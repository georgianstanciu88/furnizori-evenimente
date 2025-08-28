// scripts/geocode-localities.js
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Încarcă variabilele de mediu din .env.local
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variabile de mediu lipsesc!')
  console.error('Verifică că ai în .env.local:')
  console.error('  NEXT_PUBLIC_SUPABASE_URL=...')
  console.error('  SUPABASE_SERVICE_ROLE_KEY=...')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Rate limiting pentru Nominatim (max 1 request/secundă)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// Geocoding cu Nominatim
async function geocodeLocation(localitate, judet) {
  try {
    // Încearcă mai multe variante pentru acoperire mai bună
    const searchVariants = [
      `${localitate}, ${judet}, Romania`,
      `${localitate}, Judet ${judet}, Romania`,
      `${localitate}, ${judet}`,
      `Municipiul ${localitate}, ${judet}, Romania`,
      `Oras ${localitate}, ${judet}, Romania`
    ]

    for (const query of searchVariants) {
      console.log(`  Încercare: "${query}"`)
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `format=json&limit=1&countrycodes=ro&q=${encodeURIComponent(query)}`
      )

      if (!response.ok) {
        console.log(`  HTTP Error: ${response.status}`)
        continue
      }

      const data = await response.json()
      
      if (data && data.length > 0) {
        const result = data[0]
        const lat = parseFloat(result.lat)
        const lng = parseFloat(result.lon)
        
        // Validare coordonate (România aproximativ: 43.5-48.5 lat, 20-30 lng)
        if (lat >= 43 && lat <= 49 && lng >= 20 && lng <= 30) {
          console.log(`  ✅ Găsit: ${lat}, ${lng}`)
          return { lat, lng, display_name: result.display_name }
        } else {
          console.log(`  ⚠️  Coordonate în afara României: ${lat}, ${lng}`)
        }
      }

      // Rate limiting între încercări
      await delay(500)
    }

    console.log(`  ❌ Nu s-a găsit coordonate valide`)
    return null
    
  } catch (error) {
    console.error(`  🔥 Eroare geocoding pentru ${localitate}, ${judet}:`, error.message)
    return null
  }
}

// Funcția principală de geocoding
async function geocodeAllLocalitati() {
  console.log('🚀 Început geocoding pentru toate localitățile...\n')

  try {
    // 1. Verifică dacă coloanele există, dacă nu le adaugă
    console.log('📋 Verificare structură baza de date...')
    
    // Adaugă coloanele dacă nu există (va da eroare dacă există deja, dar continuă)
    try {
      const { error: alterError } = await supabase.rpc('add_coordinates_columns', {})
      if (alterError && !alterError.message.includes('already exists')) {
        console.log('⚠️  Eroare la adăugarea coloanelor:', alterError.message)
      }
    } catch (e) {
      // Ignoră erorile de "coloana există deja"
    }

    // 2. Obține toate localitățile fără coordonate
    const { data: localitati, error: fetchError } = await supabase
      .from('localitati')
      .select('id, nume, judet, latitude, longitude')
      .or('latitude.is.null,longitude.is.null')
      .order('judet, nume')

    if (fetchError) {
      throw new Error(`Eroare la obținerea localităților: ${fetchError.message}`)
    }

    if (!localitati || localitati.length === 0) {
      console.log('✅ Toate localitățile au deja coordonate!')
      return
    }

    console.log(`📍 Găsite ${localitati.length} localități de geocodat`)
    console.log(`⏱️  Timp estimat: ~${Math.ceil(localitati.length * 1.2 / 60)} minute\n`)

    // 3. Geocodează fiecare localitate
    let processed = 0
    let successful = 0
    let failed = 0

    for (const loc of localitati) {
      processed++
      console.log(`\n[${processed}/${localitati.length}] ${loc.nume}, ${loc.judet}`)

      // Skip dacă are deja coordonate
      if (loc.latitude && loc.longitude) {
        console.log('  ⏭️  Are deja coordonate, skip')
        continue
      }

      const coords = await geocodeLocation(loc.nume, loc.judet)
      
      if (coords) {
        // Salvează coordonatele în baza de date
        const { error: updateError } = await supabase
          .from('localitati')
          .update({
            latitude: coords.lat,
            longitude: coords.lng,
            geocoded_at: new Date().toISOString(),
            geocoded_source: 'nominatim'
          })
          .eq('id', loc.id)

        if (updateError) {
          console.log(`  🔥 Eroare la salvare: ${updateError.message}`)
          failed++
        } else {
          successful++
        }
      } else {
        failed++
      }

      // Rate limiting global (1.2 secunde între requests)
      await delay(1200)

      // Progress update la fiecare 10 localități
      if (processed % 10 === 0) {
        const percent = Math.round((processed / localitati.length) * 100)
        console.log(`\n📊 Progress: ${percent}% (${successful} successful, ${failed} failed)`)
      }
    }

    // 4. Raport final
    console.log('\n' + '='.repeat(50))
    console.log('🎉 GEOCODING COMPLET!')
    console.log(`📊 Statistici finale:`)
    console.log(`   • Total procesate: ${processed}`)
    console.log(`   • Successful: ${successful}`)
    console.log(`   • Failed: ${failed}`)
    console.log(`   • Success rate: ${Math.round((successful / processed) * 100)}%`)

    // 5. Verifică județele cu probleme
    if (failed > 0) {
      console.log('\n🔍 Verificare județe cu probleme...')
      const { data: failedByJudet } = await supabase
        .from('localitati')
        .select('judet, nume')
        .is('latitude', null)

      if (failedByJudet && failedByJudet.length > 0) {
        const problemJudete = failedByJudet.reduce((acc, loc) => {
          acc[loc.judet] = (acc[loc.judet] || 0) + 1
          return acc
        }, {})

        console.log('Județe cu localități negeocoding:')
        Object.entries(problemJudete)
          .sort(([,a], [,b]) => b - a)
          .forEach(([judet, count]) => {
            console.log(`   • ${judet}: ${count} localități`)
          })
      }
    }

  } catch (error) {
    console.error('🔥 Eroare fatală:', error.message)
    process.exit(1)
  }
}

// Funcție pentru geocoding manual individual
async function geocodeSingleLocation(nume, judet) {
  console.log(`🎯 Geocoding manual: ${nume}, ${judet}`)
  
  const coords = await geocodeLocation(nume, judet)
  
  if (coords) {
    console.log(`✅ Rezultat: ${coords.lat}, ${coords.lng}`)
    console.log(`📍 Adresa: ${coords.display_name}`)
    return coords
  } else {
    console.log(`❌ Nu s-au găsit coordonate pentru ${nume}, ${judet}`)
    return null
  }
}

// Funcție pentru testare conexiune
async function testConnection() {
  try {
    const { data, error, count } = await supabase
      .from('localitati')
      .select('*', { count: 'exact', head: true })

    if (error) throw error

    console.log('✅ Conexiune Supabase OK')
    console.log(`📊 Localități în baza de date: ${count || 'necunoscut'}`)
    
    // Test și pe o localitate reală
    const { data: testData, error: testError } = await supabase
      .from('localitati')
      .select('id, nume, judet, latitude, longitude')
      .limit(1)

    if (testError) throw testError
    
    if (testData && testData.length > 0) {
      const loc = testData[0]
      console.log(`📍 Exemplu localitate: ${loc.nume}, ${loc.judet}`)
      console.log(`🗺️  Coordonate existente: ${loc.latitude ? 'DA' : 'NU'}`)
    }
    
    return true
  } catch (error) {
    console.error('❌ Eroare conexiune Supabase:', error.message)
    return false
  }
}

// Parsing argumente command line
const args = process.argv.slice(2)
const command = args[0]

// Comenzi disponibile
switch (command) {
  case 'test':
    await testConnection()
    break
    
  case 'single':
    if (args.length < 3) {
      console.log('Utilizare: npm run geocode single "Nume Localitate" "Nume Judet"')
      process.exit(1)
    }
    await geocodeSingleLocation(args[1], args[2])
    break
    
  case 'all':
  default:
    if (command && command !== 'all') {
      console.log('Comenzi disponibile:')
      console.log('  npm run geocode test     - testează conexiunea')
      console.log('  npm run geocode single   - geocodează o localitate')
      console.log('  npm run geocode all      - geocodează toate localitățile')
      process.exit(1)
    }
    await geocodeAllLocalitati()
    break
}

process.exit(0)
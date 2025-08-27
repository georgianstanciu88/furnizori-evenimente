'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import SearchResults from '@/components/SearchResults'
import LocationPicker from '@/components/LocationPicker'

export default function Search() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  
  // Filtre de căutare
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedLocation, setSelectedLocation] = useState({ judet: '', localitate: '' })
  const [selectedCategory, setSelectedCategory] = useState('')
  const [priceRange, setPriceRange] = useState('')
  const [includeMobileSuppliers, setIncludeMobileSuppliers] = useState(true)
  
  // Date și rezultate
  const [categories, setCategories] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  
  // Statistici rezultate
  const [localSuppliers, setLocalSuppliers] = useState([])
  const [mobileSuppliers, setMobileSuppliers] = useState([])

  useEffect(() => {
    checkAuth()
    fetchCategories()
    loadSearchParamsFromURL()
  }, [])

  useEffect(() => {
    // Auto-search dacă avem parametri din URL
    if (categories.length > 0 && hasURLParams()) {
      setTimeout(() => {
        searchSuppliers()
      }, 1000)
    }
  }, [categories])

  function loadSearchParamsFromURL() {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      
      const date = urlParams.get('date')
      const judet = urlParams.get('judet')
      const localitate = urlParams.get('localitate')
      const category = urlParams.get('category')
      
      if (date) setSelectedDate(date)
      if (judet && localitate) {
        setSelectedLocation({ judet, localitate })
      }
      if (category) setSelectedCategory(category)
    }
  }

  function hasURLParams() {
    if (typeof window === 'undefined') return false
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.has('date') || urlParams.has('localitate') || urlParams.has('category')
  }

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
    }
    setUser(user)
  }

  async function fetchCategories() {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('name')
    setCategories(data || [])
  }

  async function searchSuppliers() {
    console.log('🔍 ÎNCEPE CĂUTAREA cu parametrii:', {
      selectedDate,
      selectedLocation,
      selectedCategory,
      priceRange,
      includeMobileSuppliers
    })

    if (!selectedDate && !selectedLocation.localitate && !selectedCategory) {
      alert('Selectează cel puțin un criteriu de căutare!')
      return
    }

    setLoading(true)
    setHasSearched(true)

    try {
      // 1. Căutare furnizori locali
      let localResults = []
      if (selectedLocation.localitate) {
        console.log('📍 Căutare furnizori locali...')
        localResults = await searchLocalSuppliers()
        console.log('✅ Furnizori locali găsiți:', localResults.length)
      }

      // 2. Căutare furnizori mobili (dacă este bifată opțiunea)
      let mobileResults = []
      if (includeMobileSuppliers && selectedLocation.judet) {
        console.log('🚗 Căutare furnizori mobili...')
        mobileResults = await searchMobileSuppliers()
        console.log('✅ Furnizori mobili găsiți:', mobileResults.length)
      }

      // 3. Combină și sortează rezultatele
      const allSuppliers = [...localResults, ...mobileResults]
      const uniqueSuppliers = removeDuplicates(allSuppliers)
      
      console.log('📊 REZULTATE FINALE:', {
        locali: localResults.length,
        mobili: mobileResults.length,
        total: uniqueSuppliers.length
      })
      
      setLocalSuppliers(localResults)
      setMobileSuppliers(mobileResults.filter(m => !localResults.find(l => l.id === m.id)))
      setSuppliers(uniqueSuppliers)

    } catch (error) {
      console.error('Eroare la căutarea furnizorilor:', error)
    } finally {
      setLoading(false)
    }
  }

  async function searchLocalSuppliers() {
    console.log('🔍 Căutare furnizori locali pentru:', selectedLocation)

    // Căutare de bază fără filtre pentru debug
    let { data: allSuppliers, error: allError } = await supabase
      .from('suppliers')
      .select(`
        *,
        supplier_categories (
          categories (id, name)
        )
      `)

    console.log('📊 Total furnizori în DB:', allSuppliers?.length, allSuppliers)

    if (allError) {
      console.error('❌ Eroare la căutarea tuturor furnizorilor:', allError)
      return []
    }

    if (!allSuppliers || allSuppliers.length === 0) {
      console.warn('⚠️ Nu există furnizori în baza de date!')
      return []
    }

    // Filtrează după locație dacă este specificată
    let filteredSuppliers = allSuppliers
    if (selectedLocation.judet && selectedLocation.localitate) {
      filteredSuppliers = allSuppliers.filter(supplier => {
        const matchJudet = supplier.location_judet === selectedLocation.judet
        const matchLocalitate = supplier.location_localitate === selectedLocation.localitate
        console.log(`🏘️ Supplier ${supplier.business_name}:`, {
          supplierJudet: supplier.location_judet,
          supplierLocalitate: supplier.location_localitate,
          searchJudet: selectedLocation.judet,
          searchLocalitate: selectedLocation.localitate,
          matchJudet,
          matchLocalitate,
          match: matchJudet && matchLocalitate
        })
        return matchJudet && matchLocalitate
      })
    }

    console.log('🎯 Furnizori după filtrare locație:', filteredSuppliers.length)

    // Filtru după categorie
    if (selectedCategory && filteredSuppliers.length > 0) {
      filteredSuppliers = filteredSuppliers.filter(supplier => {
        const hasCategory = supplier.supplier_categories?.some(sc => 
          sc.categories && sc.categories.id.toString() === selectedCategory.toString()
        )
        console.log(`📂 Supplier ${supplier.business_name} categoria:`, {
          categories: supplier.supplier_categories?.map(sc => sc.categories),
          searchCategory: selectedCategory,
          hasCategory
        })
        return hasCategory
      })
    }

    console.log('🏷️ Furnizori după filtrare categorie:', filteredSuppliers.length)

    // Filtru după preț
    if (priceRange && filteredSuppliers.length > 0) {
      filteredSuppliers = filteredSuppliers.filter(supplier => 
        supplier.price_range === priceRange
      )
    }

    console.log('💰 Furnizori după filtrare preț:', filteredSuppliers.length)

    // Filtrează după disponibilitate în data selectată
    const finalSuppliers = await filterByAvailability(filteredSuppliers, selectedDate)
    console.log('📅 Furnizori finali după disponibilitate:', finalSuppliers.length)

    return finalSuppliers
  }

  async function searchMobileSuppliers() {
    console.log('🚗 Căutare furnizori mobili pentru județul:', selectedLocation.judet)

    if (!selectedLocation.judet) {
      console.log('⚠️ Nu este specificat județul pentru furnizorii mobili')
      return []
    }

    // Căutare furnizori mobili - include toți din același județ + din județele învecinate
    let query = supabase
      .from('suppliers')
      .select(`
        *,
        supplier_categories (
          categories (id, name)
        )
      `)
      .eq('available_for_travel', true)

    // Pentru început, includem tot județul + județele învecinate pentru Vaslui
    const nearbyJudete = {
      'Vaslui': ['Vaslui', 'Iasi', 'Bacau', 'Galati', 'Neamt'],
      'Iasi': ['Iasi', 'Vaslui', 'Neamt', 'Suceava', 'Botosani'],
      'Bacau': ['Bacau', 'Vaslui', 'Neamt', 'Vrancea', 'Galati'],
      'Bucuresti': ['Bucuresti', 'Ilfov', 'Giurgiu', 'Calarasi', 'Ialomita']
      // Se pot adăuga mai multe
    }

    const searchJudete = nearbyJudete[selectedLocation.judet] || [selectedLocation.judet]
    query = query.in('location_judet', searchJudete)

    console.log('🗺️ Căutare în județele:', searchJudete)

    const { data: suppliers, error } = await query

    console.log('🚗 Furnizori mobili găsiți:', suppliers?.length)

    if (error) {
      console.error('❌ Eroare căutare furnizori mobili:', error)
      return []
    }

    if (!suppliers || suppliers.length === 0) {
      return []
    }

    // Exclude furnizorii din aceeași localitate (aceștia sunt deja în locali)
    let filteredSuppliers = suppliers.filter(supplier => 
      !(supplier.location_judet === selectedLocation.judet && 
        supplier.location_localitate === selectedLocation.localitate)
    )

    console.log('🚗 Furnizori mobili după excludere locali:', filteredSuppliers.length)

    // Calculează distanțe aproximative și adaugă info
    filteredSuppliers = filteredSuppliers.map(supplier => {
      const distance = calculateApproximateDistance(
        selectedLocation.judet, 
        selectedLocation.localitate,
        supplier.location_judet,
        supplier.location_localitate
      )
      
      return {
        ...supplier,
        distance: distance,
        travelInfo: `Din ${supplier.location_localitate}, ${supplier.location_judet}`
      }
    }).sort((a, b) => a.distance - b.distance) // Sortează după distanță

    console.log('🚗 Furnizori mobili cu distanțe:', filteredSuppliers.map(s => 
      `${s.business_name}: ${s.distance}km din ${s.location_localitate}, ${s.location_judet}`
    ))

    // Filtru după categorie
    if (selectedCategory) {
      filteredSuppliers = filteredSuppliers.filter(supplier => {
        const hasCategory = supplier.supplier_categories?.some(sc => 
          sc.categories && sc.categories.id.toString() === selectedCategory.toString()
        )
        return hasCategory
      })
    }

    console.log('📂 Furnizori mobili după filtrare categorie:', filteredSuppliers.length)

    // Filtru după preț
    if (priceRange) {
      filteredSuppliers = filteredSuppliers.filter(supplier => 
        supplier.price_range === priceRange
      )
    }

    // Filtrează după disponibilitate
    return await filterByAvailability(filteredSuppliers, selectedDate)
  }

  // Calculează distanța aproximativă între două locații
  function calculateApproximateDistance(judet1, localitate1, judet2, localitate2) {
    // Dacă sunt în același județ, distanța e mică
    if (judet1 === judet2) {
      if (localitate1 === localitate2) return 0
      return 25 // ~25km în același județ
    }

    // Distanțe aproximative între județe (centru-centru)
    const distanceMatrix = {
      'Vaslui-Iasi': 65,
      'Iasi-Vaslui': 65,
      'Vaslui-Bacau': 85,
      'Bacau-Vaslui': 85,
      'Vaslui-Galati': 95,
      'Galati-Vaslui': 95,
      'Iasi-Neamt': 75,
      'Neamt-Iasi': 75,
      'Bucuresti-Ilfov': 30,
      'Ilfov-Bucuresti': 30
      // Se pot adăuga mai multe
    }

    const key = `${judet1}-${judet2}`
    return distanceMatrix[key] || 100 // Default 100km pentru județe necunoscute
  }

  async function filterByAvailability(suppliers, date) {
    console.log('📅 Filtrare după disponibilitate pentru data:', date)
    console.log('👥 Furnizori de filtrat:', suppliers.length)

    if (!date || !suppliers.length) {
      console.log('⏩ Fără filtrare disponibilitate - returnez toți furnizorii')
      return suppliers
    }

    const { data: unavailableDates, error } = await supabase
      .from('unavailable_dates')
      .select('supplier_id')
      .eq('date', date)

    if (error) {
      console.error('❌ Eroare la verificarea disponibilității:', error)
      return suppliers // Return toate dacă eroare
    }

    console.log('🚫 Date indisponibile pentru această dată:', unavailableDates?.length || 0)

    const unavailableIds = unavailableDates?.map(u => u.supplier_id) || []
    
    const availableSuppliers = suppliers.filter(supplier => 
      !unavailableIds.includes(supplier.id)
    )

    console.log('✅ Furnizori disponibili:', availableSuppliers.length)
    return availableSuppliers
  }

  function removeDuplicates(suppliers) {
    const seen = new Set()
    return suppliers.filter(supplier => {
      if (seen.has(supplier.id)) return false
      seen.add(supplier.id)
      return true
    })
  }

  function resetSearch() {
    setSelectedDate('')
    setSelectedLocation({ judet: '', localitate: '' })
    setSelectedCategory('')
    setPriceRange('')
    setSuppliers([])
    setLocalSuppliers([])
    setMobileSuppliers([])
    setHasSearched(false)
  }

  const priceRanges = [
    '€ - Buget mic',
    '€€ - Buget mediu', 
    '€€€ - Buget mare',
    '€€€€ - Premium'
  ]

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      paddingTop: '64px'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '32px 16px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '800',
            color: '#111827',
            textAlign: 'center',
            margin: '0 0 16px 0'
          }}>
            Caută Furnizori pentru Evenimentul Tău
          </h1>
          <p style={{
            fontSize: '1.125rem',
            color: '#6b7280',
            textAlign: 'center',
            margin: 0
          }}>
            Găsește rapid furnizorii potriviți pentru data și locația ta
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 16px' }}>
        {/* Formular de căutare */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '32px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
            marginBottom: '24px'
          }}>
            {/* Data evenimentului */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Data evenimentului
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              />
            </div>

            {/* Locația */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Locația evenimentului
              </label>
              <LocationPicker
                value={selectedLocation}
                onLocationChange={setSelectedLocation}
                placeholder="Selectează județul și localitatea"
              />
            </div>

            {/* Categoria */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Categoria serviciului
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              >
                <option value="">Toate categoriile</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Bugetul */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Bugetul
              </label>
              <select
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              >
                <option value="">Orice buget</option>
                {priceRanges.map(range => (
                  <option key={range} value={range}>
                    {range}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Opțiuni avansate */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px'
            }}>
              <input
                type="checkbox"
                id="mobile-suppliers"
                checked={includeMobileSuppliers}
                onChange={(e) => setIncludeMobileSuppliers(e.target.checked)}
                style={{
                  width: '18px',
                  height: '18px',
                  accentColor: '#2563eb'
                }}
              />
              <label 
                htmlFor="mobile-suppliers"
                style={{
                  fontSize: '14px',
                  color: '#374151',
                  cursor: 'pointer'
                }}
              >
                Include furnizori care se deplasează din zona extinsă
              </label>
            </div>

            {includeMobileSuppliers && (
              <div style={{
                marginLeft: '26px',
                fontSize: '13px',
                color: '#6b7280',
                backgroundColor: '#f9fafb',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ marginBottom: '8px', fontWeight: '500' }}>
                  Zone de căutare pentru furnizori mobili:
                </div>
                <div>
                  • <strong>Vaslui:</strong> Iași, Bacău, Galați, Neamț (~65-95km)
                </div>
                <div>
                  • <strong>Iași:</strong> Vaslui, Neamț, Suceava, Botoșani (~65-85km)
                </div>
                <div>
                  • <strong>Alte județe:</strong> Zone învecinate (~100km)
                </div>
              </div>
            )}
          </div>

          {/* Butoane */}
          <div style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={searchSuppliers}
              disabled={loading}
              style={{
                padding: '12px 24px',
                backgroundColor: loading ? '#9ca3af' : '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #fff',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Se caută...
                </>
              ) : (
                <>
                  🔍 Caută furnizori
                </>
              )}
            </button>

            {/* Buton pentru test - afișează TOȚI furnizorii */}
            <button
              onClick={async () => {
                setLoading(true)
                setHasSearched(true)
                try {
                  const { data: allSuppliers, error } = await supabase
                    .from('suppliers')
                    .select(`
                      *,
                      supplier_categories (
                        categories (id, name)
                      )
                    `)

                  if (error) {
                    console.error('Eroare test:', error)
                  } else {
                    console.log('🧪 TEST - Toți furnizorii:', allSuppliers)
                    
                    // Log detaliat pentru fiecare furnizor
                    allSuppliers?.forEach((supplier, index) => {
                      console.log(`📋 Furnizor ${index + 1}:`, {
                        id: supplier.id,
                        business_name: supplier.business_name,
                        location_judet: supplier.location_judet,
                        location_localitate: supplier.location_localitate,
                        available_for_travel: supplier.available_for_travel,
                        categories: supplier.supplier_categories?.map(sc => sc.categories),
                        phone: supplier.phone,
                        price_range: supplier.price_range
                      })
                    })
                    
                    const processedSuppliers = allSuppliers?.map(supplier => ({
                      ...supplier,
                      categories: supplier.supplier_categories?.map(sc => sc.categories) || []
                    })) || []
                    
                    setSuppliers(processedSuppliers)
                    setLocalSuppliers(processedSuppliers)
                    setMobileSuppliers([])
                  }
                } catch (error) {
                  console.error('Eroare test:', error)
                } finally {
                  setLoading(false)
                }
              }}
              disabled={loading}
              style={{
                padding: '12px 24px',
                backgroundColor: loading ? '#9ca3af' : '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              🧪 Test - Afișează TOȚI furnizorii
            </button>

            {/* Buton pentru debug locații */}
            <button
              onClick={async () => {
                console.log('🌍 DEBUG - Locații disponibile')
                try {
                  // Verifică ce locații sunt în tabela localități
                  const { data: localitati } = await supabase
                    .from('localitati')
                    .select('*')
                    .limit(20)

                  console.log('📍 Localități în baza de date:', localitati)
                  
                  // Verifică categoriile
                  const { data: categories } = await supabase
                    .from('categories')
                    .select('*')
                    
                  console.log('🏷️ Categorii disponibile:', categories)
                  
                  // Test rapid de căutare
                  console.log('🔍 Test căutare Vaslui + Barlad:')
                  const testLocation = { judet: 'Vaslui', localitate: 'Barlad' }
                  console.log('Parametri test:', testLocation)
                  
                  const { data: testSuppliers } = await supabase
                    .from('suppliers')
                    .select('*')
                    .eq('location_judet', testLocation.judet)
                    .eq('location_localitate', testLocation.localitate)
                    
                  console.log('Rezultat test căutare:', testSuppliers)
                  
                } catch (error) {
                  console.error('Eroare debug locații:', error)
                }
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              🌍 Debug Locații & Categorii
            </button>

            {hasSearched && (
              <button
                onClick={resetSearch}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Resetează căutarea
              </button>
            )}
          </div>
        </div>

        {/* Rezultate căutare */}
        {hasSearched && (
          <SearchResults
            suppliers={suppliers}
            localSuppliers={localSuppliers}
            mobileSuppliers={mobileSuppliers}
            loading={loading}
            searchCriteria={{
              date: selectedDate,
              location: selectedLocation,
              category: selectedCategory,
              priceRange: priceRange
            }}
          />
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
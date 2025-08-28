'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import SearchResults from '@/components/SearchResults'

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

  // Pentru dropdown localitate
  const [localitati, setLocalitati] = useState([])
  const [loadingLocalitati, setLoadingLocalitati] = useState(false)

  useEffect(() => {
    checkAuth()
    fetchCategories()
  }, [])

  // Încarcă localitățile când se schimbă județul
  useEffect(() => {
    if (selectedLocation.judet) {
      fetchLocalitatiForJudet(selectedLocation.judet)
    } else {
      setLocalitati([])
      setSelectedLocation(prev => ({ ...prev, localitate: '' }))
    }
  }, [selectedLocation.judet])

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

  async function fetchLocalitatiForJudet(judet) {
    setLoadingLocalitati(true)
    try {
      const { data, error } = await supabase
        .from('localitati')
        .select('nume')
        .eq('judet', judet)
        .order('nume')

      if (error) throw error
      setLocalitati(data || [])
    } catch (error) {
      console.error('Error fetching localitati:', error)
      setLocalitati([])
    }
    setLoadingLocalitati(false)
  }

  async function searchSuppliers() {
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
        localResults = await searchLocalSuppliers()
      }

      // 2. Căutare furnizori mobili
      let mobileResults = []
      if (includeMobileSuppliers && selectedLocation.judet) {
        mobileResults = await searchMobileSuppliers()
      }

      // 3. Combină rezultatele
      const allSuppliers = [...localResults, ...mobileResults]
      const uniqueSuppliers = removeDuplicates(allSuppliers)
      
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
    let { data: allSuppliers, error } = await supabase
      .from('suppliers')
      .select(`
        *,
        supplier_categories (
          categories (id, name)
        )
      `)

    if (error || !allSuppliers) return []

    // Filtrează după locație
    let filteredSuppliers = allSuppliers
    if (selectedLocation.judet && selectedLocation.localitate) {
      filteredSuppliers = allSuppliers.filter(supplier => 
        supplier.location_judet === selectedLocation.judet &&
        supplier.location_localitate === selectedLocation.localitate
      )
    }

    // Filtru după categorie
    if (selectedCategory) {
      filteredSuppliers = filteredSuppliers.filter(supplier => 
        supplier.supplier_categories?.some(sc => 
          sc.categories && sc.categories.id.toString() === selectedCategory.toString()
        )
      )
    }

    // Filtru după preț
    if (priceRange) {
      filteredSuppliers = filteredSuppliers.filter(supplier => 
        supplier.price_range === priceRange
      )
    }

    return await filterByAvailability(filteredSuppliers, selectedDate)
  }

  async function searchMobileSuppliers() {
    const nearbyJudete = {
      'Vaslui': ['Vaslui', 'Iasi', 'Bacau', 'Galati', 'Neamt'],
      'Iasi': ['Iasi', 'Vaslui', 'Neamt', 'Suceava', 'Botosani'],
      'Bacau': ['Bacau', 'Vaslui', 'Neamt', 'Vrancea', 'Galati'],
      'Bucuresti': ['Bucuresti', 'Ilfov', 'Giurgiu', 'Calarasi', 'Ialomita']
    }

    const searchJudete = nearbyJudete[selectedLocation.judet] || [selectedLocation.judet]

    const { data: suppliers, error } = await supabase
      .from('suppliers')
      .select(`
        *,
        supplier_categories (
          categories (id, name)
        )
      `)
      .eq('available_for_travel', true)
      .in('location_judet', searchJudete)

    if (error || !suppliers) return []

    // Exclude furnizorii din aceeași localitate
    let filteredSuppliers = suppliers.filter(supplier => 
      !(supplier.location_judet === selectedLocation.judet && 
        supplier.location_localitate === selectedLocation.localitate)
    )

    // Calculează distanțe
    filteredSuppliers = filteredSuppliers.map(supplier => ({
      ...supplier,
      distance: calculateDistance(selectedLocation, supplier),
      travelInfo: `Din ${supplier.location_localitate}, ${supplier.location_judet}`
    })).sort((a, b) => a.distance - b.distance)

    // Filtru după categorie
    if (selectedCategory) {
      filteredSuppliers = filteredSuppliers.filter(supplier => 
        supplier.supplier_categories?.some(sc => 
          sc.categories && sc.categories.id.toString() === selectedCategory.toString()
        )
      )
    }

    // Filtru după preț
    if (priceRange) {
      filteredSuppliers = filteredSuppliers.filter(supplier => 
        supplier.price_range === priceRange
      )
    }

    return await filterByAvailability(filteredSuppliers, selectedDate)
  }

  function calculateDistance(location1, supplier) {
    if (location1.judet === supplier.location_judet) {
      return location1.localitate === supplier.location_localitate ? 0 : 25
    }
    
    const distanceMatrix = {
      'Vaslui-Iasi': 65, 'Iasi-Vaslui': 65,
      'Vaslui-Bacau': 85, 'Bacau-Vaslui': 85,
      'Vaslui-Galati': 95, 'Galati-Vaslui': 95
    }
    
    const key = `${location1.judet}-${supplier.location_judet}`
    return distanceMatrix[key] || 100
  }

  async function filterByAvailability(suppliers, date) {
    if (!date || !suppliers.length) return suppliers

    const { data: unavailableDates } = await supabase
      .from('unavailable_dates')
      .select('supplier_id')
      .eq('date', date)

    const unavailableIds = unavailableDates?.map(u => u.supplier_id) || []
    return suppliers.filter(supplier => !unavailableIds.includes(supplier.id))
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

  const priceRanges = ['€ - Buget mic', '€€ - Buget mediu', '€€€ - Buget mare', '€€€€ - Premium']

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      paddingTop: '64px'
    }}>
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            marginBottom: '24px'
          }}>
            {/* Data */}
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
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '12px',
                  fontSize: '16px',
                  backgroundColor: 'white',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#2563eb'
                  e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d1d5db'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            {/* Județul */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Județul
              </label>
              <select
                value={selectedLocation.judet}
                onChange={(e) => setSelectedLocation(prev => ({ 
                  ...prev, 
                  judet: e.target.value,
                  localitate: ''
                }))}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '12px',
                  fontSize: '16px',
                  backgroundColor: 'white',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#2563eb'
                  e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d1d5db'
                  e.target.style.boxShadow = 'none'
                }}
              >
                <option value="">Toate județele</option>
                {['Alba', 'Arad', 'Arges', 'Bacau', 'Bihor', 'Bistrita-Nasaud', 'Botosani', 'Braila', 
                  'Brasov', 'Bucuresti', 'Buzau', 'Caras-Severin', 'Calarasi', 'Cluj', 'Constanta', 
                  'Covasna', 'Dambovita', 'Dolj', 'Galati', 'Giurgiu', 'Gorj', 'Harghita', 'Hunedoara', 
                  'Ialomita', 'Iasi', 'Ilfov', 'Maramures', 'Mehedinti', 'Mures', 'Neamt', 'Olt', 
                  'Prahova', 'Salaj', 'Satu Mare', 'Sibiu', 'Suceava', 'Teleorman', 'Timis', 'Tulcea', 
                  'Valcea', 'Vaslui', 'Vrancea'].map(judet => (
                  <option key={judet} value={judet}>{judet}</option>
                ))}
              </select>
            </div>

            {/* Localitatea */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Localitatea
              </label>
              <select
                value={selectedLocation.localitate}
                onChange={(e) => setSelectedLocation(prev => ({ ...prev, localitate: e.target.value }))}
                disabled={!selectedLocation.judet || loadingLocalitati}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '12px',
                  fontSize: '16px',
                  backgroundColor: !selectedLocation.judet ? '#f9fafb' : 'white',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  if (selectedLocation.judet && !loadingLocalitati) {
                    e.target.style.borderColor = '#2563eb'
                    e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'
                  }
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d1d5db'
                  e.target.style.boxShadow = 'none'
                }}
              >
                <option value="">
                  {loadingLocalitati ? 'Se încarcă...' : !selectedLocation.judet ? 'Selectează județul' : 'Toate localitățile'}
                </option>
                {localitati.map((localitate, index) => (
                  <option key={index} value={localitate.nume}>
                    {localitate.nume}
                  </option>
                ))}
              </select>
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
                Categoria
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '12px',
                  fontSize: '16px',
                  backgroundColor: 'white',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#2563eb'
                  e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d1d5db'
                  e.target.style.boxShadow = 'none'
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
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '12px',
                  fontSize: '16px',
                  backgroundColor: 'white',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#2563eb'
                  e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d1d5db'
                  e.target.style.boxShadow = 'none'
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
              gap: '8px'
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
              <label htmlFor="mobile-suppliers" style={{
                fontSize: '14px',
                color: '#374151',
                cursor: 'pointer'
              }}>
                Include furnizori care se deplasează din zona extinsă
              </label>
            </div>
          </div>

          {/* Butoane */}
          <div style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center'
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
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Se caută...' : 'Caută furnizori'}
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
                Resetează
              </button>
            )}
          </div>
        </div>

        {/* Rezultate */}
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
    </div>
  )
}
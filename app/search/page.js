'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import SupplierCard from '@/components/SupplierCard'
import LocationPicker from '@/components/LocationPicker'

export default function Search() {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedLocation, setSelectedLocation] = useState({ judet: '', localitate: '' })
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [availableSuppliers, setAvailableSuppliers] = useState([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  useEffect(() => {
    checkAuth()
    fetchCategories()
  }, [])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
    }
  }

  async function fetchCategories() {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('name')
    setCategories(data || [])
  }

  async function searchSuppliers() {
    if (!selectedDate) {
      alert('Te rog selectează o dată!')
      return
    }

    setLoading(true)
    setHasSearched(true)

    try {
      // Step 1: Get all suppliers with their categories
      let suppliersQuery = supabase
        .from('suppliers')
        .select(`
          *,
          supplier_categories (
            categories (
              id,
              name
            )
          )
        `)

      // Step 2: If category is selected, filter by it
      if (selectedCategory) {
        // Get supplier IDs that have the selected category
        const { data: supplierIdsData } = await supabase
          .from('supplier_categories')
          .select('supplier_id')
          .eq('category_id', selectedCategory)

        if (supplierIdsData && supplierIdsData.length > 0) {
          const supplierIds = supplierIdsData.map(item => item.supplier_id)
          suppliersQuery = suppliersQuery.in('id', supplierIds)
        } else {
          // No suppliers found for this category
          setAvailableSuppliers([])
          setLoading(false)
          return
        }
      }

      const { data: allSuppliers, error: suppliersError } = await suppliersQuery

      if (suppliersError) {
        console.error('Error fetching suppliers:', suppliersError)
        setAvailableSuppliers([])
        setLoading(false)
        return
      }

      // Step 3: Get unavailable supplier IDs for the selected date
      const { data: unavailableData } = await supabase
        .from('unavailable_dates')
        .select('supplier_id')
        .eq('date', selectedDate)

      const unavailableSupplierIds = unavailableData ? unavailableData.map(u => u.supplier_id) : []

      // Step 4: Filter out unavailable suppliers
      const availableSuppliers = allSuppliers ? allSuppliers.filter(supplier => 
        !unavailableSupplierIds.includes(supplier.id)
      ) : []

      // Step 5: Process suppliers data to include categories properly
      const processedSuppliers = availableSuppliers.map(supplier => ({
        ...supplier,
        categories: supplier.supplier_categories?.map(sc => sc.categories) || []
      }))

      console.log('Found suppliers:', processedSuppliers.length)
      console.log('Unavailable suppliers for date:', unavailableSupplierIds.length)
      
      setAvailableSuppliers(processedSuppliers)
    } catch (error) {
      console.error('Error in searchSuppliers:', error)
      setAvailableSuppliers([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f9fafb',
      paddingTop: '64px',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Header */}
      <section style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '40px 16px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 className="search-title" style={{
              fontSize: '2rem',
              fontWeight: '800',
              color: '#111827',
              marginBottom: '12px',
              margin: '0 0 12px 0'
            }}>
              Caută Furnizori Disponibili
            </h1>
            <p style={{
              fontSize: '1rem',
              color: '#6b7280',
              margin: 0
            }}>
              Găsește furnizorii liberi pentru data ta
            </p>
          </div>

          {/* Search Form */}
          <div style={{
            backgroundColor: 'white',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #e5e7eb',
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            <div className="search-form-grid" style={{
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: '16px'
}}>
  <div>
    <label style={{
      display: 'block',
      fontSize: '14px',
      fontWeight: '600',
      color: '#374151',
      marginBottom: '8px'
    }}>
      Data Evenimentului *
    </label>
    <input
      type="date"
      style={{
        width: '100%',
        padding: '12px 16px',
        border: '1px solid #d1d5db',
        borderRadius: '12px',
        fontSize: '16px',
        transition: 'all 0.2s',
        outline: 'none'
      }}
      value={selectedDate}
      onChange={(e) => setSelectedDate(e.target.value)}
      min={new Date().toISOString().split('T')[0]}
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

  <div>
    <label style={{
      display: 'block',
      fontSize: '14px',
      fontWeight: '600',
      color: '#374151',
      marginBottom: '8px'
    }}>
      Locația (opțional)
    </label>
    <LocationPicker
      selectedJudet={selectedLocation.judet}
      selectedLocalitate={selectedLocation.localitate}
      onLocationChange={setSelectedLocation}
    />
  </div>

  <div>
    <label style={{
      display: 'block',
      fontSize: '14px',
      fontWeight: '600',
      color: '#374151',
      marginBottom: '8px'
    }}>
      Categorie (opțional)
    </label>
    <select
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
      value={selectedCategory}
      onChange={(e) => setSelectedCategory(e.target.value)}
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
      {categories.map(cat => (
        <option key={cat.id} value={cat.id}>{cat.name}</option>
      ))}
    </select>
  </div>

  <button
    onClick={searchSuppliers}
    disabled={loading || !selectedDate}
    style={{
      width: '100%',
      backgroundColor: loading || !selectedDate ? '#9ca3af' : '#2563eb',
      color: 'white',
      padding: '14px 24px',
      borderRadius: '12px',
      fontWeight: '600',
      border: 'none',
      cursor: loading || !selectedDate ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s',
      fontSize: '16px',
      marginTop: '8px'
    }}
    onMouseOver={(e) => {
      if (!loading && selectedDate) {
        e.target.style.backgroundColor = '#1d4ed8'
      }
    }}
    onMouseOut={(e) => {
      if (!loading && selectedDate) {
        e.target.style.backgroundColor = '#2563eb'
      }
    }}
  >
    {loading ? (
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        <div style={{
          width: '20px',
          height: '20px',
          border: '2px solid #ffffff',
          borderTop: '2px solid transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        Se caută...
      </span>
    ) : (
      '🔍 Caută'
    )}
  </button>
</div>
          </div>
        </div>
      </section>

      {/* Results */}
      <section style={{ padding: '40px 16px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {hasSearched && !loading && (
            <>
              {availableSuppliers.length > 0 ? (
                <>
                  <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <h2 className="results-title" style={{
                      fontSize: '1.5rem',
                      fontWeight: '800',
                      color: '#111827',
                      marginBottom: '8px',
                      margin: '0 0 8px 0'
                    }}>
                      {availableSuppliers.length} furnizori disponibili
                    </h2>
                    <p style={{
                      fontSize: '1rem',
                      color: '#6b7280',
                      margin: 0
                    }}>
                      pentru data de {new Date(selectedDate).toLocaleDateString('ro-RO', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                      {selectedCategory && categories.find(c => c.id == selectedCategory) && (
                        <span> în categoria {categories.find(c => c.id == selectedCategory).name}</span>
                      )}
                    </p>
                  </div>
                  
                  <div className="results-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr',
                    gap: '20px'
                  }}>
                    {availableSuppliers.map(supplier => (
                      <SupplierCard 
                        key={supplier.id} 
                        supplier={supplier} 
                        showAvailability={true}
                        highlightAvailable={true}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 16px' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '20px' }}>😔</div>
                  <h3 style={{
                    fontSize: '1.25rem',
                    fontWeight: '800',
                    color: '#111827',
                    marginBottom: '12px',
                    margin: '0 0 12px 0'
                  }}>
                    Nu am găsit furnizori disponibili
                  </h3>
                  <p style={{
                    fontSize: '1rem',
                    color: '#6b7280',
                    marginBottom: '24px',
                    maxWidth: '400px',
                    margin: '0 auto 24px',
                    lineHeight: '1.6'
                  }}>
                    {selectedCategory 
  ? 'Nu există furnizori disponibili pentru această dată în categoria selectată.'
  : 'Nu există furnizori disponibili pentru data selectată.'
}
                  </p>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => {
                        setSelectedDate('')
                        setAvailableSuppliers([])
                        setHasSearched(false)
                      }}
                      style={{
                        backgroundColor: '#2563eb',
                        color: 'white',
                        padding: '12px 24px',
                        borderRadius: '12px',
                        fontWeight: '600',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1rem'
                      }}
                    >
                      Alege altă dată
                    </button>
                    {selectedCategory && (
                      <button
                        onClick={() => {
                          setSelectedCategory('')
                          if (selectedDate) {
                            searchSuppliers()
                          }
                        }}
                        style={{
                          backgroundColor: '#16a34a',
                          color: 'white',
                          padding: '12px 24px',
                          borderRadius: '12px',
                          fontWeight: '600',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '1rem'
                        }}
                      >
                        Vezi toate categoriile
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {!hasSearched && !loading && (
            <div style={{ textAlign: 'center', padding: '60px 16px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '20px' }}>📅</div>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '800',
                color: '#111827',
                marginBottom: '12px',
                margin: '0 0 12px 0'
              }}>
                Selectează o dată și caută
              </h3>
              <p style={{
                fontSize: '1rem',
                color: '#6b7280',
                margin: 0
              }}>
                Alege data evenimentului tău pentru a vedea furnizorii disponibili
              </p>
            </div>
          )}



          
          {/* Debug info - remove in production - avem NODE_ENV == development cand facem debug. daca schimbam in false ar trebui sa dispara */}
          {hasSearched && process.env.NODE_ENV === 'false' && (
            <div style={{
              marginTop: '40px',
              padding: '16px',
              backgroundColor: '#f3f4f6',
              borderRadius: '8px',
              fontSize: '14px',
              color: '#6b7280'
            }}>
              <strong>Debug Info:</strong><br />
              Selected Date: {selectedDate}<br />
              Selected Category: {selectedCategory || 'None'}<br />
              Found Suppliers: {availableSuppliers.length}<br />
              Has Searched: {hasSearched ? 'Yes' : 'No'}
            </div>
          )}
        </div>
      </section>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        /* Mobile-first responsive design */
        .search-title {
          font-size: 2rem !important;
        }
        
        .results-title {
          font-size: 1.5rem !important;
        }
        
        .search-form-grid {
          grid-template-columns: 1fr !important;
          gap: 16px !important;
        }
        
        .results-grid {
          grid-template-columns: 1fr !important;
          gap: 20px !important;
        }
        
        /* Tablet breakpoint */
        @media (min-width: 640px) {
          .search-title {
            font-size: 2.5rem !important;
          }
          
          .results-title {
            font-size: 2rem !important;
          }
          
          .search-form-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 20px !important;
          }
          
          .search-form-grid button {
            grid-column: 1 / -1 !important;
          }
          
          .results-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 24px !important;
          }
        }
        
        /* Desktop breakpoint */
        @media (min-width: 1024px) {
          .search-form-grid {
            grid-template-columns: 1fr 1fr auto !important;
            align-items: end !important;
          }
          
          .search-form-grid button {
            grid-column: auto !important;
            margin-top: 0 !important;
          }
          
          .results-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 32px !important;
          }
        }
      `}</style>
    </div>
  )
}
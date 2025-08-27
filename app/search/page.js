// app/search/page.js - Enhanced version
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import SupplierCard from '@/components/SupplierCard'
import AdvancedSearchMap from '@/components/AdvancedSearchMap'

export default function Search() {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [availableSuppliers, setAvailableSuppliers] = useState([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [searchMode, setSearchMode] = useState('date') // 'date', 'location', 'both'

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
    if (!selectedDate && !selectedLocation) {
      alert('Selectează cel puțin data sau locația!')
      return
    }

    setLoading(true)
    setHasSearched(true)

    try {
      let query = supabase
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

      // Filtru după categorie dacă e selectată
      if (selectedCategory) {
        const { data: supplierIdsData } = await supabase
          .from('supplier_categories')
          .select('supplier_id')
          .eq('category_id', selectedCategory)

        if (supplierIdsData && supplierIdsData.length > 0) {
          const ids = supplierIdsData.map(item => item.supplier_id)
          query = query.in('id', ids)
        } else {
          setAvailableSuppliers([])
          setLoading(false)
          return
        }
      }

      // Filtru după locație dacă e selectată
      if (selectedLocation && selectedLocation.city) {
        query = query.ilike('address', `%${selectedLocation.city}%`)
      }

      const { data: allSuppliers, error: suppliersError } = await query

      if (suppliersError) {
        console.error('Error fetching suppliers:', suppliersError)
        setAvailableSuppliers([])
        setLoading(false)
        return
      }

      // Filtru după disponibilitate în data selectată
      let availableSuppliers = allSuppliers || []

      if (selectedDate) {
        const { data: unavailableData } = await supabase
          .from('unavailable_dates')
          .select('supplier_id')
          .eq('date', selectedDate)

        const unavailableSupplierIds = unavailableData ? unavailableData.map(u => u.supplier_id) : []
        availableSuppliers = availableSuppliers.filter(supplier => 
          !unavailableSupplierIds.includes(supplier.id)
        )
      }

      // Procesează datele furnizorilor
      const processedSuppliers = availableSuppliers.map(supplier => ({
        ...supplier,
        categories: supplier.supplier_categories?.map(sc => sc.categories) || []
      }))

      setAvailableSuppliers(processedSuppliers)
    } catch (error) {
      console.error('Error in searchSuppliers:', error)
      setAvailableSuppliers([])
    } finally {
      setLoading(false)
    }
  }

  const handleLocationSelect = (locationData) => {
    setSelectedLocation(locationData)
    if (searchMode === 'location' || searchMode === 'both') {
      // Trigger automatic search when location is selected
      setTimeout(searchSuppliers, 500)
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f9fafb',
      paddingTop: '64px',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Enhanced Header */}
      <section style={{ 
        backgroundColor: 'white', 
        borderBottom: '1px solid #e5e7eb', 
        padding: '40px 16px' 
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: '800',
              color: '#111827',
              marginBottom: '12px',
              margin: '0 0 12px 0'
            }}>
              Căutare Inteligentă cu Hartă
            </h1>
            <p style={{
              fontSize: '1.125rem',
              color: '#6b7280',
              margin: 0
            }}>
              Descoperă furnizori disponibili în locația ta și din apropierea acesteia
            </p>
          </div>

          {/* Search Mode Tabs */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '32px'
          }}>
            <div style={{
              display: 'inline-flex',
              backgroundColor: '#f3f4f6',
              borderRadius: '12px',
              padding: '4px',
              gap: '4px'
            }}>
              <button
                onClick={() => setSearchMode('date')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  backgroundColor: searchMode === 'date' ? '#2563eb' : 'transparent',
                  color: searchMode === 'date' ? 'white' : '#6b7280'
                }}
              >
                📅 Căutare după dată
              </button>
              <button
                onClick={() => setSearchMode('location')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  backgroundColor: searchMode === 'location' ? '#2563eb' : 'transparent',
                  color: searchMode === 'location' ? 'white' : '#6b7280'
                }}
              >
                🗺️ Căutare cu harta
              </button>
              <button
                onClick={() => setSearchMode('both')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  backgroundColor: searchMode === 'both' ? '#2563eb' : 'transparent',
                  color: searchMode === 'both' ? 'white' : '#6b7280'
                }}
              >
                🎯 Căutare completă
              </button>
            </div>
          </div>

          {/* Search Forms */}
          <div style={{
            backgroundColor: 'white',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            borderRadius: '16px',
            padding: '32px',
            border: '1px solid #e5e7eb',
            maxWidth: '900px',
            margin: '0 auto'
          }}>
            
            {(searchMode === 'date' || searchMode === 'both') && (
              <div style={{
                marginBottom: searchMode === 'both' ? '24px' : '0'
              }}>
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: '700',
                  color: '#111827',
                  marginBottom: '16px',
                  margin: '0 0 16px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  📅 Selectează data evenimentului
                </h3>
                
                <div style={{
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
                      Data evenimentului *
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
                        outline: 'none',
                        boxSizing: 'border-box'
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
                        outline: 'none',
                        boxSizing: 'border-box'
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
                </div>
              </div>
            )}

            {(searchMode === 'location' || searchMode === 'both') && (
              <div style={{
                marginBottom: searchMode === 'both' ? '24px' : '0'
              }}>
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: '700',
                  color: '#111827',
                  marginBottom: '16px',
                  margin: '0 0 16px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  🗺️ Selectează locația pe hartă
                </h3>
                
                <div style={{
                  padding: '16px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  marginBottom: '16px'
                }}>
                  <p style={{
                    fontSize: '14px',
                    color: '#64748b',
                    margin: '0 0 8px 0'
                  }}>
                    💡 <strong>Cum funcționează:</strong>
                  </p>
                  <ul style={{
                    fontSize: '14px',
                    color: '#64748b',
                    paddingLeft: '16px',
                    margin: 0,
                    lineHeight: '1.6'
                  }}>
                    <li>Caută orașul sau click pe hartă pentru a selecta locația</li>
                    <li>Vezi furnizorii <strong>locali</strong> din orașul selectat</li>
                    <li>Descoperă <strong>recomandări mobile</strong> din zona apropiată (50km)</li>
                  </ul>
                </div>

                <AdvancedSearchMap
                  selectedDate={selectedDate}
                  onLocationSelect={handleLocationSelect}
                  searchRadius={50}
                />
              </div>
            )}

            {/* Search Button - only for date and both modes */}
            {searchMode !== 'location' && (
              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={searchSuppliers}
                  disabled={loading || (!selectedDate && !selectedLocation)}
                  style={{
                    backgroundColor: loading || (!selectedDate && !selectedLocation) ? '#9ca3af' : '#2563eb',
                    color: 'white',
                    padding: '16px 32px',
                    borderRadius: '12px',
                    fontWeight: '600',
                    border: 'none',
                    cursor: loading || (!selectedDate && !selectedLocation) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    fontSize: '16px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseOver={(e) => {
                    if (!loading && (selectedDate || selectedLocation)) {
                      e.target.style.backgroundColor = '#1d4ed8'
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!loading && (selectedDate || selectedLocation)) {
                      e.target.style.backgroundColor = '#2563eb'
                    }
                  }}
                >
                  {loading ? (
                    <>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        border: '2px solid #ffffff',
                        borderTop: '2px solid transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                      Se caută...
                    </>
                  ) : (
                    <>
                      🔍 Caută furnizori
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section style={{ padding: '40px 16px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* Search Summary */}
          {hasSearched && !loading && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '32px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px'
              }}>
                <div>
                  <h2 style={{
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    color: '#111827',
                    margin: '0 0 8px 0'
                  }}>
                    {availableSuppliers.length > 0 ? (
                      `🎉 ${availableSuppliers.length} furnizori disponibili`
                    ) : (
                      '😔 Nu am găsit furnizori'
                    )}
                  </h2>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '14px', color: '#6b7280' }}>
                    {selectedDate && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        backgroundColor: '#eff6ff',
                        color: '#1d4ed8',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontWeight: '500'
                      }}>
                        📅 {new Date(selectedDate).toLocaleDateString('ro-RO', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    )}
                    {selectedLocation && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        backgroundColor: '#f0fdf4',
                        color: '#15803d',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontWeight: '500'
                      }}>
                        📍 {selectedLocation.city || selectedLocation.name?.split(',')[0]}
                      </span>
                    )}
                    {selectedCategory && categories.find(c => c.id == selectedCategory) && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        backgroundColor: '#fef3c7',
                        color: '#92400e',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontWeight: '500'
                      }}>
                        🏷️ {categories.find(c => c.id == selectedCategory).name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      setSelectedDate('')
                      setSelectedLocation(null)
                      setSelectedCategory('')
                      setAvailableSuppliers([])
                      setHasSearched(false)
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#f3f4f6',
                      color: '#374151',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                  >
                    🔄 Căutare nouă
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Results Grid */}
          {hasSearched && !loading && (
            <>
              {availableSuppliers.length > 0 ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                  gap: '24px'
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
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  backgroundColor: 'white',
                  borderRadius: '16px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🔍</div>
                  <h3 style={{
                    fontSize: '1.5rem',
                    fontWeight: '700',
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
                    margin: '0 0 24px 0',
                    maxWidth: '500px',
                    marginLeft: 'auto',
                    marginRight: 'auto',
                    lineHeight: '1.6'
                  }}>
                    {selectedDate && selectedLocation 
                      ? `Nu există furnizori disponibili pentru ${new Date(selectedDate).toLocaleDateString('ro-RO')} în ${selectedLocation.city || 'zona selectată'}.`
                      : selectedDate 
                        ? `Nu există furnizori disponibili pentru ${new Date(selectedDate).toLocaleDateString('ro-RO')}.`
                        : selectedLocation
                          ? `Nu există furnizori disponibili în ${selectedLocation.city || 'zona selectată'}.`
                          : 'Încearcă să modifici criteriile de căutare.'
                    }
                  </p>
                  
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'center',
                    flexWrap: 'wrap'
                  }}>
                    {selectedDate && (
                      <button
                        onClick={() => {
                          setSelectedDate('')
                          if (selectedLocation) {
                            setTimeout(searchSuppliers, 100)
                          }
                        }}
                        style={{
                          backgroundColor: '#2563eb',
                          color: 'white',
                          padding: '12px 24px',
                          borderRadius: '8px',
                          fontWeight: '600',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '14px',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
                      >
                        📅 Caută fără dată specifică
                      </button>
                    )}
                    
                    {selectedCategory && (
                      <button
                        onClick={() => {
                          setSelectedCategory('')
                          if (selectedDate || selectedLocation) {
                            setTimeout(searchSuppliers, 100)
                          }
                        }}
                        style={{
                          backgroundColor: '#16a34a',
                          color: 'white',
                          padding: '12px 24px',
                          borderRadius: '8px',
                          fontWeight: '600',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '14px',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#15803d'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#16a34a'}
                      >
                        🏷️ Toate categoriile
                      </button>
                    )}

                    <button
                      onClick={() => setSearchMode('location')}
                      style={{
                        backgroundColor: '#f59e0b',
                        color: 'white',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        fontWeight: '600',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '14px',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseOver={(e) => e.target.style.backgroundColor = '#d97706'}
                      onMouseOut={(e) => e.target.style.backgroundColor = '#f59e0b'}
                    >
                      🗺️ Încearcă cu harta
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Loading State */}
          {loading && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '60px 0',
              backgroundColor: 'white',
              borderRadius: '16px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  border: '3px solid #e5e7eb',
                  borderTop: '3px solid #2563eb',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                <div>
                  <h3 style={{
                    fontSize: '1.125rem',
                    fontWeight: '700',
                    color: '#111827',
                    margin: '0 0 4px 0'
                  }}>
                    Se caută furnizorii...
                  </h3>
                  <p style={{
                    fontSize: '14px',
                    color: '#6b7280',
                    margin: 0
                  }}>
                    Analizăm disponibilitatea și locația furnizorilor
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Welcome State */}
          {!hasSearched && !loading && (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              backgroundColor: 'white',
              borderRadius: '16px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🎯</div>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#111827',
                marginBottom: '12px',
                margin: '0 0 12px 0'
              }}>
                Începe căutarea perfectă
              </h3>
              <p style={{
                fontSize: '1rem',
                color: '#6b7280',
                margin: 0,
                maxWidth: '500px',
                marginLeft: 'auto',
                marginRight: 'auto',
                lineHeight: '1.6'
              }}>
                Selectează modul de căutare de mai sus și descoperă furnizorii ideali pentru evenimentul tău.
              </p>
            </div>
          )}
        </div>
      </section>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
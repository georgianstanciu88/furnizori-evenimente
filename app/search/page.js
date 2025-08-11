'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import SupplierCard from '@/components/SupplierCard'

export default function Search() {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState('')
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

    // Get all suppliers
    let query = supabase
      .from('suppliers')
      .select(`
        *,
        categories (name)
      `)

    if (selectedCategory) {
      query = query.eq('category_id', selectedCategory)
    }

    const { data: suppliers } = await query

    // Get unavailable dates for selected date
    const { data: unavailable } = await supabase
      .from('unavailable_dates')
      .select('supplier_id')
      .eq('date', selectedDate)

    const unavailableIds = unavailable ? unavailable.map(u => u.supplier_id) : []

    // Filter available suppliers
    const available = suppliers ? suppliers.filter(s => 
      !unavailableIds.includes(s.id)
    ) : []

    setAvailableSuppliers(available)
    setLoading(false)
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
                    Nu există furnizori liberi pentru această dată și categorie. 
                    Încearcă o altă dată sau categorie.
                  </p>
                  <button
                    onClick={() => {
                      setSelectedDate('')
                      setSelectedCategory('')
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
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
                  >
                    Caută din nou
                  </button>
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
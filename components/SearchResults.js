'use client'
import { useState } from 'react'
import SupplierCard from '@/components/SupplierCard'

export default function SearchResults({ 
  suppliers = [], 
  localSuppliers = [], 
  mobileSuppliers = [],
  loading = false,
  searchCriteria = {},
  user = null  // ✅ ADAUGĂ ACEST PARAMETRU
}) {
  const [sortBy, setSortBy] = useState('relevance') // relevance, price, rating, distance
  const [filterBy, setFilterBy] = useState('all') // all, local, mobile
  
  // Sortare furnizori
  const sortedSuppliers = [...suppliers].sort((a, b) => {
    switch (sortBy) {
      case 'price':
        const priceOrder = ['€ - Buget mic', '€€ - Buget mediu', '€€€ - Buget mare', '€€€€ - Premium']
        return priceOrder.indexOf(a.price_range || '') - priceOrder.indexOf(b.price_range || '')
      case 'rating':
        return (b.rating || 0) - (a.rating || 0)
      case 'distance':
        return (a.distance || 0) - (b.distance || 0)
      case 'relevance':
      default:
        // Prioritizează furnizorii locali
        const aIsLocal = localSuppliers.some(l => l.id === a.id)
        const bIsLocal = localSuppliers.some(l => l.id === b.id)
        if (aIsLocal && !bIsLocal) return -1
        if (!aIsLocal && bIsLocal) return 1
        return 0
    }
  })

  // Filtrare furnizori
  const filteredSuppliers = sortedSuppliers.filter(supplier => {
    if (filterBy === 'local') {
      return localSuppliers.some(l => l.id === supplier.id)
    } else if (filterBy === 'mobile') {
      return mobileSuppliers.some(m => m.id === supplier.id)
    }
    return true // 'all'
  })

  if (loading) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '48px 24px',
        textAlign: 'center',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #e5e7eb',
          borderTop: '4px solid #2563eb',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }} />
        <p style={{ color: '#6b7280', margin: 0 }}>
          Se caută furnizori...
        </p>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (suppliers.length === 0) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '48px 24px',
        textAlign: 'center',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{
          fontSize: '3rem',
          marginBottom: '16px',
          opacity: 0.5
        }}>
          😔
        </div>
        <h3 style={{
          fontSize: '1.25rem',
          fontWeight: '600',
          color: '#111827',
          marginBottom: '8px'
        }}>
          Nu am găsit furnizori
        </h3>
        <p style={{
          color: '#6b7280',
          marginBottom: '24px',
          maxWidth: '400px',
          margin: '0 auto 24px'
        }}>
          Încearcă să modifici criteriile de căutare sau să elimini unele filtre. 
          Poți extinde zona de căutare includând furnizori mobili.
        </p>
        
        {/* Sugestii pentru îmbunătățirea căutării */}
        <div style={{
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          padding: '16px',
          marginTop: '16px',
          textAlign: 'left'
        }}>
          <h4 style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '8px'
          }}>
            💡 Sugestii pentru o căutare mai bună:
          </h4>
          <ul style={{
            fontSize: '14px',
            color: '#6b7280',
            margin: 0,
            paddingLeft: '16px'
          }}>
            <li>Încearcă fără să selectezi o categorie specifică</li>
            <li>Verifică dacă data selectată nu este prea aproape</li>
            <li>Extinde căutarea la întreg județul</li>
            <li>Include furnizori care se deplasează</li>
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Statistici și filtre */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        border: '1px solid #e5e7eb'
      }}>
        {/* Header cu statistici */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: '#111827',
              marginBottom: '4px'
            }}>
              {filteredSuppliers.length} furnizori găsiți
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              margin: 0
            }}>
              {localSuppliers.length} locali • {mobileSuppliers.length} mobili
              {searchCriteria.date && ` • disponibili ${new Date(searchCriteria.date).toLocaleDateString('ro-RO')}`}
            </p>
          </div>

          {/* Controale sortare și filtrare */}
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            {/* Filter */}
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="all">Toți furnizorii</option>
              <option value="local">Doar locali ({localSuppliers.length})</option>
              <option value="mobile">Doar mobili ({mobileSuppliers.length})</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="relevance">Relevanță</option>
              <option value="price">Preț crescător</option>
              <option value="rating">Rating</option>
              {searchCriteria.location && <option value="distance">Distanță</option>}
            </select>
          </div>
        </div>

        {/* Statistici vizuale */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '12px'
        }}>
          <div style={{
            textAlign: 'center',
            padding: '12px',
            backgroundColor: '#f0f9ff',
            borderRadius: '8px'
          }}>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '800',
              color: '#0369a1',
              marginBottom: '2px'
            }}>
              {suppliers.length}
            </div>
            <div style={{
              fontSize: '12px',
              color: '#6b7280'
            }}>
              Total
            </div>
          </div>

          <div style={{
            textAlign: 'center',
            padding: '12px',
            backgroundColor: '#f0fdf4',
            borderRadius: '8px'
          }}>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '800',
              color: '#059669',
              marginBottom: '2px'
            }}>
              {localSuppliers.length}
            </div>
            <div style={{
              fontSize: '12px',
              color: '#6b7280'
            }}>
              Locali
            </div>
          </div>

          <div style={{
            textAlign: 'center',
            padding: '12px',
            backgroundColor: '#fffbeb',
            borderRadius: '8px'
          }}>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '800',
              color: '#d97706',
              marginBottom: '2px'
            }}>
              {mobileSuppliers.length}
            </div>
            <div style={{
              fontSize: '12px',
              color: '#6b7280'
            }}>
              Mobili
            </div>
          </div>
        </div>
      </div>

      {/* Lista furnizori */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '24px'
      }}>
        {filteredSuppliers.map((supplier, index) => {
          const isLocal = localSuppliers.some(l => l.id === supplier.id)
          const isMobile = mobileSuppliers.some(m => m.id === supplier.id)
          
          return (
            <div key={supplier.id} style={{ position: 'relative' }}>
              {/* Badge pentru tipul furnizorului */}
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                {isLocal && (
                  <div style={{
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '600',
                    backgroundColor: '#10b981',
                    color: 'white',
                    textAlign: 'center'
                  }}>
                    LOCAL
                  </div>
                )}
                {isMobile && (
                  <div style={{
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '600',
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    textAlign: 'center'
                  }}>
                    MOBIL
                  </div>
                )}
                
                {/* Badge pentru distanță dacă e disponibilă */}
                {supplier.distance && (
                  <div style={{
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '600',
                    backgroundColor: '#6b7280',
                    color: 'white',
                    textAlign: 'center'
                  }}>
                    {supplier.distance}km
                  </div>
                )}
              </div>
              
              <SupplierCard 
                ssupplier={supplier} 
  showCategories={true}
  priority={index < 4}
  showAvailability={!!user}
              />
            </div>
          )
        })}
      </div>

      {/* Mesaj dacă filtrele reduc rezultatele */}
      {filteredSuppliers.length < suppliers.length && (
        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '8px',
          padding: '16px',
          marginTop: '24px',
          textAlign: 'center'
        }}>
          <p style={{
            color: '#92400e',
            margin: 0,
            fontSize: '14px'
          }}>
            📊 Se afișează {filteredSuppliers.length} din {suppliers.length} furnizori găsiți. 
            <button
              onClick={() => {
                setFilterBy('all')
                setSortBy('relevance')
              }}
              style={{
                color: '#2563eb',
                textDecoration: 'underline',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                marginLeft: '4px'
              }}
            >
              Afișează toate rezultatele
            </button>
          </p>
        </div>
      )}
    </div>
  )
}
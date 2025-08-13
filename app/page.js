'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import SupplierCard from '@/components/SupplierCard'

export default function Home() {
  const [suppliers, setSuppliers] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [selectedCategory])

  async function fetchData() {
    setLoading(true)
    await Promise.all([
      fetchSuppliers(),
      fetchCategories(),
      checkUser()
    ])
    setLoading(false)
  }

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  async function fetchCategories() {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('name')
    setCategories(data || [])
  }

  async function fetchSuppliers() {
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
    .order('created_at', { ascending: false })
  
  if (selectedCategory) {
    // Filtrează după categoria selectată
    const { data: supplierIds } = await supabase
      .from('supplier_categories')
      .select('supplier_id')
      .eq('category_id', selectedCategory)
    
    if (supplierIds && supplierIds.length > 0) {
      const ids = supplierIds.map(item => item.supplier_id)
      query = query.in('id', ids)
    } else {
      // Nu există furnizori pentru această categorie
      setSuppliers([])
      return
    }
  }

  const { data } = await query
  
  // Procesează datele pentru a grupa categoriile
  const processedSuppliers = data?.map(supplier => ({
    ...supplier,
    categories: supplier.supplier_categories?.map(sc => sc.categories) || []
  })) || []

  setSuppliers(processedSuppliers)
}

  const categoryIcons = {
  'Locații': (
    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  ),
  'Muzică': (
    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
    </svg>
  ),
  'Fotografie': (
    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
      <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
    </svg>
  ),
  'Videografie': (
    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
    </svg>
  ),
  'Flori': (
    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8.66 13.07c.15 0 .29-.01.29-.16 0-.06-.04-.11-.09-.15-.97-.87-1.58-2.14-1.58-3.54 0-2.63 2.13-4.76 4.76-4.76s4.76 2.13 4.76 4.76c0 1.4-.61 2.67-1.58 3.54-.05.04-.09.09-.09.15 0 .15.14.16.29.16.22 0 .42-.06.61-.16 1.23-.69 2.07-1.99 2.07-3.53 0-2.21-1.79-4-4-4s-4 1.79-4 4c0 1.54.84 2.84 2.07 3.53.19.1.39.16.61.16z"/>
    </svg>
  ),
  'Decorațiuni': (
    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  ),
  'Torturi și prăjituri': (
    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 6c1.11 0 2-.9 2-2 0-.38-.1-.73-.29-1.03L12 0l-1.71 2.97c-.19.3-.29.65-.29 1.03 0 1.1.9 2 2 2zm4.6 9.99l-1.07-1.07-1.08 1.07c-1.3 1.3-3.58 1.31-4.89 0l-1.07-1.07-1.09 1.07C6.75 16.64 5.88 17 4.96 17c-.73 0-1.4-.23-1.96-.61V21c0 .55.45 1 1 1h16c.55 0 1-.45 1-1v-4.61c-.56.38-1.23.61-1.96.61-.92 0-1.79-.36-2.44-1.01zM18 9H6l-1.5 6h15L18 9z"/>
    </svg>
  ),
  'Catering și băuturi': (
    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8.1 13.34l2.83-2.83L3.91 3.5c-.78-.78-.78-2.05 0-2.83.78-.78 2.05-.78 2.83 0l7.01 7.01 2.83-2.83c.78-.78 2.05-.78 2.83 0 .78.78.78 2.05 0 2.83L16.17 11l5.75 5.75c.78.78.78 2.05 0 2.83-.78.78-2.05.78-2.83 0L16 16.49V21c0 .55-.45 1-1 1s-1-.45-1-1v-4.51L8.1 10.6c-.78-.78-.78-2.05 0-2.83.78-.78 2.05-.78 2.83 0z"/>
    </svg>
  ),
  'Alte servicii': (
    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  )
}

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'white', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Hero Section */}
      <section style={{
        background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
        padding: '80px 16px',
        textAlign: 'center'
      }}>
        <div className="hero-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 16px' }}>
          <h1 className="hero-title" style={{
            fontSize: '2.5rem',
            fontWeight: '800',
            color: '#111827',
            marginBottom: '24px',
            lineHeight: '1.1'
          }}>
            Găsește furnizorii perfecți pentru
            <span style={{ color: '#2563eb', display: 'block', marginTop: '12px' }}>
              evenimentul tău
            </span>
          </h1>
          
          <p className="hero-subtitle" style={{
            fontSize: '1rem',
            color: '#6b7280',
            marginBottom: '40px',
            maxWidth: '800px',
            margin: '0 auto 40px',
            lineHeight: '1.6'
          }}>
            Descoperă și contactează cei mai buni furnizori de servicii pentru evenimente din România.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '60px' }}>
            {user ? (
              <Link 
                href="/search" 
                style={{
                  backgroundColor: '#2563eb',
                  color: 'white',
                  padding: '16px 32px',
                  borderRadius: '12px',
                  fontWeight: '600',
                  textDecoration: 'none',
                  fontSize: '1.125rem',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'inline-block',
                  textAlign: 'center'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
              >
                Caută furnizori disponibili
              </Link>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                <Link 
                  href="/register" 
                  style={{
                    backgroundColor: '#2563eb',
                    color: 'white',
                    padding: '16px 32px',
                    borderRadius: '12px',
                    fontWeight: '600',
                    textDecoration: 'none',
                    fontSize: '1.125rem',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'inline-block',
                    textAlign: 'center',
                    minWidth: '200px'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
                >
                  Începe gratuit
                </Link>
                <Link 
                  href="/login" 
                  style={{
                    backgroundColor: 'white',
                    color: '#2563eb',
                    padding: '16px 32px',
                    borderRadius: '12px',
                    fontWeight: '600',
                    textDecoration: 'none',
                    fontSize: '1.125rem',
                    border: '2px solid #2563eb',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'inline-block',
                    textAlign: 'center',
                    minWidth: '200px'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#eff6ff'}
                  onMouseOut={(e) => e.target.style.backgroundColor = 'white'}
                >
                  Am deja cont
                </Link>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="stats-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            maxWidth: '300px',
            margin: '0 auto'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#111827' }}>{suppliers.length}+</div>
              <div style={{ color: '#6b7280', fontSize: '14px' }}>Furnizori</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#111827' }}>{categories.length}</div>
              <div style={{ color: '#6b7280', fontSize: '14px' }}>Categorii</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#111827' }}>24/7</div>
              <div style={{ color: '#6b7280', fontSize: '14px' }}>Suport</div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section style={{ padding: '60px 16px', backgroundColor: 'white' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: '800', color: '#111827', marginBottom: '16px' }}>
              Caută după categorie
            </h2>
            <p style={{ fontSize: '1.125rem', color: '#6b7280' }}>
              Alege tipul de serviciu perfect pentru evenimentul tău
            </p>
          </div>
          
          <div className="categories-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px'
          }}>
            <button
              onClick={() => setSelectedCategory('')}
              style={{
                padding: '16px',
                borderRadius: '16px',
                border: selectedCategory === '' ? '2px solid #2563eb' : '2px solid #e5e7eb',
                backgroundColor: selectedCategory === '' ? '#eff6ff' : 'white',
                color: selectedCategory === '' ? '#1d4ed8' : '#374151',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: '14px',
                fontWeight: '600'
              }}
              onMouseOver={(e) => {
                if (selectedCategory !== '') {
                  e.target.style.borderColor = '#9ca3af'
                  e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }
              }}
              onMouseOut={(e) => {
                if (selectedCategory !== '') {
                  e.target.style.borderColor = '#e5e7eb'
                  e.target.style.boxShadow = 'none'
                }
              }}
            >
              <div style={{ marginBottom: '8px', color: '#2563eb' }}>✨</div>
              <div style={{ fontSize: '12px', fontWeight: '600' }}>Toate</div>
              <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px' }}>{suppliers.length}</div>
            </button>

            {categories.map(category => {
              const count = suppliers.filter(s => 
  s.categories && s.categories.some(cat => cat.id === category.id)
).length
              const isSelected = selectedCategory === category.id
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  style={{
                    padding: '16px',
                    borderRadius: '16px',
                    border: isSelected ? '2px solid #2563eb' : '2px solid #e5e7eb',
                    backgroundColor: isSelected ? '#eff6ff' : 'white',
                    color: isSelected ? '#1d4ed8' : '#374151',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                  onMouseOver={(e) => {
                    if (!isSelected) {
                      e.target.style.borderColor = '#9ca3af'
                      e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isSelected) {
                      e.target.style.borderColor = '#e5e7eb'
                      e.target.style.boxShadow = 'none'
                    }
                  }}
                >
                  <div style={{ marginBottom: '8px', color: isSelected ? '#1d4ed8' : '#6b7280' }}>
  {categoryIcons[category.name] || (
    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  )}
</div>
                  <div style={{ fontSize: '12px', fontWeight: '600' }}>{category.name}</div>
                  <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px' }}>{count}</div>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* Suppliers Grid */}
      <section style={{ padding: '60px 16px', backgroundColor: '#f9fafb' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {!user && suppliers.length > 0 && (
            <div style={{
              marginBottom: '40px',
              padding: '20px',
              backgroundColor: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '16px'
            }}>
              <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>💡</div>
              <div>
                <p style={{ fontWeight: '600', color: '#92400e', marginBottom: '4px', margin: '0 0 4px 0' }}>
                  Vrei să vezi toate detaliile?
                </p>
                <p style={{ color: '#92400e', margin: 0, fontSize: '14px', lineHeight: '1.4' }}>
                  Creează un cont gratuit pentru a contacta furnizorii direct.
                  <Link href="/register" style={{ marginLeft: '8px', textDecoration: 'underline', fontWeight: '600' }}>
                    Înregistrează-te aici →
                  </Link>
                </p>
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  border: '3px solid #e5e7eb',
                  borderTop: '3px solid #2563eb',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                <span style={{ fontSize: '1.125rem', color: '#6b7280' }}>Se încarcă furnizorii...</span>
              </div>
            </div>
          ) : suppliers.length > 0 ? (
            <>
              <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: '800', color: '#111827', marginBottom: '8px', margin: '0 0 8px 0' }}>
                  {selectedCategory ? 'Furnizori selectați' : 'Toți furnizorii'}
                </h2>
                <p style={{ fontSize: '1.125rem', color: '#6b7280', margin: 0 }}>
                  {suppliers.length} furnizori găsiți
                </p>
              </div>
              
              <div className="suppliers-grid" style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: '20px'
              }}>
                {suppliers.map((supplier, index) => (
                  <div 
                    key={supplier.id}
                    className="supplier-card"
                    style={{ 
                      opacity: 0,
                      animation: `fadeIn 0.6s ease-out ${index * 0.1}s forwards`
                    }}
                  >
                    <SupplierCard 
                      supplier={supplier} 
                      showAvailability={!!user}
                    />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <div style={{ fontSize: '4rem', marginBottom: '24px' }}>🔍</div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#111827', marginBottom: '16px', margin: '0 0 16px 0' }}>
                Nu am găsit furnizori
              </h3>
              <p style={{ fontSize: '1.125rem', color: '#6b7280', marginBottom: '32px', margin: '0 0 32px 0' }}>
                Încearcă să selectezi altă categorie sau verifică din nou mai târziu
              </p>
              <button
                onClick={() => setSelectedCategory('')}
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
                Vezi toți furnizorii
              </button>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section style={{ padding: '80px 16px', backgroundColor: '#111827', color: 'white' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '24px', margin: '0 0 24px 0' }}>
              Ești furnizor de servicii?
            </h2>
            <p style={{ fontSize: '1.125rem', color: '#d1d5db', marginBottom: '40px', margin: '0 0 40px 0' }}>
              Alătură-te platformei EventPro și conectează-te cu mii de clienți care caută exact serviciile tale.
            </p>
            <Link 
              href="/register" 
              style={{
                backgroundColor: 'white',
                color: '#111827',
                padding: '16px 32px',
                borderRadius: '12px',
                fontWeight: '600',
                textDecoration: 'none',
                fontSize: '1.125rem',
                display: 'inline-block',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
              onMouseOut={(e) => e.target.style.backgroundColor = 'white'}
            >
              Înregistrează-te ca furnizor
            </Link>
          </div>
        </section>
      )}

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        /* Mobile-first responsive design */
        .hero-container {
          padding: 0 16px !important;
        }
        
        .hero-title {
          font-size: 2.5rem !important;
          line-height: 1.1 !important;
        }
        
        .hero-subtitle {
          font-size: 1rem !important;
          line-height: 1.5 !important;
        }
        
        .categories-grid {
          grid-template-columns: repeat(2, 1fr) !important;
          gap: 12px !important;
        }
        
        .suppliers-grid {
          grid-template-columns: 1fr !important;
          gap: 20px !important;
        }
        
        .stats-grid {
          gap: 12px !important;
          max-width: 300px !important;
        }
        
        /* Tablet breakpoint */
        @media (min-width: 640px) {
          .hero-container {
            padding: 0 24px !important;
          }
          
          .hero-title {
            font-size: 3rem !important;
          }
          
          .hero-subtitle {
            font-size: 1.125rem !important;
          }
          
          .categories-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 16px !important;
          }
          
          .suppliers-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 24px !important;
          }
          
          .stats-grid {
            gap: 20px !important;
            max-width: 400px !important;
          }
        }
        
        /* Desktop breakpoint */
        @media (min-width: 1024px) {
          .hero-container {
            padding: 0 32px !important;
          }
          
          .hero-title {
            font-size: 3.5rem !important;
          }
          
          .hero-subtitle {
            font-size: 1.25rem !important;
          }
          
          .categories-grid {
            grid-template-columns: repeat(6, 1fr) !important;
            gap: 20px !important;
          }
          
          .suppliers-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 32px !important;
          }
          
          .stats-grid {
            gap: 32px !important;
            max-width: 600px !important;
          }
        }
        
        /* Large desktop */
        @media (min-width: 1280px) {
          .hero-title {
            font-size: 4rem !important;
          }
          
          .suppliers-grid {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
      `}</style>
    </div>
  )
}
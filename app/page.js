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
  const [showCategoryView, setShowCategoryView] = useState(false)

  useEffect(() => {
    fetchData()
  }, [selectedCategory])

  useEffect(() => {
    // Check URL params on page load
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const categoryParam = urlParams.get('categoria')
      if (categoryParam && categories.length > 0) {
        const category = categories.find(c => c.slug === categoryParam || c.id.toString() === categoryParam)
        if (category) {
          setSelectedCategory(category.id)
          setShowCategoryView(true)
        }
      }
    }
  }, [categories])

  useEffect(() => {
    // Update URL when category changes
    if (typeof window !== 'undefined') {
      if (selectedCategory && showCategoryView) {
        const category = categories.find(c => c.id === selectedCategory)
        if (category) {
          const newUrl = `/?categoria=${category.slug || category.id}`
          window.history.pushState({}, '', newUrl)
        }
      } else if (!selectedCategory) {
        window.history.pushState({}, '', '/')
      }
    }
  }, [selectedCategory, showCategoryView, categories])

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
      const { data: supplierIds } = await supabase
        .from('supplier_categories')
        .select('supplier_id')
        .eq('category_id', selectedCategory)
      
      if (supplierIds && supplierIds.length > 0) {
        const ids = supplierIds.map(item => item.supplier_id)
        query = query.in('id', ids)
      } else {
        setSuppliers([])
        return
      }
    }

    const { data } = await query
    
    const processedSuppliers = data?.map(supplier => ({
      ...supplier,
      categories: supplier.supplier_categories?.map(sc => sc.categories) || []
    })) || []

    setSuppliers(processedSuppliers)
  }

  // Helper function pentru emoji-uri categorii
  const getCategoryEmoji = (categoryName) => {
    const emojiMap = {
      'Locații': '🏛️',
      'Muzică': '🎵', 
      'Fotografie': '📸',
      'Videografie': '🎬',
      'Flori': '🌸',
      'Decorațiuni': '🎨',
      'Torturi și prăjituri': '🎂',
      'Catering și băuturi': '🍽️',
      'Alte servicii': '⭐'
    }
    return emojiMap[categoryName] || '🎉'
  }

  // Funcție pentru a selecta o categorie și a afișa view-ul dedicat
  const selectCategory = (categoryId) => {
    setSelectedCategory(categoryId)
    setShowCategoryView(true)
    setTimeout(() => {
      const element = document.querySelector('#category-view-section')
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }, 100)
  }

  // Funcție pentru a reseta la view-ul principal
  const resetToMainView = () => {
    setSelectedCategory('')
    setShowCategoryView(false)
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', fontFamily: 'Inter, system-ui, sans-serif' }}>
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

      {/* Featured Suppliers by Categories - Ascuns când e selectată o categorie */}
      {!showCategoryView && (
        <section style={{ padding: '60px 16px', backgroundColor: '#f9fafb' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '50px' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: '800', color: '#111827', marginBottom: '16px' }}>
                Furnizori Recomandați
              </h2>
              <p style={{ fontSize: '1.125rem', color: '#6b7280' }}>
                Descoperiți cei mai apreciați furnizori din fiecare categorie
              </p>
            </div>

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
            ) : (
              <>
                {categories.map(category => {
                  const categorySuppliers = suppliers.filter(s => 
                    s.categories && s.categories.some(cat => cat.id === category.id)
                  ).slice(0, 4)

                  if (categorySuppliers.length === 0) return null

                  return (
                    <div key={category.id} style={{ marginBottom: '60px' }}>
                      {/* Category Header */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '30px',
                        flexWrap: 'wrap',
                        gap: '16px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ fontSize: '2rem', lineHeight: '1' }}>
                            {getCategoryEmoji(category.name)}
                          </div>
                          <h3 style={{
                            fontSize: '1.5rem',
                            fontWeight: '700',
                            color: '#111827',
                            margin: 0
                          }}>
                            {category.name}
                          </h3>
                        </div>
                        
                        <button
                          onClick={() => selectCategory(category.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 20px',
                            backgroundColor: 'white',
                            color: '#2563eb',
                            border: '1px solid #2563eb',
                            borderRadius: '12px',
                            fontWeight: '600',
                            fontSize: '14px',
                            transition: 'all 0.2s',
                            whiteSpace: 'nowrap',
                            cursor: 'pointer'
                          }}
                          onMouseOver={(e) => {
                            e.target.style.backgroundColor = '#2563eb'
                            e.target.style.color = 'white'
                          }}
                          onMouseOut={(e) => {
                            e.target.style.backgroundColor = 'white'
                            e.target.style.color = '#2563eb'
                          }}
                        >
                          Vezi toată categoria
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" 
                          style={{
      pointerEvents: 'none', // ✅ ACEASTĂ LINIE ELIMINĂ INTERACȚIUNEA CU SĂGEATA
      transition: 'inherit'   // ✅ MOȘTENEȘTE TRANZIȚIA DE LA BUTON
    }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>

                      {/* Category Suppliers Grid */}
                      <div className="category-suppliers-grid" style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr',
                        gap: '20px'
                      }}>
                        {categorySuppliers.map((supplier, index) => (
                          <div 
                            key={supplier.id}
                            style={{ 
                              opacity: 0,
                              animation: `fadeIn 0.6s ease-out ${index * 0.1}s forwards`
                            }}
                          >
                            <SupplierCard 
                              supplier={supplier} 
                              showAvailability={!!user}
                              user={user}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}

                {/* Call to Action pentru toate categoriile */}
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  backgroundColor: 'white',
                  borderRadius: '16px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                }}>
                  <h3 style={{
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    color: '#111827',
                    marginBottom: '12px',
                    margin: '0 0 12px 0'
                  }}>
                    Caută furnizori specifici
                  </h3>
                  <p style={{
                    color: '#6b7280',
                    marginBottom: '24px',
                    margin: '0 0 24px 0'
                  }}>
                    Folosește căutarea avansată pentru a găsi exact ce ai nevoie
                  </p>
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'center',
                    flexWrap: 'wrap'
                  }}>
                    {user ? (
                      <Link 
                        href="/search"
                        style={{
                          backgroundColor: '#2563eb',
                          color: 'white',
                          padding: '12px 24px',
                          borderRadius: '12px',
                          fontWeight: '600',
                          textDecoration: 'none',
                          fontSize: '14px',
                          transition: 'background-color 0.2s',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
                      >
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Caută după dată
                      </Link>
                    ) : (
                      <Link 
                        href="/register"
                        style={{
                          backgroundColor: '#2563eb',
                          color: 'white',
                          padding: '12px 24px',
                          borderRadius: '12px',
                          fontWeight: '600',
                          textDecoration: 'none',
                          fontSize: '14px',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
                      >
                        Înregistrează-te pentru căutare avansată
                      </Link>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* Category View Section - Afișat când e selectată o categorie */}
      {showCategoryView && selectedCategory && (
        <section id="category-view-section" style={{ padding: '60px 16px', backgroundColor: 'white' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            
            {/* Breadcrumb și Status Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '40px',
              padding: '20px',
              backgroundColor: '#f9fafb',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                {/* Breadcrumb */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', fontSize: '14px' }}>
                  <button
                    onClick={resetToMainView}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    Acasă
                  </button>
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span style={{ fontWeight: '600', color: '#111827' }}>
                    {categories.find(c => c.id === selectedCategory)?.name}
                  </span>
                </div>

                {/* Category info */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginLeft: 'auto'
                }}>
                  <div style={{ fontSize: '1.5rem' }}>
                    {getCategoryEmoji(categories.find(c => c.id === selectedCategory)?.name)}
                  </div>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#111827' }}>
                      {categories.find(c => c.id === selectedCategory)?.name}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>
                      {suppliers.length} furnizori găsiți
                    </div>
                  </div>
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={resetToMainView}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#b91c1c'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#dc2626'}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Închide
              </button>
            </div>

            {/* Warning pentru utilizatori neautentificați */}
            {!user && (
              <div style={{
                marginBottom: '30px',
                padding: '16px 20px',
                backgroundColor: '#fef3c7',
                border: '1px solid #f59e0b',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                <div style={{ fontSize: '1.25rem', flexShrink: 0 }}>💡</div>
                <div>
                  <p style={{ fontWeight: '600', color: '#92400e', marginBottom: '4px', margin: '0 0 4px 0' }}>
                    Vrei să vezi toate detaliile și să contactezi furnizorii?
                  </p>
                  <p style={{ color: '#92400e', margin: 0, fontSize: '14px', lineHeight: '1.4' }}>
                    <Link href="/register" style={{ textDecoration: 'underline', fontWeight: '600', color: '#92400e' }}>
                      Înregistrează-te gratuit aici →
                    </Link>
                  </p>
                </div>
              </div>
            )}
            
            {/* Suppliers Grid */}
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
              <div className="suppliers-grid" style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: '20px'
              }}>
                {suppliers.map((supplier, index) => (
                  <div 
                    key={supplier.id}
                    style={{ 
                      opacity: 0,
                      animation: `fadeIn 0.6s ease-out ${index * 0.1}s forwards`
                    }}
                  >
                    <SupplierCard 
                      supplier={supplier} 
                      showAvailability={!!user}
                      user={user}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: '20px' }}>😔</div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', marginBottom: '12px', margin: '0 0 12px 0' }}>
                  Nu am găsit furnizori în această categorie
                </h3>
                <p style={{ color: '#6b7280', marginBottom: '24px', margin: '0 0 24px 0' }}>
                  Încearcă să revii mai târziu sau explorează alte categorii
                </p>
                <button
                  onClick={resetToMainView}
                  style={{
                    backgroundColor: '#2563eb',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '12px',
                    fontWeight: '600',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Înapoi la toate categoriile
                </button>
              </div>
            )}

            {/* Call to Action la sfârșitul listei */}
            {suppliers.length > 0 && (
              <div style={{
                textAlign: 'center',
                marginTop: '50px',
                padding: '30px',
                backgroundColor: '#f9fafb',
                borderRadius: '12px',
                border: '1px solid #e5e7eb'
              }}>
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: '#111827',
                  marginBottom: '12px',
                  margin: '0 0 12px 0'
                }}>
                  Nu ai găsit ce căutai?
                </h3>
                <p style={{
                  color: '#6b7280',
                  marginBottom: '20px',
                  margin: '0 0 20px 0'
                }}>
                  Explorează alte categorii sau folosește căutarea avansată
                </p>
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'center',
                  flexWrap: 'wrap'
                }}>
                  <button
                    onClick={resetToMainView}
                    style={{
                      backgroundColor: '#2563eb',
                      color: 'white',
                      padding: '12px 24px',
                      borderRadius: '12px',
                      fontWeight: '600',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
                  >
                    Vezi toate categoriile
                  </button>
                  
                  {user && (
                    <Link 
                      href="/search"
                      style={{
                        backgroundColor: 'white',
                        color: '#374151',
                        padding: '12px 24px',
                        borderRadius: '12px',
                        fontWeight: '600',
                        border: '1px solid #d1d5db',
                        cursor: 'pointer',
                        fontSize: '14px',
                        transition: 'all 0.2s',
                        textDecoration: 'none',
                        display: 'inline-block'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.backgroundColor = '#f9fafb'
                        e.target.style.borderColor = '#9ca3af'
                      }}
                      onMouseOut={(e) => {
                        e.target.style.backgroundColor = 'white'
                        e.target.style.borderColor = '#d1d5db'
                      }}
                    >
                      Caută după dată
                    </Link>
                  )}
                </div>
              </div>
            )}

          </div>
        </section>
      )}

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
        
        /* Category suppliers grid responsive */
        .category-suppliers-grid {
          grid-template-columns: 1fr !important;
          gap: 16px !important;
        }
        
        /* Mobile optimizations */
        @media (max-width: 640px) {
          .category-suppliers-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
        }
        
        /* Tablet and up */
        @media (min-width: 641px) {
          .category-suppliers-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 20px !important;
          }
        }
        
        /* Desktop optimizations */
        @media (min-width: 1024px) {
          .category-suppliers-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 24px !important;
          }
        }
        
        /* Focus styles for accessibility */
        button:focus {
          outline: 2px solid #2563eb;
          outline-offset: 2px;
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
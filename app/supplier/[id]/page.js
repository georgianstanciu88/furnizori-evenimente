'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import Link from 'next/link'

export default function SupplierProfile() {
  const router = useRouter()
  const params = useParams()
  const supplierId = params.id

  const [supplier, setSupplier] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [unavailableDates, setUnavailableDates] = useState([])
  const [showGallery, setShowGallery] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showContactForm, setShowContactForm] = useState(false)
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    event_date: '',
    message: ''
  })
  const [contactLoading, setContactLoading] = useState(false)
  const [contactMessage, setContactMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    if (supplierId) {
      fetchSupplier()
      checkUser()
    }
  }, [supplierId])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  async function fetchSupplier() {
    try {
      // Fetch supplier with categories through junction table
      const { data: supplierData, error: supplierError } = await supabase
        .from('suppliers')
        .select(`
          *,
          profiles (email),
          supplier_categories (
            categories (
              id,
              name
            )
          )
        `)
        .eq('id', supplierId)
        .single()

      if (supplierError) {
        console.error('Error fetching supplier:', supplierError)
        router.push('/404')
        return
      }

      // Process categories data
      const processedSupplier = {
        ...supplierData,
        categories: supplierData.supplier_categories?.map(sc => sc.categories) || []
      }

      setSupplier(processedSupplier)

      // Fetch unavailable dates
      const { data: unavailableData } = await supabase
        .from('unavailable_dates')
        .select('date')
        .eq('supplier_id', supplierId)

      setUnavailableDates(unavailableData || [])
    } catch (error) {
      console.error('Error in fetchSupplier:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const openGallery = (index = 0) => {
    setCurrentImageIndex(index)
    setShowGallery(true)
    document.body.style.overflow = 'hidden'
  }

  const closeGallery = () => {
    setShowGallery(false)
    document.body.style.overflow = 'unset'
  }

  const nextImage = () => {
    const images = getAllImages()
    setCurrentImageIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    const images = getAllImages()
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const getAllImages = () => {
    const images = []
    if (supplier?.image_url) images.push(supplier.image_url)
    if (supplier?.gallery_images) images.push(...supplier.gallery_images)
    return images
  }

  async function handleContactSubmit(e) {
    e.preventDefault()
    
    if (!user) {
      setContactMessage({ type: 'error', text: 'Trebuie să fii conectat pentru a trimite un mesaj' })
      return
    }

    setContactLoading(true)

    // În realitate, aici ai trimite email sau salva în baza de date
    // Pentru demo, simulez trimiterea
    setTimeout(() => {
      setContactMessage({ type: 'success', text: '✅ Mesajul a fost trimis cu succes! Furnizorul te va contacta în curând.' })
      setContactForm({ name: '', email: '', phone: '', event_date: '', message: '' })
      setContactLoading(false)
      setTimeout(() => {
        setShowContactForm(false)
        setContactMessage({ type: '', text: '' })
      }, 3000)
    }, 1500)
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        paddingTop: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '3px solid #e5e7eb',
            borderTop: '3px solid #2563eb',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <span style={{ fontSize: '16px', color: '#6b7280' }}>Se încarcă...</span>
        </div>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (!supplier) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        paddingTop: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginBottom: '16px' }}>
            Furnizor nu a fost găsit
          </h1>
          <Link href="/" style={{ color: '#2563eb', textDecoration: 'underline' }}>
            Înapoi la lista furnizorilor
          </Link>
        </div>
      </div>
    )
  }

  const allImages = getAllImages()

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      paddingTop: '64px',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Header with back button */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '20px 0'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <Link 
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#6b7280',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Înapoi la furnizori
          </Link>
          <span style={{ color: '#d1d5db' }}>•</span>
          <span style={{ color: '#374151', fontWeight: '600' }}>{supplier.business_name}</span>
        </div>
      </div>

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '40px 20px'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '32px'
        }}>
          {/* Main Content */}
          <div className="main-content-grid" style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '32px'
          }}>
            {/* Left Column - Images & Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {/* Main Image */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                overflow: 'hidden',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
              }}>
                {supplier.image_url ? (
                  <div style={{ position: 'relative' }}>
                    <img 
                      src={supplier.image_url}
                      alt={supplier.business_name}
                      style={{
                        width: '100%',
                        height: '400px',
                        objectFit: 'cover',
                        cursor: allImages.length > 0 ? 'pointer' : 'default'
                      }}
                      onClick={() => allImages.length > 0 && openGallery(0)}
                    />
                    {allImages.length > 1 && (
                      <div style={{
                        position: 'absolute',
                        bottom: '16px',
                        right: '16px',
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        color: 'white',
                        padding: '8px 12px',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                      onClick={() => openGallery(0)}>
                        Vezi toate ({allImages.length} imagini)
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{
                    height: '400px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f9fafb',
                    border: '2px dashed #d1d5db'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '4rem', opacity: 0.3, marginBottom: '16px' }}>📸</div>
                      <p style={{ color: '#9ca3af', fontSize: '16px', margin: 0 }}>
                        Furnizorul nu a încărcat imagini încă
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Gallery thumbnails */}
              {supplier.gallery_images && supplier.gallery_images.length > 0 && (
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                }}>
                  <h3 style={{
                    fontSize: '1.25rem',
                    fontWeight: '700',
                    color: '#111827',
                    marginBottom: '16px',
                    margin: '0 0 16px 0'
                  }}>
                    Galerie ({supplier.gallery_images.length})
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                    gap: '12px'
                  }}>
                    {supplier.gallery_images.map((imageUrl, index) => (
                      <div 
                        key={index}
                        style={{
                          position: 'relative',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          border: '2px solid transparent',
                          transition: 'all 0.2s'
                        }}
                        onClick={() => openGallery(supplier.image_url ? index + 1 : index)}
                        onMouseOver={(e) => e.target.closest('div').style.borderColor = '#2563eb'}
                        onMouseOut={(e) => e.target.closest('div').style.borderColor = 'transparent'}
                      >
                        <img 
                          src={imageUrl}
                          alt={`${supplier.business_name} - ${index + 1}`}
                          style={{
                            width: '100%',
                            height: '100px',
                            objectFit: 'cover'
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Business Info */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '32px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '24px'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: '#eff6ff',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg width="20" height="20" fill="none" stroke="#2563eb" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 style={{
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    color: '#111827',
                    margin: 0
                  }}>
                    Despre {supplier.business_name}
                  </h2>
                </div>

                {supplier.description ? (
                  <p style={{
                    color: '#374151',
                    fontSize: '16px',
                    lineHeight: '1.6',
                    margin: 0
                  }}>
                    {supplier.description}
                  </p>
                ) : (
                  <p style={{
                    color: '#9ca3af',
                    fontSize: '16px',
                    fontStyle: 'italic',
                    margin: 0
                  }}>
                    Furnizorul nu a adăugat încă o descriere.
                  </p>
                )}
              </div>
            </div>

            {/* Right Column - Contact & Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Business Header */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '32px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
              }}>
                <h1 style={{
                  fontSize: '2rem',
                  fontWeight: '800',
                  color: '#111827',
                  marginBottom: '8px',
                  margin: '0 0 8px 0'
                }}>
                  {supplier.business_name}
                </h1>
                
                {/* Categories */}
                {supplier.categories && supplier.categories.length > 0 && (
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    marginBottom: '16px'
                  }}>
                    {supplier.categories.map((category, index) => (
                      <div
                        key={category.id || index}
                        style={{
                          display: 'inline-block',
                          padding: '6px 12px',
                          backgroundColor: '#eff6ff',
                          color: '#1d4ed8',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600'
                        }}
                      >
                        {category.name}
                      </div>
                    ))}
                  </div>
                )}

                {supplier.price_range && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '16px'
                  }}>
                    <svg width="16" height="16" fill="none" stroke="#6b7280" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    <span style={{ color: '#374151', fontWeight: '500' }}>
                      Interval preț: {supplier.price_range}
                    </span>
                  </div>
                )}

                {/* Contact Button */}
                {user ? (
                  <button
                    onClick={() => setShowContactForm(true)}
                    style={{
                      width: '100%',
                      backgroundColor: '#2563eb',
                      color: 'white',
                      padding: '16px 24px',
                      borderRadius: '12px',
                      fontWeight: '600',
                      fontSize: '16px',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
                  >
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Contactează furnizorul
                  </button>
                ) : (
                  <Link
                    href="/login"
                    style={{
                      display: 'block',
                      width: '100%',
                      backgroundColor: '#f3f4f6',
                      color: '#374151',
                      padding: '16px 24px',
                      borderRadius: '12px',
                      fontWeight: '600',
                      fontSize: '16px',
                      textAlign: 'center',
                      textDecoration: 'none',
                      transition: 'all 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                  >
                    Conectează-te pentru contact
                  </Link>
                )}
              </div>

              {/* Contact Details */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
              }}>
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: '700',
                  color: '#111827',
                  marginBottom: '16px',
                  margin: '0 0 16px 0'
                }}>
                  Informații de contact
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {supplier.phone && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        backgroundColor: '#f0fdf4',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <svg width="16" height="16" fill="none" stroke="#16a34a" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', color: '#6b7280' }}>Telefon</div>
                        <div style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                          {supplier.phone}
                        </div>
                      </div>
                    </div>
                  )}

                  {supplier.address && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        backgroundColor: '#fef3c7',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <svg width="16" height="16" fill="none" stroke="#f59e0b" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', color: '#6b7280' }}>Locație</div>
                        <div style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                          {supplier.address}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Availability Calendar (simplified view) */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
              }}>
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: '700',
                  color: '#111827',
                  marginBottom: '16px',
                  margin: '0 0 16px 0'
                }}>
                  Disponibilitate
                </h3>

                {unavailableDates.length > 0 ? (
                  <div>
                    <p style={{
                      color: '#6b7280',
                      fontSize: '14px',
                      marginBottom: '12px',
                      margin: '0 0 12px 0'
                    }}>
                      Următoarele zile sunt ocupate:
                    </p>
                    <div style={{
                      maxHeight: '150px',
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}>
                      {unavailableDates
                        .sort((a, b) => new Date(a.date) - new Date(b.date))
                        .slice(0, 10)
                        .map((dateObj, index) => (
                        <div key={index} style={{
                          padding: '6px 12px',
                          backgroundColor: '#fef2f2',
                          color: '#991b1b',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '500'
                        }}>
                          {new Date(dateObj.date).toLocaleDateString('ro-RO', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                      ))}
                      {unavailableDates.length > 10 && (
                        <div style={{
                          padding: '6px 12px',
                          color: '#6b7280',
                          fontSize: '12px',
                          textAlign: 'center'
                        }}>
                          ... și încă {unavailableDates.length - 10} zile
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{
                    padding: '16px',
                    backgroundColor: '#f0fdf4',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🎉</div>
                    <p style={{
                      color: '#15803d',
                      fontSize: '14px',
                      fontWeight: '600',
                      margin: 0
                    }}>
                      Disponibil în toate zilele!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gallery Modal */}
      {showGallery && allImages.length > 0 && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
        onClick={closeGallery}>
          <div style={{
            position: 'relative',
            maxWidth: '90vw',
            maxHeight: '90vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={(e) => e.stopPropagation()}>
            
            {/* Close button */}
            <button
              onClick={closeGallery}
              style={{
                position: 'absolute',
                top: '-50px',
                right: '0',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                cursor: 'pointer',
                fontSize: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>

            {/* Previous button */}
            {allImages.length > 1 && (
              <button
                onClick={prevImage}
                style={{
                  position: 'absolute',
                  left: '-60px',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  cursor: 'pointer',
                  fontSize: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ‹
              </button>
            )}

            {/* Current image */}
            <img
              src={allImages[currentImageIndex]}
              alt={`${supplier.business_name} - Imagine ${currentImageIndex + 1}`}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                borderRadius: '8px'
              }}
            />

            {/* Next button */}
            {allImages.length > 1 && (
              <button
                onClick={nextImage}
                style={{
                  position: 'absolute',
                  right: '-60px',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  cursor: 'pointer',
                  fontSize: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ›
              </button>
            )}

            {/* Image counter */}
            {allImages.length > 1 && (
              <div style={{
                position: 'absolute',
                bottom: '-40px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                {currentImageIndex + 1} / {allImages.length}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contact Form Modal */}
      {showContactForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
        onClick={() => setShowContactForm(false)}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}>
            
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#111827',
                margin: 0
              }}>
                Contactează {supplier.business_name}
              </h3>
              <button
                onClick={() => setShowContactForm(false)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  color: '#6b7280',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ×
              </button>
            </div>

            {/* Message */}
            {contactMessage.text && (
              <div style={{
                marginBottom: '20px',
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: contactMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${contactMessage.type === 'success' ? '#16a34a' : '#dc2626'}`,
                color: contactMessage.type === 'success' ? '#15803d' : '#dc2626',
                fontSize: '14px'
              }}>
                {contactMessage.text}
              </div>
            )}

            {/* Contact Form */}
            <form onSubmit={handleContactSubmit}>
              <div style={{
                display: 'grid',
                gap: '16px'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Numele tău *
                  </label>
                  <input
                    type="text"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    value={contactForm.name}
                    onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
                    placeholder="Numele complet"
                  />
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px'
                }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '6px'
                    }}>
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                      value={contactForm.email}
                      onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                      placeholder="email@exemplu.com"
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '6px'
                    }}>
                      Telefon
                    </label>
                    <input
                      type="tel"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                      value={contactForm.phone}
                      onChange={(e) => setContactForm({...contactForm, phone: e.target.value})}
                      placeholder="07xx xxx xxx"
                    />
                  </div>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Data evenimentului
                  </label>
                  <input
                    type="date"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    value={contactForm.event_date}
                    onChange={(e) => setContactForm({...contactForm, event_date: e.target.value})}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Mesajul tău *
                  </label>
                  <textarea
                    required
                    rows="4"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      resize: 'vertical'
                    }}
                    value={contactForm.message}
                    onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                    placeholder="Descrie evenimentul tău și ce servicii ai nevoie..."
                  />
                </div>

                <div style={{
                  display: 'flex',
                  gap: '12px',
                  marginTop: '8px'
                }}>
                  <button
                    type="button"
                    onClick={() => setShowContactForm(false)}
                    style={{
                      flex: 1,
                      padding: '12px 24px',
                      backgroundColor: '#f3f4f6',
                      color: '#374151',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                  >
                    Anulează
                  </button>
                  <button
                    type="submit"
                    disabled={contactLoading}
                    style={{
                      flex: 2,
                      padding: '12px 24px',
                      backgroundColor: contactLoading ? '#9ca3af' : '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '600',
                      cursor: contactLoading ? 'not-allowed' : 'pointer',
                      transition: 'background-color 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                    onMouseOver={(e) => {
                      if (!contactLoading) {
                        e.target.style.backgroundColor = '#1d4ed8'
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!contactLoading) {
                        e.target.style.backgroundColor = '#2563eb'
                      }
                    }}
                  >
                    {contactLoading ? (
                      <>
                        <div style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid #ffffff',
                          borderTop: '2px solid transparent',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }}></div>
                        Se trimite...
                      </>
                    ) : (
                      'Trimite mesajul'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .main-content-grid {
          grid-template-columns: 1fr !important;
        }
        
        @media (min-width: 768px) {
          .main-content-grid {
            grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) !important;
          }
        }
      `}</style>
    </div>
  )
}
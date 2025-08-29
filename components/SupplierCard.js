// FOLOSEȘTE EXACT ACEEAȘI LOGICĂ CA PE PAGINA PRINCIPALĂ (NU parametrul user)

'use client'
import React, { useState } from 'react'
import Link from 'next/link'

export default function SupplierCard({ supplier, showAvailability, highlightAvailable }) {
  const [showGallery, setShowGallery] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  // ✅ VERIFICARE DE SIGURANȚĂ LA ÎNCEPUT:
  if (!supplier) {
    return (
      <div style={{
        backgroundColor: '#f3f4f6',
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        padding: '20px',
        textAlign: 'center',
        color: '#9ca3af',
        minHeight: '200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⏳</div>
          <p style={{ margin: 0 }}>Se încarcă furnizorul...</p>
        </div>
      </div>
    )
  }

  const getCategoryIcon = (categoryName) => {
    const icons = {
      'Localuri': '🏛️',
      'Fotografi': '📸',
      'Formații Muzicale': '🎵',
      'Decoratori': '🎨',
      'Catering': '🍽️'
    }
    return icons[categoryName] || '🎉'
  }

  const hasGallery = supplier?.gallery_images && Array.isArray(supplier.gallery_images) && supplier.gallery_images.length > 0
  const galleryImages = hasGallery ? supplier.gallery_images : []

  const openGallery = (index = 0) => {
    if (galleryImages.length === 0) return
    setCurrentImageIndex(index)
    setShowGallery(true)
    document.body.style.overflow = 'hidden'
  }

  const closeGallery = () => {
    setShowGallery(false)
    document.body.style.overflow = 'unset'
  }

  const nextImage = () => {
    if (galleryImages.length <= 1) return
    setCurrentImageIndex((prev) => (prev + 1) % galleryImages.length)
  }

  const prevImage = () => {
    if (galleryImages.length <= 1) return
    setCurrentImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length)
  }

  return (
    <>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        transition: 'all 0.3s ease',
        cursor: 'pointer'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
        e.currentTarget.style.transform = 'translateY(-4px)'
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}>
        
        {/* Image Section */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: '240px',
          backgroundColor: '#f3f4f6',
          overflow: 'hidden'
        }}>
          {supplier?.image_url ? (
            <img 
              src={supplier.image_url} 
              alt={supplier?.business_name || 'Furnizor'}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                cursor: hasGallery ? 'pointer' : 'default',
                transition: 'transform 0.3s ease'
              }}
              onClick={() => hasGallery && openGallery(0)}
              onMouseOver={(e) => {
                if (hasGallery) {
                  e.target.style.transform = 'scale(1.05)'
                }
              }}
              onMouseOut={(e) => {
                if (hasGallery) {
                  e.target.style.transform = 'scale(1)'
                }
              }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              border: '2px dashed #d1d5db'
            }}>
              <div style={{
                fontSize: '2rem',
                marginBottom: '8px',
                opacity: 0.4
              }}>
                {supplier?.categories && supplier.categories[0] ? 
                  getCategoryIcon(supplier.categories[0].name) : '🎉'}
              </div>
              <p style={{
                color: '#9ca3af',
                fontSize: '14px',
                fontWeight: '500',
                margin: '0 0 4px 0',
                textAlign: 'center'
              }}>
                {supplier?.categories && supplier.categories[0] ? 
                  supplier.categories[0].name : 'Servicii'}
              </p>
              <p style={{
                color: '#d1d5db',
                fontSize: '12px',
                margin: 0,
                textAlign: 'center'
              }}>
                Fără imagine
              </p>
            </div>
          )}
          
          {/* Badges pentru disponibilitate */}
          {highlightAvailable && (
            <div style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              backgroundColor: '#10b981',
              color: 'white',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              Disponibil
            </div>
          )}

          {/* Badges pentru categorii */}
          {supplier?.categories && Array.isArray(supplier.categories) && supplier.categories.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              {supplier.categories.slice(0, 2).map((category, index) => (
                <div key={category?.id || index} style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '600'
                }}>
                  {category?.name || 'Categorie'}
                </div>
              ))}
              {supplier.categories.length > 2 && (
                <div style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '600'
                }}>
                  +{supplier.categories.length - 2} mai multe
                </div>
              )}
            </div>
          )}

          {/* Gallery indicator */}
          {hasGallery && (
            <div style={{
              position: 'absolute',
              bottom: '12px',
              right: '12px',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              padding: '6px 10px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              📸 {galleryImages.length}
            </div>
          )}
        </div>

        {/* Content Section */}
        <div style={{ padding: '20px' }}>
          {/* Title */}
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '700',
            color: '#111827',
            marginBottom: '12px',
            margin: '0 0 12px 0'
          }}>
            {supplier?.business_name || 'Furnizor fără nume'}
          </h3>

          {/* Description */}
          {supplier?.description && (
            <p style={{
              color: '#6b7280',
              fontSize: '14px',
              lineHeight: '1.5',
              marginBottom: '16px',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              margin: '0 0 16px 0'
            }}>
              {supplier.description}
            </p>
          )}

          {/* Details */}
          <div style={{ marginBottom: '16px' }}>
            {supplier?.address && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#6b7280',
                fontSize: '14px',
                marginBottom: '8px'
              }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {supplier.address}
                </span>
              </div>
            )}
            
            {supplier?.phone && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#6b7280',
                fontSize: '14px',
                marginBottom: '8px'
              }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>{supplier.phone}</span>
              </div>
            )}
            
            {supplier?.price_range && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#6b7280',
                fontSize: '14px'
              }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                <span>{supplier.price_range}</span>
              </div>
            )}
          </div>

          {/* Action Button - FOLOSEȘTE ACEEAȘI LOGICĂ CA PE PAGINA PRINCIPALĂ */}
          <div style={{ width: '100%' }}>
            {showAvailability ? (
              <Link 
                href={`/supplier/${supplier?.id || ''}`}
                style={{
                  display: 'block',
                  width: '100%',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  fontWeight: '600',
                  textAlign: 'center',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                  border: 'none',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
              >
                Vezi detalii
              </Link>
            ) : (
              <Link 
                href="/login"
                style={{
                  display: 'block',
                  width: '100%',
                  backgroundColor: '#f3f4f6',
                  color: '#6b7280',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  fontWeight: '600',
                  textAlign: 'center',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                  border: 'none',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#f3f4f6'}
              >
                Conectează-te pentru detalii
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Gallery Modal */}
      {showGallery && galleryImages.length > 0 && (
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
        }}>
          {/* Close button */}
          <button
            onClick={closeGallery}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
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
              justifyContent: 'center',
              zIndex: 10001
            }}
          >
            ✕
          </button>

          {/* Gallery content */}
          <div style={{ 
            position: 'relative',
            maxWidth: '90vw',
            maxHeight: '90vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {/* Previous button */}
            {galleryImages.length > 1 && (
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
                  justifyContent: 'center',
                  zIndex: 10001
                }}
              >
                ‹
              </button>
            )}

            {/* Current image */}
            <img
              src={galleryImages[currentImageIndex]}
              alt={`${supplier?.business_name || 'Furnizor'} - Imagine ${currentImageIndex + 1}`}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                borderRadius: '8px'
              }}
            />

            {/* Next button */}
            {galleryImages.length > 1 && (
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
                  justifyContent: 'center',
                  zIndex: 10001
                }}
              >
                ›
              </button>
            )}

            {/* Image counter */}
            {galleryImages.length > 1 && (
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
                {currentImageIndex + 1} / {galleryImages.length}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
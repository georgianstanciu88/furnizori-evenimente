'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Calendar from '@/components/Calendar'

export default function Profile() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [categories, setCategories] = useState([])
  const [message, setMessage] = useState({ type: '', text: '' })
  const [formData, setFormData] = useState({
    business_name: '',
    category_id: '',
    description: '',
    phone: '',
    address: '',
    price_range: '',
    image_url: '',
    gallery_images: []
  })
  const [unavailableDates, setUnavailableDates] = useState([])
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [uploadingMain, setUploadingMain] = useState(false)
  const [uploadingGallery, setUploadingGallery] = useState(false)

  useEffect(() => {
    checkUser()
    fetchCategories()
  }, [])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    setUser(user)

    // Verifică tipul de utilizator
    const { data: profileData } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    if (profileData?.user_type !== 'furnizor') {
      router.push('/dashboard')
      return
    }

    // Fetch existing supplier profile
    const { data: supplierData } = await supabase
      .from('suppliers')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (supplierData) {
      setFormData({
        ...supplierData,
        gallery_images: supplierData.gallery_images || []
      })
      fetchUnavailableDates(supplierData.id)
    }

    setPageLoading(false)
  }

  async function fetchCategories() {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('name')
    setCategories(data || [])
  }

  async function fetchUnavailableDates(supplierId) {
    const { data } = await supabase
      .from('unavailable_dates')
      .select('*')
      .eq('supplier_id', supplierId)

    setUnavailableDates(data ? data.map(d => new Date(d.date)) : [])
  }

  // Upload main image to Supabase Storage
  async function uploadMainImage(file) {
    setUploadingMain(true)
    
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/main_${Date.now()}.${fileExt}`
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('supplier-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('supplier-images')
        .getPublicUrl(fileName)

      if (urlData?.publicUrl) {
        // Delete old main image if exists
        if (formData.image_url && formData.image_url.includes('supabase')) {
          const oldPath = formData.image_url.split('/').slice(-2).join('/')
          await supabase.storage.from('supplier-images').remove([oldPath])
        }

        setFormData(prev => ({ ...prev, image_url: urlData.publicUrl }))
        setMessage({ type: 'success', text: '✅ Imaginea principală a fost încărcată!' })
      }
    } catch (error) {
      console.error('Upload error:', error)
      setMessage({ type: 'error', text: '❌ Eroare la încărcarea imaginii: ' + error.message })
    }
    
    setUploadingMain(false)
  }

  // Upload gallery images to Supabase Storage
  async function uploadGalleryImages(files) {
    if (formData.gallery_images.length + files.length > 7) {
      setMessage({ type: 'error', text: '❌ Poți avea maximum 7 imagini în galerie' })
      return
    }

    setUploadingGallery(true)
    
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const fileExt = file.name.split('.').pop()
        const fileName = `${user.id}/gallery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('supplier-images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          throw uploadError
        }

        const { data: urlData } = supabase.storage
          .from('supplier-images')
          .getPublicUrl(fileName)

        return urlData.publicUrl
      })

      const uploadedUrls = await Promise.all(uploadPromises)
      
      setFormData(prev => ({
        ...prev,
        gallery_images: [...prev.gallery_images, ...uploadedUrls.filter(url => url)]
      }))
      
      setMessage({ type: 'success', text: `✅ ${uploadedUrls.length} imagini adăugate în galerie!` })
    } catch (error) {
      console.error('Gallery upload error:', error)
      setMessage({ type: 'error', text: '❌ Eroare la încărcarea imaginilor: ' + error.message })
    }
    
    setUploadingGallery(false)
  }

  // Remove image from gallery
  async function removeGalleryImage(imageUrl, index) {
    try {
      // Delete from Supabase Storage
      if (imageUrl.includes('supabase')) {
        const path = imageUrl.split('/').slice(-2).join('/')
        await supabase.storage.from('supplier-images').remove([path])
      }

      // Remove from state
      const newGallery = formData.gallery_images.filter((_, i) => i !== index)
      setFormData(prev => ({ ...prev, gallery_images: newGallery }))
      
      setMessage({ type: 'success', text: '✅ Imaginea a fost ștearsă din galerie' })
    } catch (error) {
      setMessage({ type: 'error', text: '❌ Eroare la ștergerea imaginii' })
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })

    const { data: existingSupplier } = await supabase
      .from('suppliers')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (existingSupplier) {
      // Update
      const { error } = await supabase
        .from('suppliers')
        .update(formData)
        .eq('id', existingSupplier.id)

      if (error) {
        setMessage({ type: 'error', text: `Eroare: ${error.message}` })
      } else {
        setMessage({ type: 'success', text: '✅ Profil actualizat cu succes!' })
      }
    } else {
      // Insert
      const { error } = await supabase
        .from('suppliers')
        .insert([{ ...formData, user_id: user.id }])

      if (error) {
        setMessage({ type: 'error', text: `Eroare: ${error.message}` })
      } else {
        setMessage({ type: 'success', text: '✅ Profil creat cu succes!' })
        setTimeout(() => window.location.reload(), 1500)
      }
    }

    setLoading(false)
  }

  async function toggleDate(date) {
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!supplier) {
      setMessage({ type: 'error', text: '⚠️ Salvează mai întâi profilul!' })
      return
    }

    const dateStr = date.toISOString().split('T')[0]
    const isUnavailable = unavailableDates.some(d => 
      d.toDateString() === date.toDateString()
    )

    if (isUnavailable) {
      // Remove date
      await supabase
        .from('unavailable_dates')
        .delete()
        .eq('supplier_id', supplier.id)
        .eq('date', dateStr)

      setUnavailableDates(unavailableDates.filter(d => 
        d.toDateString() !== date.toDateString()
      ))
      
      setMessage({ type: 'success', text: '✅ Data marcată ca disponibilă' })
    } else {
      // Add date
      await supabase
        .from('unavailable_dates')
        .insert([{
          supplier_id: supplier.id,
          date: dateStr
        }])

      setUnavailableDates([...unavailableDates, date])
      setMessage({ type: 'success', text: '✅ Data marcată ca indisponibilă' })
    }

    setTimeout(() => setMessage({ type: '', text: '' }), 3000)
  }

  if (pageLoading) {
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

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      paddingTop: '64px',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '40px 20px'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
          color: 'white',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '32px'
        }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '800',
            marginBottom: '8px',
            margin: '0 0 8px 0'
          }}>
            Profil Furnizor
          </h1>
          <p style={{
            fontSize: '1.125rem',
            opacity: 0.9,
            margin: 0
          }}>
            Gestionează informațiile, imaginile și disponibilitatea ta
          </p>
        </div>

        {/* Message */}
        {message.text && (
          <div style={{
            marginBottom: '24px',
            padding: '16px 20px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${message.type === 'success' ? '#16a34a' : '#dc2626'}`,
            color: message.type === 'success' ? '#15803d' : '#dc2626'
          }}>
            <span style={{ fontSize: '20px' }}>
              {message.type === 'success' ? '✅' : '⚠️'}
            </span>
            <span style={{ fontWeight: '500' }}>{message.text}</span>
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '32px'
        }}>
          {/* Images Section */}
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
                backgroundColor: '#fef3c7',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="20" height="20" fill="none" stroke="#f59e0b" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#111827',
                margin: 0
              }}>
                Imagini
              </h2>
            </div>

            {/* Main Image Upload */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '12px',
                margin: '0 0 12px 0'
              }}>
                Imaginea Principală
              </h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: formData.image_url ? '200px 1fr' : '1fr',
                gap: '20px',
                alignItems: 'start'
              }}>
                {/* Current main image */}
                {formData.image_url && (
                  <div style={{
                    position: 'relative',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '2px solid #e5e7eb'
                  }}>
                    <img 
                      src={formData.image_url}
                      alt="Imaginea principală"
                      style={{
                        width: '100%',
                        height: '150px',
                        objectFit: 'cover'
                      }}
                    />
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      ×
                    </button>
                  </div>
                )}

                {/* Upload area */}
                <div>
                  <div style={{
                    border: '2px dashed #d1d5db',
                    borderRadius: '12px',
                    padding: '24px',
                    textAlign: 'center',
                    backgroundColor: '#f9fafb',
                    transition: 'all 0.2s'
                  }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0]
                        if (file) uploadMainImage(file)
                      }}
                      disabled={uploadingMain}
                      style={{
                        position: 'absolute',
                        opacity: 0,
                        width: '100%',
                        height: '100%',
                        cursor: 'pointer'
                      }}
                    />
                    
                    {uploadingMain ? (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <div style={{
                          width: '24px',
                          height: '24px',
                          border: '2px solid #e5e7eb',
                          borderTop: '2px solid #2563eb',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }}></div>
                        <span style={{ fontSize: '14px', color: '#6b7280' }}>Se încarcă...</span>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📸</div>
                        <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                          Click pentru a încărca imaginea principală
                        </div>
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                          PNG, JPG până la 5MB
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Gallery Upload */}
            <div>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '12px',
                margin: '0 0 12px 0'
              }}>
                Galerie ({formData.gallery_images.length}/7)
              </h3>

              {/* Current gallery images */}
              {formData.gallery_images.length > 0 && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: '12px',
                  marginBottom: '20px'
                }}>
                  {formData.gallery_images.map((imageUrl, index) => (
                    <div key={index} style={{
                      position: 'relative',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '1px solid #e5e7eb'
                    }}>
                      <img 
                        src={imageUrl}
                        alt={`Galerie ${index + 1}`}
                        style={{
                          width: '100%',
                          height: '100px',
                          objectFit: 'cover'
                        }}
                      />
                      <button
                        onClick={() => removeGalleryImage(imageUrl, index)}
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          backgroundColor: 'rgba(0, 0, 0, 0.7)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload area for gallery */}
              {formData.gallery_images.length < 7 && (
                <div style={{
                  border: '2px dashed #d1d5db',
                  borderRadius: '12px',
                  padding: '24px',
                  textAlign: 'center',
                  backgroundColor: '#f9fafb',
                  position: 'relative'
                }}>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = e.target.files
                      if (files.length > 0) uploadGalleryImages(files)
                    }}
                    disabled={uploadingGallery}
                    style={{
                      position: 'absolute',
                      opacity: 0,
                      width: '100%',
                      height: '100%',
                      cursor: 'pointer',
                      top: 0,
                      left: 0
                    }}
                  />
                  
                  {uploadingGallery ? (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        border: '2px solid #e5e7eb',
                        borderTop: '2px solid #2563eb',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                      <span style={{ fontSize: '14px', color: '#6b7280' }}>Se încarcă galeria...</span>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🖼️</div>
                      <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                        Click pentru a adăuga imagini în galerie
                      </div>
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                        Poți selecta multiple imagini (max {7 - formData.gallery_images.length})
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Form Section */}
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#111827',
                margin: 0
              }}>
                Informații Afacere
              </h2>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '20px'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Nume Afacere *
                  </label>
                  <input
                    type="text"
                    required
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
                    value={formData.business_name}
                    onChange={(e) => setFormData({...formData, business_name: e.target.value})}
                    placeholder="Ex: Salon Phoenix"
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
                    Categorie *
                  </label>
                  <select
                    required
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
                    value={formData.category_id}
                    onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#2563eb'
                      e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db'
                      e.target.style.boxShadow = 'none'
                    }}
                  >
                    <option value="">Selectează categoria</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Descriere
                  </label>
                  <textarea
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '12px',
                      fontSize: '16px',
                      transition: 'all 0.2s',
                      outline: 'none',
                      boxSizing: 'border-box',
                      minHeight: '100px',
                      resize: 'vertical'
                    }}
                    rows="4"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Descrie serviciile tale..."
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
                    Telefon
                  </label>
                  <input
                    type="tel"
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
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="07xx xxx xxx"
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
                    Interval Preț
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
                    value={formData.price_range}
                    onChange={(e) => setFormData({...formData, price_range: e.target.value})}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#2563eb'
                      e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db'
                      e.target.style.boxShadow = 'none'
                    }}
                  >
                    <option value="">Selectează</option>
                    <option value="€">€ - Buget redus</option>
                    <option value="€€">€€ - Mediu</option>
                    <option value="€€€">€€€ - Premium</option>
                  </select>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Adresă
                  </label>
                  <input
                    type="text"
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
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="Oraș, Strada..."
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
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  marginTop: '24px',
                  background: loading ? '#9ca3af' : 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                  color: 'white',
                  padding: '14px 24px',
                  borderRadius: '12px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseOver={(e) => {
                  if (!loading) {
                    e.target.style.transform = 'translateY(-2px)'
                    e.target.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }
                }}
                onMouseOut={(e) => {
                  if (!loading) {
                    e.target.style.transform = 'translateY(0)'
                    e.target.style.boxShadow = 'none'
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
                    Se salvează...
                  </>
                ) : (
                  <>
                    💾 Salvează Profil
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Calendar Section */}
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
                backgroundColor: '#f0fdf4',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="20" height="20" fill="none" stroke="#16a34a" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#111827',
                margin: 0
              }}>
                Calendar Disponibilitate
              </h2>
            </div>
            
            <div style={{
              padding: '16px',
              backgroundColor: '#eff6ff',
              border: '1px solid #93c5fd',
              borderRadius: '12px',
              marginBottom: '24px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '16px' }}>💡</span>
                <div style={{
                  fontSize: '14px',
                  color: '#1e40af',
                  lineHeight: '1.5'
                }}>
                  <strong>Sfat:</strong> Click pe zile pentru a le marca ca indisponibile (roșu). 
                  Clienții vor vedea doar zilele în care ești disponibil.
                </div>
              </div>
            </div>
            
            <Calendar 
              unavailableDates={unavailableDates}
              onDateClick={toggleDate}
            />
            
            {unavailableDates.length > 0 && (
              <div style={{
                marginTop: '16px',
                padding: '16px',
                backgroundColor: '#f9fafb',
                borderRadius: '12px',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{
                  fontSize: '14px',
                  color: '#6b7280'
                }}>
                  <strong>Zile indisponibile:</strong> {unavailableDates.length}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#9ca3af',
                  marginTop: '4px'
                }}>
                  Aceste zile nu vor apărea în căutările clienților
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
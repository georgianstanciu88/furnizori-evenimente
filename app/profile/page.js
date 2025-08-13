'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Calendar from '@/components/Calendar'
import LocationPicker from '@/components/LocationPicker'

export default function Profile() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [categories, setCategories] = useState([])
  const [selectedCategories, setSelectedCategories] = useState([])
  const [message, setMessage] = useState({ type: '', text: '' })
  const [location, setLocation] = useState({ judet: '', localitate: '' })
  const [formData, setFormData] = useState({
    business_name: '',
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
  const [supplierId, setSupplierId] = useState(null)

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
  setSupplierId(supplierData.id)
  
  // Parsez adresa existentă pentru a extrage județul și localitatea
  if (supplierData.address) {
    const addressParts = supplierData.address.split(', ')
    if (addressParts.length === 2) {
      setLocation({
        localitate: addressParts[0],
        judet: addressParts[1]
      })
    }
  }
  
  // Fetch supplier categories
  await fetchSupplierCategories(supplierData.id)
  await fetchUnavailableDates(supplierData.id)
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

  async function fetchSupplierCategories(supplierId) {
    const { data } = await supabase
      .from('supplier_categories')
      .select('category_id')
      .eq('supplier_id', supplierId)
    
    if (data) {
      setSelectedCategories(data.map(item => item.category_id))
    }
  }

  async function fetchUnavailableDates(supplierId) {
    const { data } = await supabase
      .from('unavailable_dates')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('date')

    setUnavailableDates(data ? data.map(d => ({
      ...d,
      dateObj: new Date(d.date)
    })) : [])
  }

  // Toggle category selection
  function toggleCategory(categoryId) {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId)
      } else {
        return [...prev, categoryId]
      }
    })
  }

  // Upload main image
  async function uploadMainImage(file) {
    setUploadingMain(true)
    
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/main_${Date.now()}.${fileExt}`
      
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

      if (urlData?.publicUrl) {
        // Delete old image if exists
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
    setTimeout(() => setMessage({ type: '', text: '' }), 5000)
  }

  // Upload gallery images
  async function uploadGalleryImages(files) {
    if (formData.gallery_images.length + files.length > 7) {
      setMessage({ type: 'error', text: '❌ Poți avea maximum 7 imagini în galerie' })
      setTimeout(() => setMessage({ type: '', text: '' }), 5000)
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
    setTimeout(() => setMessage({ type: '', text: '' }), 5000)
  }

  // Remove gallery image
  async function removeGalleryImage(imageUrl, index) {
    try {
      if (imageUrl.includes('supabase')) {
        const path = imageUrl.split('/').slice(-2).join('/')
        await supabase.storage.from('supplier-images').remove([path])
      }

      const newGallery = formData.gallery_images.filter((_, i) => i !== index)
      setFormData(prev => ({ ...prev, gallery_images: newGallery }))
      
      setMessage({ type: 'success', text: '✅ Imaginea a fost ștearsă din galerie' })
    } catch (error) {
      setMessage({ type: 'error', text: '❌ Eroare la ștergerea imaginii' })
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 3000)
  }

  // Handle form submit
  async function handleSubmit(e) {
    e.preventDefault()
    
    if (selectedCategories.length === 0) {
      setMessage({ type: 'error', text: '❌ Selectează cel puțin o categorie!' })
      setTimeout(() => setMessage({ type: '', text: '' }), 5000)
      return
    }

    if (!location.judet || !location.localitate || location.localitate.trim() === '') {
  setMessage({ type: 'error', text: '❌ Selectează județul și localitatea!' })
  setTimeout(() => setMessage({ type: '', text: '' }), 5000)
  return
}
    
    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      const { data: existingSupplier } = await supabase
        .from('suppliers')
        .select('id')
        .eq('user_id', user.id)
        .single()

      let currentSupplierId

      if (existingSupplier) {
        // Update supplier
        const { error } = await supabase
          .from('suppliers')
          .update(formData)
          .eq('id', existingSupplier.id)

        if (error) throw error
        currentSupplierId = existingSupplier.id
      } else {
        // Insert new supplier
        const { data: newSupplier, error } = await supabase
          .from('suppliers')
          .insert([{ ...formData, user_id: user.id }])
          .select('id')
          .single()

        if (error) throw error
        currentSupplierId = newSupplier.id
        setSupplierId(currentSupplierId)
      }

      // Update categories
      // First, delete existing categories
      await supabase
        .from('supplier_categories')
        .delete()
        .eq('supplier_id', currentSupplierId)

      // Then, insert new categories
      if (selectedCategories.length > 0) {
        const categoryInserts = selectedCategories.map(categoryId => ({
          supplier_id: currentSupplierId,
          category_id: categoryId
        }))

        const { error: categoryError } = await supabase
          .from('supplier_categories')
          .insert(categoryInserts)

        if (categoryError) throw categoryError
      }

      setMessage({ type: 'success', text: '✅ Profil actualizat cu succes!' })
    } catch (error) {
      console.error('Error saving:', error)
      setMessage({ type: 'error', text: `❌ Eroare: ${error.message}` })
    }

    setLoading(false)
    setTimeout(() => setMessage({ type: '', text: '' }), 5000)
  }

  // Handle calendar date toggle
  async function toggleDate(date) {
    if (!supplierId) {
      setMessage({ type: 'error', text: '⚠️ Salvează mai întâi profilul!' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
      return
    }

    const dateStr = date.toISOString().split('T')[0]
    const existingDate = unavailableDates.find(d => 
      d.dateObj.toDateString() === date.toDateString()
    )

    if (existingDate) {
      // Remove date
      await supabase
        .from('unavailable_dates')
        .delete()
        .eq('id', existingDate.id)

      setUnavailableDates(unavailableDates.filter(d => d.id !== existingDate.id))
      setMessage({ type: 'success', text: '✅ Data marcată ca disponibilă' })
    } else {
      // Add date
      const { data, error } = await supabase
        .from('unavailable_dates')
        .insert([{
          supplier_id: supplierId,
          date: dateStr
        }])
        .select()
        .single()

      if (error) {
        setMessage({ type: 'error', text: '❌ Eroare la salvarea datei' })
      } else {
        setUnavailableDates([...unavailableDates, {
          ...data,
          dateObj: new Date(data.date)
        }])
        setMessage({ type: 'success', text: '✅ Data marcată ca indisponibilă' })
      }
    }

    setTimeout(() => setMessage({ type: '', text: '' }), 3000)
  }

  // Delete unavailable date
  async function deleteUnavailableDate(dateId) {
    if (!confirm('Ești sigur că vrei să ștergi această dată indisponibilă?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('unavailable_dates')
        .delete()
        .eq('id', dateId)

      if (error) throw error

      setUnavailableDates(unavailableDates.filter(d => d.id !== dateId))
      setMessage({ type: 'success', text: '✅ Data a fost ștearsă cu succes!' })
    } catch (error) {
      setMessage({ type: 'error', text: '❌ Eroare la ștergerea datei' })
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
      <div className="profile-container" style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '20px 16px'
      }}>
        {/* Header */}
        <div className="profile-header" style={{
          background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
          color: 'white',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <h1 className="profile-title" style={{
            fontSize: '1.75rem',
            fontWeight: '800',
            marginBottom: '8px',
            margin: '0 0 8px 0'
          }}>
            Profil Furnizor
          </h1>
          <p className="profile-subtitle" style={{
            fontSize: '1rem',
            opacity: 0.9,
            margin: 0
          }}>
            Gestionează informațiile, categoriile și disponibilitatea ta
          </p>
        </div>

        {/* Message */}
        {message.text && (
          <div className="message-container" style={{
            marginBottom: '20px',
            padding: '12px 16px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${message.type === 'success' ? '#16a34a' : '#dc2626'}`,
            color: message.type === 'success' ? '#15803d' : '#dc2626'
          }}>
            <span style={{ fontSize: '16px', flexShrink: 0 }}>
              {message.type === 'success' ? '✅' : '⚠️'}
            </span>
            <span className="message-text" style={{ fontWeight: '500', fontSize: '14px', lineHeight: '1.4' }}>
              {message.text}
            </span>
          </div>
        )}

        <div className="profile-grid" style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '24px'
        }}>
          
          {/* Categories Section */}
          <div className="profile-card" style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px'
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <h2 className="section-title" style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: '#111827',
                margin: 0
              }}>
                Categorii Servicii
              </h2>
            </div>

            <p style={{
              color: '#6b7280',
              fontSize: '14px',
              marginBottom: '16px',
              lineHeight: '1.5'
            }}>
              Selectează categoriile care descriu cel mai bine serviciile tale. Poți alege multiple categorii.
            </p>

            <div className="categories-selection" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px'
            }}>
              {categories.map(category => {
                const isSelected = selectedCategories.includes(category.id)
                return (
                  <div
                    key={category.id}
                    onClick={() => toggleCategory(category.id)}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      border: isSelected ? '2px solid #2563eb' : '2px solid #e5e7eb',
                      backgroundColor: isSelected ? '#eff6ff' : 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                    onMouseOver={(e) => {
                      if (!isSelected) {
                        e.target.style.borderColor = '#9ca3af'
                        e.target.style.backgroundColor = '#f9fafb'
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!isSelected) {
                        e.target.style.borderColor = '#e5e7eb'
                        e.target.style.backgroundColor = 'white'
                      }
                    }}
                  >
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '4px',
                      border: '2px solid',
                      borderColor: isSelected ? '#2563eb' : '#d1d5db',
                      backgroundColor: isSelected ? '#2563eb' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}>
                      {isSelected && (
                        <svg width="12" height="12" fill="none" stroke="white" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span style={{
                      fontWeight: '600',
                      color: isSelected ? '#1d4ed8' : '#374151',
                      fontSize: '14px'
                    }}>
                      {category.name}
                    </span>
                  </div>
                )
              })}
            </div>

            {selectedCategories.length > 0 && (
              <div style={{
                marginTop: '16px',
                padding: '12px 16px',
                backgroundColor: '#f0fdf4',
                borderRadius: '8px',
                border: '1px solid #bbf7d0'
              }}>
                <div style={{
                  fontSize: '14px',
                  color: '#15803d',
                  fontWeight: '600'
                }}>
                  ✅ {selectedCategories.length} categorie{selectedCategories.length > 1 ? 'i' : ''} selectată{selectedCategories.length > 1 ? '' : 'ă'}
                </div>
              </div>
            )}
          </div>

          {/* Images Section */}
          <div className="profile-card" style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                backgroundColor: '#eff6ff',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="16" height="16" fill="none" stroke="#2563eb" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: '#111827',
                margin: 0
              }}>
                Imagini
              </h2>
            </div>

            {/* Main Image */}
            <div style={{ marginBottom: '32px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '12px'
              }}>
                Imagine principală
              </label>
              
              <div style={{
                border: '2px dashed #d1d5db',
                borderRadius: '12px',
                padding: '24px',
                textAlign: 'center',
                backgroundColor: '#f9fafb',
                transition: 'all 0.2s'
              }}>
                {formData.image_url ? (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img 
                      src={formData.image_url} 
                      alt="Imagine principală"
                      style={{
                        width: '200px',
                        height: '150px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                      }}
                    />
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                      style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: '#dc2626',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Șterge imaginea"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '2rem', marginBottom: '12px', opacity: 0.4 }}>📸</div>
                    <p style={{ color: '#6b7280', marginBottom: '16px', fontSize: '14px' }}>
                      Încarcă imaginea principală a afacerii tale
                    </p>
                  </div>
                )}
                
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files[0] && uploadMainImage(e.target.files[0])}
                  style={{ display: 'none' }}
                  id="main-image-upload"
                />
                <label
                  htmlFor="main-image-upload"
                  style={{
                    display: 'inline-block',
                    padding: '8px 16px',
                    backgroundColor: uploadingMain ? '#9ca3af' : '#2563eb',
                    color: 'white',
                    borderRadius: '8px',
                    cursor: uploadingMain ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    fontSize: '14px',
                    transition: 'background-color 0.2s'
                  }}
                >
                  {uploadingMain ? '⏳ Se încarcă...' : formData.image_url ? 'Schimbă imaginea' : 'Alege imagine'}
                </label>
              </div>
            </div>

            {/* Gallery */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '12px'
              }}>
                Galerie ({formData.gallery_images.length}/7)
              </label>
              
              {formData.gallery_images.length > 0 && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                  gap: '12px',
                  marginBottom: '16px'
                }}>
                  {formData.gallery_images.map((imageUrl, index) => (
                    <div key={index} style={{ position: 'relative' }}>
                      <img 
                        src={imageUrl}
                        alt={`Galerie ${index + 1}`}
                        style={{
                          width: '100%',
                          height: '100px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb'
                        }}
                      />
                      <button
                        onClick={() => removeGalleryImage(imageUrl, index)}
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: '#dc2626',
                          color: 'white',
                          border: 'none',
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
              
              {formData.gallery_images.length < 7 && (
                <div style={{
                  border: '2px dashed #d1d5db',
                  borderRadius: '12px',
                  padding: '20px',
                  textAlign: 'center',
                  backgroundColor: '#f9fafb'
                }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '8px', opacity: 0.4 }}>🖼️</div>
                  <p style={{ color: '#6b7280', marginBottom: '12px', fontSize: '14px' }}>
                    Adaugă până la {7 - formData.gallery_images.length} imagini în galerie
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => e.target.files.length > 0 && uploadGalleryImages(e.target.files)}
                    style={{ display: 'none' }}
                    id="gallery-upload"
                  />
                  <label
                    htmlFor="gallery-upload"
                    style={{
                      display: 'inline-block',
                      padding: '8px 16px',
                      backgroundColor: uploadingGallery ? '#9ca3af' : '#16a34a',
                      color: 'white',
                      borderRadius: '8px',
                      cursor: uploadingGallery ? 'not-allowed' : 'pointer',
                      fontWeight: '600',
                      fontSize: '14px',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    {uploadingGallery ? '⏳ Se încarcă...' : 'Adaugă imagini'}
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Business Information Form */}
          <div className="profile-card" style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px'
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h2 style={{
                fontSize: '1.25rem',
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
                gridTemplateColumns: '1fr',
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
                    Numele afacerii *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.business_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, business_name: e.target.value }))}
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
                    placeholder="Ex: Studio Foto Magic Moments"
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
                    Descrierea serviciilor
                  </label>
                  <textarea
                    rows="4"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '12px',
                      fontSize: '16px',
                      transition: 'all 0.2s',
                      outline: 'none',
                      boxSizing: 'border-box',
                      resize: 'vertical'
                    }}
                    placeholder="Descrie serviciile tale, experiența și ce te face special..."
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

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
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
                      Telefon *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
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
                      Interval de preț
                    </label>
                    <input
                      type="text"
                      value={formData.price_range}
                      onChange={(e) => setFormData(prev => ({ ...prev, price_range: e.target.value }))}
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
                      placeholder="Ex: 500-2000 lei"
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

                <div>
  <label style={{
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px'
  }}>
    Locația *
  </label>
  <LocationPicker
    selectedJudet={location.judet}
    selectedLocalitate={location.localitate}
    onLocationChange={(locationData) => {
      setLocation(locationData)
      // Actualizez și câmpul address pentru compatibilitate
      const fullAddress = locationData.judet && locationData.localitate 
        ? `${locationData.localitate}, ${locationData.judet}`
        : ''
      setFormData(prev => ({ ...prev, address: fullAddress }))
    }}
  />
</div>
              </div>

              <button
                type="submit"
                disabled={loading || selectedCategories.length === 0}
                style={{
                  marginTop: '24px',
                  width: '100%',
                  backgroundColor: loading || selectedCategories.length === 0 ? '#9ca3af' : '#16a34a',
                  color: 'white',
                  padding: '14px 24px',
                  borderRadius: '12px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: loading || selectedCategories.length === 0 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseOver={(e) => {
                  if (!loading && selectedCategories.length > 0) {
                    e.target.style.backgroundColor = '#15803d'
                  }
                }}
                onMouseOut={(e) => {
                  if (!loading && selectedCategories.length > 0) {
                    e.target.style.backgroundColor = '#16a34a'
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
                  '💾 Salvează Profilul'
                )}
              </button>
            </form>
          </div>

          {/* Calendar Section */}
          <div className="profile-card" style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                backgroundColor: '#fef2f2',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="16" height="16" fill="none" stroke="#dc2626" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: '#111827',
                margin: 0
              }}>
                Calendar Disponibilitate
              </h2>
            </div>

            <p style={{
              color: '#6b7280',
              fontSize: '14px',
              marginBottom: '20px',
              lineHeight: '1.5'
            }}>
              Marchează zilele în care <strong>nu ești disponibil</strong>. Clienții vor vedea doar zilele disponibile când caută furnizori.
            </p>

            {supplierId ? (
              <Calendar 
                unavailableDates={unavailableDates.map(d => d.dateObj)}
                onDateClick={toggleDate}
              />
            ) : (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                backgroundColor: '#f9fafb',
                borderRadius: '12px',
                border: '2px dashed #d1d5db'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '12px', opacity: 0.4 }}>📅</div>
                <p style={{ color: '#6b7280', margin: '0 0 16px 0', fontWeight: '500' }}>
                  Calendarul va fi disponibil după salvarea profilului
                </p>
                <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>
                  Completează și salvează informațiile de mai sus pentru a putea gestiona disponibilitatea
                </p>
              </div>
            )}
          </div>

          {/* Unavailable Dates List */}
          {supplierId && unavailableDates.length > 0 && (
            <div className="profile-card" style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '20px'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: '#fef2f2',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg width="16" height="16" fill="none" stroke="#dc2626" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: '#111827',
                  margin: 0
                }}>
                  Date Indisponibile ({unavailableDates.length})
                </h2>
              </div>

              <p style={{
                color: '#6b7280',
                fontSize: '14px',
                marginBottom: '16px',
                lineHeight: '1.5'
              }}>
                Lista completă cu datele în care nu ești disponibil. Poți șterge o dată dacă un client renunță la programare.
              </p>

              <div style={{
                maxHeight: '300px',
                overflowY: 'auto',
                display: 'grid',
                gap: '8px'
              }}>
                {unavailableDates
                  .sort((a, b) => new Date(a.date) - new Date(b.date))
                  .map((unavailableDate) => (
                  <div
                    key={unavailableDate.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      backgroundColor: '#fef2f2',
                      borderRadius: '8px',
                      border: '1px solid #fecaca'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        backgroundColor: '#dc2626',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <svg width="12" height="12" fill="none" stroke="white" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                      <div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#991b1b'
                        }}>
                          {new Date(unavailableDate.date).toLocaleDateString('ro-RO', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#7f1d1d'
                        }}>
                          Data indisponibilă
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => deleteUnavailableDate(unavailableDate.id)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                        transition: 'background-color 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      onMouseOver={(e) => e.target.style.backgroundColor = '#b91c1c'}
                      onMouseOut={(e) => e.target.style.backgroundColor = '#dc2626'}
                      title="Șterge data - folosește dacă clientul renunță"
                    >
                      <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Șterge
                    </button>
                  </div>
                ))}
              </div>

              {unavailableDates.length > 5 && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px 16px',
                  backgroundColor: '#f0f9ff',
                  borderRadius: '8px',
                  border: '1px solid #0ea5e9'
                }}>
                  <div style={{
                    fontSize: '14px',
                    color: '#0c4a6e',
                    fontWeight: '500'
                  }}>
                    💡 Sfat: Poți șterge o dată dacă un client renunță la programare și vrei să fii din nou disponibil în acea zi.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        /* Mobile-first responsive design */
        .profile-container {
          padding: 20px 16px !important;
        }
        
        .profile-header {
          padding: 20px !important;
          margin-bottom: 20px !important;
        }
        
        .profile-title {
          font-size: 1.5rem !important;
        }
        
        .profile-subtitle {
          font-size: 0.875rem !important;
        }
        
        .section-title {
          font-size: 1.125rem !important;
        }
        
        .profile-card {
          padding: 20px !important;
        }
        
        .categories-selection {
          grid-template-columns: 1fr !important;
          gap: 8px !important;
        }
        
        /* Tablet breakpoint */
        @media (min-width: 640px) {
          .profile-container {
            padding: 30px 20px !important;
          }
          
          .profile-header {
            padding: 32px !important;
            margin-bottom: 32px !important;
          }
          
          .profile-title {
            font-size: 2rem !important;
          }
          
          .profile-subtitle {
            font-size: 1rem !important;
          }
          
          .section-title {
            font-size: 1.25rem !important;
          }
          
          .profile-card {
            padding: 32px !important;
          }
          
          .categories-selection {
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)) !important;
            gap: 12px !important;
          }
        }
        
        /* Desktop breakpoint */
        @media (min-width: 1024px) {
          .profile-container {
            padding: 40px 20px !important;
          }
          
          .profile-header {
            padding: 40px !important;
            margin-bottom: 40px !important;
          }
          
          .profile-title {
            font-size: 2.5rem !important;
          }
          
          .profile-subtitle {
            font-size: 1.125rem !important;
          }
          
          .section-title {
            font-size: 1.5rem !important;
          }
          
          .categories-selection {
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)) !important;
            gap: 16px !important;
          }
        }
      `}</style>
    </div>
  )
}
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Calendar from '@/components/Calendar'

export default function Profile() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [categories, setCategories] = useState([])
  const [selectedCategories, setSelectedCategories] = useState([])
  const [message, setMessage] = useState({ type: '', text: '' })
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

    setUnavailableDates(data ? data.map(d => new Date(d.date)) : [])
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

  // Upload functions (același cod ca înainte)
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
  }

  async function handleSubmit(e) {
    e.preventDefault()
    
    if (selectedCategories.length === 0) {
      setMessage({ type: 'error', text: '❌ Selectează cel puțin o categorie!' })
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

      let supplierId

      if (existingSupplier) {
        // Update supplier
        const { error } = await supabase
          .from('suppliers')
          .update(formData)
          .eq('id', existingSupplier.id)

        if (error) throw error
        supplierId = existingSupplier.id
      } else {
        // Insert new supplier
        const { data: newSupplier, error } = await supabase
          .from('suppliers')
          .insert([{ ...formData, user_id: user.id }])
          .select('id')
          .single()

        if (error) throw error
        supplierId = newSupplier.id
      }

      // Update categories
      // First, delete existing categories
      await supabase
        .from('supplier_categories')
        .delete()
        .eq('supplier_id', supplierId)

      // Then, insert new categories
      if (selectedCategories.length > 0) {
        const categoryInserts = selectedCategories.map(categoryId => ({
          supplier_id: supplierId,
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

          {/* Restul componentelor - Images, Form, Calendar - rămân la fel */}
          {/* ... (codul pentru imagini, formular și calendar rămâne neschimbat) */}
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
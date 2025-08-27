// app/profile/page.js - Enhanced version cu location și travel options
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import LocationPicker from '@/components/LocationPicker'

export default function Profile() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [supplierProfile, setSupplierProfile] = useState(null)
  const [categories, setCategories] = useState([])
  const [selectedCategories, setSelectedCategories] = useState([])
  const [message, setMessage] = useState({ type: '', text: '' })
  const [location, setLocation] = useState({ judet: '', localitate: '' })
  
  // Noul state pentru mobilitate
  const [availableForTravel, setAvailableForTravel] = useState(false)
  const [travelRadius, setTravelRadius] = useState(50)
  
  const [formData, setFormData] = useState({
    business_name: '',
    description: '',
    phone: '',
    price_range: '',
    image_url: '',
    gallery_images: []
  })
  
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [uploadingMain, setUploadingMain] = useState(false)
  const [uploadingGallery, setUploadingGallery] = useState(false)
  
  // Categorii care NU pot fi mobile (fixe)
  const fixedCategories = ['Locații', 'Localuri', 'Săli de evenimente', 'Restaurante']
  
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
        business_name: supplierData.business_name || '',
        description: supplierData.description || '',
        phone: supplierData.phone || '',
        price_range: supplierData.price_range || '',
        image_url: supplierData.image_url || '',
        gallery_images: supplierData.gallery_images || []
      })
      
      // Setează locația
      setLocation({
        judet: supplierData.location_judet || '',
        localitate: supplierData.location_localitate || ''
      })
      
      // Setează opțiunile de mobilitate
      setAvailableForTravel(supplierData.available_for_travel || false)
      setTravelRadius(supplierData.travel_radius || 50)
      
      setSupplierProfile(supplierData)
      
      // Fetch supplier categories
      await fetchSupplierCategories(supplierData.id)
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

  // Verifică dacă categoriile selectate permit mobilitatea
  const canBeAvailableForTravel = () => {
    const selectedCategoryNames = categories
      .filter(cat => selectedCategories.includes(cat.id))
      .map(cat => cat.name)
    
    // Dacă nu sunt categorii selectate, permite mobilitatea
    if (selectedCategoryNames.length === 0) return true
    
    // Dacă toate categoriile selectate sunt fixe, nu permite mobilitatea
    return !selectedCategoryNames.every(name => 
      fixedCategories.some(fixedCat => name.includes(fixedCat))
    )
  }

  // Toggle category selection
  function toggleCategory(categoryId) {
    setSelectedCategories(prev => {
      const newSelection = prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
      
      // Dacă noile categorii selectate sunt toate fixe, dezactivează mobilitatea
      setTimeout(() => {
        if (!canBeAvailableForTravel()) {
          setAvailableForTravel(false)
        }
      }, 100)
      
      return newSelection
    })
  }

  // Upload main image (păstrează implementarea existentă)
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

      if (uploadError) throw uploadError

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
    setTimeout(() => setMessage({ type: '', text: '' }), 5000)
  }

  // Upload gallery images (păstrează implementarea existentă)
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

        if (uploadError) throw uploadError

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

  // Remove gallery image (păstrează implementarea existentă)
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

      // Pregătește datele pentru salvare
      const supplierData = {
        ...formData,
        location_judet: location.judet,
        location_localitate: location.localitate,
        available_for_travel: availableForTravel,
        travel_radius: availableForTravel ? travelRadius : 0
      }

      let currentSupplierId

      if (existingSupplier) {
        // Update supplier
        const { error } = await supabase
          .from('suppliers')
          .update(supplierData)
          .eq('id', existingSupplier.id)

        if (error) throw error
        currentSupplierId = existingSupplier.id
      } else {
        // Insert new supplier
        const { data: newSupplier, error } = await supabase
          .from('suppliers')
          .insert([{ ...supplierData, user_id: user.id }])
          .select('id')
          .single()

        if (error) throw error
        currentSupplierId = newSupplier.id
      }

      // Update categories
      await supabase
        .from('supplier_categories')
        .delete()
        .eq('supplier_id', currentSupplierId)

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
            Gestionează informațiile, locația și disponibilitatea ta
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
          
          {/* Location Section - NOUĂ */}
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#111827',
                margin: 0
              }}>
                Locația Afacerii
              </h2>
            </div>

            <p style={{
              color: '#6b7280',
              fontSize: '14px',
              marginBottom: '20px',
              lineHeight: '1.5'
            }}>
              Selectează locația principală a afacerii tale. Aceasta va fi folosită pentru căutările clienților.
            </p>

            <LocationPicker
              selectedJudet={location.judet}
              selectedLocalitate={location.localitate}
              onLocationChange={(locationData) => {
                setLocation(locationData)
              }}
            />
          </div>

          {/* Travel Options Section - NOUĂ */}
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m-6 3l6-3" />
                </svg>
              </div>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#111827',
                margin: 0
              }}>
                Opțiuni Deplasare
              </h2>
            </div>

            <p style={{
              color: '#6b7280',
              fontSize: '14px',
              marginBottom: '20px',
              lineHeight: '1.5'
            }}>
              Specifică dacă poți să te deplasezi în alte localități pentru serviciile tale.
            </p>

            {/* Verificare dacă categoriile permit mobilitatea */}
            {!canBeAvailableForTravel() && selectedCategories.length > 0 && (
              <div style={{
                padding: '16px',
                backgroundColor: '#fef3c7',
                borderRadius: '12px',
                marginBottom: '20px',
                border: '1px solid #fbbf24'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '8px'
                }}>
                  <span style={{ fontSize: '20px' }}>🏢</span>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#92400e'
                  }}>
                    Categoriile selectate nu permit deplasarea
                  </span>
                </div>
                <p style={{
                  fontSize: '14px',
                  color: '#92400e',
                  lineHeight: '1.5',
                  margin: 0
                }}>
                  Categoriile ca "Locații", "Localuri" sau "Săli de evenimente" sunt considerate fixe și nu se pot deplasa.
                </p>
              </div>
            )}

            {/* Toggle pentru disponibilitate deplasare */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '20px',
              padding: '16px',
              backgroundColor: availableForTravel ? '#f0fdf4' : '#f9fafb',
              borderRadius: '12px',
              border: `1px solid ${availableForTravel ? '#bbf7d0' : '#e5e7eb'}`,
              cursor: canBeAvailableForTravel() ? 'pointer' : 'not-allowed',
              opacity: canBeAvailableForTravel() ? 1 : 0.6
            }}
            onClick={() => {
              if (canBeAvailableForTravel()) {
                setAvailableForTravel(!availableForTravel)
              }
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '4px',
                border: '2px solid',
                borderColor: availableForTravel ? '#16a34a' : '#d1d5db',
                backgroundColor: availableForTravel ? '#16a34a' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}>
                {availableForTravel && (
                  <svg width="12" height="12" fill="none" stroke="white" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div>
                <div style={{
                  fontWeight: '600',
                  color: '#111827',
                  fontSize: '16px'
                }}>
                  Sunt disponibil pentru deplasare
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  marginTop: '2px'
                }}>
                  Accept să mă deplasez în alte localități pentru serviciile mele
                </div>
              </div>
            </div>

            {/* Raza de deplasare - doar dacă este disponibil pentru deplasare */}
            {availableForTravel && (
              <div style={{
                padding: '20px',
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                border: '1px solid #e2e8f0'
              }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '12px'
                }}>
                  Raza maximă de deplasare
                </label>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '12px'
                }}>
                  <input
                    type="range"
                    min="10"
                    max="200"
                    step="10"
                    value={travelRadius}
                    onChange={(e) => setTravelRadius(parseInt(e.target.value))}
                    style={{
                      flex: 1,
                      height: '8px',
                      borderRadius: '5px',
                      background: '#e2e8f0',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  />
                  <div style={{
                    minWidth: '80px',
                    textAlign: 'center',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#16a34a',
                    backgroundColor: 'white',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '2px solid #16a34a'
                  }}>
                    {travelRadius} km
                  </div>
                </div>
                
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  color: '#6b7280'
                }}>
                  <span>10 km</span>
                  <span>200+ km</span>
                </div>
                
                <p style={{
                  fontSize: '13px',
                  color: '#6b7280',
                  marginTop: '8px',
                  margin: '8px 0 0 0',
                  textAlign: 'center'
                }}>
                  {travelRadius <= 30 ? '🏘️ Zona locală' : 
                   travelRadius <= 80 ? '🏙️ Zona județeană' :
                   travelRadius <= 150 ? '🌆 Zona regională' : '🗺️ Național'}
                </p>
              </div>
            )}
          </div>

          {/* Categories Section */}
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <h2 style={{
                fontSize: '1.5rem',
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
              marginBottom: '20px',
              lineHeight: '1.5'
            }}>
              Selectează categoriile care descriu cel mai bine serviciile tale.
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '12px'
            }}>
              {categories.map(category => {
                const isSelected = selectedCategories.includes(category.id)
                const isFixed = fixedCategories.some(fixedCat => category.name.includes(fixedCat))
                
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
                      gap: '12px',
                      position: 'relative'
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
                    <div style={{ flex: 1 }}>
                      <span style={{
                        fontWeight: '600',
                        color: isSelected ? '#1d4ed8' : '#374151',
                        fontSize: '14px'
                      }}>
                        {category.name}
                      </span>
                      {isFixed && (
                        <div style={{
                          fontSize: '12px',
                          color: '#6b7280',
                          marginTop: '2px'
                        }}>
                          🏢 Serviciu fix (nu se deplasează)
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {selectedCategories.length > 0 && (
              <div style={{
                marginTop: '20px',
                padding: '16px 20px',
                backgroundColor: '#f0fdf4',
                borderRadius: '12px',
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
                backgroundColor: '#fef2f2',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="20" height="20" fill="none" stroke="#dc2626" viewBox="0 0 24 24">
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
                backgroundColor: '#f0f9ff',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="20" height="20" fill="none" stroke="#0369a1" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
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
              </div>

              <button
                type="submit"
                disabled={loading || selectedCategories.length === 0 || !location.judet || !location.localitate}
                style={{
                  marginTop: '32px',
                  width: '100%',
                  backgroundColor: (loading || selectedCategories.length === 0 || !location.judet || !location.localitate) ? '#9ca3af' : '#16a34a',
                  color: 'white',
                  padding: '16px 24px',
                  borderRadius: '12px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: (loading || selectedCategories.length === 0 || !location.judet || !location.localitate) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseOver={(e) => {
                  if (!loading && selectedCategories.length > 0 && location.judet && location.localitate) {
                    e.target.style.backgroundColor = '#15803d'
                  }
                }}
                onMouseOut={(e) => {
                  if (!loading && selectedCategories.length > 0 && location.judet && location.localitate) {
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
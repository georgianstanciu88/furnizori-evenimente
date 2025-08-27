// components/AdvancedSearchMap.js
'use client'
import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'

// Încarcă toate componentele Leaflet doar pe client-side
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { 
  ssr: false,
  loading: () => <div>Se încarcă harta...</div>
})
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Circle = dynamic(() => import('react-leaflet').then(mod => mod.Circle), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })

export default function AdvancedSearchMap({ 
  selectedDate, 
  onLocationSelect,
  searchRadius = 50, // km
  className = "" 
}) {
  const [mapCenter, setMapCenter] = useState([45.9432, 24.9668]) // Centrul României
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [nearbySuppliers, setNearbySuppliers] = useState([])
  const [mobileSuppliers, setMobileSuppliers] = useState([])
  const [locationName, setLocationName] = useState('')
  const [searching, setSearching] = useState(false)
  const [leafletReady, setLeafletReady] = useState(false)

  // Categorii mobile (furnizori care se pot deplasa)
  const mobileCategories = [
    'Fotografie', 'Videografie', 'Muzică', 'Formații Muzicale', 
    'Flori', 'Decorațiuni', 'Animatori', 'DJ', 'Catering și băuturi'
  ]

  // Inițializează Leaflet după ce componenta este mounted
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('leaflet').then((L) => {
        // Fix pentru iconurile Leaflet în Next.js
        delete L.Icon.Default.prototype._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        })
        setLeafletReady(true)
      })
    }
  }, [])

  // Geocoding pentru România - folosind Nominatim (gratuit)
  const searchLocation = async (query) => {
    if (!query || query.length < 3) return

    setSearching(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` + 
        `format=json&countrycodes=ro&q=${encodeURIComponent(query)}&limit=5`
      )
      const results = await response.json()
      
      if (results && results.length > 0) {
        const result = results[0]
        const lat = parseFloat(result.lat)
        const lon = parseFloat(result.lon)
        
        setMapCenter([lat, lon])
        setSelectedLocation({ lat, lon })
        setLocationName(result.display_name)
        
        // Caută furnizori apropiați
        await findNearbySuppliers(lat, lon)
        
        if (onLocationSelect) {
          onLocationSelect({
            lat, 
            lon, 
            name: result.display_name,
            city: extractCityFromAddress(result.display_name)
          })
        }
      }
    } catch (error) {
      console.error('Eroare la căutarea locației:', error)
    }
    setSearching(false)
  }

  // Extrage orașul din adresa completă
  const extractCityFromAddress = (displayName) => {
    const parts = displayName.split(', ')
    // Încearcă să găsească orașul în părțile adresei
    for (let part of parts) {
      if (part.includes('Municipiul') || part.includes('Oraș')) {
        return part.replace('Municipiul ', '').replace('Oraș ', '')
      }
    }
    return parts[0] // Fallback la prima parte
  }

  // Calculează distanța între două puncte (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371 // Raza Pământului în km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  // Găsește furnizori în apropiere
  const findNearbySuppliers = async (lat, lon) => {
    try {
      // 1. Găsește furnizori locali (din aceeași localitate)
      const cityName = extractCityFromAddress(locationName)
      const { data: localSuppliers, error: localError } = await supabase
        .from('suppliers')
        .select(`
          *,
          supplier_categories (
            categories (id, name)
          )
        `)
        .ilike('address', `%${cityName}%`)

      if (!localError && localSuppliers) {
        // Filtrează doar furnizorii disponibili în data selectată
        const availableSuppliers = await filterAvailableSuppliers(localSuppliers, selectedDate)
        setNearbySuppliers(availableSuppliers)
      }

      // 2. Găsește furnizori mobili din zona extinsă (în raza de 50km)
      const { data: allMobileSuppliers, error: mobileError } = await supabase
        .from('suppliers')
        .select(`
          *,
          supplier_categories (
            categories (id, name)
          )
        `)

      if (!mobileError && allMobileSuppliers) {
        // Filtrează furnizorii care au servicii mobile
        const mobileFiltered = allMobileSuppliers.filter(supplier => {
          return supplier.supplier_categories?.some(sc => 
            mobileCategories.includes(sc.categories.name)
          )
        })

        // Calculează distanțele și păstrează doar pe cei în raza selectată
        const nearbyMobile = mobileFiltered
          .map(supplier => {
            // Extrage coordonatele din adresa furnizorului (simplificat)
            // În producție, ar trebui să geocodezi adresele furnizorilor
            const supplierCoords = getSupplierCoordinates(supplier.address)
            if (!supplierCoords) return null

            const distance = calculateDistance(
              lat, lon, 
              supplierCoords.lat, supplierCoords.lon
            )

            return distance <= searchRadius ? {
              ...supplier,
              distance: Math.round(distance)
            } : null
          })
          .filter(Boolean)
          .sort((a, b) => a.distance - b.distance)

        const availableMobileSuppliers = await filterAvailableSuppliers(nearbyMobile, selectedDate)
        setMobileSuppliers(availableMobileSuppliers)
      }

    } catch (error) {
      console.error('Eroare la căutarea furnizorilor:', error)
    }
  }

  // Filtrează furnizorii disponibili în data selectată
  const filterAvailableSuppliers = async (suppliers, date) => {
    if (!date || !suppliers?.length) return suppliers || []

    const { data: unavailableDates } = await supabase
      .from('unavailable_dates')
      .select('supplier_id')
      .eq('date', date)

    const unavailableIds = unavailableDates?.map(u => u.supplier_id) || []
    
    return suppliers.filter(supplier => !unavailableIds.includes(supplier.id))
  }

  // Simulează obținerea coordonatelor furnizorului (în producție folosește geocoding)
  const getSupplierCoordinates = (address) => {
    // Coordonate aproximative pentru județele din România
    const romaniaCoords = {
      'Alba': { lat: 46.0667, lon: 23.5833 },
      'Arad': { lat: 46.1667, lon: 21.3167 },
      'Bacau': { lat: 46.5833, lon: 26.9167 },
      'Bihor': { lat: 47.0667, lon: 21.9333 },
      'Brasov': { lat: 45.6500, lon: 25.6000 },
      'Bucuresti': { lat: 44.4268, lon: 26.1025 },
      'Cluj': { lat: 46.7833, lon: 23.6000 },
      'Constanta': { lat: 44.1833, lon: 28.6500 },
      'Iasi': { lat: 47.1500, lon: 27.6000 },
      'Timis': { lat: 45.7500, lon: 21.2333 },
      // Adaugă mai multe după nevoie
    }

    // Caută județul în adresă
    for (let judet in romaniaCoords) {
      if (address?.includes(judet)) {
        return romaniaCoords[judet]
      }
    }

    return null
  }

  // Handler pentru click pe hartă
  const handleMapClick = async (e) => {
    const { lat, lng: lon } = e.latlng
    
    setMapCenter([lat, lon])
    setSelectedLocation({ lat, lon })
    
    // Reverse geocoding pentru a obține numele locației
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?` +
        `format=json&lat=${lat}&lon=${lon}&countrycodes=ro`
      )
      const result = await response.json()
      
      if (result && result.display_name) {
        setLocationName(result.display_name)
        await findNearbySuppliers(lat, lon)
        
        if (onLocationSelect) {
          onLocationSelect({
            lat, 
            lon, 
            name: result.display_name,
            city: extractCityFromAddress(result.display_name)
          })
        }
      }
    } catch (error) {
      console.error('Eroare la reverse geocoding:', error)
    }
  }

  // Dacă Leaflet nu este încă încărcat, afișează loading
  if (!leafletReady) {
    return (
      <div className={`advanced-search-map ${className}`}>
        <div style={{
          marginBottom: '20px',
          display: 'flex',
          gap: '12px',
          alignItems: 'center'
        }}>
          <input
            type="text"
            placeholder="Caută locația evenimentului (ex: București, Cluj-Napoca, Brașov...)"
            onChange={(e) => {
              const value = e.target.value
              if (value.length > 2) {
                clearTimeout(window.searchTimeout)
                window.searchTimeout = setTimeout(() => {
                  searchLocation(value)
                }, 500)
              }
            }}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '12px',
              fontSize: '16px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>
        
        <div style={{
          height: '400px',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid #e5e7eb',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f9fafb'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid #e5e7eb',
              borderTop: '3px solid #2563eb',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }}></div>
            <p style={{ color: '#6b7280', fontSize: '16px' }}>Se încarcă harta...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`advanced-search-map ${className}`}>
      {/* Search Input */}
      <div style={{
        marginBottom: '20px',
        display: 'flex',
        gap: '12px',
        alignItems: 'center'
      }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="text"
            placeholder="Caută locația evenimentului (ex: București, Cluj-Napoca, Brașov...)"
            onChange={(e) => {
              const value = e.target.value
              if (value.length > 2) {
                // Debounce search
                clearTimeout(window.searchTimeout)
                window.searchTimeout = setTimeout(() => {
                  searchLocation(value)
                }, 500)
              }
            }}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '12px',
              fontSize: '16px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#2563eb'
              e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#d1d5db'
              e.target.style.boxShadow = 'none'
            }}
          />
          {searching && (
            <div style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '20px',
              height: '20px',
              border: '2px solid #e5e7eb',
              borderTop: '2px solid #2563eb',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          )}
        </div>
      </div>

      {/* Map Container */}
      <div style={{
        height: '400px',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid #e5e7eb',
        marginBottom: '20px'
      }}>
        <MapContainer
          center={mapCenter}
          zoom={selectedLocation ? 11 : 7}
          style={{ height: '100%', width: '100%' }}
          eventHandlers={{
            click: handleMapClick,
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {selectedLocation && (
            <>
              {/* Marker pentru locația selectată */}
              <Marker position={[selectedLocation.lat, selectedLocation.lon]}>
                <Popup>
                  <strong>Locația evenimentului</strong>
                  <br />
                  {locationName}
                </Popup>
              </Marker>

              {/* Cerc pentru zona de căutare */}
              <Circle
                center={[selectedLocation.lat, selectedLocation.lon]}
                radius={searchRadius * 1000} // convertește km în metri
                pathOptions={{
                  fillColor: 'blue',
                  fillOpacity: 0.1,
                  color: 'blue',
                  weight: 2,
                  opacity: 0.5
                }}
              />
            </>
          )}
        </MapContainer>
      </div>

      {/* Results Section */}
      {selectedLocation && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '24px'
        }}>
          {/* Furnizori locali */}
          {nearbySuppliers.length > 0 && (
            <div>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: '#111827',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                🏪 Furnizori locali
                <span style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#6b7280',
                  backgroundColor: '#f3f4f6',
                  padding: '4px 8px',
                  borderRadius: '12px'
                }}>
                  {nearbySuppliers.length} disponibili
                </span>
              </h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px'
              }}>
                {nearbySuppliers.slice(0, 6).map(supplier => (
                  <SupplierCompactCard key={supplier.id} supplier={supplier} />
                ))}
              </div>
            </div>
          )}

          {/* Furnizori mobili */}
          {mobileSuppliers.length > 0 && (
            <div>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: '#111827',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                🚗 Recomandări din apropiere
                <span style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#6b7280',
                  backgroundColor: '#f3f4f6',
                  padding: '4px 8px',
                  borderRadius: '12px'
                }}>
                  în raza {searchRadius}km
                </span>
              </h3>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px'
              }}>
                {mobileSuppliers.slice(0, 8).map(supplier => (
                  <MobileSupplierCard 
                    key={supplier.id} 
                    supplier={supplier} 
                    distance={supplier.distance}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

// Componentă compactă pentru furnizori locali
function SupplierCompactCard({ supplier }) {
  return (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      padding: '16px',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      transition: 'all 0.2s',
      cursor: 'pointer'
    }}
    onMouseOver={(e) => {
      e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      e.currentTarget.style.transform = 'translateY(-2px)'
    }}
    onMouseOut={(e) => {
      e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      e.currentTarget.style.transform = 'translateY(0)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '8px'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          backgroundColor: '#10b981',
          borderRadius: '50%'
        }} />
        <span style={{
          fontSize: '12px',
          fontWeight: '600',
          color: '#10b981'
        }}>
          LOCAL
        </span>
      </div>

      <h4 style={{
        fontSize: '16px',
        fontWeight: '700',
        color: '#111827',
        marginBottom: '8px',
        margin: '0 0 8px 0'
      }}>
        {supplier.business_name}
      </h4>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px',
        marginBottom: '12px'
      }}>
        {supplier.supplier_categories?.slice(0, 2).map((sc, index) => (
          <span key={index} style={{
            fontSize: '12px',
            backgroundColor: '#eff6ff',
            color: '#1d4ed8',
            padding: '2px 6px',
            borderRadius: '4px',
            fontWeight: '500'
          }}>
            {sc.categories.name}
          </span>
        ))}
      </div>

      {supplier.price_range && (
        <p style={{
          fontSize: '14px',
          color: '#6b7280',
          margin: '0 0 8px 0'
        }}>
          💰 {supplier.price_range}
        </p>
      )}
    </div>
  )
}

// Componentă pentru furnizori mobili
function MobileSupplierCard({ supplier, distance }) {
  return (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid #f59e0b',
      borderRadius: '12px',
      padding: '16px',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      transition: 'all 0.2s',
      cursor: 'pointer'
    }}
    onMouseOver={(e) => {
      e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      e.currentTarget.style.transform = 'translateY(-2px)'
    }}
    onMouseOut={(e) => {
      e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      e.currentTarget.style.transform = 'translateY(0)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '8px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            backgroundColor: '#f59e0b',
            borderRadius: '50%'
          }} />
          <span style={{
            fontSize: '12px',
            fontWeight: '600',
            color: '#f59e0b'
          }}>
            MOBIL
          </span>
        </div>
        <span style={{
          fontSize: '12px',
          color: '#6b7280',
          backgroundColor: '#f9fafb',
          padding: '2px 6px',
          borderRadius: '4px'
        }}>
          {distance}km
        </span>
      </div>

      <h4 style={{
        fontSize: '16px',
        fontWeight: '700',
        color: '#111827',
        marginBottom: '8px',
        margin: '0 0 8px 0'
      }}>
        {supplier.business_name}
      </h4>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px',
        marginBottom: '12px'
      }}>
        {supplier.supplier_categories?.slice(0, 2).map((sc, index) => (
          <span key={index} style={{
            fontSize: '12px',
            backgroundColor: '#fef3c7',
            color: '#92400e',
            padding: '2px 6px',
            borderRadius: '4px',
            fontWeight: '500'
          }}>
            {sc.categories.name}
          </span>
        ))}
      </div>

      <p style={{
        fontSize: '14px',
        color: '#6b7280',
        margin: 0
      }}>
        📍 {supplier.address?.split(',')[0]} • 💰 {supplier.price_range || 'La cerere'}
      </p>
    </div>
  )
}
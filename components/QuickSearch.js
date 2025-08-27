'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import LocationPicker from '@/components/LocationPicker'

export default function QuickSearch({ 
  showTitle = true,
  compact = false,
  onSearch = null // callback pentru căutare custom
}) {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedLocation, setSelectedLocation] = useState({ judet: '', localitate: '' })
  const [selectedCategory, setSelectedCategory] = useState('')
  const [categories, setCategories] = useState([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    fetchCategories()
  }, [])

  async function fetchCategories() {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('name')
    setCategories(data || [])
  }

  async function handleSearch() {
    // Validare
    if (!selectedDate && !selectedLocation.localitate && !selectedCategory) {
      alert('Selectează cel puțin un criteriu de căutare!')
      return
    }

    setIsSearching(true)

    try {
      if (onSearch) {
        // Folosește callback-ul custom dacă este furnizat
        await onSearch({
          date: selectedDate,
          location: selectedLocation,
          category: selectedCategory
        })
      } else {
        // Navigează către pagina de căutare cu parametrii
        const searchParams = new URLSearchParams()
        
        if (selectedDate) searchParams.set('date', selectedDate)
        if (selectedLocation.judet) searchParams.set('judet', selectedLocation.judet)
        if (selectedLocation.localitate) searchParams.set('localitate', selectedLocation.localitate)
        if (selectedCategory) searchParams.set('category', selectedCategory)
        
        router.push(`/search?${searchParams.toString()}`)
      }
    } catch (error) {
      console.error('Eroare la căutare:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const containerStyle = {
    backgroundColor: 'white',
    borderRadius: compact ? '12px' : '16px',
    padding: compact ? '24px' : '32px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    ...(compact && { maxWidth: '600px', margin: '0 auto' })
  }

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: compact 
      ? 'repeat(auto-fit, minmax(200px, 1fr))'
      : 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: compact ? '16px' : '20px',
    marginBottom: compact ? '20px' : '24px'
  }

  return (
    <div style={containerStyle}>
      {showTitle && (
        <div style={{ 
          textAlign: 'center', 
          marginBottom: compact ? '20px' : '32px'
        }}>
          <h2 style={{
            fontSize: compact ? '1.5rem' : '2rem',
            fontWeight: '700',
            color: '#111827',
            marginBottom: '8px'
          }}>
            Căutare Rapidă Furnizori
          </h2>
          <p style={{
            color: '#6b7280',
            fontSize: compact ? '14px' : '16px'
          }}>
            Completează criteriile pentru a găsi furnizorii potriviți
          </p>
        </div>
      )}

      <div style={gridStyle}>
        {/* Data evenimentului */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '8px'
          }}>
            📅 Data evenimentului
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: 'white',
              transition: 'border-color 0.2s',
              '&:focus': {
                borderColor: '#2563eb',
                outline: 'none'
              }
            }}
          />
        </div>

        {/* Locația */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '8px'
          }}>
            📍 Locația evenimentului
          </label>
          <LocationPicker
            value={selectedLocation}
            onChange={setSelectedLocation}
            placeholder="Alege județul și orașul"
            compact={compact}
          />
        </div>

        {/* Categoria */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '8px'
          }}>
            🎯 Categoria serviciului
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            <option value="">Toate categoriile</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Buton de căutare */}
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={handleSearch}
          disabled={isSearching}
          style={{
            padding: compact ? '12px 24px' : '14px 32px',
            backgroundColor: isSearching ? '#9ca3af' : '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: compact ? '14px' : '16px',
            fontWeight: '600',
            cursor: isSearching ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            margin: '0 auto',
            boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)',
            ...(isSearching && { transform: 'scale(0.98)' })
          }}
          onMouseOver={(e) => {
            if (!isSearching) {
              e.target.style.backgroundColor = '#1d4ed8'
              e.target.style.transform = 'translateY(-1px)'
              e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }
          }}
          onMouseOut={(e) => {
            if (!isSearching) {
              e.target.style.backgroundColor = '#2563eb'
              e.target.style.transform = 'translateY(0)'
              e.target.style.boxShadow = '0 2px 4px -1px rgba(0, 0, 0, 0.1)'
            }
          }}
        >
          {isSearching ? (
            <>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid #fff',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              Se caută...
            </>
          ) : (
            <>
              🔍 Caută furnizori
            </>
          )}
        </button>
      </div>

      {/* Sugestii rapide */}
      {!compact && (
        <div style={{
          marginTop: '24px',
          paddingTop: '24px',
          borderTop: '1px solid #f3f4f6'
        }}>
          <div style={{
            fontSize: '14px',
            color: '#6b7280',
            marginBottom: '12px',
            textAlign: 'center'
          }}>
            Căutări populare:
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            justifyContent: 'center'
          }}>
            {['Fotografie', 'Muzică', 'Locații', 'Decorațiuni', 'Catering'].map((categoryName) => {
              const category = categories.find(c => c.name === categoryName)
              return category ? (
                <button
                  key={category.id}
                  onClick={() => {
                    setSelectedCategory(category.id)
                    // Auto-search după 500ms
                    setTimeout(() => {
                      if (selectedDate || selectedLocation.localitate) {
                        handleSearch()
                      }
                    }, 500)
                  }}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: selectedCategory === category.id ? '#2563eb' : '#f3f4f6',
                    color: selectedCategory === category.id ? 'white' : '#6b7280',
                    border: 'none',
                    borderRadius: '20px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontWeight: selectedCategory === category.id ? '600' : '500'
                  }}
                  onMouseOver={(e) => {
                    if (selectedCategory !== category.id) {
                      e.target.style.backgroundColor = '#e5e7eb'
                      e.target.style.color = '#374151'
                    }
                  }}
                  onMouseOut={(e) => {
                    if (selectedCategory !== category.id) {
                      e.target.style.backgroundColor = '#f3f4f6'
                      e.target.style.color = '#6b7280'
                    }
                  }}
                >
                  {categoryName}
                </button>
              ) : null
            })}
          </div>
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
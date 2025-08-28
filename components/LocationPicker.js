'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

function removeDiacritics(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimină diacriticele
    .replace(/ă/g, 'a')
    .replace(/â/g, 'a')
    .replace(/î/g, 'i')
    .replace(/ș/g, 's')
    .replace(/ț/g, 't')
    .replace(/Ă/g, 'A')
    .replace(/Â/g, 'A')
    .replace(/Î/g, 'I')
    .replace(/Ș/g, 'S')
    .replace(/Ț/g, 'T')
}

function capitalizeFirstLetter(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

function normalizeLocationName(str) {
  const withoutDiacritics = removeDiacritics(str.trim())
  return capitalizeFirstLetter(withoutDiacritics)
}

const judete = [
  'Alba', 'Arad', 'Arges', 'Bacau', 'Bihor', 'Bistrita-Nasaud', 'Botosani', 'Braila', 
  'Brasov', 'Bucuresti', 'Buzau', 'Caras-Severin', 'Calarasi', 'Cluj', 'Constanta', 
  'Covasna', 'Dambovita', 'Dolj', 'Galati', 'Giurgiu', 'Gorj', 'Harghita', 'Hunedoara', 
  'Ialomita', 'Iasi', 'Ilfov', 'Maramures', 'Mehedinti', 'Mures', 'Neamt', 'Olt', 
  'Prahova', 'Salaj', 'Satu Mare', 'Sibiu', 'Suceava', 'Teleorman', 'Timis', 'Tulcea', 
  'Valcea', 'Vaslui', 'Vrancea'
]

export default function LocationPicker({ 
  selectedJudet = '', 
  selectedLocalitate = '', 
  onLocationChange,
  disabled = false,
  allowAddNew = true  // Nou prop pentru a controla adăugarea localităților
}) {
  const [currentJudet, setCurrentJudet] = useState(selectedJudet)
  const [currentLocalitate, setCurrentLocalitate] = useState(selectedLocalitate)
  const [localitati, setLocalitati] = useState([])
  const [loading, setLoading] = useState(false)
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customValue, setCustomValue] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredLocalitati, setFilteredLocalitati] = useState([])

  useEffect(() => {
    if (currentJudet) {
      fetchLocalitati(currentJudet)
      if (currentLocalitate && !showCustomInput) {
        checkIfLocaliateExists(currentJudet, currentLocalitate)
      }
    } else {
      setLocalitati([])
      setCurrentLocalitate('')
      setShowCustomInput(false)
      setCustomValue('')
      setSearchTerm('')
    }
  }, [currentJudet])

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = localitati.filter(localitate =>
        localitate.nume.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredLocalitati(filtered)
    } else {
      setFilteredLocalitati(localitati)
    }
  }, [localitati, searchTerm])

  useEffect(() => {
    if (onLocationChange) {
      onLocationChange({
        judet: currentJudet,
        localitate: currentLocalitate
      })
    }
  }, [currentJudet, currentLocalitate])

  async function fetchLocalitati(judet) {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('localitati')
        .select('nume, is_predefined')
        .eq('judet', judet)
        .order('is_predefined', { ascending: false })
        .order('nume')

      if (error) throw error
      setLocalitati(data || [])
    } catch (error) {
      console.error('Error fetching localitati:', error)
      setLocalitati([])
    }
    setLoading(false)
  }

  async function checkIfLocaliateExists(judet, localitate) {
    try {
      const { data } = await supabase
        .from('localitati')
        .select('nume')
        .eq('judet', judet)
        .eq('nume', localitate)
        .single()

      if (!data) {
        setCurrentLocalitate('')
      }
    } catch (error) {
      setCurrentLocalitate('')
    }
  }

  async function saveNewLocalitate(judet, localitate) {
    if (!allowAddNew) return localitate // Nu salvează dacă nu este permis
    
    try {
      const normalizedLocalitate = normalizeLocationName(localitate)
      
      const { error } = await supabase
        .from('localitati')
        .insert([{
          judet: judet,
          nume: normalizedLocalitate,
          is_predefined: false
        }])

      if (error && error.code !== '23505') {
        throw error
      }

      await fetchLocalitati(judet)
      return normalizedLocalitate
    } catch (error) {
      console.error('Error saving localitate:', error)
      return localitate
    }
  }

  const handleJudetChange = (value) => {
    setCurrentJudet(value)
    setCurrentLocalitate('')
    setShowCustomInput(false)
    setCustomValue('')
    setSearchTerm('')
  }

  const handleCustomSubmit = async () => {
    if (customValue.trim() && currentJudet && allowAddNew) {
      const normalizedLocalitate = normalizeLocationName(customValue.trim())
      
      const exists = localitati.some(l => 
        removeDiacritics(l.nume.toLowerCase()) === removeDiacritics(normalizedLocalitate.toLowerCase())
      )
      
      if (!exists) {
        const savedLocalitate = await saveNewLocalitate(currentJudet, normalizedLocalitate)
        setCurrentLocalitate(savedLocalitate)
      } else {
        setCurrentLocalitate(normalizedLocalitate)
      }
      
      setShowCustomInput(false)
      setCustomValue('')
    }
  }

  const handleCustomKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleCustomSubmit()
    }
    if (e.key === 'Escape') {
      setShowCustomInput(false)
      setCustomValue('')
    }
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '16px'
    }}>
      {/* Județul */}
      <div>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '8px'
        }}>
          Județul *
        </label>
        <select
          value={currentJudet}
          onChange={(e) => handleJudetChange(e.target.value)}
          disabled={disabled}
          style={{
            width: '100%',
            padding: '12px 16px',
            border: '1px solid #d1d5db',
            borderRadius: '12px',
            fontSize: '16px',
            backgroundColor: disabled ? '#f9fafb' : 'white',
            transition: 'all 0.2s',
            outline: 'none'
          }}
          onFocus={(e) => {
            if (!disabled) {
              e.target.style.borderColor = '#2563eb'
              e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'
            }
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#d1d5db'
            e.target.style.boxShadow = 'none'
          }}
        >
          <option value="">Selecteaza judetul</option>
          {judete.map(judet => (
            <option key={judet} value={judet}>{judet}</option>
          ))}
        </select>
      </div>

      {/* Localitatea */}
      <div>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '8px'
        }}>
          Localitatea *
        </label>
        
        {!showCustomInput ? (
          <>
            <select
              value={currentLocalitate}
              onChange={(e) => {
                const value = e.target.value
                if (value === '__ADD_NEW__' && allowAddNew) {
                  setShowCustomInput(true)
                  setCurrentLocalitate('')
                } else {
                  setCurrentLocalitate(value)
                }
              }}
              disabled={disabled || !currentJudet || loading}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '12px',
                fontSize: '16px',
                backgroundColor: disabled || !currentJudet ? '#f9fafb' : 'white',
                transition: 'all 0.2s',
                outline: 'none'
              }}
              onFocus={(e) => {
                if (!disabled && currentJudet && !loading) {
                  e.target.style.borderColor = '#2563eb'
                  e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'
                }
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#d1d5db'
                e.target.style.boxShadow = 'none'
              }}
            >
              <option value="">
                {loading ? 'Se incarca...' : 'Selecteaza localitatea'}
              </option>
              {localitati.map((localitate, index) => (
                <option key={index} value={localitate.nume}>
                  {localitate.nume}
                  {!localitate.is_predefined ? ' (Custom)' : ''}
                </option>
              ))}
              {allowAddNew && currentJudet && !loading && (
                <option value="__ADD_NEW__" style={{ fontWeight: 'bold', color: '#16a34a' }}>
                  + Adaugă localitate nouă
                </option>
              )}
            </select>
            
            {/* Helper text */}
            {currentJudet && !loading && (
              <div style={{
                fontSize: '12px',
                color: '#6b7280',
                marginTop: '4px'
              }}>
                {currentLocalitate ? 
                  `Selectat: ${currentLocalitate}` :
                  `${localitati.length} localități disponibile`
                }
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{
              display: 'flex',
              gap: '8px'
            }}>
              <input
                type="text"
                value={customValue}
                onChange={(e) => {
                  const normalizedValue = normalizeLocationName(e.target.value)
                  setCustomValue(normalizedValue)
                }}
                onKeyDown={handleCustomKeyDown}
                placeholder="Numele localitatii..."
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: '2px solid #2563eb',
                  borderRadius: '12px',
                  fontSize: '16px',
                  outline: 'none',
                  boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.1)'
                }}
                autoFocus
              />
              <button
                type="button"
                onClick={handleCustomSubmit}
                disabled={!customValue.trim()}
                style={{
                  padding: '12px 16px',
                  backgroundColor: customValue.trim() ? '#16a34a' : '#9ca3af',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: customValue.trim() ? 'pointer' : 'not-allowed',
                  fontWeight: '600',
                  fontSize: '14px'
                }}
              >
                ✓
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCustomInput(false)
                  setCustomValue('')
                }}
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px'
                }}
              >
                ✕
              </button>
            </div>
            <div style={{
              fontSize: '12px',
              color: '#2563eb',
              marginTop: '4px'
            }}>
              Apasa Enter pentru a salva sau Escape pentru a anula
            </div>
          </>
        )}
      </div>
    </div>
  )
}
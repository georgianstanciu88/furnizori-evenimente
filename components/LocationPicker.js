'use client'
import { useState, useEffect } from 'react'
import { romaniaData, judete } from '@/data/romania'

export default function LocationPicker({ 
  selectedJudet = '', 
  selectedLocalitate = '', 
  onLocationChange,
  disabled = false 
}) {
  const [currentJudet, setCurrentJudet] = useState(selectedJudet)
  const [currentLocalitate, setCurrentLocalitate] = useState(selectedLocalitate)
  const [customLocalitate, setCustomLocalitate] = useState('')
  const [localitati, setLocalitati] = useState([])

  useEffect(() => {
    if (currentJudet) {
      setLocalitati(romaniaData[currentJudet] || [])
      // Verifică dacă localitatea selectată există în lista noului județ
      if (!romaniaData[currentJudet]?.includes(currentLocalitate) && currentLocalitate !== 'custom') {
        setCurrentLocalitate('')
      }
    } else {
      setLocalitati([])
      setCurrentLocalitate('')
      setCustomLocalitate('')
    }
  }, [currentJudet])

  useEffect(() => {
    if (onLocationChange) {
      onLocationChange({
        judet: currentJudet,
        localitate: currentLocalitate === 'custom' ? customLocalitate : currentLocalitate
      })
    }
  }, [currentJudet, currentLocalitate, customLocalitate])

  const handleLocaliateChange = (value) => {
    if (value === 'custom') {
      setCurrentLocalitate('custom')
      setCustomLocalitate('')
    } else {
      setCurrentLocalitate(value)
      setCustomLocalitate('')
    }
  }

  const handleCustomChange = (value) => {
    setCustomLocalitate(value)
    if (value.trim()) {
      setCurrentLocalitate(value.trim())
    }
  }

  return (
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
          marginBottom: '8px'
        }}>
          Județul *
        </label>
        <select
          value={currentJudet}
          onChange={(e) => setCurrentJudet(e.target.value)}
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
          <option value="">Selectează județul</option>
          {judete.map(judet => (
            <option key={judet} value={judet}>{judet}</option>
          ))}
        </select>
      </div>

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
        
        {/* Select pentru localități */}
        <select
  value={localitati.includes(currentLocalitate) ? currentLocalitate : (currentLocalitate && currentLocalitate !== 'custom' ? 'custom' : '')}
  onChange={(e) => handleLocaliateChange(e.target.value)}
          disabled={disabled || !currentJudet}
          style={{
            width: '100%',
            padding: '12px 16px',
            border: '1px solid #d1d5db',
            borderRadius: '12px',
            fontSize: '16px',
            backgroundColor: disabled || !currentJudet ? '#f9fafb' : 'white',
            transition: 'all 0.2s',
            outline: 'none',
            marginBottom: currentLocalitate === 'custom' && currentJudet ? '12px' : '0'
          }}
          onFocus={(e) => {
            if (!disabled && currentJudet) {
              e.target.style.borderColor = '#2563eb'
              e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'
            }
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#d1d5db'
            e.target.style.boxShadow = 'none'
          }}
        >
          <option value="">Selectează localitatea</option>
          {localitati.map(localitate => (
            <option key={localitate} value={localitate}>{localitate}</option>
          ))}
          <option value="custom"> Altă localitate (introdu manual)</option>
        </select>

        {/* Input pentru localitate custom */}
        {(currentLocalitate === 'custom' && currentJudet) && (
          <input
            type="text"
            value={currentLocalitate === 'custom' ? customLocalitate : currentLocalitate}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder="Introdu numele localității"
            required
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #2563eb',
              borderRadius: '12px',
              fontSize: '16px',
              outline: 'none',
              boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.1)'
            }}
            autoFocus
          />
        )}

        {/* Helper text */}
        {currentJudet && (
          <div style={{
            fontSize: '12px',
            color: '#6b7280',
            marginTop: '4px'
          }}>
            {localitati.length} localități disponibile sau introdu manual
          </div>
        )}
      </div>
    </div>
  )
}
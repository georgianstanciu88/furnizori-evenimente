'use client'
import { useState } from 'react'

export default function Calendar({ unavailableDates = [], onDateClick }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  
  const monthNames = [
    'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
    'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
  ]
  
  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate()
  
  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay()
  
  const isDateUnavailable = (day) => {
  const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day, 12, 0, 0)
  return unavailableDates.some(d => {
    const compareDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0)
    return compareDate.getTime() === date.getTime()
  })
}

const isPastDate = (day) => {
  const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day, 12, 0, 0)
  const today = new Date()
  const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0)
  return date < todayNormalized
}
  
  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }
  
  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }
  
  const handleDateClick = (day) => {
  if (!isPastDate(day) && onDateClick) {
    // Fixez timezone-ul pentru data corectă
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day, 12, 0, 0)
    onDateClick(date)
  }
}
  
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <button
          onClick={handlePrevMonth}
          style={{
            padding: '8px 12px',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = '#f3f4f6'
            e.target.style.borderColor = '#d1d5db'
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = 'white'
            e.target.style.borderColor = '#e5e7eb'
          }}
        >
          ←
        </button>
        
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#111827',
          margin: 0
        }}>
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        
        <button
          onClick={handleNextMonth}
          style={{
            padding: '8px 12px',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = '#f3f4f6'
            e.target.style.borderColor = '#d1d5db'
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = 'white'
            e.target.style.borderColor = '#e5e7eb'
          }}
        >
          →
        </button>
      </div>
      
      {/* Days of week */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '4px',
        marginBottom: '8px'
      }}>
        {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map(day => (
          <div key={day} style={{
            textAlign: 'center',
            fontSize: '14px',
            fontWeight: '600',
            color: '#6b7280',
            padding: '8px 4px'
          }}>
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '4px'
      }}>
        {/* Empty cells for first week */}
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} style={{ padding: '8px' }}></div>
        ))}
        
        {/* Days */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const isUnavailable = isDateUnavailable(day)
          const isPast = isPastDate(day)
          
          return (
            <button
              key={day}
              onClick={() => handleDateClick(day)}
              disabled={isPast}
              style={{
                padding: '12px 8px',
                textAlign: 'center',
                borderRadius: '8px',
                border: 'none',
                cursor: isPast ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                fontSize: '14px',
                fontWeight: '500',
                backgroundColor: isPast 
                  ? '#f9fafb' 
                  : isUnavailable 
                    ? '#fecaca' 
                    : '#f0fdf4',
                color: isPast 
                  ? '#9ca3af' 
                  : isUnavailable 
                    ? '#991b1b' 
                    : '#15803d',
                border: isPast 
                  ? '1px solid #f3f4f6' 
                  : isUnavailable 
                    ? '1px solid #fca5a5' 
                    : '1px solid #bbf7d0'
              }}
              onMouseOver={(e) => {
                if (!isPast) {
                  if (isUnavailable) {
                    e.target.style.backgroundColor = '#fca5a5'
                  } else {
                    e.target.style.backgroundColor = '#dcfce7'
                  }
                }
              }}
              onMouseOut={(e) => {
                if (!isPast) {
                  if (isUnavailable) {
                    e.target.style.backgroundColor = '#fecaca'
                  } else {
                    e.target.style.backgroundColor = '#f0fdf4'
                  }
                }
              }}
            >
              {day}
            </button>
          )
        })}
      </div>
      
      {/* Legend */}
      <div style={{
        marginTop: '20px',
        display: 'flex',
        justifyContent: 'center',
        gap: '24px',
        fontSize: '14px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            width: '16px',
            height: '16px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '4px'
          }}></div>
          <span style={{ color: '#374151' }}>Disponibil</span>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            width: '16px',
            height: '16px',
            backgroundColor: '#fecaca',
            border: '1px solid #fca5a5',
            borderRadius: '4px'
          }}></div>
          <span style={{ color: '#374151' }}>Indisponibil</span>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            width: '16px',
            height: '16px',
            backgroundColor: '#f9fafb',
            border: '1px solid #f3f4f6',
            borderRadius: '4px'
          }}></div>
          <span style={{ color: '#9ca3af' }}>Trecut</span>
        </div>
      </div>
    </div>
  )
}
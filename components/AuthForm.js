'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function AuthForm({ mode, onSubmit, loading }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [userType, setUserType] = useState('client')
  
  const handleSubmit = (e) => {
    e.preventDefault()
    if (mode === 'register') {
      onSubmit(email, password, userType)
    } else {
      onSubmit(email, password)
    }
  }
  
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: '32px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e5e7eb',
      width: '100%',
      maxWidth: '400px'
    }}>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Email
          </label>
          <input
            type="email"
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="exemplu@email.com"
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
        
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Parolă
          </label>
          <input
            type="password"
            required
            minLength="6"
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minim 6 caractere"
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
        
        {mode === 'register' && (
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '12px'
            }}>
              Tip Cont
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                padding: '12px 16px',
                border: userType === 'client' ? '2px solid #2563eb' : '2px solid #e5e7eb',
                borderRadius: '12px',
                backgroundColor: userType === 'client' ? '#eff6ff' : 'white',
                transition: 'all 0.2s'
              }}>
                <input
                  type="radio"
                  name="userType"
                  value="client"
                  checked={userType === 'client'}
                  onChange={(e) => setUserType(e.target.value)}
                  style={{ marginRight: '12px', accentColor: '#2563eb' }}
                />
                <div>
                  <div style={{ fontWeight: '600', color: '#111827' }}>Client</div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>Caut furnizori pentru evenimente</div>
                </div>
              </label>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                padding: '12px 16px',
                border: userType === 'furnizor' ? '2px solid #2563eb' : '2px solid #e5e7eb',
                borderRadius: '12px',
                backgroundColor: userType === 'furnizor' ? '#eff6ff' : 'white',
                transition: 'all 0.2s'
              }}>
                <input
                  type="radio"
                  name="userType"
                  value="furnizor"
                  checked={userType === 'furnizor'}
                  onChange={(e) => setUserType(e.target.value)}
                  style={{ marginRight: '12px', accentColor: '#2563eb' }}
                />
                <div>
                  <div style={{ fontWeight: '600', color: '#111827' }}>Furnizor</div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>Ofer servicii pentru evenimente</div>
                </div>
              </label>
            </div>
          </div>
        )}
        
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            backgroundColor: loading ? '#9ca3af' : '#2563eb',
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
              e.target.style.backgroundColor = '#1d4ed8'
            }
          }}
          onMouseOut={(e) => {
            if (!loading) {
              e.target.style.backgroundColor = '#2563eb'
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
              Se procesează...
            </>
          ) : (
            mode === 'register' ? 'Creează cont' : 'Conectează-te'
          )}
        </button>
        
        <div style={{
          marginTop: '24px',
          textAlign: 'center',
          fontSize: '14px',
          color: '#6b7280'
        }}>
          {mode === 'register' ? (
            <p style={{ margin: 0 }}>
              Ai deja cont? 
              <Link 
                href="/login" 
                style={{ 
                  color: '#2563eb', 
                  textDecoration: 'none',
                  fontWeight: '600',
                  marginLeft: '4px'
                }}
                onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                onMouseOut={(e) => e.target.style.textDecoration = 'none'}
              >
                Conectează-te
              </Link>
            </p>
          ) : (
            <p style={{ margin: 0 }}>
              Nu ai cont? 
              <Link 
                href="/register" 
                style={{ 
                  color: '#2563eb', 
                  textDecoration: 'none',
                  fontWeight: '600',
                  marginLeft: '4px'
                }}
                onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                onMouseOut={(e) => e.target.style.textDecoration = 'none'}
              >
                Înregistrează-te
              </Link>
            </p>
          )}
        </div>
      </form>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
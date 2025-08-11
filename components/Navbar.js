'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Navbar() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    checkUser()
    
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
    setMobileMenuOpen(false)
  }

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      backgroundColor: 'white',
      borderBottom: '1px solid #e5e7eb',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 16px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '64px'
        }}>
          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
            <div style={{
              width: '40px',
              height: '40px',
              backgroundColor: '#2563eb',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ color: 'white', fontWeight: '700', fontSize: '18px' }}>E</span>
            </div>
            <span style={{ fontSize: '20px', fontWeight: '700', color: '#111827' }}>EventPro</span>
          </Link>

          {/* Desktop Navigation */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            <div style={{ display: 'none', alignItems: 'center', gap: '32px' }} className="desktop-nav">
              <Link 
                href="/" 
                style={{
                  color: '#6b7280',
                  fontWeight: '500',
                  textDecoration: 'none',
                  transition: 'color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.color = '#111827'}
                onMouseOut={(e) => e.target.style.color = '#6b7280'}
              >
                Acasă
              </Link>
              <Link 
                href="/search" 
                style={{
                  color: '#6b7280',
                  fontWeight: '500',
                  textDecoration: 'none',
                  transition: 'color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.color = '#111827'}
                onMouseOut={(e) => e.target.style.color = '#6b7280'}
              >
                Caută
              </Link>
              {user && (
                <Link 
                  href="/dashboard" 
                  style={{
                    color: '#6b7280',
                    fontWeight: '500',
                    textDecoration: 'none',
                    transition: 'color 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.color = '#111827'}
                  onMouseOut={(e) => e.target.style.color = '#6b7280'}
                >
                  Dashboard
                </Link>
              )}
            </div>
          </nav>

          {/* Desktop Actions */}
          <div style={{ display: 'none', alignItems: 'center', gap: '16px' }} className="desktop-actions">
            {user ? (
              <>
                <Link 
                  href="/profile" 
                  style={{
                    color: '#6b7280',
                    fontWeight: '500',
                    textDecoration: 'none',
                    transition: 'color 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.color = '#111827'}
                  onMouseOut={(e) => e.target.style.color = '#6b7280'}
                >
                  Profil
                </Link>
                <button 
                  onClick={handleLogout} 
                  style={{
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontWeight: '500',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                >
                  Ieșire
                </button>
              </>
            ) : (
              <>
                <Link 
                  href="/login" 
                  style={{
                    color: '#6b7280',
                    fontWeight: '500',
                    textDecoration: 'none',
                    transition: 'color 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.color = '#111827'}
                  onMouseOut={(e) => e.target.style.color = '#6b7280'}
                >
                  Conectare
                </Link>
                <Link 
                  href="/register" 
                  style={{
                    backgroundColor: '#2563eb',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontWeight: '500',
                    textDecoration: 'none',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
                >
                  Înregistrare
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: 'block',
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            className="mobile-menu-btn"
            onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            <svg width="24" height="24" fill="none" stroke="#6b7280" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div style={{
            display: 'block',
            borderTop: '1px solid #e5e7eb',
            paddingTop: '16px',
            paddingBottom: '16px',
            backgroundColor: 'white'
          }} className="mobile-menu">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Link 
                href="/" 
                style={{
                  display: 'block',
                  padding: '8px 16px',
                  color: '#6b7280',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  transition: 'all 0.2s'
                }}
                onClick={() => setMobileMenuOpen(false)}
                onMouseOver={(e) => {
                  e.target.style.color = '#111827'
                  e.target.style.backgroundColor = '#f3f4f6'
                }}
                onMouseOut={(e) => {
                  e.target.style.color = '#6b7280'
                  e.target.style.backgroundColor = 'transparent'
                }}
              >
                Acasă
              </Link>
              <Link 
                href="/search" 
                style={{
                  display: 'block',
                  padding: '8px 16px',
                  color: '#6b7280',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  transition: 'all 0.2s'
                }}
                onClick={() => setMobileMenuOpen(false)}
                onMouseOver={(e) => {
                  e.target.style.color = '#111827'
                  e.target.style.backgroundColor = '#f3f4f6'
                }}
                onMouseOut={(e) => {
                  e.target.style.color = '#6b7280'
                  e.target.style.backgroundColor = 'transparent'
                }}
              >
                Caută
              </Link>
              {user ? (
                <>
                  <Link 
                    href="/dashboard" 
                    style={{
                      display: 'block',
                      padding: '8px 16px',
                      color: '#6b7280',
                      textDecoration: 'none',
                      borderRadius: '8px',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => setMobileMenuOpen(false)}
                    onMouseOver={(e) => {
                      e.target.style.color = '#111827'
                      e.target.style.backgroundColor = '#f3f4f6'
                    }}
                    onMouseOut={(e) => {
                      e.target.style.color = '#6b7280'
                      e.target.style.backgroundColor = 'transparent'
                    }}
                  >
                    Dashboard
                  </Link>
                  <Link 
                    href="/profile" 
                    style={{
                      display: 'block',
                      padding: '8px 16px',
                      color: '#6b7280',
                      textDecoration: 'none',
                      borderRadius: '8px',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => setMobileMenuOpen(false)}
                    onMouseOver={(e) => {
                      e.target.style.color = '#111827'
                      e.target.style.backgroundColor = '#f3f4f6'
                    }}
                    onMouseOut={(e) => {
                      e.target.style.color = '#6b7280'
                      e.target.style.backgroundColor = 'transparent'
                    }}
                  >
                    Profil
                  </Link>
                  <button 
                    onClick={handleLogout} 
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 16px',
                      color: '#ef4444',
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#fef2f2'}
                    onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    Deconectare
                  </button>
                </>
              ) : (
                <>
                  <Link 
                    href="/login" 
                    style={{
                      display: 'block',
                      padding: '8px 16px',
                      color: '#6b7280',
                      textDecoration: 'none',
                      borderRadius: '8px',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => setMobileMenuOpen(false)}
                    onMouseOver={(e) => {
                      e.target.style.color = '#111827'
                      e.target.style.backgroundColor = '#f3f4f6'
                    }}
                    onMouseOut={(e) => {
                      e.target.style.color = '#6b7280'
                      e.target.style.backgroundColor = 'transparent'
                    }}
                  >
                    Conectare
                  </Link>
                  <Link 
                    href="/register" 
                    style={{
                      display: 'block',
                      margin: '8px 16px 0',
                      padding: '8px 16px',
                      backgroundColor: '#2563eb',
                      color: 'white',
                      borderRadius: '8px',
                      fontWeight: '500',
                      textAlign: 'center',
                      textDecoration: 'none',
                      transition: 'background-color 0.2s'
                    }}
                    onClick={() => setMobileMenuOpen(false)}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
                  >
                    Înregistrare
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @media (min-width: 768px) {
          .desktop-nav {
            display: flex !important;
          }
          .desktop-actions {
            display: flex !important;
          }
          .mobile-menu-btn {
            display: none !important;
          }
          .mobile-menu {
            display: none !important;
          }
        }
      `}</style>
    </header>
  )
}
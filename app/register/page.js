'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AuthForm from '@/components/AuthForm'

export default function Register() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleRegister(email, password, userType) {
    setLoading(true)
    
    // Înregistrare user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      alert(authError.message)
      setLoading(false)
      return
    }

    // Creează profil
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: authData.user.id,
        email: email,
        user_type: userType
      }])

    if (profileError) {
      alert(profileError.message)
      setLoading(false)
      return
    }

    alert('Cont creat cu succes! Verifică email-ul pentru confirmare.')
    router.push('/login')
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      paddingTop: '64px',
      fontFamily: 'Inter, system-ui, sans-serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div className="register-container" style={{
        width: '100%',
        maxWidth: '500px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '32px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            backgroundColor: '#2563eb',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <span style={{ 
              color: 'white', 
              fontWeight: '700', 
              fontSize: '20px' 
            }}>E</span>
          </div>
          
          <h1 className="register-title" style={{
            fontSize: '1.75rem',
            fontWeight: '800',
            color: '#111827',
            marginBottom: '8px',
            margin: '0 0 8px 0'
          }}>
            Creează cont nou
          </h1>
          <p style={{
            fontSize: '1rem',
            color: '#6b7280',
            margin: 0
          }}>
            Alătură-te comunității EventPro și găsește furnizorii perfecți
          </p>
        </div>

        {/* Auth Form */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '24px'
        }}>
          <AuthForm 
            mode="register" 
            onSubmit={handleRegister}
            loading={loading}
          />
        </div>

        {/* Benefits */}
        <div style={{
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          marginBottom: '20px'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '12px',
            margin: '0 0 12px 0'
          }}>
            Ce obții cu un cont EventPro:
          </h3>
          <div className="benefits-grid" style={{
            display: 'grid',
            gap: '8px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                backgroundColor: '#10b981',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '2px'
              }}>
                <span style={{ color: 'white', fontSize: '10px' }}>✓</span>
              </div>
              <span style={{ fontSize: '14px', color: '#374151', lineHeight: '1.4' }}>
                Acces la toate detaliile furnizorilor
              </span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                backgroundColor: '#10b981',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '2px'
              }}>
                <span style={{ color: 'white', fontSize: '10px' }}>✓</span>
              </div>
              <span style={{ fontSize: '14px', color: '#374151', lineHeight: '1.4' }}>
                Căutare după disponibilitate
              </span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                backgroundColor: '#10b981',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '2px'
              }}>
                <span style={{ color: 'white', fontSize: '10px' }}>✓</span>
              </div>
              <span style={{ fontSize: '14px', color: '#374151', lineHeight: '1.4' }}>
                Contact direct cu furnizorii
              </span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                backgroundColor: '#10b981',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '2px'
              }}>
                <span style={{ color: 'white', fontSize: '10px' }}>✓</span>
              </div>
              <span style={{ fontSize: '14px', color: '#374151', lineHeight: '1.4' }}>
                Suport 24/7 pentru evenimente
              </span>
            </div>
          </div>
        </div>

        {/* Terms */}
        <div style={{
          textAlign: 'center',
          fontSize: '12px',
          color: '#6b7280',
          lineHeight: '1.5',
          padding: '0 20px'
        }}>
          Prin crearea contului, ești de acord cu{' '}
          <a 
            href="/terms" 
            style={{ color: '#2563eb', textDecoration: 'none' }}
            onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
            onMouseOut={(e) => e.target.style.textDecoration = 'none'}
          >
            Termenii și Condițiile
          </a>
          {' '}și{' '}
          <a 
            href="/privacy" 
            style={{ color: '#2563eb', textDecoration: 'none' }}
            onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
            onMouseOut={(e) => e.target.style.textDecoration = 'none'}
          >
            Politica de Confidențialitate
          </a>
          .
        </div>
      </div>

      <style jsx>{`
        /* Mobile-first responsive design */
        .register-container {
          max-width: 400px !important;
        }
        
        .register-title {
          font-size: 2rem !important;
        }
        
        .benefits-grid {
          gap: 8px !important;
        }
        
        /* Tablet breakpoint */
        @media (min-width: 640px) {
          .register-container {
            max-width: 500px !important;
          }
          
          .register-title {
            font-size: 1.75rem !important;
          }
          
          .benefits-grid {
            gap: 10px !important;
          }
        }
        
        /* Desktop breakpoint */
        @media (min-width: 1024px) {
          .register-container {
            max-width: 550px !important;
          }
          
          .register-title {
            font-size: 2rem !important;
          }
          
          .benefits-grid {
            gap: 12px !important;
          }
        }
      `}</style>
    </div>
  )
}
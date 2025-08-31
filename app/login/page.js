'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AuthForm from '@/components/AuthForm'

export default function Login() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleLogin(email, password) {
    setLoading(true)
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
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
      <div className="login-container" style={{
        width: '100%',
        maxWidth: '400px',
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
          
          <h1 className="login-title" style={{
            fontSize: '1.75rem',
            fontWeight: '800',
            color: '#111827',
            marginBottom: '8px',
            margin: '0 0 8px 0'
          }}>
            Bun venit înapoi
          </h1>
          <p style={{
            fontSize: '1rem',
            color: '#6b7280',
            margin: 0
          }}>
            Conectează-te la contul tău EventPro
          </p>
        </div>

        {/* Auth Form */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '24px'
        }}>
          <AuthForm 
            mode="login" 
            onSubmit={handleLogin}
            loading={loading}
          />
        </div>

        {/* Footer Links */}
        <div style={{
          textAlign: 'center',
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{
            fontSize: '14px',
            color: '#6b7280',
            marginBottom: '12px'
          }}>
            Probleme cu conectarea?
          </div>
          <div className="footer-links" style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            flexWrap: 'wrap',
            fontSize: '14px'
          }}>
            <a 
              href="mailto:support@eventpro.ro"
              style={{
                color: '#2563eb',
                textDecoration: 'none',
                fontWeight: '500'
              }}
              onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
              onMouseOut={(e) => e.target.style.textDecoration = 'none'}
            >
              Contactează suportul
            </a>
            <span style={{ color: '#d1d5db' }}>•</span>
            <a 
              href="/help"
              style={{
                color: '#2563eb',
                textDecoration: 'none',
                fontWeight: '500'
              }}
              onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
              onMouseOut={(e) => e.target.style.textDecoration = 'none'}
            >
              Ajutor
            </a>
          </div>
        </div>
      </div>

      <style jsx>{`
        /* Mobile-first responsive design */
        .login-container {
          max-width: 350px !important;
        }
        
        .login-title {
          font-size: 2rem !important;
        }
        
        .footer-links {
          flex-direction: column !important;
          gap: 8px !important;
        }
        
        .footer-links span {
          display: none !important;
        }
        
        /* Tablet breakpoint */
        @media (min-width: 640px) {
          .login-container {
            max-width: 400px !important;
          }
          
          .login-title {
            font-size: 1.75rem !important;
          }
          
          .footer-links {
            flex-direction: row !important;
            gap: 12px !important;
          }
          
          .footer-links span {
            display: inline !important;
          }
        }
        
        /* Desktop breakpoint */
        @media (min-width: 1024px) {
          .login-container {
            max-width: 450px !important;
          }
          
          .login-title {
            font-size: 2rem !important;
          }
        }
      `}</style>
    </div>
  )
}
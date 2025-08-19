'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Calendar from '@/components/Calendar'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [supplierProfile, setSupplierProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [unavailableDates, setUnavailableDates] = useState([])
  const [supplierId, setSupplierId] = useState(null)
  const [undoAction, setUndoAction] = useState(null) // Pentru undo functionality

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    setUser(user)

    // Fetch profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    setProfile(profileData)

    // If furnizor, fetch supplier profile
    if (profileData?.user_type === 'furnizor') {
      const { data: supplierData } = await supabase
        .from('suppliers')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (supplierData) {
        setSupplierProfile(supplierData)
        setSupplierId(supplierData.id)
        await fetchUnavailableDates(supplierData.id)
      }
    }

    setLoading(false)
  }

  async function fetchUnavailableDates(supplierId) {
    const { data } = await supabase
      .from('unavailable_dates')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('date')

    setUnavailableDates(data ? data.map(d => ({
      ...d,
      dateObj: new Date(d.date)
    })) : [])
  }

  async function toggleDate(date) {
    if (!supplierId) {
      showToast('Eroare la încărcarea datelor!', 'error')
      return
    }

    const dateStr = date.toISOString().split('T')[0]
    const existingDate = unavailableDates.find(d => 
      d.dateObj.toDateString() === date.toDateString()
    )

    if (existingDate) {
      // Dacă data există, o ștergem instant cu opțiune de undo
      const tempRemovedDate = existingDate
      setUnavailableDates(unavailableDates.filter(d => d.id !== existingDate.id))
      
      // Șterge din baza de date
      await supabase
        .from('unavailable_dates')
        .delete()
        .eq('id', existingDate.id)

      // Afișează toast cu undo
      setUndoAction({
        type: 'restore',
        data: tempRemovedDate,
        message: 'Data marcată ca disponibilă'
      })
      
      // Auto-clear undo după 5 secunde
      setTimeout(() => setUndoAction(null), 5000)
      
    } else {
      // Dacă data nu există, o adăugăm instant cu opțiune de undo
      const tempDate = {
        supplier_id: supplierId,
        date: dateStr,
        dateObj: date,
        temp_id: Date.now() // ID temporar până salvăm în DB
      }
      
      setUnavailableDates([...unavailableDates, tempDate])

      // Salvează în baza de date
      const { data: savedData, error } = await supabase
        .from('unavailable_dates')
        .insert([{
          supplier_id: supplierId,
          date: dateStr
        }])
        .select()
        .single()

      if (!error && savedData) {
        // Înlocuiește data temporară cu cea din DB
        setUnavailableDates(prev => prev.map(d => 
          d.temp_id === tempDate.temp_id 
            ? { ...savedData, dateObj: new Date(savedData.date) }
            : d
        ))

        // Afișează toast cu undo
        setUndoAction({
          type: 'remove',
          data: savedData,
          message: 'Data marcată ca indisponibilă'
        })
        
        // Auto-clear undo după 5 secunde
        setTimeout(() => setUndoAction(null), 5000)
      } else {
        // Dacă salvarea a eșuat, remove din UI
        setUnavailableDates(prev => prev.filter(d => d.temp_id !== tempDate.temp_id))
        showToast('Eroare la salvare!', 'error')
      }
    }
  }

  // Funcție pentru undo
  async function handleUndo() {
    if (!undoAction) return

    if (undoAction.type === 'restore') {
      // Restaurează data ștearsă
      const { data: restoredData, error } = await supabase
        .from('unavailable_dates')
        .insert([{
          supplier_id: supplierId,
          date: undoAction.data.date
        }])
        .select()
        .single()

      if (!error && restoredData) {
        setUnavailableDates(prev => [...prev, {
          ...restoredData,
          dateObj: new Date(restoredData.date)
        }])
        showToast('Data restaurată cu succes!', 'success')
      }
    } else if (undoAction.type === 'remove') {
      // Șterge data adăugată
      await supabase
        .from('unavailable_dates')
        .delete()
        .eq('id', undoAction.data.id)

      setUnavailableDates(prev => prev.filter(d => d.id !== undoAction.data.id))
      showToast('Data eliminată cu succes!', 'success')
    }

    setUndoAction(null)
  }

  // Funcție pentru toast notifications
  function showToast(message, type) {
    // În loc de alert, poți implementa un sistem de toast
    // Pentru acum folosim alert dar cu mesaje mai scurte
    if (type === 'error') {
      alert('❌ ' + message)
    } else {
      // Nu mai afișăm toast pentru acțiuni normale - doar undo bar-ul
    }
  }

  async function deleteUnavailableDate(dateId) {
    if (!confirm('Ești sigur că vrei să ștergi această dată indisponibilă?')) {
      return
    }

    const dateToDelete = unavailableDates.find(d => d.id === dateId)
    setUnavailableDates(unavailableDates.filter(d => d.id !== dateId))

    const { error } = await supabase
      .from('unavailable_dates')
      .delete()
      .eq('id', dateId)

    if (!error) {
      // Afișează undo bar
      setUndoAction({
        type: 'restore',
        data: dateToDelete,
        message: 'Data ștearsă din listă'
      })
      
      // Auto-clear undo după 5 secunde
      setTimeout(() => setUndoAction(null), 5000)
    } else {
      // Dacă ștergerea a eșuat, restaurează în UI
      setUnavailableDates(prev => [...prev, dateToDelete])
      showToast('Eroare la ștergere!', 'error')
    }
  }

  if (loading) {
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
      <div className="dashboard-container" style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '20px 16px'
      }}>
        {/* Header */}
        <div className="dashboard-header" style={{ marginBottom: '24px' }}>
          <h1 className="dashboard-title" style={{
            fontSize: '1.75rem',
            fontWeight: '800',
            color: '#111827',
            marginBottom: '8px',
            margin: '0 0 8px 0'
          }}>
            Dashboard
          </h1>
          <p className="dashboard-subtitle" style={{
            fontSize: '1rem',
            color: '#6b7280',
            margin: 0
          }}>
            Bun venit înapoi, {profile?.email.split('@')[0]}!
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="dashboard-grid" style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '16px'
        }}>
          
          {/* Account Info */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                backgroundColor: '#eff6ff',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="16" height="16" fill="none" stroke="#2563eb" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 style={{
                fontSize: '1.125rem',
                fontWeight: '700',
                color: '#111827',
                margin: 0
              }}>
                Informații Cont
              </h2>
            </div>
            
            <div style={{ marginBottom: '12px' }}>
              <div style={{
                fontSize: '14px',
                color: '#6b7280',
                marginBottom: '4px'
              }}>
                Email
              </div>
              <div style={{
                fontSize: '16px',
                fontWeight: '500',
                color: '#111827'
              }}>
                {profile?.email}
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <div style={{
                fontSize: '14px',
                color: '#6b7280',
                marginBottom: '4px'
              }}>
                Tip cont
              </div>
              <div style={{
                display: 'inline-block',
                padding: '4px 8px',
                backgroundColor: profile?.user_type === 'furnizor' ? '#fef3c7' : '#dbeafe',
                color: profile?.user_type === 'furnizor' ? '#92400e' : '#1e40af',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                {profile?.user_type === 'furnizor' ? '🏢 Furnizor' : '👤 Client'}
              </div>
            </div>
          </div>

          {/* Supplier Profile Section - doar pentru furnizori */}
          {profile?.user_type === 'furnizor' && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg width="16" height="16" fill="none" stroke="#16a34a" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h2 style={{
                  fontSize: '1.125rem',
                  fontWeight: '700',
                  color: '#111827',
                  margin: 0
                }}>
                  Profil Furnizor
                </h2>
              </div>

              {supplierProfile ? (
                <div>
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{
                      fontSize: '14px',
                      color: '#6b7280',
                      marginBottom: '4px'
                    }}>
                      Nume afacere
                    </div>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#111827'
                    }}>
                      {supplierProfile.business_name}
                    </div>
                  </div>

                  {supplierProfile.description && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{
                        fontSize: '14px',
                        color: '#6b7280',
                        marginBottom: '4px'
                      }}>
                        Descriere
                      </div>
                      <div style={{
  fontSize: '14px',
  color: '#374151',
  lineHeight: '1.5',
  display: '-webkit-box',
  WebkitLineClamp: 3,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
}}>
  {supplierProfile.description}
</div>
                    </div>
                  )}

                  <Link 
                    href="/profile" 
                    style={{
                      display: 'inline-block',
                      backgroundColor: '#2563eb',
                      color: 'white',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      fontWeight: '600',
                      fontSize: '14px',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
                  >
                    ✏️ Editează Profilul
                  </Link>
                </div>
              ) : (
                <div>
                  <div style={{
                    padding: '16px',
                    backgroundColor: '#fef3c7',
                    borderRadius: '12px',
                    marginBottom: '16px',
                    border: '1px solid #fbbf24'
                  }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#92400e',
                      marginBottom: '8px'
                    }}>
                      ⚠️ Profil incomplet
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: '#92400e',
                      lineHeight: '1.5'
                    }}>
                      Pentru a apărea în căutările clienților, trebuie să completezi profilul de furnizor.
                    </div>
                  </div>

                  <Link 
                    href="/profile" 
                    style={{
                      display: 'inline-block',
                      backgroundColor: '#16a34a',
                      color: 'white',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      fontWeight: '600',
                      fontSize: '14px',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#15803d'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#16a34a'}
                  >
                    🚀 Creează Profil Furnizor
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Client Section - doar pentru clienți */}
          {profile?.user_type === 'client' && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: '#fef3c7',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg width="16" height="16" fill="none" stroke="#f59e0b" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h2 style={{
                  fontSize: '1.125rem',
                  fontWeight: '700',
                  color: '#111827',
                  margin: 0
                }}>
                  Acțiuni Rapide
                </h2>
              </div>

              <div style={{
                display: 'grid',
                gap: '12px'
              }}>
                <Link 
                  href="/search" 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px',
                    backgroundColor: '#eff6ff',
                    borderRadius: '12px',
                    textDecoration: 'none',
                    border: '1px solid #dbeafe',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = '#dbeafe'
                    e.target.style.transform = 'translateY(-2px)'
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = '#eff6ff'
                    e.target.style.transform = 'translateY(0)'
                  }}
                >
                  <div style={{
                    width: '28px',
                    height: '28px',
                    backgroundColor: '#2563eb',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg width="14" height="14" fill="none" stroke="white" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#111827'
                    }}>
                      Caută Furnizori după Dată
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#6b7280'
                    }}>
                      Găsește furnizorii disponibili pentru evenimentul tău
                    </div>
                  </div>
                </Link>

                <Link 
                  href="/" 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px',
                    backgroundColor: '#f0fdf4',
                    borderRadius: '12px',
                    textDecoration: 'none',
                    border: '1px solid #dcfce7',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = '#dcfce7'
                    e.target.style.transform = 'translateY(-2px)'
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = '#f0fdf4'
                    e.target.style.transform = 'translateY(0)'
                  }}
                >
                  <div style={{
                    width: '28px',
                    height: '28px',
                    backgroundColor: '#16a34a',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg width="14" height="14" fill="none" stroke="white" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <div>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#111827'
                    }}>
                      Explorează Furnizorii
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#6b7280'
                    }}>
                      Vezi toți furnizorii disponibili pe platformă
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          )}

          {/* Quick Stats - pentru toți utilizatorii */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                backgroundColor: '#fef2f2',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="16" height="16" fill="none" stroke="#dc2626" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 style={{
                fontSize: '1.125rem',
                fontWeight: '700',
                color: '#111827',
                margin: 0
              }}>
                Activitatea Ta
              </h2>
            </div>

            <div className="stats-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px'
            }}>
              <div style={{
                textAlign: 'center',
                padding: '12px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px'
              }}>
                <div style={{
                  fontSize: '1.25rem',
                  fontWeight: '800',
                  color: '#111827',
                  marginBottom: '4px'
                }}>
                  0
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#6b7280'
                }}>
                  Căutări
                </div>
              </div>
              <div style={{
                textAlign: 'center',
                padding: '12px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px'
              }}>
                <div style={{
                  fontSize: '1.25rem',
                  fontWeight: '800',
                  color: '#111827',
                  marginBottom: '4px'
                }}>
                  0
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#6b7280'
                }}>
                  Contactări
                </div>
              </div>
            </div>

            <div style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: '#f0f9ff',
              borderRadius: '8px',
              border: '1px solid #0ea5e9'
            }}>
              <div style={{
                fontSize: '14px',
                color: '#0c4a6e',
                fontWeight: '500'
              }}>
                💡 Sfat: {profile?.user_type === 'furnizor' 
                  ? 'Folosește calendarul pentru a gestiona disponibilitatea ta!'
                  : 'Folosește căutarea după dată pentru rezultate mai precise!'
                }
              </div>
            </div>
          </div>

          {/* Calendar Section - DOAR pentru furnizori cu profil complet */}
          {profile?.user_type === 'furnizor' && supplierId && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              gridColumn: '1 / -1' // Ocupe toată lățimea disponibilă
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '20px'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: '#fef2f2',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg width="16" height="16" fill="none" stroke="#dc2626" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: '#111827',
                  margin: 0
                }}>
                  Calendar Disponibilitate
                </h2>
              </div>

              <p style={{
                color: '#6b7280',
                fontSize: '14px',
                marginBottom: '20px',
                lineHeight: '1.5'
              }}>
                Marchează zilele în care <strong>nu ești disponibil</strong>. Clienții vor vedea doar zilele disponibile când caută furnizori.
              </p>

              <Calendar 
                unavailableDates={unavailableDates.map(d => d.dateObj)}
                onDateClick={toggleDate}
              />
            </div>
          )}

          {/* Lista Date Indisponibile - DUPĂ calendar */}
          {profile?.user_type === 'furnizor' && supplierId && unavailableDates.length > 0 && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              gridColumn: '1 / -1' // Ocupe toată lățimea disponibilă
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '20px'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: '#fef2f2',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg width="16" height="16" fill="none" stroke="#dc2626" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: '#111827',
                  margin: 0
                }}>
                  Date Indisponibile ({unavailableDates.length})
                </h2>
              </div>

              <p style={{
                color: '#6b7280',
                fontSize: '14px',
                marginBottom: '16px',
                lineHeight: '1.5'
              }}>
                Lista completă cu datele în care nu ești disponibil. Poți șterge o dată dacă un client renunță la programare.
              </p>

              <div style={{
                maxHeight: '300px',
                overflowY: 'auto',
                display: 'grid',
                gap: '8px'
              }}>
                {unavailableDates
                  .sort((a, b) => new Date(a.date) - new Date(b.date))
                  .map((unavailableDate) => (
                  <div
                    key={unavailableDate.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      backgroundColor: '#fef2f2',
                      borderRadius: '8px',
                      border: '1px solid #fecaca'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        backgroundColor: '#dc2626',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <svg width="12" height="12" fill="none" stroke="white" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                      <div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#991b1b'
                        }}>
                          {new Date(unavailableDate.date).toLocaleDateString('ro-RO', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#7f1d1d'
                        }}>
                          Data indisponibilă
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => deleteUnavailableDate(unavailableDate.id)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                        transition: 'background-color 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      onMouseOver={(e) => e.target.style.backgroundColor = '#b91c1c'}
                      onMouseOut={(e) => e.target.style.backgroundColor = '#dc2626'}
                      title="Șterge data - folosește dacă clientul renunță"
                    >
                      <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Șterge
                    </button>
                  </div>
                ))}
              </div>

              {unavailableDates.length > 5 && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px 16px',
                  backgroundColor: '#f0f9ff',
                  borderRadius: '8px',
                  border: '1px solid #0ea5e9'
                }}>
                  <div style={{
                    fontSize: '14px',
                    color: '#0c4a6e',
                    fontWeight: '500'
                  }}>
                    💡 Sfat: Poți șterge o dată dacă un client renunță la programare și vrei să fii din nou disponibil în acea zi.
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        /* Mobile-first responsive design */
        .dashboard-container {
          padding: 20px 16px !important;
        }
        
        .dashboard-header {
          margin-bottom: 20px !important;
        }
        
        .dashboard-title {
          font-size: 1.5rem !important;
        }
        
        .dashboard-subtitle {
          font-size: 0.875rem !important;
        }
        
        .dashboard-grid {
          grid-template-columns: 1fr !important;
          gap: 16px !important;
        }
        
        .stats-grid {
          grid-template-columns: repeat(2, 1fr) !important;
          gap: 8px !important;
        }
        
        /* Tablet breakpoint */
        @media (min-width: 640px) {
          .dashboard-container {
            padding: 30px 20px !important;
          }
          
          .dashboard-header {
            margin-bottom: 28px !important;
          }
          
          .dashboard-title {
            font-size: 2rem !important;
          }
          
          .dashboard-subtitle {
            font-size: 1rem !important;
          }
          
          .dashboard-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 20px !important;
          }
          
          .stats-grid {
            gap: 10px !important;
          }
        }
        
        /* Desktop breakpoint */
        @media (min-width: 1024px) {
          .dashboard-container {
            padding: 40px 20px !important;
          }
          
          .dashboard-header {
            margin-bottom: 32px !important;
          }
          
          .dashboard-title {
            font-size: 2.5rem !important;
          }
          
          .dashboard-subtitle {
            font-size: 1.125rem !important;
          }
          
          .dashboard-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 24px !important;
          }
          
          .stats-grid {
            gap: 12px !important;
          }
        }
      `}</style>
    </div>
  )
}
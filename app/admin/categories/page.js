'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AdminCategories() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategorySlug, setNewCategorySlug] = useState('')
  const [editingCategory, setEditingCategory] = useState(null)
  const [editName, setEditName] = useState('')
  const [editSlug, setEditSlug] = useState('')

  useEffect(() => {
    checkAdminAccess()
  }, [])

  // Generate slug from name
  function generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim()
  }

  // Update slug when name changes
  useEffect(() => {
    setNewCategorySlug(generateSlug(newCategoryName))
  }, [newCategoryName])

  async function checkAdminAccess() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      setUser(user)

      // Check if user is admin
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (!adminData) {
        setMessage({ type: 'error', text: 'Nu ai permisiuni de administrator' })
        setTimeout(() => router.push('/dashboard'), 2000)
        return
      }

      setIsAdmin(true)
      await fetchCategories()
    } catch (error) {
      console.error('Error checking admin access:', error)
      setMessage({ type: 'error', text: 'Eroare la verificarea permisiunilor' })
    } finally {
      setLoading(false)
    }
  }

  async function fetchCategories() {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')

      if (error) {
        throw error
      }

      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
      setMessage({ type: 'error', text: 'Eroare la încărcarea categoriilor' })
    }
  }

  async function createCategory() {
    if (!newCategoryName.trim()) {
      setMessage({ type: 'error', text: 'Introdu numele categoriei' })
      return
    }

    if (!newCategorySlug.trim()) {
      setMessage({ type: 'error', text: 'Slug-ul este obligatoriu' })
      return
    }

    setSaving(true)
    
    try {
      const { error } = await supabase
        .from('categories')
        .insert([{ 
          name: newCategoryName.trim(),
          slug: newCategorySlug.trim()
        }])

      if (error) {
        throw error
      }

      setMessage({ type: 'success', text: '✅ Categoria a fost creată cu succes!' })
      setNewCategoryName('')
      setNewCategorySlug('')
      await fetchCategories()
    } catch (error) {
      console.error('Error creating category:', error)
      setMessage({ type: 'error', text: `Eroare: ${error.message}` })
    } finally {
      setSaving(false)
      setTimeout(() => setMessage({ type: '', text: '' }), 5000)
    }
  }

  async function startEdit(category) {
    setEditingCategory(category.id)
    setEditName(category.name)
    setEditSlug(category.slug)
  }

  async function updateCategory() {
    if (!editName.trim()) {
      setMessage({ type: 'error', text: 'Introdu numele categoriei' })
      return
    }

    if (!editSlug.trim()) {
      setMessage({ type: 'error', text: 'Slug-ul este obligatoriu' })
      return
    }

    setSaving(true)
    
    try {
      const { error } = await supabase
        .from('categories')
        .update({ 
          name: editName.trim(),
          slug: editSlug.trim()
        })
        .eq('id', editingCategory)

      if (error) {
        throw error
      }

      setMessage({ type: 'success', text: '✅ Categoria a fost actualizată cu succes!' })
      setEditingCategory(null)
      setEditName('')
      setEditSlug('')
      await fetchCategories()
    } catch (error) {
      console.error('Error updating category:', error)
      setMessage({ type: 'error', text: `Eroare: ${error.message}` })
    } finally {
      setSaving(false)
      setTimeout(() => setMessage({ type: '', text: '' }), 5000)
    }
  }

  async function deleteCategory(categoryId, categoryName) {
    if (!confirm(`Ești sigur că vrei să ștergi categoria "${categoryName}"? Această acțiune nu poate fi anulată și va afecta toți furnizorii care o folosesc.`)) {
      return
    }

    setSaving(true)
    
    try {
      // First check if category is being used
      const { data: usageData } = await supabase
        .from('supplier_categories')
        .select('supplier_id')
        .eq('category_id', categoryId)

      if (usageData && usageData.length > 0) {
        const confirmDelete = confirm(`Această categorie este folosită de ${usageData.length} furnizori. Ștergi oricum?`)
        if (!confirmDelete) {
          setSaving(false)
          return
        }
      }

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId)

      if (error) {
        throw error
      }

      setMessage({ type: 'success', text: '✅ Categoria a fost ștearsă cu succes!' })
      await fetchCategories()
    } catch (error) {
      console.error('Error deleting category:', error)
      setMessage({ type: 'error', text: `Eroare: ${error.message}` })
    } finally {
      setSaving(false)
      setTimeout(() => setMessage({ type: '', text: '' }), 5000)
    }
  }

  function cancelEdit() {
    setEditingCategory(null)
    setEditName('')
    setEditSlug('')
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
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '40px 20px'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
          color: 'white',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '32px'
        }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '800',
            marginBottom: '8px',
            margin: '0 0 8px 0'
          }}>
            🔧 Admin - Categorii
          </h1>
          <p style={{
            fontSize: '1.125rem',
            opacity: 0.9,
            margin: 0
          }}>
            Gestionează categoriile serviciilor din platformă
          </p>
        </div>

        {/* Message */}
        {message.text && (
          <div style={{
            marginBottom: '24px',
            padding: '16px 20px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${message.type === 'success' ? '#16a34a' : '#dc2626'}`,
            color: message.type === 'success' ? '#15803d' : '#dc2626'
          }}>
            <span style={{ fontSize: '20px' }}>
              {message.type === 'success' ? '✅' : '⚠️'}
            </span>
            <span style={{ fontWeight: '500' }}>{message.text}</span>
          </div>
        )}

        {/* Add New Category */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '32px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          marginBottom: '32px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '24px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              backgroundColor: '#f0fdf4',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="20" height="20" fill="none" stroke="#16a34a" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#111827',
              margin: 0
            }}>
              Adaugă Categorie Nouă
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '16px',
            marginBottom: '20px'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Numele categoriei *
              </label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Ex: Animatori pentru copii"
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

            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Slug (URL) *
              </label>
              <input
                type="text"
                value={newCategorySlug}
                onChange={(e) => setNewCategorySlug(e.target.value)}
                placeholder="animatori-pentru-copii"
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
                onFocus={(e) => {
                  e.target.style.borderColor = '#2563eb'
                  e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d1d5db'
                  e.target.style.boxShadow = 'none'
                }}
              />
              <p style={{
                fontSize: '12px',
                color: '#6b7280',
                marginTop: '4px',
                margin: '4px 0 0 0'
              }}>
                Se generează automat din nume, dar poate fi editat
              </p>
            </div>
          </div>

          <button
            onClick={createCategory}
            disabled={saving || !newCategoryName.trim() || !newCategorySlug.trim()}
            style={{
              backgroundColor: saving || !newCategoryName.trim() || !newCategorySlug.trim() ? '#9ca3af' : '#16a34a',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '12px',
              fontWeight: '600',
              border: 'none',
              cursor: saving || !newCategoryName.trim() || !newCategorySlug.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseOver={(e) => {
              if (!saving && newCategoryName.trim() && newCategorySlug.trim()) {
                e.target.style.backgroundColor = '#15803d'
              }
            }}
            onMouseOut={(e) => {
              if (!saving && newCategoryName.trim() && newCategorySlug.trim()) {
                e.target.style.backgroundColor = '#16a34a'
              }
            }}
          >
            {saving ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid #ffffff',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                Se salvează...
              </>
            ) : (
              <>
                ➕ Adaugă Categoria
              </>
            )}
          </button>
        </div>

        {/* Categories List */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '32px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '24px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              backgroundColor: '#eff6ff',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="20" height="20" fill="none" stroke="#2563eb" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#111827',
              margin: 0
            }}>
              Categorii Existente ({categories.length})
            </h2>
          </div>

          {categories.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#6b7280'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📝</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '8px' }}>
                Nu există categorii încă
              </h3>
              <p>Adaugă prima categorie folosind formularul de mai sus.</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gap: '16px'
            }}>
              {categories.map((category) => (
                <div
                  key={category.id}
                  style={{
                    padding: '20px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    transition: 'all 0.2s'
                  }}
                >
                  {editingCategory === category.id ? (
                    <div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr',
                        gap: '12px',
                        marginBottom: '16px'
                      }}>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          style={{
                            padding: '8px 12px',
                            border: '1px solid #2563eb',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: '600',
                            outline: 'none',
                            boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.1)'
                          }}
                          placeholder="Numele categoriei"
                        />
                        <input
                          type="text"
                          value={editSlug}
                          onChange={(e) => setEditSlug(e.target.value)}
                          style={{
                            padding: '8px 12px',
                            border: '1px solid #2563eb',
                            borderRadius: '8px',
                            fontSize: '14px',
                            outline: 'none',
                            boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.1)'
                          }}
                          placeholder="slug-categoria"
                        />
                      </div>
                      <div style={{
                        display: 'flex',
                        gap: '8px'
                      }}>
                        <button
                          onClick={updateCategory}
                          disabled={saving}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#16a34a',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '600'
                          }}
                        >
                          💾 Salvează
                        </button>
                        <button
                          onClick={cancelEdit}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#6b7280',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '600'
                          }}
                        >
                          ❌ Anulează
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{
                          fontSize: '1.125rem',
                          fontWeight: '600',
                          color: '#111827',
                          margin: '0 0 4px 0'
                        }}>
                          {category.name}
                        </h3>
                        <p style={{
                          fontSize: '14px',
                          color: '#6b7280',
                          margin: '0 0 4px 0'
                        }}>
                          Slug: /{category.slug}
                        </p>
                        <p style={{
                          fontSize: '12px',
                          color: '#9ca3af',
                          margin: 0
                        }}>
                          ID: {category.id}
                        </p>
                      </div>

                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        marginLeft: '16px'
                      }}>
                        <button
                          onClick={() => startEdit(category)}
                          style={{
                            padding: '8px 12px',
                            backgroundColor: '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '600',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                          onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
                        >
                          ✏️ Editează
                        </button>
                        <button
                          onClick={() => deleteCategory(category.id, category.name)}
                          style={{
                            padding: '8px 12px',
                            backgroundColor: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '600',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseOver={(e) => e.target.style.backgroundColor = '#b91c1c'}
                          onMouseOut={(e) => e.target.style.backgroundColor = '#dc2626'}
                        >
                          🗑️ Șterge
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div style={{
          marginTop: '32px',
          padding: '24px',
          backgroundColor: '#eff6ff',
          borderRadius: '16px',
          border: '1px solid #93c5fd'
        }}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: '#1e40af',
            marginBottom: '12px',
            margin: '0 0 12px 0'
          }}>
            💡 Instrucțiuni pentru gestionarea categoriilor
          </h3>
          <ul style={{
            color: '#1e40af',
            fontSize: '14px',
            lineHeight: '1.6',
            paddingLeft: '20px',
            margin: 0
          }}>
            <li>Categoriile sunt utilizate de furnizori pentru a-și clasifica serviciile</li>
            <li>Un furnizor poate selecta multiple categorii pentru serviciile sale</li>
            <li>Slug-ul este folosit în URL-uri și trebuie să fie unic</li>
            <li>Ștergearea unei categorii va afecta toți furnizorii care o folosesc</li>
            <li>Pentru a accesa această pagină, trebuie să fii adăugat în tabela admin_users</li>
          </ul>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
          .grid-responsive {
            grid-template-columns: 1fr !important;
          }
        }
        
        @media (min-width: 768px) {
          .grid-responsive {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
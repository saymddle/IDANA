'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/context/ThemeContext'
import { Icon, IDANAGlyph } from '@/components/Icons'
import NewSessionModal from '@/components/NewSessionModal'

const NAV = [
  { href: '/',         label: 'Home',     iconKey: 'Home'     as const },
  { href: '/sessions', label: 'Sessions', iconKey: 'Sessions' as const },
  { href: '/tags',     label: 'Tags',     iconKey: 'Tags'     as const },
  { href: '/profile',  label: 'Profile',  iconKey: 'Profile'  as const },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()
  const [showModal, setShowModal] = useState(false)

  function isActive(href: string) {
    return pathname === href || (href !== '/' && pathname.startsWith(href))
  }

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex" style={{
        width: 76, minHeight: '100vh',
        background: 'var(--bg)', borderRight: '1px solid var(--line)',
        flexDirection: 'column', alignItems: 'center',
        padding: '22px 0 18px', gap: 6,
        position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 50,
      }}>
        <div style={{ marginBottom: 14, cursor: 'pointer' }}>
          <IDANAGlyph size={32} color="var(--green)" />
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          {NAV.map(({ href, label, iconKey }) => {
            const active = isActive(href)
            const NavIcon = Icon[iconKey]
            return (
              <Link key={href} href={href} title={label} style={{
                width: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                padding: '10px 0 8px', borderRadius: 12, textDecoration: 'none',
                color: active ? 'var(--green)' : 'var(--muted)',
                background: active ? 'var(--tier-strong-tint-soft)' : 'transparent',
                transition: 'all 0.15s ease',
              }}>
                <NavIcon size={22} stroke={active ? 'var(--green)' : 'var(--muted)'} />
                <span style={{ fontSize: 10.5, fontWeight: 500, color: active ? 'var(--green)' : 'var(--muted)' }}>
                  {label}
                </span>
              </Link>
            )
          })}
        </nav>

        <button onClick={toggleTheme} title="Toggle theme" style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'transparent', border: '1px solid var(--line)',
          color: 'var(--muted)', cursor: 'pointer', display: 'grid', placeItems: 'center',
        }}>
          {theme === 'light' ? <MoonIcon size={18} /> : <SunIcon size={18} />}
        </button>

        <button onClick={() => setShowModal(true)} title="New session" style={{
          marginTop: 8, width: 44, height: 44, borderRadius: '50%',
          background: 'var(--green)', color: '#FBF8F2',
          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 22px rgba(59,83,35,0.35)', transition: 'transform 0.15s ease',
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px) scale(1.04)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}
        >
          <Icon.Plus size={20} stroke="#FBF8F2" />
        </button>
      </aside>

      {/* ── Mobile bottom nav ── */}
      <div className="md:hidden" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        padding: '0 16px',
        paddingBottom: 'calc(8px + env(safe-area-inset-bottom))',
      }}>
        <div style={{
          width: '100%', display: 'flex', alignItems: 'center',
          background: 'rgba(245, 242, 236, 0.88)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid var(--line)',
          borderRadius: 999,
          padding: '8px 4px',
          boxShadow: 'var(--shadow-3)',
          position: 'relative',
        }}>
          {NAV.slice(0, 2).map(({ href, label, iconKey }) => {
            const active = isActive(href)
            const NavIcon = Icon[iconKey]
            return (
              <Link key={href} href={href} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 2, padding: '6px 0', textDecoration: 'none',
                color: active ? 'var(--green)' : 'var(--muted)',
              }}>
                <NavIcon size={22} stroke={active ? 'var(--green)' : 'var(--muted)'} />
                <span style={{ fontSize: 10, fontWeight: 500 }}>{label}</span>
              </Link>
            )
          })}

          {/* FAB placeholder space */}
          <div style={{ width: 60, flexShrink: 0 }} />

          {NAV.slice(2).map(({ href, label, iconKey }) => {
            const active = isActive(href)
            const NavIcon = Icon[iconKey]
            return (
              <Link key={href} href={href} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 2, padding: '6px 0', textDecoration: 'none',
                color: active ? 'var(--green)' : 'var(--muted)',
              }}>
                <NavIcon size={22} stroke={active ? 'var(--green)' : 'var(--muted)'} />
                <span style={{ fontSize: 10, fontWeight: 500 }}>{label}</span>
              </Link>
            )
          })}

          {/* Elevated center FAB */}
          <button
            onClick={() => setShowModal(true)}
            style={{
              position: 'absolute', left: '50%',
              transform: 'translateX(-50%) translateY(-50%)',
              top: 0,
              width: 52, height: 52, borderRadius: '50%',
              background: 'var(--green)', color: '#FBF8F2',
              border: '3px solid var(--bg)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 22px rgba(59,83,35,0.4)',
              zIndex: 10,
            }}
          >
            <Icon.Plus size={22} stroke="#FBF8F2" />
          </button>
        </div>
      </div>

      {showModal && (
        <NewSessionModal
          ingredientA=""
          allIngredients={[]}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}

function SunIcon({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
}

function MoonIcon({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
}

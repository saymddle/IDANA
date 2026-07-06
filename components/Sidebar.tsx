'use client'

import Link from 'next/link'
import { useState, useEffect, useRef, useCallback } from 'react'
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

const RAIL_W = 76
const NOTCH_H = 52
const COLLAPSE_KEY = 'idana-sidebar-collapsed'
const NOTCH_Y_KEY  = 'idana-sidebar-notch-y'

export default function Sidebar() {
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()
  const [showModal, setShowModal] = useState(false)

  // ── Collapsible-notch state ──
  const [collapsed, setCollapsed] = useState(false)
  const [notchY, setNotchY] = useState(140)
  const [mounted, setMounted] = useState(false)
  const drag = useRef({ active: false, startY: 0, startTop: 0, moved: false })

  // Hydrate persisted state after mount (avoids SSR mismatch)
  useEffect(() => {
    setMounted(true)
    try {
      const c = localStorage.getItem(COLLAPSE_KEY)
      if (c != null) setCollapsed(c === '1')
      const y = localStorage.getItem(NOTCH_Y_KEY)
      if (y != null) {
        const parsed = parseInt(y, 10)
        if (!Number.isNaN(parsed)) {
          setNotchY(Math.max(8, Math.min(window.innerHeight - NOTCH_H - 8, parsed)))
        }
      }
    } catch { /* ignore */ }
  }, [])

  // Expose the current rail width to the layout so page content reflows
  useEffect(() => {
    if (!mounted) return
    document.documentElement.style.setProperty('--sidebar-w', collapsed ? '0px' : `${RAIL_W}px`)
    try { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0') } catch { /* ignore */ }
  }, [collapsed, mounted])

  useEffect(() => {
    if (!mounted) return
    try { localStorage.setItem(NOTCH_Y_KEY, String(Math.round(notchY))) } catch { /* ignore */ }
  }, [notchY, mounted])

  function isActive(href: string) {
    return pathname === href || (href !== '/' && pathname.startsWith(href))
  }

  // ── Notch drag (vertical reposition along the left edge) ──
  const onNotchDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = { active: true, startY: e.clientY, startTop: notchY, moved: false }
  }, [notchY])

  const onNotchMove = useCallback((e: React.PointerEvent) => {
    const d = drag.current
    if (!d.active) return
    const dy = e.clientY - d.startY
    if (Math.abs(dy) > 4) d.moved = true
    const next = Math.max(8, Math.min(window.innerHeight - NOTCH_H - 8, d.startTop + dy))
    setNotchY(next)
  }, [])

  const onNotchUp = useCallback((e: React.PointerEvent) => {
    const d = drag.current
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    const wasDrag = d.moved
    d.active = false
    if (!wasDrag) setCollapsed(c => !c)   // tap toggles open/closed
  }, [])

  return (
    <>
      {/* ── Notch handle: the collapsed sidebar; drag vertically to reposition ── */}
      <button
        className="hidden md:flex"
        onPointerDown={onNotchDown}
        onPointerMove={onNotchMove}
        onPointerUp={onNotchUp}
        onPointerCancel={onNotchUp}
        title={collapsed ? 'Open menu (drag to move)' : 'Hide menu (drag to move)'}
        style={{
          position: 'fixed',
          top: notchY,
          left: collapsed ? 0 : RAIL_W,
          zIndex: 51,
          width: 22, height: NOTCH_H,
          padding: 0,
          alignItems: 'center', justifyContent: 'center',
          background: 'var(--green)', color: '#FBF8F2',
          border: 'none',
          borderRadius: collapsed ? '0 14px 14px 0' : '0 12px 12px 0',
          boxShadow: '0 4px 14px rgba(59,83,35,0.28)',
          cursor: 'grab',
          touchAction: 'none',
          transition: 'left 0.22s ease, border-radius 0.22s ease',
        }}
      >
        <span style={{
          display: 'inline-flex',
          transform: collapsed ? 'none' : 'rotate(180deg)',
          transition: 'transform 0.22s ease',
        }}>
          <Icon.ChevronRight size={15} stroke="#FBF8F2" />
        </span>
      </button>

      {/* ── Desktop sidebar (expanded rail) ── */}
      <aside className="hidden md:flex" style={{
        width: RAIL_W, minHeight: '100vh',
        background: 'var(--bg)', borderRight: '1px solid var(--line)',
        flexDirection: 'column', alignItems: 'center',
        padding: '22px 0 18px', gap: 6,
        position: 'fixed', left: collapsed ? -RAIL_W - 1 : 0, top: 0, bottom: 0, zIndex: 50,
        transition: 'left 0.22s ease',
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
          <span suppressHydrationWarning>
            {theme === 'light' ? <MoonIcon size={18} /> : <SunIcon size={18} />}
          </span>
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

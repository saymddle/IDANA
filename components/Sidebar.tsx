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
      {/* ── Desktop: always-visible floating pill ── */}
      <aside className="idana-pill hidden md:flex">
        <Link href="/" className="idana-pill-glyph" title="IDANA — Home">
          <IDANAGlyph size={26} color="var(--green)" />
        </Link>

        <div className="idana-pill-divider" />

        <nav className="idana-pill-nav">
          {NAV.map(({ href, label, iconKey }) => {
            const active = isActive(href)
            const NavIcon = Icon[iconKey]
            return (
              <Link
                key={href}
                href={href}
                title={label}
                className={`idana-pill-item ${active ? 'is-active' : ''}`}
              >
                <NavIcon size={21} stroke={active ? 'var(--green)' : 'var(--muted)'} />
                <span className="idana-pill-label">{label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="idana-pill-divider" />

        <button onClick={toggleTheme} title="Toggle theme" className="idana-pill-theme">
          <span suppressHydrationWarning>
            {theme === 'light' ? <MoonIcon size={17} /> : <SunIcon size={17} />}
          </span>
        </button>

        <button onClick={() => setShowModal(true)} title="New session" className="idana-pill-new">
          <Icon.Plus size={19} stroke="#FBF8F2" />
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

      <style>{`
        .idana-pill {
          position: fixed;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          z-index: 50;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 12px 8px;
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 30px;
          box-shadow: 0 12px 32px rgba(28,26,23,0.16);
        }
        .idana-pill-glyph {
          display: flex; align-items: center; justify-content: center;
          width: 40px; height: 40px; border-radius: 50%;
          text-decoration: none;
        }
        .idana-pill-divider {
          width: 26px; height: 1px; background: var(--line);
        }
        .idana-pill-nav {
          display: flex; flex-direction: column; gap: 3px;
        }
        .idana-pill-item {
          width: 52px;
          display: flex; flex-direction: column; align-items: center; gap: 3px;
          padding: 9px 0 7px;
          border-radius: 15px;
          text-decoration: none;
          color: var(--muted);
          transition: background 0.15s ease, color 0.15s ease;
        }
        .idana-pill-item:hover { background: var(--bg-2); }
        .idana-pill-item.is-active { background: var(--green-soft); color: var(--green); }
        .idana-pill-label {
          font-size: 10px; font-weight: 500; line-height: 1;
          color: inherit;
        }
        .idana-pill-item .idana-pill-label { color: var(--muted); }
        .idana-pill-item.is-active .idana-pill-label { color: var(--green); }
        .idana-pill-theme {
          width: 36px; height: 36px; border-radius: 50%;
          background: transparent; border: 1px solid var(--line);
          color: var(--muted); cursor: pointer;
          display: grid; place-items: center;
          transition: background 0.15s ease;
        }
        .idana-pill-theme:hover { background: var(--bg-2); }
        .idana-pill-new {
          width: 44px; height: 44px; border-radius: 50%;
          background: var(--green); color: #FBF8F2;
          border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 8px 22px rgba(59,83,35,0.35);
          transition: transform 0.15s ease;
        }
        .idana-pill-new:hover { transform: translateY(-1px) scale(1.04); }
      `}</style>
    </>
  )
}

function SunIcon({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
}

function MoonIcon({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
}

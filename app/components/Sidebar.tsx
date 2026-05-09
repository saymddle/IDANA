'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/context/ThemeContext'

const NAV = [
  { href: '/',         label: 'Home',     icon: HomeIcon },
  { href: '/sessions', label: 'Sessions', icon: FlaskIcon },
  { href: '/tags',     label: 'Tags',     icon: TagIcon },
  { href: '/profile',  label: 'Profile',  icon: UserIcon },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()

  return (
    <>
      <aside style={{
        width: 76, minHeight: '100vh',
        background: 'var(--bg)', borderRight: '1px solid var(--line)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '22px 0 18px', gap: 6,
        position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 50,
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 12,
          display: 'grid', placeItems: 'center',
          background: 'var(--surface)', border: '1px solid var(--line)',
          marginBottom: 14, boxShadow: 'var(--soft-shadow)',
        }}>
          <span style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 900, fontSize: 18, color: 'var(--ink)', fontStyle: 'italic', letterSpacing: '-0.04em' }}>
            I
          </span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href))
            return (
              <Link key={href} href={href} title={label} style={{
                width: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                padding: '10px 0 8px', borderRadius: 12, textDecoration: 'none',
                color: active ? 'var(--ink)' : 'var(--ink-3)',
                background: active ? 'var(--surface)' : 'transparent',
                boxShadow: active ? 'var(--soft-shadow)' : 'none',
                transition: 'all 0.15s ease',
              }}>
                <Icon size={22} active={active} />
                <span style={{ fontSize: 10.5, fontWeight: 500, color: active ? 'var(--ink)' : 'var(--ink-3)' }}>
                  {label}
                </span>
              </Link>
            )
          })}
        </nav>

        <button onClick={toggleTheme} title="Toggle theme" style={{
          width: 36, height: 36, borderRadius: '50%', background: 'transparent',
          border: 'none', color: 'var(--ink-3)', cursor: 'pointer', display: 'grid', placeItems: 'center',
        }}>
          {theme === 'light' ? <MoonIcon size={18} /> : <SunIcon size={18} />}
        </button>
      </aside>

      {/* FAB */}
      <button title="New session" style={{
        position: 'fixed', left: 20, bottom: 22,
        width: 44, height: 44, borderRadius: '50%',
        background: 'var(--green)', color: '#FBF7F0',
        border: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center',
        boxShadow: '0 8px 22px rgba(47,93,58,0.35), 0 2px 6px rgba(47,93,58,0.2)',
        zIndex: 60, fontSize: 22, fontWeight: 300, transition: 'transform 0.15s ease',
      }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px) scale(1.04)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
      >
        +
      </button>
    </>
  )
}

function ico(active: boolean): React.CSSProperties {
  return { color: active ? 'var(--green)' : 'currentColor' }
}

function HomeIcon({ size = 22, active = false }: { size?: number; active?: boolean }) {
  return <svg width={size} height={size} style={ico(active)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>
}
function FlaskIcon({ size = 22, active = false }: { size?: number; active?: boolean }) {
  return <svg width={size} height={size} style={ico(active)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6M9 3v8l-4 9h14l-4-9V3"/><path d="M6.5 17h11"/></svg>
}
function TagIcon({ size = 22, active = false }: { size?: number; active?: boolean }) {
  return <svg width={size} height={size} style={ico(active)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
}
function UserIcon({ size = 22, active = false }: { size?: number; active?: boolean }) {
  return <svg width={size} height={size} style={ico(active)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
}
function SunIcon({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
}
function MoonIcon({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
}

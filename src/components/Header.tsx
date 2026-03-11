'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { copy, useLanguage } from './LanguageContext';
import { NotificationBell } from './NotificationBell';
import { getNavigationItems, isNavItemActive } from './navigation';

function BrandMark() {
  return (
    <span className="relative inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-[var(--iux-ochre-border)] bg-primary shadow-sm">
      <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-[var(--iux-ochre2)]/30" />
      <span className="absolute -bottom-3 -left-2 h-5 w-5 rounded-full bg-white/10" />
      <span className="relative text-[13px] font-semibold text-[var(--iux-ochre2)]" style={{ fontFamily: 'var(--font-mono)' }}>
        OP
      </span>
    </span>
  );
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const { language, setLanguage } = useLanguage();
  const t = copy[language];
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const navItems = useMemo(() => getNavigationItems(Boolean(user)), [user]);
  const desktopNavItems = useMemo(() => (user ? navItems : navItems.filter((item) => item.href !== '/auth')), [navItems, user]);
  const userInitial = user
    ? (
      user.user_metadata?.full_name?.[0]?.toUpperCase()
      || user.user_metadata?.name?.[0]?.toUpperCase()
      || user.email?.[0]?.toUpperCase()
      || 'U'
    )
    : '';

  const handleSignOutClick = async () => {
    setIsUserMenuOpen(false);
    await signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border-primary bg-bg-secondary/88 backdrop-blur-xl">
      <div className="editorial-page editorial-page--wide py-3">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <BrandMark />
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.22em] text-text-muted" style={{ fontFamily: 'var(--font-mono)' }}>
                Open Politics
              </div>
              <div className="truncate text-base text-text-primary" style={{ fontFamily: 'var(--font-display)' }}>
                Join a group. Compare options. Leave freely.
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            <div className="editorial-pill-group">
              {desktopNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`editorial-pill ${isNavItemActive(pathname, item) ? 'editorial-pill--active' : ''}`}
                  aria-current={isNavItemActive(pathname, item) ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>

          {!loading && (
            <div className="flex items-center gap-2">
              {user ? (
                <>
                  <div className="hidden sm:block">
                    <NotificationBell />
                  </div>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsUserMenuOpen((prev) => !prev)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-primary bg-bg-card text-sm font-semibold text-text-primary"
                      aria-label="Open user menu"
                    >
                      {userInitial}
                    </button>
                    {isUserMenuOpen && (
                      <div className="absolute right-0 top-12 z-20 w-52 rounded-2xl border border-border-primary bg-bg-card p-2 shadow-xl shadow-stone-900/10">
                        <Link
                          href="/profile"
                          className="block rounded-xl px-3 py-2 text-sm text-text-secondary transition hover:bg-bg-hover hover:text-text-primary"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          {t.profile}
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setLanguage(language === 'en' ? 'hi' : 'en');
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full rounded-xl px-3 py-2 text-left text-sm text-text-secondary transition hover:bg-bg-hover hover:text-text-primary"
                        >
                          {language === 'en' ? t.switchToHindi : t.switchToEnglish}
                        </button>
                        <button
                          type="button"
                          onClick={handleSignOutClick}
                          className="w-full rounded-xl px-3 py-2 text-left text-sm text-text-secondary transition hover:bg-bg-hover hover:text-text-primary"
                        >
                          {t.signOut}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Link href="/auth" className="btn btn-secondary btn-sm hidden sm:inline-flex">
                    Sign In
                  </Link>
                  <Link href="/welcome" className="btn btn-primary btn-sm">
                    Get Started
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthContext';
import { getBottomNavigationItems, isNavItemActive } from './navigation';

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const navItems = getBottomNavigationItems(Boolean(user));

  return (
    <nav className="pointer-events-none fixed bottom-4 left-0 right-0 z-50 sm:hidden">
      <div className="editorial-page pointer-events-auto">
        <div className="mx-auto flex h-16 max-w-sm items-center justify-around rounded-[1.6rem] border border-border-primary bg-bg-card/95 px-2 shadow-[0_20px_60px_rgba(21,33,23,0.16)] backdrop-blur-xl">
          {navItems.map((item) => {
            const isActive = isNavItemActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex h-full flex-1 flex-col items-center justify-center gap-1 rounded-[1.2rem] text-[10px] font-medium transition ${isActive ? 'text-[var(--iux-ochre)]' : 'text-text-muted hover:text-text-primary'
                  }`}
              >
                {isActive && (
                  <div className="absolute top-1 max-w-[40px] w-full h-1 bg-[var(--iux-ochre)]/20 rounded-b-md" />
                )}
                <div className={`flex items-center justify-center h-6 w-6 transition-transform ${isActive ? 'scale-110' : ''}`}>
                  {item.href === '/' && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill={isActive ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      strokeWidth={isActive ? '0' : '2'}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                  )}
                  {item.href === '/discover' && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill={isActive ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      strokeWidth={isActive ? '0' : '2'}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" strokeWidth="2" />
                    </svg>
                  )}
                  {item.href === '/profile' && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill={isActive ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      strokeWidth={isActive ? '0' : '2'}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  )}
                  {item.href === '/auth' && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                      <polyline points="10 17 15 12 10 7" />
                      <line x1="15" y1="12" x2="3" y2="12" />
                    </svg>
                  )}
                </div>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

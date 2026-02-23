'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavItem = {
    href: string;
    label: string;
    icon: string;
    isAction?: boolean;
};

const NAV_ITEMS: NavItem[] = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/discover', label: 'Groups', icon: '👥' },
    { href: '/trends', label: 'Trends', icon: '📈' },
    { href: '/alliances', label: 'Alliances', icon: '🤝' },
    { href: '/party/create', label: 'New', icon: '＋', isAction: true },
    { href: '/profile', label: 'Me', icon: '👤' },
];

export function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border-primary bg-bg-secondary/95 backdrop-blur-sm sm:hidden">
            <div className="flex items-center justify-around h-14">
                {NAV_ITEMS.map((item) => {
                    const isActive = item.href === '/'
                        ? pathname === '/'
                        : pathname.startsWith(item.href);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-xs transition-colors ${item.isAction
                                ? 'text-primary'
                                : isActive
                                    ? 'text-primary'
                                    : 'text-text-muted hover:text-text-secondary'
                                }`}
                        >
                            <span className={`text-lg leading-none ${item.isAction
                                ? 'h-7 w-7 rounded-full bg-primary text-white flex items-center justify-center text-base font-bold'
                                : ''
                                }`}>
                                {item.icon}
                            </span>
                            <span className={item.isAction ? 'sr-only' : ''}>{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}

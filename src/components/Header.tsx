'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from './AuthContext';
import { copy, useLanguage } from './LanguageContext';
import { NotificationBell } from './NotificationBell';

export function Header() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, loading, signOut } = useAuth();
    const { language, setLanguage } = useLanguage();
    const t = copy[language];
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    const handleSignOut = async () => {
        await signOut();
        router.push('/');
        router.refresh();
    };

    const handleSignOutClick = async () => {
        setIsUserMenuOpen(false);
        await handleSignOut();
    };

    const navLinks = [
        { href: '/', label: 'Home' },
        { href: '/discover', label: 'Groups' },
        { href: '/alliances', label: 'Alliances' },
        { href: '/trends', label: 'Trends' },
        { href: '/profile', label: 'Me' },
    ];

    const handleGetStarted = () => {
        window.location.href = '/welcome';
    };

    const userInitial = user
        ? (user.user_metadata?.full_name?.[0]?.toUpperCase()
            || user.user_metadata?.name?.[0]?.toUpperCase()
            || user.email?.[0]?.toUpperCase()
            || 'U')
        : '';

    return (
        <header className="sticky top-0 z-50 border-b border-border-primary bg-bg-secondary/95 backdrop-blur-sm">
            <div className="brand-hairline" />
            <div className="container mx-auto px-4 h-14 flex items-center justify-between">
                {/* Logo — always visible */}
                <Link href="/" className="flex items-center gap-2.5 group">
                    <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-border-primary bg-bg-card shadow-sm">
                        <span className="absolute h-5 w-5 rounded-full border border-primary/60" />
                        <span className="h-2 w-2 rounded-full bg-accent" />
                    </span>
                    <span className="text-sm font-semibold text-text-primary" style={{ fontFamily: 'var(--font-display)' }}>
                        Open Politics
                    </span>
                </Link>

                {/* Mobile right side — bell + avatar only */}
                {!loading && (
                    <div className="flex items-center gap-2 sm:hidden">
                        {user && <NotificationBell />}
                        {user ? (
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsUserMenuOpen(prev => !prev)}
                                    className="h-8 w-8 rounded-full bg-bg-tertiary border border-border-primary flex items-center justify-center text-text-secondary text-xs font-semibold"
                                    aria-label="Open user menu"
                                >
                                    {userInitial}
                                </button>
                                {isUserMenuOpen && (
                                    <div className="absolute right-0 top-10 z-20 w-44 rounded-xl border border-border-primary bg-bg-card p-2 shadow-md">
                                        <Link
                                            href="/profile"
                                            className="block rounded-md px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                                            onClick={() => setIsUserMenuOpen(false)}
                                        >
                                            {t.profile}
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
                                            className="w-full rounded-md px-3 py-2 text-left text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                                        >
                                            {language === 'en' ? t.switchToHindi : t.switchToEnglish}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSignOutClick}
                                            className="w-full rounded-md px-3 py-2 text-left text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                                        >
                                            {t.signOut}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Link href="/auth" className="btn btn-primary btn-sm">
                                Sign In
                            </Link>
                        )}
                    </div>
                )}

                {/* Desktop nav — hidden on mobile (BottomNav handles it) */}
                <nav className="hidden sm:flex items-center gap-2">
                    {navLinks.map((link) => {
                        const isActive = pathname === link.href;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`rounded-full border px-3 py-2 text-sm transition-colors ${isActive
                                    ? 'border-primary/30 bg-primary/10 text-text-primary'
                                    : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-hover hover:border-border-primary'
                                    }`}
                            >
                                {link.label}
                            </Link>
                        );
                    })}

                    {!user && !loading && (
                        <button
                            type="button"
                            onClick={handleGetStarted}
                            className="rounded-full px-4 py-2 text-sm font-medium transition-colors bg-primary text-white hover:bg-primary-dark"
                        >
                            Get Started
                        </button>
                    )}

                    {!loading && user && (
                        <div className="flex items-center gap-3 ml-4 pl-4 border-l border-border-primary">
                            <NotificationBell />
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsUserMenuOpen(prev => !prev)}
                                    className="h-8 w-8 rounded-full bg-bg-tertiary border border-border-primary flex items-center justify-center text-text-secondary text-xs font-semibold"
                                    aria-label="Open user menu"
                                >
                                    {userInitial}
                                </button>
                                {isUserMenuOpen && (
                                    <div className="absolute right-0 top-10 z-20 w-44 rounded-xl border border-border-primary bg-bg-card p-2 shadow-md">
                                        <Link
                                            href="/profile"
                                            className="block rounded-md px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                                            onClick={() => setIsUserMenuOpen(false)}
                                        >
                                            {t.profile}
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
                                            className="w-full rounded-md px-3 py-2 text-left text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                                        >
                                            {language === 'en' ? t.switchToHindi : t.switchToEnglish}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSignOutClick}
                                            className="w-full rounded-md px-3 py-2 text-left text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                                        >
                                            {t.signOut}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {!loading && !user && (
                        <Link href="/auth" className="btn btn-primary btn-sm">
                            Sign In
                        </Link>
                    )}
                </nav>
            </div>
        </header>
    );
}

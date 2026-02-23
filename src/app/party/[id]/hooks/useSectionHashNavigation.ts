'use client';

import { useEffect, useState } from 'react';

export interface SectionHashTab<T extends string> {
    id: T;
    sectionId: string;
}

interface UseSectionHashNavigationParams<T extends string> {
    tabs: readonly SectionHashTab<T>[];
    initialSection: T;
    resetKey: string;
}

function getTabByHash<T extends string>(tabs: readonly SectionHashTab<T>[], hash: string | null) {
    if (!hash) return null;
    const normalized = hash.startsWith('#') ? hash.slice(1) : hash;
    return tabs.find(tab => tab.sectionId === normalized) || null;
}

export function useSectionHashNavigation<T extends string>({
    tabs,
    initialSection,
    resetKey,
}: UseSectionHashNavigationParams<T>) {
    const [activeSection, setActiveSection] = useState<T>(initialSection);

    const updateHash = (sectionId: string, mode: 'push' | 'replace' = 'replace') => {
        if (typeof window === 'undefined') return;
        const nextHash = `#${sectionId}`;
        if (window.location.hash === nextHash) return;
        if (mode === 'push') {
            window.history.pushState(null, '', nextHash);
            return;
        }
        window.history.replaceState(null, '', nextHash);
    };

    const handleSectionTabClick = (target: T) => {
        setActiveSection(target);
        const sectionMeta = tabs.find(tab => tab.id === target);
        if (sectionMeta) updateHash(sectionMeta.sectionId, 'push');
    };

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const syncFromHash = () => {
            if (!window.location.hash) {
                setActiveSection(initialSection);
                return;
            }
            const tab = getTabByHash(tabs, window.location.hash);
            if (tab) {
                setActiveSection(tab.id);
            }
        };

        syncFromHash();
        window.addEventListener('hashchange', syncFromHash);
        return () => window.removeEventListener('hashchange', syncFromHash);
    }, [tabs, initialSection, resetKey]);

    return { activeSection, handleSectionTabClick };
}

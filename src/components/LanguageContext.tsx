'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type AppLanguage = 'en' | 'hi';

type LanguageContextType = {
    language: AppLanguage;
    setLanguage: (lang: AppLanguage) => void;
    hasPreference: boolean;
    isReady: boolean;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'op-language-preference';

export const copy = {
    en: {
        profile: 'Profile',
        signOut: 'Sign Out',
        switchToHindi: 'हिन्दी',
        switchToEnglish: 'English',
        languageEnglish: 'English',
        languageHindi: 'हिन्दी',
        chooseLanguage: 'Choose Language',
        welcomeTitle: 'Welcome to Open Politics',
        welcomeSubtitle: 'Please choose your preferred language.',
        continue: 'Continue',
        selectLanguageToContinue: 'Select a language to continue',
    },
    hi: {
        profile: 'प्रोफ़ाइल',
        signOut: 'लॉग आउट',
        switchToHindi: 'हिन्दी',
        switchToEnglish: 'English',
        languageEnglish: 'English',
        languageHindi: 'हिन्दी',
        chooseLanguage: 'भाषा चुनें',
        welcomeTitle: 'ओपन पॉलिटिक्स में आपका स्वागत है',
        welcomeSubtitle: 'कृपया अपनी पसंदीदा भाषा चुनें।',
        continue: 'आगे बढ़ें',
        selectLanguageToContinue: 'जारी रखने के लिए भाषा चुनें',
    },
} as const;

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<AppLanguage>(() => {
        if (typeof window === 'undefined') return 'en';
        const saved = window.localStorage.getItem(STORAGE_KEY) as AppLanguage | null;
        return saved === 'en' || saved === 'hi' ? saved : 'en';
    });
    const [hasPreference, setHasPreference] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        const saved = window.localStorage.getItem(STORAGE_KEY);
        return saved === 'en' || saved === 'hi';
    });
    const isReady = typeof window !== 'undefined';

    const setLanguage = (lang: AppLanguage) => {
        setLanguageState(lang);
        setHasPreference(true);
        window.localStorage.setItem(STORAGE_KEY, lang);
    };

    const value = useMemo(
        () => ({ language, setLanguage, hasPreference, isReady }),
        [language, hasPreference, isReady],
    );

    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}

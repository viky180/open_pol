'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import { useLanguage, copy, type AppLanguage } from '@/components/LanguageContext';
import { OnboardingStepIndicator } from '@/components/OnboardingStepIndicator';
import { buildFoundingGroupName, resolvePartyDisplayName } from '@/lib/foundingGroups';
import type { Category, Issue, Party } from '@/types/database';

interface GroupItem {
    party: Party;
    memberCount: number;
    issueName: string | null;
}

interface IssueWithNationalGroups {
    issue: Issue;
    groups: GroupItem[];
}

// Each entry maps a set of keywords to an icon.
// The category slug or name is checked for any of the keywords (substring match).
const CATEGORY_ICON_ENTRIES: Array<{ keywords: string[]; icon: React.ReactNode }> = [
    {
        // 🌿 Environment / Nature / Climate
        keywords: ['environment', 'climate', 'nature', 'green', 'ecology', 'forest', 'pollution', 'conservation'],
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>,
    },
    {
        // ➕ Health / Healthcare / Medical
        keywords: ['health', 'healthcare', 'medical', 'hospital', 'medicine', 'doctor', 'clinic'],
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z"/></svg>,
    },
    {
        // 🎓 Education / School / Skill / Learning
        keywords: ['education', 'school', 'learning', 'skill', 'training', 'university', 'college', 'literacy', 'academic'],
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
    },
    {
        // 🔧 Infrastructure / Roads / Construction
        keywords: ['infrastructure', 'road', 'bridge', 'construction', 'building', 'urban governance', 'governance', 'civic', 'municipality', 'municipal', 'public works'],
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
    },
    {
        // ⚠️ Corruption / Fraud / Bribery / Accountability
        keywords: ['corruption', 'fraud', 'bribery', 'scam', 'embezzlement', 'accountability', 'transparency', 'anti-corruption'],
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>,
    },
    {
        // 🙋 Fundamental Rights / Civil Liberties / Constitutional
        keywords: ['fundamental', 'rights', 'civil liberties', 'constitutional', 'human rights', 'liberty', 'freedom'],
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/><path d="M12 12v4"/></svg>,
    },
    {
        // 👥 Social Justice / Equality / Inclusion / Community
        keywords: ['social justice', 'social', 'equality', 'inclusion', 'diversity', 'community', 'welfare', 'women', 'gender', 'minority', 'tribal', 'dalit', 'marginalized'],
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    },
    {
        // ⚖️ Law / Legal / Court (generic)
        keywords: ['law', 'legal', 'court', 'judicial', 'justice'],
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>,
    },
    {
        // 💰 Economy / Finance / Tax / Budget
        keywords: ['economy', 'economic', 'finance', 'taxation', 'tax', 'budget', 'fiscal', 'revenue', 'trade', 'business', 'monetary'],
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>,
    },
    {
        // 🏠 Housing / Shelter / Homes
        keywords: ['housing', 'shelter', 'homes', 'home', 'apartment', 'affordable', 'real estate', 'slum'],
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    },
    {
        // 🚌 Transport / Transit / Commute
        keywords: ['transport', 'transit', 'commute', 'bus', 'train', 'rail', 'metro', 'road', 'traffic', 'mobility'],
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>,
    },
    {
        // 🛡️ Safety / Security / Crime / Police
        keywords: ['safety', 'security', 'crime', 'police', 'protection', 'violence', 'law enforcement'],
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2-1 4-3 5.99-4.99a1 1 0 0 1 1.02 0C14 2 16 4 18 5a1 1 0 0 1 1 1z"/></svg>,
    },
    {
        // 💧 Water / Irrigation / Flood / Drought
        keywords: ['water', 'irrigation', 'flood', 'drought', 'river', 'drinking water', 'groundwater'],
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-8.5c-1 1.5-2.2 4.6-3.6 6.7-1.3 2-2.3 3.2-3.2 5.2A6.9 6.9 0 0 0 12 22v0Z"/></svg>,
    },
    {
        // 🗑️ Sanitation / Waste / Hygiene / Cleanliness
        keywords: ['sanitation', 'waste', 'garbage', 'sewage', 'hygiene', 'cleanliness', 'toilet', 'open defecation'],
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
    },
    {
        // ⚡ Electricity / Energy / Power
        keywords: ['electricity', 'energy', 'power', 'solar', 'renewable', 'grid', 'fuel'],
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    },
    {
        // 💼 Employment / Jobs / Work / Labour
        keywords: ['employment', 'jobs', 'job', 'work', 'labour', 'labor', 'career', 'livelihood', 'wages', 'unemployment'],
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
    },

    {
        // 🌾 Agriculture / Farming / Rural / Food
        keywords: ['agriculture', 'farming', 'farm', 'rural', 'food', 'crop', 'irrigation', 'soil', 'livestock', 'fisher'],
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22V12"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/><path d="M8 6c0-2.757 1.79-5 4-5s4 2.243 4 5c0 4-4 6-4 6S8 10 8 6Z"/></svg>,
    },
];

const CATEGORY_ICON_DEFAULT = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>;

function getCategoryIcon(category: Category): React.ReactNode {
    const slug = category.slug?.toLowerCase() || '';
    const name = category.name?.toLowerCase() || '';
    const combined = `${slug} ${name}`;
    for (const entry of CATEGORY_ICON_ENTRIES) {
        if (entry.keywords.some((kw) => combined.includes(kw))) {
            return entry.icon;
        }
    }
    return CATEGORY_ICON_DEFAULT;
}

const SESSION_KEY = 'openpolitics:welcome:selectedCategory';
const OPEN_LOCATION_MODAL_EVENT = 'open-location-modal';
const LOCATION_UPDATED_EVENT = 'location-updated';

export default function WelcomePage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { language, setLanguage, hasPreference, isReady } = useLanguage();
    const t = copy[language];

    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [issuesWithNationalGroups, setIssuesWithNationalGroups] = useState<IssueWithNationalGroups[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [loadingGroups, setLoadingGroups] = useState(false);
    const [showAllCategories, setShowAllCategories] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState<AppLanguage | null>(null);

    const [profileCompleted, setProfileCompleted] = useState(false);
    const [displayName, setDisplayName] = useState('');
    const [pincode, setPincode] = useState('');
    const [profileLoading, setProfileLoading] = useState(true);
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileError, setProfileError] = useState<string | null>(null);
    const [locationCompleted, setLocationCompleted] = useState(false);
    const [locationStepSkipped, setLocationStepSkipped] = useState(false);

    const [joinLoadingPartyId, setJoinLoadingPartyId] = useState<string | null>(null);
    const [joinError, setJoinError] = useState<string | null>(null);

    const [requestedNext, setRequestedNext] = useState('/');
    const continuePath = requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/';
    const welcomeReturnTo = continuePath === '/' ? '/welcome' : `/welcome?next=${encodeURIComponent(continuePath)}`;

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setRequestedNext(params.get('next') ?? '/');
    }, []);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push(`/auth?returnTo=${encodeURIComponent(welcomeReturnTo)}`);
        }
    }, [authLoading, user, router, welcomeReturnTo]);

    useEffect(() => {
        if (!user) return;
        async function loadProfile() {
            try {
                const res = await fetch('/api/profile');
                if (res.ok) {
                    const data = await res.json();
                    setDisplayName(data.display_name || '');
                    setPincode(data.pincode || '');
                    setLocationCompleted(Boolean(data.state));
                    if (data.display_name && data.display_name.trim().length > 0) {
                        setProfileCompleted(true);
                    }
                }
            } catch {
                // ignore
            } finally {
                setProfileLoading(false);
            }
        }
        loadProfile();
    }, [user]);

    useEffect(() => {
        if (!user) return;

        const refreshLocationCompletion = async () => {
            try {
                const res = await fetch('/api/profile');
                if (!res.ok) return;
                const data = await res.json();
                setLocationCompleted(Boolean(data.state));
            } catch {
                // ignore
            }
        };

        const onLocationUpdated = () => {
            refreshLocationCompletion();
        };

        window.addEventListener(LOCATION_UPDATED_EVENT, onLocationUpdated);
        return () => window.removeEventListener(LOCATION_UPDATED_EVENT, onLocationUpdated);
    }, [user]);

    useEffect(() => {
        try {
            const saved = window.sessionStorage.getItem(SESSION_KEY);
            if (saved) {
                const parsed = JSON.parse(saved) as Category;
                if (parsed && parsed.id) {
                    setSelectedCategory(parsed);
                }
            }
        } catch {
            // ignore
        }
    }, []);

    useEffect(() => {
        async function fetchCategories() {
            try {
                const res = await fetch('/api/categories');
                if (res.ok) {
                    const data = await res.json();
                    setCategories(data);
                }
            } catch (err) {
                console.error('Failed to fetch categories:', err);
            } finally {
                setLoadingCategories(false);
            }
        }
        fetchCategories();
    }, []);

    useEffect(() => {
        if (!selectedCategory) {
            setIssuesWithNationalGroups([]);
            return;
        }

        const categoryId = selectedCategory.id;

        async function fetchGroups() {
            setLoadingGroups(true);
            try {
                const [issuesRes, groupsRes] = await Promise.all([
                    fetch(`/api/issues?category_id=${categoryId}&limit=200`),
                    fetch(`/api/parties?category_id=${categoryId}&location_scope=national&limit=200`),
                ]);

                if (!issuesRes.ok || !groupsRes.ok) {
                    throw new Error('Failed to load issues/groups');
                }

                const issuesPayload = await issuesRes.json();
                const groupsPayload = await groupsRes.json();

                const issues: Issue[] = Array.isArray(issuesPayload.issues) ? issuesPayload.issues : [];
                const items: GroupItem[] = (groupsPayload.parties || []).map((p: Party & { member_count?: number; issue_name?: string | null }) => ({
                        party: p,
                        memberCount: p.member_count || 0,
                        issueName: p.issue_name ?? null,
                    }));

                const groupsByIssueId = new Map<string, GroupItem[]>();
                const groupsByIssueText = new Map<string, GroupItem[]>();
                for (const item of items) {
                    const issueId = item.party.issue_id?.trim() || '';
                    if (issueId) {
                        const existing = groupsByIssueId.get(issueId) || [];
                        existing.push(item);
                        groupsByIssueId.set(issueId, existing);
                    }

                    const textKey = (item.issueName || '').trim().toLowerCase();
                    if (textKey) {
                        const existing = groupsByIssueText.get(textKey) || [];
                        existing.push(item);
                        groupsByIssueText.set(textKey, existing);
                    }
                }

                const sections: IssueWithNationalGroups[] = issues.map((issue) => {
                    const issueIdMatches = groupsByIssueId.get(issue.id) || [];
                    const issueTextKey = issue.issue_text.trim().toLowerCase();
                    const issueTextMatches = issueIdMatches.length === 0
                        ? (groupsByIssueText.get(issueTextKey) || [])
                        : [];

                    const seenPartyIds = new Set<string>();
                    const mergedGroups: GroupItem[] = [];
                    for (const group of [...issueIdMatches, ...issueTextMatches]) {
                        if (seenPartyIds.has(group.party.id)) continue;
                        seenPartyIds.add(group.party.id);
                        mergedGroups.push(group);
                    }

                    mergedGroups.sort((a, b) => {
                        if (a.party.is_founding_group && !b.party.is_founding_group) return -1;
                        if (!a.party.is_founding_group && b.party.is_founding_group) return 1;
                        return b.memberCount - a.memberCount;
                    });

                    return { issue, groups: mergedGroups };
                });

                setIssuesWithNationalGroups(sections);
            } catch (err) {
                console.error('Failed to fetch groups:', err);
            } finally {
                setLoadingGroups(false);
            }
        }
        fetchGroups();
    }, [selectedCategory]);

    const handleSelectCategory = (category: Category) => {
        setSelectedCategory(category);
        setJoinError(null);
        try {
            window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(category));
        } catch {
            // ignore
        }
    };

    const handleBackToCategories = () => {
        setSelectedCategory(null);
        setJoinError(null);
        try {
            window.sessionStorage.removeItem(SESSION_KEY);
        } catch {
            // ignore
        }
    };

    const handleSaveProfile = async () => {
        const trimmedName = displayName.trim();
        if (trimmedName.length === 0) {
            setProfileError('Please enter your name');
            return;
        }

        setProfileSaving(true);
        setProfileError(null);

        try {
            const body: Record<string, string> = { display_name: trimmedName };
            const cleanedPincode = pincode.replace(/\D/g, '');
            if (cleanedPincode.length === 6) {
                body.pincode = cleanedPincode;
            }

            const res = await fetch('/api/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data?.error || 'Failed to save profile');
            }

            setProfileCompleted(true);
        } catch (err) {
            setProfileError(err instanceof Error ? err.message : 'Failed to save profile');
        } finally {
            setProfileSaving(false);
        }
    };

    const handleJoin = async (partyId: string) => {
        if (!user) return;

        setJoinLoadingPartyId(partyId);
        setJoinError(null);

        try {
            const res = await fetch(`/api/parties/${partyId}/join`, { method: 'POST' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data?.error || 'Unable to join group');
            }

            try {
                window.sessionStorage.removeItem(SESSION_KEY);
            } catch {
                // ignore
            }

            const autoProvision = data?.autoProvision || null;
            if (autoProvision) {
                const notice = {
                    targetPartyId: partyId,
                    created: autoProvision.created || [],
                    reused: autoProvision.reused || [],
                    skipped: autoProvision.skipped || [],
                    createdAt: Date.now(),
                };
                try {
                    window.sessionStorage.setItem('openpolitics:auto-provision-notice', JSON.stringify(notice));
                } catch { /* best effort */ }
            }

            router.push(`/party/${partyId}`);
            router.refresh();
        } catch (err) {
            setJoinError(err instanceof Error ? err.message : 'Unable to join group');
        } finally {
            setJoinLoadingPartyId(null);
        }
    };

    if (authLoading || !user) {
        return null;
    }

    if (isReady && !hasPreference) {
        const applyLanguage = () => {
            if (!selectedLanguage) return;
            setLanguage(selectedLanguage);
        };

        return (
            <section className="brand-surface min-h-[70vh]">
                <div className="container mx-auto px-4 py-10 sm:py-14 max-w-xl">
                    <div className="brand-panel animate-fade-in text-center p-6">
                        <p className="brand-kicker">Getting Started</p>
                        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mt-4" style={{ fontFamily: 'var(--font-display)' }}>
                            {t.chooseLanguage}
                        </h1>
                        <p className="text-sm text-text-secondary mb-6 mt-2">{t.welcomeSubtitle}</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setSelectedLanguage('en')}
                                className={`rounded-xl border px-4 py-3 text-left transition-all ${selectedLanguage === 'en'
                                    ? 'border-primary bg-primary/10 text-text-primary'
                                    : 'border-border-primary bg-bg-secondary text-text-secondary hover:border-primary/50'
                                    }`}
                            >
                                <div className="font-semibold">English</div>
                                <div className="text-xs opacity-80">Continue in English</div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedLanguage('hi')}
                                className={`rounded-xl border px-4 py-3 text-left transition-all ${selectedLanguage === 'hi'
                                    ? 'border-primary bg-primary/10 text-text-primary'
                                    : 'border-border-primary bg-bg-secondary text-text-secondary hover:border-primary/50'
                                    }`}
                            >
                                <div className="font-semibold">Hindi</div>
                                <div className="text-xs opacity-80">Continue in Hindi</div>
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={applyLanguage}
                            disabled={!selectedLanguage}
                            className="btn btn-primary mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {t.continue}
                        </button>

                        {!selectedLanguage && <p className="text-xs text-text-muted mt-3">{t.selectLanguageToContinue}</p>}
                    </div>
                </div>
            </section>
        );
    }

    if (!profileCompleted && !profileLoading) {
        const profileSteps = [
            { id: 'about_you', label: 'About you', status: 'current' as const },
            { id: 'find_group', label: 'Find your group', status: 'upcoming' as const },
        ];

        return (
            <section className="brand-surface min-h-[70vh]">
                <div className="container mx-auto px-4 py-10 sm:py-14 max-w-xl">
                    <div className="brand-panel animate-fade-in p-6">
                        <OnboardingStepIndicator
                            className="mb-6"
                            title="Getting started"
                            metaLabel="Step 1 of 2"
                            steps={profileSteps}
                        />

                        <div className="mb-6">
                            <p className="brand-kicker">Optional profile details</p>
                            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mt-4" style={{ fontFamily: 'var(--font-display)' }}>
                                Tell people how to recognize you
                            </h1>
                            <p className="text-sm text-text-secondary mt-2">
                                Your name helps other members recognize you. Your pincode helps us suggest nearby groups. You can skip this and add it later.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label htmlFor="welcome-name" className="block text-sm font-medium text-text-primary mb-1.5">
                                    Your name <span className="text-danger">*</span>
                                </label>
                                <input
                                    id="welcome-name"
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder="Enter your name"
                                    maxLength={100}
                                    className="w-full rounded-xl border border-border-primary bg-bg-secondary px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                                />
                            </div>

                            <div>
                                <label htmlFor="welcome-pincode" className="block text-sm font-medium text-text-primary mb-1.5">
                                    Pincode <span className="text-text-muted text-xs font-normal">(optional)</span>
                                </label>
                                <input
                                    id="welcome-pincode"
                                    type="text"
                                    inputMode="numeric"
                                    value={pincode}
                                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="e.g. 110001"
                                    maxLength={6}
                                    className="w-full rounded-xl border border-border-primary bg-bg-secondary px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                                />
                                <p className="text-xs text-text-muted mt-1.5">Helps us show groups active in your area</p>
                            </div>

                            {profileError && <p className="text-sm text-danger">{profileError}</p>}

                            <button
                                type="button"
                                onClick={handleSaveProfile}
                                disabled={profileSaving || displayName.trim().length === 0}
                                className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {profileSaving ? 'Saving...' : 'Save and continue'}
                            </button>

                            <div className="text-center">
                                <button
                                    type="button"
                                    onClick={() => setProfileCompleted(true)}
                                    className="btn btn-secondary w-full"
                                >
                                    Skip and explore groups
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    if (!locationCompleted && !locationStepSkipped) {
        const locationSteps = [
            { id: 'about_you', label: 'About you', status: 'completed' as const },
            { id: 'set_location', label: 'Set location', status: 'current' as const },
            { id: 'find_group', label: 'Find your group', status: 'upcoming' as const },
        ];

        return (
            <section className="brand-surface min-h-[70vh]">
                <div className="container mx-auto px-4 py-10 sm:py-14 max-w-xl">
                    <div className="brand-panel animate-fade-in p-6">
                        <OnboardingStepIndicator
                            className="mb-6"
                            title="Getting started"
                            metaLabel="Step 2 of 3"
                            steps={locationSteps}
                        />

                        <div className="mb-6">
                            <p className="brand-kicker">Location setup</p>
                            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mt-4" style={{ fontFamily: 'var(--font-display)' }}>
                                Set your location for better local matches
                            </h1>
                            <p className="text-sm text-text-secondary mt-2">
                                This helps OpenPolitics recommend nearby groups and local issues relevant to your area.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <button
                                type="button"
                                onClick={() => window.dispatchEvent(new Event(OPEN_LOCATION_MODAL_EVENT))}
                                className="btn btn-primary w-full"
                            >
                                Set location now
                            </button>

                            <button
                                type="button"
                                onClick={() => setLocationStepSkipped(true)}
                                className="btn btn-secondary w-full"
                            >
                                Do this later
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    const visibleCategories = showAllCategories ? categories : categories.slice(0, 6);
    const hasMoreCategories = categories.length > 6;
    const currentStep = selectedCategory ? 2 : 1;
    const groupSetupSteps = [
        {
            id: 'choose_cause',
            label: 'Choose cause',
            status: selectedCategory ? 'completed' as const : 'current' as const,
        },
        {
            id: 'pick_group',
            label: 'Pick group',
            status: selectedCategory ? 'current' as const : 'upcoming' as const,
        },
    ];

    return (
        <section className="brand-surface min-h-[70vh]">
            <div className="container mx-auto px-4 py-10 sm:py-14 max-w-2xl">
                <div className="brand-panel animate-fade-in p-6">
                    <OnboardingStepIndicator
                        className="mb-6"
                        title="Getting started"
                        metaLabel={`Step ${currentStep} of 2`}
                        steps={groupSetupSteps}
                    />

                    <div className="mb-6">
                        <p className="brand-kicker">Getting Started</p>
                        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mt-4" style={{ fontFamily: 'var(--font-display)' }}>
                            {t.welcomeTitle}
                        </h1>
                        <p className="text-sm text-text-secondary mt-2">
                            Find people near you who care about the same things. Join a group. Make things happen.
                        </p>
                    </div>

                    {!selectedCategory && (
                        <div className="mt-6">
                            <p className="text-sm text-text-secondary mb-3">Find people who care about the same issues. Pick a topic to see relevant groups.</p>
                            <p className="text-xs uppercase tracking-[0.2em] text-text-muted mb-4">What do you care about?</p>

                            {loadingCategories ? (
                                <div className="flex justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                                </div>
                            ) : categories.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {visibleCategories.map((category) => (
                                        <button
                                            key={category.id}
                                            type="button"
                                            onClick={() => handleSelectCategory(category)}
                                            className="flex flex-col items-center gap-3 p-5 rounded-[1.2rem] border border-border-primary bg-bg-secondary hover:border-[var(--iux-ochre)] hover:bg-[var(--iux-ochre)]/5 hover:shadow-md transition-all group"
                                        >
                                            <span className="flex items-center justify-center w-12 h-12 rounded-full bg-bg-tertiary text-[var(--iux-ochre)] group-hover:scale-110 transition-transform">
                                                {getCategoryIcon(category)}
                                            </span>
                                            <span className="text-sm font-medium text-text-primary text-center line-clamp-2">{category.name}</span>
                                        </button>
                                    ))}

                                    {hasMoreCategories && (
                                        <button
                                            type="button"
                                            onClick={() => setShowAllCategories((prev) => !prev)}
                                            className="col-span-2 sm:col-span-3 rounded-xl border border-dashed border-border-primary bg-bg-secondary px-4 py-3 text-sm font-medium text-text-secondary hover:text-text-primary hover:border-primary transition-all"
                                        >
                                            {showAllCategories ? 'Show fewer causes' : `Show ${categories.length - 6} more causes`}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <p className="text-center text-text-muted py-4">No categories available yet.</p>
                            )}

                            <div className="mt-6 text-center">
                                <Link href={continuePath} className="text-sm text-text-muted hover:text-primary transition-colors">
                                    Skip for now and browse groups without setup
                                </Link>
                            </div>
                        </div>
                    )}

                    {selectedCategory && (
                        <div className="mt-6">
                            <button type="button" onClick={handleBackToCategories} className="text-sm text-text-muted hover:text-primary mb-4 flex items-center gap-1">
                                <span>&lt;-</span> Choose different cause
                            </button>

                            <div className="flex items-center gap-3 mb-4">
                                <span className="flex items-center justify-center rounded-full border border-[var(--iux-ochre)]/20 bg-[var(--iux-ochre)]/10 h-12 w-12 text-[var(--iux-ochre)]">
                                    {getCategoryIcon(selectedCategory)}
                                </span>
                                <div>
                                    <h2 className="text-lg font-semibold text-text-primary">{selectedCategory.name}</h2>
                                    <p className="text-xs text-text-muted">Issues under this cause and their national groups</p>
                                </div>
                            </div>

                            {joinError && <div className="mb-4 p-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger">{joinError}</div>}

                            {loadingGroups ? (
                                <div className="py-6">
                                    <p className="text-center text-sm text-text-muted mb-4">Finding issues and national groups...</p>
                                    <div className="space-y-3">
                                        {Array.from({ length: 3 }).map((_, i) => (
                                            <div key={i} className="h-28 rounded-xl border border-border-primary bg-bg-secondary animate-pulse" />
                                        ))}
                                    </div>
                                </div>
                            ) : issuesWithNationalGroups.length > 0 ? (
                                <div className="space-y-4">
                                    {issuesWithNationalGroups.map(({ issue, groups: nationalGroups }) => (
                                        <div key={issue.id} className="brand-panel p-4">
                                            <div className="mb-3">
                                                <h3 className="text-base font-semibold text-text-primary">{issue.issue_text}</h3>
                                                <p className="text-xs text-text-muted mt-1">National groups for this issue</p>
                                            </div>

                                            {nationalGroups.length > 0 ? (
                                                <div className="space-y-3">
                                                    {nationalGroups.map(({ party, memberCount, issueName }) => {
                                                        const displayName = resolvePartyDisplayName({
                                                            partyName: party.issue_text,
                                                            isFoundingGroup: party.is_founding_group,
                                                            issueText: issueName ?? issue.issue_text,
                                                            locationScope: party.location_scope,
                                                            locationLabel: party.location_label,
                                                            stateName: party.state_name,
                                                            districtName: party.district_name,
                                                            blockName: party.block_name,
                                                            panchayatName: party.panchayat_name,
                                                            villageName: party.village_name,
                                                        });

                                                        return (
                                                        <div key={party.id} className="rounded-xl border border-border-primary bg-bg-secondary p-3">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <Link href={`/party/${party.id}`} className="flex-1 min-w-0">
                                                                    <h4 className="text-sm font-medium text-text-primary line-clamp-2">{displayName}</h4>
                                                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                                        {party.is_founding_group && (
                                                                            <span className="inline-flex items-center text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted border border-border-primary">Founding group</span>
                                                                        )}
                                                                        <span className="text-sm text-text-muted">{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
                                                                    </div>
                                                                </Link>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleJoin(party.id)}
                                                                    disabled={joinLoadingPartyId !== null}
                                                                    className="btn btn-primary btn-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    {joinLoadingPartyId === party.id ? 'Joining...' : 'Join'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="rounded-xl border border-border-primary bg-bg-secondary p-3">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="text-sm font-medium text-text-primary">
                                                                {buildFoundingGroupName({
                                                                    issueText: issue.issue_text,
                                                                    locationScope: 'national',
                                                                    locationLabel: 'India',
                                                                })}
                                                            </h4>
                                                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                                <span className="inline-flex items-center text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted border border-border-primary">Founding group</span>
                                                                <span className="text-sm text-text-muted">0 members</span>
                                                            </div>
                                                        </div>
                                                        <Link
                                                            href={`/party/create?category=${selectedCategory.id}&issue=${encodeURIComponent(issue.issue_text)}&location_scope=national`}
                                                            className="btn btn-primary btn-sm whitespace-nowrap"
                                                        >
                                                            Create founding group
                                                        </Link>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    <div className="pt-4 text-center">
                                        <Link href={`/discover?category=${selectedCategory.id}`} className="text-sm text-primary hover:underline">
                                            See all {selectedCategory.name} groups
                                        </Link>
                                    </div>

                                    <div className="mt-6 pt-5 border-t border-border-primary text-center">
                                        <p className="text-text-muted text-sm mb-3">Did not find your group?</p>
                                        <Link href={`/party/create?category=${selectedCategory.id}`} className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                                            Create your own group
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 rounded-xl border border-dashed border-border-primary bg-bg-tertiary">
                                    <p className="text-text-primary font-medium mb-2">No issues for {selectedCategory.name} yet</p>
                                    <p className="text-sm text-text-muted mb-4">Be the first to add an issue for this cause.</p>
                                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                        <button type="button" onClick={handleBackToCategories} className="btn btn-secondary">
                                            Try another cause
                                        </button>
                                        <Link href={`/party/create?category=${selectedCategory.id}`} className="btn btn-primary">
                                            Create the first group
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-8 rounded-xl bg-bg-tertiary px-4 py-3 text-center">
                        <p className="text-text-muted text-xs">No strings attached. Join freely. Leave freely.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}

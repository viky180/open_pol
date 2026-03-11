"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Category, Issue, Party } from '@/types/database';
import Image from 'next/image';

type PartyDraft = {
    issueText: string;
    titleImageUrl: string;
    pincodes: string;
    categoryId: string;
};

function buildDefaultGroupIconSvg(name: string) {
    const first = (name || 'G').trim().charAt(0).toUpperCase() || 'G';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" role="img" aria-label="${first}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f6e6da"/><stop offset="100%" stop-color="#ddb297"/></linearGradient></defs><rect width="64" height="64" rx="16" fill="url(#g)"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="#6b3a1f" font-family="Inter, system-ui, sans-serif" font-weight="700" font-size="30">${first}</text></svg>`;
}

function svgToDataUri(svg: string) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export default function AdminPage() {
    const router = useRouter();
    const supabase = createClient();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [issues, setIssues] = useState<Issue[]>([]);
    const [parties, setParties] = useState<Party[]>([]);

    const [categoryName, setCategoryName] = useState('');
    const [categorySlug, setCategorySlug] = useState('');
    const [categoryStatus, setCategoryStatus] = useState<string | null>(null);

    const [issueText, setIssueText] = useState('');
    const [issueCategoryId, setIssueCategoryId] = useState('');
    const [issueStatus, setIssueStatus] = useState<string | null>(null);
    const [issueSubmitting, setIssueSubmitting] = useState(false);

    const [partyDrafts, setPartyDrafts] = useState<PartyDraft[]>([{
        issueText: '',
        titleImageUrl: '',
        pincodes: '',
        categoryId: ''
    }]);
    const [partyStatus, setPartyStatus] = useState<string | null>(null);
    const [partySubmitting, setPartySubmitting] = useState(false);
    const [titleImageUploadingByDraft, setTitleImageUploadingByDraft] = useState<Record<number, boolean>>({});
    const [deletePartyId, setDeletePartyId] = useState('');
    const [deletePartyStatus, setDeletePartyStatus] = useState<string | null>(null);
    const [deletePartySubmitting, setDeletePartySubmitting] = useState(false);
    const [editTitleImagePartyId, setEditTitleImagePartyId] = useState('');
    const [editTitleImageUrl, setEditTitleImageUrl] = useState('');
    const [editTitleImageUploading, setEditTitleImageUploading] = useState(false);
    const [editTitleImageSubmitting, setEditTitleImageSubmitting] = useState(false);
    const [editTitleImageStatus, setEditTitleImageStatus] = useState<string | null>(null);
    const [editIconPartyId, setEditIconPartyId] = useState('');
    const [editIconSvg, setEditIconSvg] = useState('');
    const [editIconSubmitting, setEditIconSubmitting] = useState(false);
    const [editIconStatus, setEditIconStatus] = useState<string | null>(null);

    const [selectedPartyId, setSelectedPartyId] = useState('');
    const [fakeNamesText, setFakeNamesText] = useState('');
    const [fakePincode, setFakePincode] = useState('');
    const [simulationStatus, setSimulationStatus] = useState<string | null>(null);
    const [simulationSubmitting, setSimulationSubmitting] = useState(false);
    const [partyMembers, setPartyMembers] = useState<Array<{
        user_id: string;
        display_name: string;
        is_subgroup_leader?: boolean;
        subgroup_name?: string | null;
    }>>([]);
    const [selectedLeaderUserId, setSelectedLeaderUserId] = useState('');
    const [selectedImpersonationUserId, setSelectedImpersonationUserId] = useState('');
    const [actingAs, setActingAs] = useState<{ id: string; display_name: string } | null>(null);

    useEffect(() => {
        const load = async () => {
            setError(null);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/auth');
                return;
            }

            const adminCheck = await fetch('/api/admin/check');
            if (!adminCheck.ok) {
                setError('You are not authorized to view this page.');
                setLoading(false);
                return;
            }

            const response = await fetch('/api/categories');
            const issuesResponse = await fetch('/api/issues?limit=200');
            const partiesResponse = await fetch('/api/parties?limit=200&sort=recent');

            if (!response.ok || !issuesResponse.ok || !partiesResponse.ok) {
                setError('Failed to load admin data.');
                setLoading(false);
                return;
            }
            const data = (await response.json()) as Category[];
            const issuesPayload = (await issuesResponse.json()) as { issues?: Issue[] };
            const partiesPayload = (await partiesResponse.json()) as { parties?: Party[] };
            const impersonationResponse = await fetch('/api/admin/simulation/impersonation');

            setCategories(data);
            setIssues(issuesPayload.issues || []);
            setParties(partiesPayload.parties || []);

            if (impersonationResponse.ok) {
                const impersonationPayload = (await impersonationResponse.json()) as { actingAs?: { id: string; display_name: string } | null };
                setActingAs(impersonationPayload.actingAs || null);
            }
            setLoading(false);
        };

        load();
    }, [router, supabase]);

    const slugHint = useMemo(() => {
        if (!categoryName) return '';
        return categoryName
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
    }, [categoryName]);

    const selectedPartyForTitleImageEdit = useMemo(
        () => parties.find((party) => party.id === editTitleImagePartyId) || null,
        [parties, editTitleImagePartyId]
    );

    const categoryNameById = useMemo(
        () => new Map(categories.map((category) => [category.id, category.name])),
        [categories]
    );

    const selectedPartyForIconEdit = useMemo(
        () => parties.find((party) => party.id === editIconPartyId) || null,
        [parties, editIconPartyId]
    );

    const iconPromptText = useMemo(() => {
        const groupName = selectedPartyForIconEdit?.issue_text || 'Civic Group';
        return `Create a clean, simple square SVG logo for this civic group name: "${groupName}".
Rules:
- Output only raw <svg>...</svg> code.
- No scripts, no external images/fonts, no foreignObject.
- Keep it minimal and readable at small sizes (24px/32px).
- Use warm neutral colors and high contrast text/symbol.
- Keep file small (under 20KB).`;
    }, [selectedPartyForIconEdit]);

    const nextPartyMissingCustomIcon = useMemo(() => {
        if (parties.length === 0) return null;
        const startIdx = parties.findIndex((p) => p.id === editIconPartyId);
        for (let i = 1; i <= parties.length; i += 1) {
            const idx = (Math.max(startIdx, -1) + i) % parties.length;
            const candidate = parties[idx];
            if (!candidate.icon_svg) return candidate;
        }
        return null;
    }, [parties, editIconPartyId]);

    const updatePartyDraft = (index: number, patch: Partial<PartyDraft>) => {
        setPartyDrafts(prev => prev.map((draft, i) => (
            i === index ? { ...draft, ...patch } : draft
        )));
    };

    const addPartyDraft = () => {
        setPartyDrafts(prev => [...prev, { issueText: '', titleImageUrl: '', pincodes: '', categoryId: '' }]);
    };

    const removePartyDraft = (index: number) => {
        setPartyDrafts(prev => prev.filter((_, i) => i !== index));
    };

    const handleDraftTitleImageUpload = async (index: number, file: File | null) => {
        if (!file) return;

        setError(null);
        setTitleImageUploadingByDraft((prev) => ({ ...prev, [index]: true }));

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/uploads/party-title-image', {
                method: 'POST',
                body: formData,
            });

            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload?.error || 'Failed to upload title image.');
            }

            updatePartyDraft(index, { titleImageUrl: typeof payload?.url === 'string' ? payload.url : '' });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to upload title image.');
        } finally {
            setTitleImageUploadingByDraft((prev) => ({ ...prev, [index]: false }));
        }
    };

    const handleCreateCategory = async (event: React.FormEvent) => {
        event.preventDefault();
        setCategoryStatus(null);
        setError(null);

        const slugValue = categorySlug || slugHint;
        if (!categoryName || !slugValue) {
            setError('Category name and slug are required.');
            return;
        }

        const response = await fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: categoryName.trim(), slug: slugValue })
        });

        const payload = await response.json();
        if (!response.ok) {
            setError(payload?.error || 'Failed to create category.');
            return;
        }

        setCategories(prev => [...prev, payload].sort((a, b) => a.name.localeCompare(b.name)));
        setCategoryName('');
        setCategorySlug('');
        setCategoryStatus('Category created successfully.');
    };

    const handleCreateParties = async () => {
        setPartyStatus(null);
        setError(null);
        setPartySubmitting(true);

        try {
            for (const draft of partyDrafts) {
                const pincodeArray = draft.pincodes
                    .split(/[,\s]+/)
                    .map(p => p.trim())
                    .filter(p => p.length === 6 && /^\d+$/.test(p));

                if (!draft.issueText || pincodeArray.length === 0 || !draft.categoryId) {
                    throw new Error('Each party needs an issue, at least one pincode, and a category.');
                }

                const response = await fetch('/api/parties', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        issue_text: draft.issueText.trim(),
                        title_image_url: draft.titleImageUrl.trim() || null,
                        pincodes: pincodeArray,
                        category_id: draft.categoryId
                    })
                });

                const payload = await response.json();
                if (!response.ok) {
                    throw new Error(payload?.error || 'Failed to create party.');
                }
            }

            setPartyDrafts([{ issueText: '', titleImageUrl: '', pincodes: '', categoryId: '' }]);
            setPartyStatus('All parties created successfully.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create parties.');
        } finally {
            setPartySubmitting(false);
        }
    };

    const handleCreateIssue = async (event: React.FormEvent) => {
        event.preventDefault();
        setIssueStatus(null);
        setError(null);

        if (!issueText.trim()) {
            setError('Issue text is required.');
            return;
        }

        if (!issueCategoryId) {
            setError('Please select an issue category.');
            return;
        }

        setIssueSubmitting(true);
        try {
            const response = await fetch('/api/issues', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    issue_text: issueText.trim(),
                    category_id: issueCategoryId,
                }),
            });

            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload?.error || 'Failed to create issue.');
            }

            setIssues((prev) => [payload as Issue, ...prev]);
            setIssueText('');
            setIssueCategoryId('');
            setIssueStatus('Issue created successfully under selected category.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create issue.');
        } finally {
            setIssueSubmitting(false);
        }
    };

    const handleDeleteParty = async () => {
        if (!deletePartyId) {
            setDeletePartyStatus('Please select a group to delete.');
            return;
        }

        const partyToDelete = parties.find((party) => party.id === deletePartyId);
        if (!partyToDelete) {
            setDeletePartyStatus('Selected group was not found. Please refresh and try again.');
            return;
        }

        const confirmed = window.confirm(
            `Delete this group and all child groups?\n\n${partyToDelete.issue_text.slice(0, 120)}`
        );

        if (!confirmed) return;

        setDeletePartyStatus(null);
        setDeletePartySubmitting(true);

        try {
            const response = await fetch(`/api/parties/${deletePartyId}`, {
                method: 'DELETE',
            });
            const payload = await response.json();

            if (!response.ok) {
                throw new Error(payload?.error || 'Failed to delete group.');
            }

            const deletedIds = new Set<string>(payload?.deleted_party_ids || [deletePartyId]);
            setParties((prev) => prev.filter((party) => !deletedIds.has(party.id)));

            if (selectedPartyId && deletedIds.has(selectedPartyId)) {
                setSelectedPartyId('');
                setPartyMembers([]);
                setSelectedLeaderUserId('');
                setSelectedImpersonationUserId('');
            }

            setDeletePartyId('');
            setDeletePartyStatus(`Deleted ${payload?.deleted_count || deletedIds.size} group(s) successfully.`);
        } catch (err) {
            setDeletePartyStatus(err instanceof Error ? err.message : 'Failed to delete group.');
        } finally {
            setDeletePartySubmitting(false);
        }
    };

    const handleEditTitleImageUpload = async (file: File | null) => {
        if (!file) return;

        setError(null);
        setEditTitleImageStatus(null);
        setEditTitleImageUploading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/uploads/party-title-image', {
                method: 'POST',
                body: formData,
            });

            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload?.error || 'Failed to upload title image.');
            }

            const uploadedUrl = typeof payload?.url === 'string' ? payload.url : '';
            setEditTitleImageUrl(uploadedUrl);
            setEditTitleImageStatus('Image uploaded. Click save to apply this title image.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to upload title image.');
        } finally {
            setEditTitleImageUploading(false);
        }
    };

    const handleSaveTitleImageForParty = async () => {
        if (!editTitleImagePartyId) {
            setEditTitleImageStatus('Please select a group first.');
            return;
        }

        setError(null);
        setEditTitleImageStatus(null);
        setEditTitleImageSubmitting(true);

        try {
            const response = await fetch(`/api/parties/${editTitleImagePartyId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title_image_url: editTitleImageUrl.trim() || null,
                }),
            });

            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload?.error || 'Failed to update title image.');
            }

            const nextUrl = payload?.title_image_url ?? null;
            setParties((prev) => prev.map((party) => (
                party.id === editTitleImagePartyId
                    ? { ...party, title_image_url: nextUrl }
                    : party
            )));
            setEditTitleImageUrl(nextUrl || '');
            setEditTitleImageStatus(nextUrl
                ? 'Group title image updated successfully.'
                : 'Group title image removed successfully.'
            );
        } catch (err) {
            setEditTitleImageStatus(err instanceof Error ? err.message : 'Failed to update title image.');
        } finally {
            setEditTitleImageSubmitting(false);
        }
    };

    const handleSaveIconForParty = async () => {
        if (!editIconPartyId) {
            setEditIconStatus('Please select a group first.');
            return;
        }

        setError(null);
        setEditIconStatus(null);
        setEditIconSubmitting(true);

        try {
            const response = await fetch(`/api/parties/${editIconPartyId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    icon_svg: editIconSvg.trim() || null,
                }),
            });

            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload?.error || 'Failed to update group icon.');
            }

            const nextSvg = payload?.icon_svg ?? null;
            setParties((prev) => prev.map((party) => (
                party.id === editIconPartyId
                    ? { ...party, icon_svg: nextSvg }
                    : party
            )));
            setEditIconSvg(nextSvg || '');
            setEditIconStatus(nextSvg
                ? 'Group icon updated successfully.'
                : 'Group icon reset to default letter icon.'
            );
        } catch (err) {
            setEditIconStatus(err instanceof Error ? err.message : 'Failed to update group icon.');
        } finally {
            setEditIconSubmitting(false);
        }
    };

    useEffect(() => {
        const loadMembers = async () => {
            if (!selectedPartyId) {
                setPartyMembers([]);
                setSelectedLeaderUserId('');
                setSelectedImpersonationUserId('');
                return;
            }
            const response = await fetch(`/api/admin/simulation/members?partyId=${encodeURIComponent(selectedPartyId)}`);
            if (!response.ok) {
                setPartyMembers([]);
                return;
            }
            const data = (await response.json()) as Array<{
                user_id: string;
                display_name: string;
                is_subgroup_leader?: boolean;
                subgroup_name?: string | null;
            }>;
            setPartyMembers(data || []);
            if (data?.length) {
                setSelectedLeaderUserId(data[0].user_id);
                setSelectedImpersonationUserId(data[0].user_id);
            }
        };

        void loadMembers();
    }, [selectedPartyId]);

    const handleImportFakePeople = async () => {
        if (!selectedPartyId) {
            setError('Please select a group first.');
            return;
        }

        const names = fakeNamesText
            .split(/\r?\n|,/)
            .map((name) => name.trim())
            .filter(Boolean);

        if (names.length === 0) {
            setError('Please paste at least one name.');
            return;
        }

        if (names.length > 10) {
            setError('Please provide up to 10 names only.');
            return;
        }

        setError(null);
        setSimulationStatus(null);
        setSimulationSubmitting(true);
        try {
            const response = await fetch('/api/admin/simulation/people', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    partyId: selectedPartyId,
                    names,
                    pincode: fakePincode || undefined,
                }),
            });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload?.error || 'Failed to import fake people.');
            }
            setSimulationStatus(`Imported ${payload?.createdCount || 0} fake people successfully.`);

            const membersResponse = await fetch(`/api/admin/simulation/members?partyId=${encodeURIComponent(selectedPartyId)}`);
            if (membersResponse.ok) {
                const membersData = (await membersResponse.json()) as Array<{
                    user_id: string;
                    display_name: string;
                    is_subgroup_leader?: boolean;
                    subgroup_name?: string | null;
                }>;
                setPartyMembers(membersData || []);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to import fake people.');
        } finally {
            setSimulationSubmitting(false);
        }
    };

    const handleSetLeader = async () => {
        if (!selectedPartyId || !selectedLeaderUserId) {
            setError('Select group and leader first.');
            return;
        }
        setError(null);
        setSimulationStatus(null);
        setSimulationSubmitting(true);
        try {
            const response = await fetch('/api/admin/simulation/leader', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ partyId: selectedPartyId, leaderUserId: selectedLeaderUserId }),
            });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload?.error || 'Failed to set leader.');
            }
            setSimulationStatus('Leader set successfully.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to set leader.');
        } finally {
            setSimulationSubmitting(false);
        }
    };

    const handleStartImpersonation = async () => {
        if (!selectedImpersonationUserId) {
            setError('Select a member to impersonate.');
            return;
        }
        setError(null);
        setSimulationStatus(null);
        setSimulationSubmitting(true);
        try {
            const response = await fetch('/api/admin/simulation/impersonation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: selectedImpersonationUserId }),
            });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload?.error || 'Failed to start impersonation.');
            }
            setActingAs(payload?.actingAs || null);
            setSimulationStatus(`Now acting as ${payload?.actingAs?.display_name || 'selected user'}.`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to start impersonation.');
        } finally {
            setSimulationSubmitting(false);
        }
    };

    const handleClearImpersonation = async () => {
        setError(null);
        setSimulationStatus(null);
        setSimulationSubmitting(true);
        try {
            const response = await fetch('/api/admin/simulation/impersonation', { method: 'DELETE' });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload?.error || 'Failed to clear impersonation.');
            }
            setActingAs(null);
            setSimulationStatus('Impersonation cleared. You are back as admin.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to clear impersonation.');
        } finally {
            setSimulationSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-12">
                <div className="text-center text-text-muted">Loading admin tools...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-12">
                <div className="card border border-danger/40 bg-danger/5">
                    <h1 className="text-lg font-semibold text-danger">Admin Access</h1>
                    <p className="text-text-secondary mt-2">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 sm:py-12 max-w-5xl space-y-8">
            <div className="card border border-primary/30 bg-primary/5">
                <h2 className="text-lg font-semibold">Admin Simulation Mode</h2>
                <p className="text-sm text-text-secondary mt-1">
                    {actingAs
                        ? `Currently acting as: ${actingAs.display_name} (${actingAs.id})`
                        : 'Not impersonating anyone right now.'}
                </p>
            </div>

            <div className="card">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Admin: Categories & Parties</h1>
                    <p className="text-text-secondary text-sm">Create categories, add issues under categories, and seed parties.</p>
                </div>

                <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold">Create Category</h2>
                        <form onSubmit={handleCreateCategory} className="space-y-4">
                            <div className="form-group">
                                <label className="label">Category Name</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={categoryName}
                                    onChange={(event) => setCategoryName(event.target.value)}
                                    placeholder="Health"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="label">Slug</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={categorySlug}
                                    onChange={(event) => setCategorySlug(event.target.value)}
                                    placeholder={slugHint || 'health'}
                                />
                                <span className="form-hint">Suggested: {slugHint || 'health'}</span>
                            </div>
                            <button type="submit" className="btn btn-primary">Create Category</button>
                            {categoryStatus && (
                                <p className="text-sm text-success">{categoryStatus}</p>
                            )}
                        </form>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold">Existing Categories</h2>
                        <div className="rounded-xl border border-border-primary bg-bg-tertiary px-4 py-3">
                            {categories.length === 0 ? (
                                <p className="text-sm text-text-muted">No categories yet.</p>
                            ) : (
                                <ul className="space-y-2 text-sm text-text-secondary">
                                    {categories.map(category => (
                                        <li key={category.id} className="flex items-center justify-between">
                                            <span>{category.name}</span>
                                            <span className="text-text-muted">{category.slug}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </section>

                <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 pt-6 border-t border-border-primary">
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold">Create Issue</h2>
                        <form onSubmit={handleCreateIssue} className="space-y-4">
                            <div className="form-group">
                                <label className="label">Issue Text</label>
                                <textarea
                                    className="input textarea"
                                    value={issueText}
                                    onChange={(event) => setIssueText(event.target.value)}
                                    placeholder="Describe the issue..."
                                    maxLength={280}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="label">Issue Category</label>
                                <select
                                    className="input"
                                    value={issueCategoryId}
                                    onChange={(event) => setIssueCategoryId(event.target.value)}
                                    required
                                >
                                    <option value="">Select a category</option>
                                    {categories.map((category) => (
                                        <option key={category.id} value={category.id}>{category.name}</option>
                                    ))}
                                </select>
                            </div>

                            <button type="submit" className="btn btn-primary" disabled={issueSubmitting || categories.length === 0}>
                                {issueSubmitting ? 'Creating...' : 'Create Issue'}
                            </button>

                            {issueStatus && (
                                <p className="text-sm text-success">{issueStatus}</p>
                            )}
                        </form>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold">Existing Issues</h2>
                        <div className="rounded-xl border border-border-primary bg-bg-tertiary px-4 py-3 max-h-80 overflow-auto">
                            {issues.length === 0 ? (
                                <p className="text-sm text-text-muted">No issues yet.</p>
                            ) : (
                                <ul className="space-y-2 text-sm text-text-secondary">
                                    {issues.map((issue) => (
                                        <li key={issue.id} className="space-y-1 border-b border-border-primary/60 pb-2 last:border-b-0">
                                            <p>{issue.issue_text}</p>
                                            <p className="text-xs text-text-muted">
                                                {issue.category_id ? (categoryNameById.get(issue.category_id) || 'Unknown category') : 'Uncategorized'}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </section>
            </div>

            <div className="card">
                <div className="mb-6">
                    <h2 className="text-xl font-semibold">Create Parties</h2>
                    <p className="text-text-secondary text-sm">
                        Add issue-parties and assign them to categories. Each party is created as the current admin user.
                    </p>
                </div>

                <div className="space-y-5">
                    {partyDrafts.map((draft, index) => (
                        <div key={index} className="rounded-xl border border-border-primary p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-text-secondary">Party {index + 1}</h3>
                                {partyDrafts.length > 1 && (
                                    <button
                                        type="button"
                                        className="text-xs text-danger hover:underline"
                                        onClick={() => removePartyDraft(index)}
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>

                            <div className="form-group">
                                <label className="label">Issue Statement</label>
                                <textarea
                                    className="input textarea"
                                    value={draft.issueText}
                                    onChange={(event) => updatePartyDraft(index, { issueText: event.target.value })}
                                    maxLength={280}
                                    placeholder="Describe the issue..."
                                />
                            </div>

                            <div className="form-group">
                                <label className="label">Issue Group Title Image (optional)</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="input"
                                    onChange={(event) => handleDraftTitleImageUpload(index, event.target.files?.[0] || null)}
                                />
                                <span className="form-hint">Upload JPG, PNG, WEBP, or GIF up to 5MB.</span>
                                {titleImageUploadingByDraft[index] && (
                                    <p className="text-xs text-text-muted mt-1">Uploading image...</p>
                                )}
                                {draft.titleImageUrl && (
                                    <div className="mt-2 space-y-2">
                                        <p className="text-xs text-success">Image uploaded successfully.</p>
                                        <div className="rounded-lg border border-border-primary overflow-hidden max-w-sm">
                                            <Image
                                                src={draft.titleImageUrl}
                                                alt="Title preview"
                                                className="w-full h-28 object-cover"
                                                width={560}
                                                height={224}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => updatePartyDraft(index, { titleImageUrl: '' })}
                                        >
                                            Remove image
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-group">
                                    <label className="label">Pincodes</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={draft.pincodes}
                                        onChange={(event) => updatePartyDraft(index, { pincodes: event.target.value })}
                                        placeholder="302001, 302002"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="label">Category</label>
                                    <select
                                        className="input"
                                        value={draft.categoryId}
                                        onChange={(event) => updatePartyDraft(index, { categoryId: event.target.value })}
                                    >
                                        <option value="">Select a category</option>
                                        {categories.map(category => (
                                            <option key={category.id} value={category.id}>{category.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    ))}

                    <div className="flex flex-wrap gap-3">
                        <button type="button" className="btn btn-secondary" onClick={addPartyDraft}>
                            + Add Another Party
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleCreateParties}
                            disabled={partySubmitting}
                        >
                            {partySubmitting ? 'Creating...' : 'Create Parties'}
                        </button>
                    </div>
                    {partyStatus && (
                        <p className="text-sm text-success">{partyStatus}</p>
                    )}
                </div>
            </div>

            <div className="card">
                <div className="mb-6">
                    <h2 className="text-xl font-semibold">Delete Groups</h2>
                    <p className="text-text-secondary text-sm">
                        Permanently delete a group and its full child hierarchy.
                    </p>
                </div>

                <div className="space-y-4">
                    <div className="form-group">
                        <label className="label">Select Group to Delete</label>
                        <select
                            className="input"
                            value={deletePartyId}
                            onChange={(event) => setDeletePartyId(event.target.value)}
                            disabled={deletePartySubmitting}
                        >
                            <option value="">Choose a group</option>
                            {parties.map((party) => (
                                <option key={party.id} value={party.id}>
                                    {party.issue_text.slice(0, 120)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="button"
                        className="btn btn-secondary text-danger border-danger/40 hover:bg-danger/10"
                        disabled={!deletePartyId || deletePartySubmitting}
                        onClick={handleDeleteParty}
                    >
                        {deletePartySubmitting ? 'Deleting...' : 'Delete Group'}
                    </button>

                    {deletePartyStatus && (
                        <p className="text-sm text-text-secondary">{deletePartyStatus}</p>
                    )}
                </div>
            </div>

            <div className="card">
                <div className="mb-6">
                    <h2 className="text-xl font-semibold">Edit Group Title Image</h2>
                    <p className="text-text-secondary text-sm">
                        Update or remove a group&apos;s title image from admin tools.
                    </p>
                </div>

                <div className="space-y-4">
                    <div className="form-group">
                        <label className="label">Select Group</label>
                        <select
                            className="input"
                            value={editTitleImagePartyId}
                            onChange={(event) => {
                                const nextId = event.target.value;
                                setEditTitleImagePartyId(nextId);
                                const selectedParty = parties.find((party) => party.id === nextId);
                                setEditTitleImageUrl(selectedParty?.title_image_url || '');
                                setEditTitleImageStatus(null);
                            }}
                            disabled={editTitleImageSubmitting}
                        >
                            <option value="">Choose a group</option>
                            {parties.map((party) => (
                                <option key={party.id} value={party.id}>
                                    {party.issue_text.slice(0, 120)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="label">Upload New Title Image</label>
                        <input
                            type="file"
                            accept="image/*"
                            className="input"
                            disabled={!editTitleImagePartyId || editTitleImageSubmitting}
                            onChange={(event) => handleEditTitleImageUpload(event.target.files?.[0] || null)}
                        />
                        <span className="form-hint">Upload JPG, PNG, WEBP, or GIF up to 5MB.</span>
                        {editTitleImageUploading && (
                            <p className="text-xs text-text-muted mt-1">Uploading image...</p>
                        )}
                    </div>

                    {editTitleImagePartyId && (
                        <div className="rounded-xl border border-border-primary p-4 space-y-3">
                            <p className="text-xs text-text-muted">
                                {selectedPartyForTitleImageEdit?.title_image_url
                                    ? 'Current image preview'
                                    : 'No current image. Upload one and save.'}
                            </p>
                            {editTitleImageUrl ? (
                                <div className="rounded-lg border border-border-primary overflow-hidden max-w-md">
                                    <Image
                                        src={editTitleImageUrl}
                                        alt="Group title preview"
                                        className="w-full h-36 object-cover"
                                        width={720}
                                        height={360}
                                    />
                                </div>
                            ) : (
                                <p className="text-sm text-text-muted">No title image selected.</p>
                            )}
                            <div className="flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    disabled={!editTitleImagePartyId || editTitleImageSubmitting}
                                    onClick={() => setEditTitleImageUrl('')}
                                >
                                    Remove Image
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    disabled={!editTitleImagePartyId || editTitleImageUploading || editTitleImageSubmitting}
                                    onClick={handleSaveTitleImageForParty}
                                >
                                    {editTitleImageSubmitting ? 'Saving...' : 'Save Title Image'}
                                </button>
                            </div>
                        </div>
                    )}

                    {editTitleImageStatus && (
                        <p className="text-sm text-text-secondary">{editTitleImageStatus}</p>
                    )}
                </div>
            </div>

            <div className="card">
                <div className="mb-6">
                    <h2 className="text-xl font-semibold">Edit Group Icon (SVG)</h2>
                    <p className="text-text-secondary text-sm">
                        Manage custom group icons in bulk: copy prompt, paste SVG, preview, save, then jump to next group.
                    </p>
                </div>

                <div className="space-y-4">
                    <div className="form-group">
                        <label className="label">Select Group</label>
                        <select
                            className="input"
                            value={editIconPartyId}
                            onChange={(event) => {
                                const nextId = event.target.value;
                                setEditIconPartyId(nextId);
                                const selectedParty = parties.find((party) => party.id === nextId);
                                setEditIconSvg(selectedParty?.icon_svg || '');
                                setEditIconStatus(null);
                            }}
                            disabled={editIconSubmitting}
                        >
                            <option value="">Choose a group</option>
                            {parties.map((party) => (
                                <option key={party.id} value={party.id}>
                                    {party.issue_text.slice(0, 120)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedPartyForIconEdit && (
                        <>
                            <div className="rounded-xl border border-border-primary p-4 space-y-3">
                                <p className="text-xs text-text-muted">Suggested prompt</p>
                                <pre className="text-xs text-text-secondary whitespace-pre-wrap">{iconPromptText}</pre>
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={async () => {
                                        try {
                                            await navigator.clipboard.writeText(iconPromptText);
                                            setEditIconStatus('Prompt copied. Paste in your SVG generator.');
                                        } catch {
                                            setEditIconStatus('Could not copy prompt.');
                                        }
                                    }}
                                >
                                    Copy prompt
                                </button>
                            </div>

                            <div className="form-group">
                                <label className="label">Paste SVG code</label>
                                <textarea
                                    className="input textarea font-mono"
                                    value={editIconSvg}
                                    onChange={(event) => setEditIconSvg(event.target.value)}
                                    placeholder="<svg ...>...</svg>"
                                    rows={8}
                                />
                                <span className="form-hint">Leave empty to reset to default first-letter icon.</span>
                            </div>

                            <div className="rounded-xl border border-border-primary p-4 space-y-2">
                                <p className="text-xs text-text-muted">Preview</p>
                                <div className="inline-flex items-center gap-3 rounded-lg border border-border-primary bg-bg-tertiary px-3 py-2">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={svgToDataUri(editIconSvg.trim() || buildDefaultGroupIconSvg(selectedPartyForIconEdit.issue_text))}
                                        alt=""
                                        aria-hidden="true"
                                        width={44}
                                        height={44}
                                        className="h-11 w-11 rounded-md border border-border-primary bg-bg-tertiary object-cover"
                                    />
                                    <span className="text-sm text-text-secondary">{selectedPartyForIconEdit.issue_text}</span>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    disabled={editIconSubmitting}
                                    onClick={() => setEditIconSvg('')}
                                >
                                    Reset to default
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    disabled={editIconSubmitting}
                                    onClick={handleSaveIconForParty}
                                >
                                    {editIconSubmitting ? 'Saving...' : 'Save Icon'}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    disabled={editIconSubmitting || !nextPartyMissingCustomIcon}
                                    onClick={() => {
                                        if (!nextPartyMissingCustomIcon) return;
                                        setEditIconPartyId(nextPartyMissingCustomIcon.id);
                                        setEditIconSvg(nextPartyMissingCustomIcon.icon_svg || '');
                                        setEditIconStatus(null);
                                    }}
                                >
                                    {nextPartyMissingCustomIcon ? 'Jump to next without icon' : 'All groups already have icons'}
                                </button>
                            </div>
                        </>
                    )}

                    {editIconStatus && (
                        <p className="text-sm text-text-secondary">{editIconStatus}</p>
                    )}
                </div>
            </div>

            <div className="card">
                <div className="mb-6">
                    <h2 className="text-xl font-semibold">Audience Simulation</h2>
                    <p className="text-text-secondary text-sm">
                        Import fake people into a group, choose voice, and impersonate members.
                    </p>
                </div>

                <div className="space-y-6">
                    <div className="form-group">
                        <label className="label">Select Group</label>
                        <select className="input" value={selectedPartyId} onChange={(e) => setSelectedPartyId(e.target.value)}>
                            <option value="">Choose a group</option>
                            {parties.map((p) => (
                                <option key={p.id} value={p.id}>{p.issue_text.slice(0, 90)}</option>
                            ))}
                        </select>
                    </div>

                    <div className="rounded-xl border border-border-primary p-4 space-y-4">
                        <h3 className="text-sm font-semibold text-text-secondary">1) Import Fake People</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <textarea
                                className="input textarea md:col-span-2"
                                value={fakeNamesText}
                                onChange={(e) => setFakeNamesText(e.target.value)}
                                placeholder={'Paste up to 10 names (one per line)\nAarav Sharma\nPriya Nair\nRohit Verma'}
                                rows={6}
                            />
                            <input className="input" value={fakePincode} onChange={(e) => setFakePincode(e.target.value)} placeholder="Pincode (optional)" />
                        </div>
                        <p className="text-xs text-text-muted">Tip: You can paste names line-by-line (max 10) to make the simulation look realistic.</p>
                        <button className="btn btn-primary" type="button" disabled={simulationSubmitting} onClick={handleImportFakePeople}>
                            {simulationSubmitting ? 'Importing...' : 'Import Fake People'}
                        </button>
                    </div>

                    <div className="rounded-xl border border-border-primary p-4 space-y-4">
                        <h3 className="text-sm font-semibold text-text-secondary">2) Choose Leader</h3>
                        <select className="input" value={selectedLeaderUserId} onChange={(e) => setSelectedLeaderUserId(e.target.value)}>
                            <option value="">Select member as leader</option>
                            {partyMembers.map((m) => (
                                <option key={m.user_id} value={m.user_id}>
                                    {m.display_name}
                                    {m.is_subgroup_leader
                                        ? ` — Sub-group leader${m.subgroup_name ? ` (${m.subgroup_name})` : ''}`
                                        : ''}
                                </option>
                            ))}
                        </select>
                        <button className="btn btn-primary" type="button" disabled={simulationSubmitting} onClick={handleSetLeader}>
                            {simulationSubmitting ? 'Saving...' : 'Set Leader'}
                        </button>
                    </div>

                    <div className="rounded-xl border border-border-primary p-4 space-y-4">
                        <h3 className="text-sm font-semibold text-text-secondary">3) Act as Member</h3>
                        <select className="input" value={selectedImpersonationUserId} onChange={(e) => setSelectedImpersonationUserId(e.target.value)}>
                            <option value="">Select member to impersonate</option>
                            {partyMembers.map((m) => (
                                <option key={m.user_id} value={m.user_id}>{m.display_name}</option>
                            ))}
                        </select>
                        <div className="flex flex-wrap gap-3">
                            <button className="btn btn-primary" type="button" disabled={simulationSubmitting} onClick={handleStartImpersonation}>
                                {simulationSubmitting ? 'Starting...' : 'Start Impersonation'}
                            </button>
                            <button className="btn btn-secondary" type="button" disabled={simulationSubmitting} onClick={handleClearImpersonation}>
                                Clear Impersonation
                            </button>
                        </div>
                    </div>

                    {simulationStatus && <p className="text-sm text-success">{simulationStatus}</p>}
                </div>
            </div>
        </div>
    );
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Category } from '@/types/database';
import { getLocationScopeRank } from '@/types/database';
import {
    DEFAULT_CREATE_PARTY_PREFILL,
    getCreatePartyPrefill,
    getCreateChildGroupLabel,
    getLocationLabelFromScope,
    isScopeLocationValid,
    parsePincodes,
    buildAutoName,
} from '@/lib/partyCreation';
import Link from 'next/link';
import {
    CategorySection,
    IssueSection,
    LocationScopeSection,
    LocationSection,
    ParentSection,
    ScopeDetailsSection,
} from './CreatePartyFormSections';
import { useEligibilityGate } from './useEligibilityGate';
import { usePartyPrefill } from './usePartyPrefill';
import type { Party } from '@/types/database';
import { Suspense } from 'react';

type PartyWithMemberCount = Party & {
    member_count: number;
    level: number;
};

export default function CreatePartyPageWrapper() {
    return (
        <Suspense fallback={<div className="container mx-auto px-4 py-8 sm:py-12 max-w-2xl text-center"><p className="text-text-muted">Loading group builder...</p></div>}>
            <CreatePartyPage />
        </Suspense>
    );
}

function CreatePartyPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const searchParamsKey = searchParams.toString();
    const supabase = createClient();

    const initialPrefill = useMemo(() => {
        if (typeof window === 'undefined') return DEFAULT_CREATE_PARTY_PREFILL;
        try {
            return getCreatePartyPrefill(window.location.search);
        } catch {
            return DEFAULT_CREATE_PARTY_PREFILL;
        }
    }, []);

    // ── Form state ────────────────────────────────────────────────────────────
    const [issueText, setIssueText] = useState(initialPrefill.issueText);
    const [titleImageUrl, setTitleImageUrl] = useState(initialPrefill.titleImageUrl);
    const [titleImageUploading, setTitleImageUploading] = useState(false);
    const [pincodes, setPincodes] = useState(initialPrefill.pincodes);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [parentPartyId, setParentPartyId] = useState(initialPrefill.parentPartyId);
    const [forkOfPartyId, setForkOfPartyId] = useState(initialPrefill.forkOfPartyId);
    const [categoryId, setCategoryId] = useState(initialPrefill.categoryId);

    // ── Location state ────────────────────────────────────────────────────────
    const [locationScope, setLocationScope] = useState(initialPrefill.locationScope || 'district');
    const [stateName, setStateName] = useState(initialPrefill.stateName);
    const [districtName, setDistrictName] = useState(initialPrefill.districtName);
    const [blockName, setBlockName] = useState(initialPrefill.blockName);
    const [panchayatName, setPanchayatName] = useState(initialPrefill.panchayatName);
    const [villageName, setVillageName] = useState(initialPrefill.villageName);
    const [locationPermissionState, setLocationPermissionState] = useState<'idle' | 'requesting' | 'granted' | 'denied' | 'error'>('idle');
    const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);

    // ── Misc ──────────────────────────────────────────────────────────────────
    const [categories, setCategories] = useState<Category[]>([]);
    const [availableParents, setAvailableParents] = useState<PartyWithMemberCount[]>([]);
    const [parentsLoading, setParentsLoading] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [showParentSelector, setShowParentSelector] = useState(false);

    // ── URL change: sync all prefill fields ───────────────────────────────────
    useEffect(() => {
        const nextPrefill = getCreatePartyPrefill(searchParamsKey);
        setIssueText(nextPrefill.issueText);
        setTitleImageUrl(nextPrefill.titleImageUrl);
        setPincodes(nextPrefill.pincodes);
        setParentPartyId(nextPrefill.parentPartyId);
        setForkOfPartyId(nextPrefill.forkOfPartyId);
        setCategoryId(nextPrefill.categoryId);
        setLocationScope(nextPrefill.locationScope);
        setStateName(nextPrefill.stateName);
        setDistrictName(nextPrefill.districtName);
        setBlockName(nextPrefill.blockName);
        setPanchayatName(nextPrefill.panchayatName);
        setVillageName(nextPrefill.villageName);
    }, [searchParamsKey]);

    // ── Stable setters for prefill hook ───────────────────────────────────────
    // React setState functions are identity-stable, no useCallback needed.
    const stableSetLocationScope = setLocationScope;
    const stableSetStateName = setStateName;
    const stableSetDistrictName = setDistrictName;
    const stableSetBlockName = setBlockName;
    const stableSetPanchayatName = setPanchayatName;
    const stableSetVillageName = setVillageName;
    const stableSetParentPartyId = setParentPartyId;
    const stableSetCategoryId = setCategoryId;
    const stableSetIssueText = setIssueText;

    // ── Custom hooks ──────────────────────────────────────────────────────────
    const {
        forkSourceParty,
        parentParty,
    } = usePartyPrefill({
        forkOfPartyId,
        parentPartyId,
        categoryId,
        onSetParentPartyId: stableSetParentPartyId,
        onSetLocationScope: stableSetLocationScope,
        onSetStateName: stableSetStateName,
        onSetDistrictName: stableSetDistrictName,
        onSetBlockName: stableSetBlockName,
        onSetPanchayatName: stableSetPanchayatName,
        onSetVillageName: stableSetVillageName,
        onSetCategoryId: stableSetCategoryId,
        onSetIssueText: stableSetIssueText,
    });

    const {
        isLoggedIn,
        isLeavingCurrentGroup,
        eligibilityLoading,
        canCreateChildWithoutJoining,
        hasBlockingMembership,
        handleLeaveCurrentGroup,
        leaveError,
    } = useEligibilityGate({ parentPartyId, isAdmin });

    // ── Location scope cleanup ────────────────────────────────────────────────
    useEffect(() => {
        if (locationScope === 'national') {
            setStateName('');
            setDistrictName('');
            setBlockName('');
            setPanchayatName('');
            setVillageName('');
            return;
        }
        if (!['district', 'block'].includes(locationScope)) setDistrictName('');
        if (locationScope !== 'block') setBlockName('');
        if (locationScope !== 'panchayat') setPanchayatName('');
        if (locationScope !== 'village') setVillageName('');
        if (!['state', 'district', 'block'].includes(locationScope)) setStateName('');
    }, [locationScope]);

    // ── Auto-naming: react to location changes ────────────────────────────────
    // Track previous location qualifier to detect real changes
    const [prevLocationQualifier, setPrevLocationQualifier] = useState('');

    useEffect(() => {
        // Determine the current location qualifier for this scope
        let currentQualifier = '';
        if (locationScope === 'national') currentQualifier = '- India';
        else if (locationScope === 'state') currentQualifier = stateName.trim();
        else if (locationScope === 'district') currentQualifier = districtName.trim();
        else if (locationScope === 'block') currentQualifier = blockName.trim();
        else if (locationScope === 'panchayat') currentQualifier = panchayatName.trim();
        else if (locationScope === 'village') currentQualifier = villageName.trim();

        // Only auto-name when qualifier actually changes and is non-empty
        if (!currentQualifier || currentQualifier === prevLocationQualifier) return;

        const baseText = issueText || (parentParty?.issue_text || '');
        if (!baseText.trim()) {
            setPrevLocationQualifier(currentQualifier);
            return;
        }

        const autoName = buildAutoName(
            baseText,
            prevLocationQualifier,
            currentQualifier,
            locationScope,
        );

        if (autoName && autoName !== issueText) {
            setIssueText(autoName);
        }
        setPrevLocationQualifier(currentQualifier);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locationScope, stateName, districtName, blockName, panchayatName, villageName]);

    // ── Data fetching ─────────────────────────────────────────────────────────
    const loadCategories = useCallback(async () => {
        const response = await fetch('/api/categories');
        if (!response.ok) return;
        const data = (await response.json()) as Category[];
        setCategories(data);
    }, []);

    useEffect(() => { loadCategories(); }, [loadCategories]);

    useEffect(() => {
        const checkAdmin = async () => {
            try {
                const res = await fetch('/api/admin/check');
                setIsAdmin(res.ok);
            } catch {
                setIsAdmin(false);
            }
        };
        checkAdmin();
    }, []);

    useEffect(() => {
        const loadParents = async () => {
            setParentsLoading(true);
            try {
                const res = await fetch('/api/parties?limit=50');
                if (!res.ok) return;
                const raw = await res.json();
                const data = Array.isArray(raw) ? raw as PartyWithMemberCount[] : (raw.parties || []) as PartyWithMemberCount[];
                const parentable = data.filter((p: PartyWithMemberCount & { node_type?: string }) =>
                    p.node_type === 'community' || p.node_type === 'sub_community' || !p.node_type
                );
                setAvailableParents(parentable);
            } catch {
                // ignore
            } finally {
                setParentsLoading(false);
            }
        };
        loadParents();
    }, []);

    // ── Derived values ────────────────────────────────────────────────────────
    const pincodeArray = useMemo(() => parsePincodes(pincodes), [pincodes]);
    const hasGeoLocation = !!coordinates;

    const computedLocationLabel = useMemo(
        () => getLocationLabelFromScope({ locationScope, stateName, districtName, blockName, panchayatName, villageName }),
        [locationScope, stateName, districtName, blockName, panchayatName, villageName]
    );

    const scopeLocationValid = useMemo(
        () => isScopeLocationValid({ locationScope, stateName, districtName, blockName, panchayatName, villageName }),
        [locationScope, stateName, districtName, blockName, panchayatName, villageName]
    );

    const childScopeValid = useMemo(() => {
        if (!parentParty) return true;
        const parentRank = getLocationScopeRank(parentParty.location_scope || 'district');
        const childRank = getLocationScopeRank(locationScope || 'district');
        return childRank === parentRank + 1;
    }, [parentParty, locationScope]);

    const isDistrictScopeInheritedFromParent = useMemo(() => {
        if (!parentPartyId || !parentParty || !!forkOfPartyId) return false;
        return (parentParty.location_scope || 'district') === 'district' && locationScope === 'district';
    }, [parentPartyId, parentParty, forkOfPartyId, locationScope]);

    const isBlockScopeInheritedFromDistrictParent = useMemo(() => {
        if (!parentPartyId || !parentParty || !!forkOfPartyId) return false;
        return (parentParty.location_scope || 'district') === 'district' && locationScope === 'block';
    }, [parentPartyId, parentParty, forkOfPartyId, locationScope]);

    useEffect(() => {
        if (!isDistrictScopeInheritedFromParent || !parentParty) return;
        setStateName(parentParty.state_name || '');
        setDistrictName(parentParty.district_name || '');
    }, [isDistrictScopeInheritedFromParent, parentParty]);

    const forkScopeValid = useMemo(() => {
        if (!forkSourceParty) return true;
        return (locationScope || 'district') === (forkSourceParty.location_scope || 'district');
    }, [forkSourceParty, locationScope]);

    const hasValidPincodes = pincodeArray.length > 0;
    const hasLocationSignal = hasGeoLocation || hasValidPincodes || !!parentPartyId;
    const hasLocationInput = scopeLocationValid;
    const createChildGroupLabel = getCreateChildGroupLabel(parentParty?.location_scope || null);
    const showLocationScopeSelector = !parentPartyId && !forkOfPartyId;
    const isIssueValid = issueText.trim().length > 0 && issueText.length <= 280;
    const isSubmitDisabled = loading || !isIssueValid || !hasLocationInput || !hasLocationSignal;

    const submitBlockReason = !isIssueValid
        ? 'Issue statement is required and must be 280 characters or less.'
        : !hasLocationInput
            ? 'Complete location scope details before creating.'
            : !hasLocationSignal
                ? 'Add current location or valid postal code(s) before creating.'
                : '';

    // ── Handlers ──────────────────────────────────────────────────────────────
    const requestCurrentLocation = () => {
        if (!navigator.geolocation) {
            setLocationPermissionState('error');
            return;
        }
        setLocationPermissionState('requesting');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setCoordinates({ lat: position.coords.latitude, lng: position.coords.longitude });
                setLocationPermissionState('granted');
            },
            () => {
                setLocationPermissionState('denied');
                setCoordinates(null);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    };

    const handleParentPartyIdChange = (nextParentPartyId: string) => {
        setParentPartyId(nextParentPartyId);
        const selected = availableParents.find((p) => p.id === nextParentPartyId);
        // parentParty will be set by usePartyPrefill on the next ID change
        void selected;
    };

    const handleTitleImageFileChange = async (file: File | null) => {
        if (!file) return;

        setError(null);
        setTitleImageUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/uploads/party-title-image', {
                method: 'POST',
                body: formData,
            });

            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload?.error || 'Failed to upload title image');
            }

            setTitleImageUrl(typeof payload?.url === 'string' ? payload.url : '');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to upload title image');
        } finally {
            setTitleImageUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                const returnUrl = new URL('/party/create', window.location.origin);
                if (issueText) returnUrl.searchParams.set('issue', issueText);
                if (titleImageUrl) returnUrl.searchParams.set('title_image_url', titleImageUrl);
                if (pincodes) returnUrl.searchParams.set('pincodes', pincodes);
                if (categoryId) returnUrl.searchParams.set('category', categoryId);
                if (parentPartyId) returnUrl.searchParams.set('parent', parentPartyId);
                if (forkOfPartyId) returnUrl.searchParams.set('fork_of', forkOfPartyId);
                if (locationScope) returnUrl.searchParams.set('location_scope', locationScope);
                if (stateName) returnUrl.searchParams.set('state_name', stateName);
                if (districtName) returnUrl.searchParams.set('district_name', districtName);
                if (blockName) returnUrl.searchParams.set('block_name', blockName);
                if (panchayatName) returnUrl.searchParams.set('panchayat_name', panchayatName);
                if (villageName) returnUrl.searchParams.set('village_name', villageName);
                router.push(`/auth?returnTo=${encodeURIComponent(returnUrl.pathname + returnUrl.search)}`);
                return;
            }

            if (issueText.length > 280) throw new Error('Issue text must be 280 characters or less');
            if (!scopeLocationValid) throw new Error('Please complete location details for the selected scope.');
            if (!hasLocationSignal) throw new Error('Add location access or at least one valid 6-digit postal code.');
            if (parentPartyId && !parentParty) throw new Error('Parent group not found. Please open the parent group page and try again.');
            if (!childScopeValid) throw new Error('Child group scope must be exactly one level below.');

            if (forkOfPartyId) {
                if (!forkSourceParty) throw new Error('Fork source group not found. Please retry from the group page.');
                const sourceParentId = forkSourceParty.parent_party_id || null;
                const selectedParentId = parentPartyId || null;
                if (selectedParentId !== sourceParentId) throw new Error('Forked group must keep the same parent setting as the selected group.');
                if (!forkScopeValid) throw new Error('Forked group must use the same location scope as the selected group.');
            }

            const { data: activeMembership } = await supabase
                .from('memberships')
                .select('id, party_id')
                .eq('user_id', user.id)
                .is('left_at', null)
                .maybeSingle();

            const canCreateChild = !!parentPartyId && (isAdmin || (activeMembership && activeMembership.party_id === parentPartyId));

            if (activeMembership && !canCreateChild) {
                throw new Error('You can only join one party at a time. Leave your current party first.');
            }

            const { data: party, error: partyError } = await supabase
                .from('parties')
                .insert({
                    issue_text: issueText,
                    title_image_url: titleImageUrl.trim() || null,
                    pincodes: pincodeArray,
                    lat: coordinates?.lat ?? null,
                    lng: coordinates?.lng ?? null,
                    created_by: user.id,
                    category_id: categoryId || null,
                    parent_party_id: parentPartyId || null,
                    node_type: parentPartyId ? 'group' : 'community',
                    location_scope: locationScope || 'district',
                    location_label: computedLocationLabel || null,
                    state_name: stateName.trim() || null,
                    district_name: districtName.trim() || null,
                    block_name: blockName.trim() || null,
                    panchayat_name: panchayatName.trim() || null,
                    village_name: villageName.trim() || null,
                })
                .select()
                .single();

            if (partyError) throw partyError;

            if (!canCreateChild) {
                const { error: memberError } = await supabase
                    .from('memberships')
                    .insert({ party_id: party.id, user_id: user.id });

                if (memberError) {
                    const message = memberError.message.includes('idx_memberships_user_active')
                        ? 'You can only join one party at a time. Leave your current party first.'
                        : memberError.message;
                    throw new Error(message);
                }
            }

            if (parentPartyId) {
                const { data: wouldCycle } = await supabase.rpc('check_party_cycle', {
                    child_id: party.id,
                    parent_id: parentPartyId,
                });
                if (wouldCycle) throw new Error('Unable to create child group due to a hierarchy cycle.');
            }

            router.push(`/party/${party.id}`);
        } catch (err: unknown) {
            const message =
                err instanceof Error
                    ? err.message
                    : typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: unknown }).message === 'string'
                        ? (err as { message: string }).message
                        : 'Failed to create party';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    const displayError = error || leaveError;

    return (
        <section className="brand-surface">
            <div className="container mx-auto px-4 py-8 sm:py-12 max-w-2xl">
                <div className="brand-panel animate-fade-in p-5 sm:p-6">
                    {/* Header */}
                    <div className="mb-6">
                        <p className="brand-kicker mb-3">Group Builder</p>
                        <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                            {forkOfPartyId ? 'Fork Group' : parentPartyId ? createChildGroupLabel : 'Create Group'}
                        </h1>
                        <p className="text-sm text-text-secondary">
                            {forkOfPartyId
                                ? 'Fork this group to compete at the same level under the same parent. Whoever gets the most members (including sub-groups) wins.'
                                : parentPartyId
                                    ? ''
                                    : 'One issue. Real location. Clear local action.'}
                        </p>
                    </div>

                    {forkOfPartyId && (
                        <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 mb-6">
                            <p className="text-sm text-text-secondary leading-relaxed">
                                Forking:{' '}
                                {forkSourceParty ? (
                                    <Link href={`/party/${forkSourceParty.id}`} className="text-primary hover:underline font-medium">
                                        {forkSourceParty.issue_text.slice(0, 120)}
                                    </Link>
                                ) : (
                                    <span className="text-warning">Loading selected group...</span>
                                )}
                                {' '}– competing at the same level under the same parent.
                            </p>
                        </div>
                    )}

                    {parentPartyId && (
                        <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 mb-6">
                            <p className="text-sm text-text-secondary leading-relaxed">
                                This group will be created as a child of:{' '}
                                {parentParty ? (
                                    <Link href={`/party/${parentParty.id}`} className="text-primary hover:underline font-medium">
                                        {parentParty.issue_text.slice(0, 120)}
                                    </Link>
                                ) : (
                                    <span className="text-warning">Loading parent group...</span>
                                )}
                            </p>
                            <p className="text-xs text-text-muted mt-1">
                                Level is fixed by parent hierarchy, so scope is auto-selected.
                            </p>
                        </div>
                    )}

                    {/* Eligibility banner */}
                    <div className="rounded-xl border border-border-primary bg-bg-secondary px-4 py-3 mb-6">
                        {eligibilityLoading ? (
                            <p className="text-xs text-text-muted">Checking your membership eligibility...</p>
                        ) : !isLoggedIn ? (
                            <p className="text-xs text-text-muted">You&apos;ll be asked to sign in before creating this group.</p>
                        ) : hasBlockingMembership ? (
                            <div className="space-y-2">
                                <p className="text-xs text-warning">
                                    You already belong to another active group. Leave it first, then create this group.
                                </p>
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={handleLeaveCurrentGroup}
                                    disabled={isLeavingCurrentGroup}
                                >
                                    {isLeavingCurrentGroup ? 'Exiting current group...' : 'Exit present group'}
                                </button>
                            </div>
                        ) : canCreateChildWithoutJoining ? (
                            <></>
                        ) : (
                            <p className="text-xs text-text-muted">You&apos;ll auto-join this group as the first member.</p>
                        )}
                    </div>

                    {/* Rules */}
                    <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 mb-6">
                        <details>
                            <summary className="cursor-pointer text-sm font-medium text-primary-light">Creation rules (quick read)</summary>
                            <p className="text-sm text-text-secondary leading-relaxed mt-2">
                                • Each group = one issue only<br />
                                • Tie your issue to a real location (GPS or postal code fallback)<br />
                                • No logos, symbols, or manifestos<br />
                                • You can only join one active group at a time (likes are unlimited)
                            </p>
                        </details>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit}>
                        <IssueSection
                            issueText={issueText}
                            onIssueTextChange={setIssueText}
                            titleImageUrl={titleImageUrl}
                            onTitleImageUrlChange={setTitleImageUrl}
                            titleImageUploading={titleImageUploading}
                            onTitleImageFileChange={handleTitleImageFileChange}
                        />

                        <LocationSection
                            locationPermissionState={locationPermissionState}
                            coordinates={coordinates}
                            requestCurrentLocation={requestCurrentLocation}
                            pincodes={pincodes}
                            onPincodesChange={setPincodes}
                            hasValidPincodes={hasValidPincodes}
                            hasGeoLocation={hasGeoLocation}
                        />

                        <CategorySection
                            categoryId={categoryId}
                            onCategoryIdChange={setCategoryId}
                            categories={categories}
                        />

                        {showLocationScopeSelector && (
                            <LocationScopeSection
                                locationScope={locationScope}
                                onLocationScopeChange={setLocationScope}
                                forkSourceParty={forkSourceParty}
                                forkScopeValid={forkScopeValid}
                                parentParty={parentParty}
                                childScopeValid={childScopeValid}
                            />
                        )}

                        <ScopeDetailsSection
                            locationScope={locationScope}
                            stateName={stateName}
                            onStateNameChange={setStateName}
                            districtName={districtName}
                            onDistrictNameChange={setDistrictName}
                            blockName={blockName}
                            onBlockNameChange={setBlockName}
                            panchayatName={panchayatName}
                            onPanchayatNameChange={setPanchayatName}
                            villageName={villageName}
                            onVillageNameChange={setVillageName}
                            computedLocationLabel={computedLocationLabel}
                            isDistrictScopeInheritedFromParent={isDistrictScopeInheritedFromParent}
                            isBlockScopeInheritedFromDistrictParent={isBlockScopeInheritedFromDistrictParent}
                        />

                        <ParentSection
                            parentPartyId={parentPartyId}
                            showParentSelector={showParentSelector}
                            parentParty={parentParty}
                            onShowParentSelector={() => setShowParentSelector(true)}
                            forkSourceParty={forkSourceParty}
                            parentsLoading={parentsLoading}
                            availableParents={availableParents}
                            onParentPartyIdChange={handleParentPartyIdChange}
                            onHideParentSelector={() => setShowParentSelector(false)}
                        />

                        {displayError && (
                            <div role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-danger text-sm mb-4">
                                {displayError}
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-3">
                            <button type="button" onClick={() => router.back()} className="btn btn-secondary sm:flex-1">
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary sm:flex-[2]"
                                disabled={isSubmitDisabled}
                                title={submitBlockReason || undefined}
                            >
                                {loading
                                    ? 'Creating...'
                                    : forkOfPartyId
                                        ? 'Fork Group'
                                        : parentPartyId
                                            ? createChildGroupLabel
                                            : 'Create Group'}
                            </button>
                        </div>
                        {!!submitBlockReason && (
                            <p className="text-xs text-text-muted mt-2">{submitBlockReason}</p>
                        )}
                    </form>

                    {/* Philosophy note */}
                    <div className="mt-6 rounded-xl bg-bg-tertiary px-4 py-3 text-center">
                        <p className="text-text-muted text-xs">
                            {isAdmin && parentPartyId
                                ? 'Admin mode: child groups can be created without auto-joining.'
                                : 'You&apos;ll automatically join as the first member.'}
                            Leadership is earned through trust, not declared.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Category } from '@/types/database';
import { isCreationLocationScope, isValidHierarchyScopeTransition } from '@/types/database';
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
    ScopeDetailsSection,
    getIssueSummary,
    getCategorySummary,
    getScopeSummary,
    getScopeDetailsSummary,
    getParentSummary,
} from './CreatePartyFormSections';
import { IssueSelectorSection } from './IssueSelectorSection';
import { useEligibilityGate } from './useEligibilityGate';
import { usePartyPrefill } from './usePartyPrefill';
import { Suspense } from 'react';
import { useConversationalSteps, type StepId } from './useConversationalSteps';
import { ConversationalStep } from './ConversationalStep';
import { OnboardingStepIndicator } from '@/components/OnboardingStepIndicator';

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
    const shouldStartAtReview = searchParams.get('review') === '1';
    const hasExplicitScopeInUrl = searchParams.has('location_scope');
    const supabase = createClient();

    const initialPrefill = useMemo(() => {
        if (typeof window === 'undefined') return DEFAULT_CREATE_PARTY_PREFILL;
        try {
            return getCreatePartyPrefill(window.location.search);
        } catch {
            return DEFAULT_CREATE_PARTY_PREFILL;
        }
    }, []);

    // â”€â”€ Form state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const [issueText, setIssueText] = useState(initialPrefill.issueText);
    const [titleImageUrl, setTitleImageUrl] = useState(initialPrefill.titleImageUrl);
    const [titleImageUploading, setTitleImageUploading] = useState(false);
    const [pincodes, setPincodes] = useState(initialPrefill.pincodes);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [parentPartyId, setParentPartyId] = useState(initialPrefill.parentPartyId);
    const [forkOfPartyId, setForkOfPartyId] = useState(initialPrefill.forkOfPartyId);
    const [categoryId, setCategoryId] = useState(initialPrefill.categoryId);

    // ── Issue entity state (for national-scope groups) ─────────────────────────────
    const [issueId, setIssueId] = useState('');
    const [newIssueName, setNewIssueName] = useState('');

    // â”€â”€ Location state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const [locationScope, setLocationScope] = useState(initialPrefill.locationScope || 'district');
    const [stateName, setStateName] = useState(initialPrefill.stateName);
    const [districtName, setDistrictName] = useState(initialPrefill.districtName);
    const [blockName, setBlockName] = useState(initialPrefill.blockName);
    const [panchayatName, setPanchayatName] = useState(initialPrefill.panchayatName);
    const [villageName, setVillageName] = useState(initialPrefill.villageName);

    // â”€â”€ Misc â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const [categories, setCategories] = useState<Category[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);

    // â”€â”€ URL change: sync all prefill fields â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    // â”€â”€ Stable setters for prefill hook â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const stableSetLocationScope = setLocationScope;
    const stableSetStateName = setStateName;
    const stableSetDistrictName = setDistrictName;
    const stableSetBlockName = setBlockName;
    const stableSetPanchayatName = setPanchayatName;
    const stableSetVillageName = setVillageName;
    const stableSetParentPartyId = setParentPartyId;
    const stableSetCategoryId = setCategoryId;
    const stableSetIssueText = setIssueText;

    // â”€â”€ Custom hooks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const {
        forkSourceParty,
        parentParty,
    } = usePartyPrefill({
        forkOfPartyId,
        parentPartyId,
        categoryId,
        allowParentScopeAutofill: !hasExplicitScopeInUrl,
        onSetIssueId: setIssueId,
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

    // â”€â”€ Location scope cleanup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    // â”€â”€ Auto-naming: react to location changes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const [prevLocationQualifier, setPrevLocationQualifier] = useState('');

    useEffect(() => {
        let currentQualifier = '';
        if (locationScope === 'national') currentQualifier = '- India';
        else if (locationScope === 'state') currentQualifier = stateName.trim();
        else if (locationScope === 'district') currentQualifier = districtName.trim();
        else if (locationScope === 'block') currentQualifier = blockName.trim();
        else if (locationScope === 'panchayat') currentQualifier = panchayatName.trim();
        else if (locationScope === 'village') currentQualifier = villageName.trim();

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

    // â”€â”€ Data fetching â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    // â”€â”€ Derived values â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const pincodeArray = useMemo(() => parsePincodes(pincodes), [pincodes]);

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
        return isValidHierarchyScopeTransition(parentParty.location_scope || 'district', locationScope || 'district');
    }, [parentParty, locationScope]);

    const isDistrictScopeInheritedFromParent = useMemo(() => {
        if (!parentPartyId || !parentParty || !!forkOfPartyId) return false;
        return (parentParty.location_scope || 'district') === 'district' && locationScope === 'district';
    }, [parentPartyId, parentParty, forkOfPartyId, locationScope]);

    const isBlockScopeInheritedFromDistrictParent = false;

    useEffect(() => {
        if (!isDistrictScopeInheritedFromParent || !parentParty) return;
        setStateName(parentParty.state_name || '');
        setDistrictName(parentParty.district_name || '');
    }, [isDistrictScopeInheritedFromParent, parentParty]);

    const forkScopeValid = useMemo(() => {
        if (!forkSourceParty) return true;
        return (locationScope || 'district') === (forkSourceParty.location_scope || 'district');
    }, [forkSourceParty, locationScope]);

    const createChildGroupLabel = getCreateChildGroupLabel(parentParty?.location_scope || null);
    const showLocationScopeSelector = !parentPartyId && !forkOfPartyId;
    const isIssueValid = issueText.trim().length > 0 && issueText.length <= 280;
    const isSubmitDisabled = loading || !isIssueValid || !scopeLocationValid;

    // â”€â”€ Step context â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const stepCtx = useMemo(() => ({
        forkOfPartyId,
        parentPartyId,
        forkSourceParty,
        parentParty,
        issueText,
        locationScope,
        stateName,
        districtName,
        blockName,
        panchayatName,
        villageName,
        categoryId,
        scopeLocationValid,
        issueId,
        newIssueName,
    }), [
        forkOfPartyId, parentPartyId, forkSourceParty, parentParty,
        issueText, locationScope, stateName, districtName, blockName,
        panchayatName, villageName, categoryId, scopeLocationValid,
        issueId, newIssueName,
    ]);

    const steps = useConversationalSteps(stepCtx, { startAtReview: shouldStartAtReview });
    const activeStepId = steps.editingStep ?? steps.currentStep;
    const createStepLabels: Record<StepId, string> = {
        scope: 'Impact area',
        issue_selector: 'Issue',
        issue: 'Position',
        scope_details: 'Location',
        category: 'Category',
        review: 'Review',
    };
    const createProgressSteps = steps.visibleSteps.map((step) => ({
        id: step.id,
        label: createStepLabels[step.id],
        status: step.id === activeStepId
            ? 'current' as const
            : steps.completedSteps.has(step.id)
                ? 'completed' as const
                : 'upcoming' as const,
    }));
    const currentCreateStepNumber = Math.max(
        1,
        createProgressSteps.findIndex((step) => step.status === 'current') + 1
    );

    // â”€â”€ Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
            if (!isCreationLocationScope(locationScope)) {
                throw new Error('Group creation is currently limited to Village/Locality, District/City, State, or National levels.');
            }
            if (parentPartyId && !parentParty) throw new Error('Main movement not found. Please open the movement page and try again.');
            if (!childScopeValid) throw new Error('Local chapter impact area is not valid for the selected main movement.');

            if (forkOfPartyId) {
                if (!forkSourceParty) throw new Error('Alternative chapter source group not found. Please retry from the group page.');
                const sourceParentId = forkSourceParty.parent_party_id || null;
                const selectedParentId = parentPartyId || null;
                if (selectedParentId !== sourceParentId) throw new Error('Alternative chapter must keep the same main movement as the selected group.');
                if (!forkScopeValid) throw new Error('Alternative chapter must use the same impact area as the selected group.');
            }

            // ── Resolve issue for national groups ───────────────────────────────────
            let resolvedIssueId: string | null = null;
            if (locationScope === 'national' && !parentPartyId) {
                if (issueId) {
                    resolvedIssueId = issueId;
                } else if (forkOfPartyId && forkSourceParty?.issue_id) {
                    resolvedIssueId = forkSourceParty.issue_id;
                } else if (newIssueName.trim()) {
                    // Create a new issue first
                    const issueRes = await fetch('/api/issues', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ issue_text: newIssueName.trim(), category_id: categoryId || null }),
                    });
                    if (!issueRes.ok) {
                        const payload = await issueRes.json();
                        throw new Error(payload?.error || 'Failed to create issue');
                    }
                    const newIssue = await issueRes.json();
                    resolvedIssueId = newIssue.id;
                } else {
                    throw new Error('Please select or create an issue for this national group.');
                }
            }

            const { data: activeMembership } = await supabase
                .from('memberships')
                .select('id, party_id')
                .eq('user_id', user.id)
                .is('left_at', null)
                .maybeSingle();

            // Child group creation is always allowed — auto-join is skipped when creator
            // already has a membership (they are creating on behalf of a parent group).
            // For standalone groups, creator must have no active membership (they will auto-join).
            const canCreateChild = !!parentPartyId;

            if (!canCreateChild && activeMembership) {
                throw new Error('You can only join one party at a time. Leave your current party first.');
            }

            const { data: party, error: partyError } = await supabase
                .from('parties')
                .insert({
                    issue_text: issueText,
                    title_image_url: titleImageUrl.trim() || null,
                    pincodes: pincodeArray,
                    lat: null,
                    lng: null,
                    created_by: user.id,
                    category_id: categoryId || null,
                    parent_party_id: parentPartyId || null,
                    issue_id: resolvedIssueId,
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
                        ? 'You can only be in one group at a time. Leave your current group first.'
                        : memberError.message;
                    throw new Error(message);
                }
            }

            if (parentPartyId) {
                const { data: wouldCycle } = await supabase.rpc('check_party_cycle', {
                    child_id: party.id,
                    parent_id: parentPartyId,
                });
                if (wouldCycle) throw new Error('Can\'t connect these groups this way.');
            }

            router.push(`/party/${party.id}`);
        } catch (err: unknown) {
            const message =
                err instanceof Error
                    ? err.message
                    : typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: unknown }).message === 'string'
                        ? (err as { message: string }).message
                        : 'Failed to create group';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const displayError = error || leaveError;
    const pageTitle = forkOfPartyId ? 'Create alternative group' : parentPartyId ? createChildGroupLabel : 'Create group';

    return (
        <section className="brand-surface">
            <div className="container mx-auto px-4 py-8 sm:py-12 max-w-2xl">
                <div className="brand-panel animate-fade-in p-5 sm:p-6">

                    {/* Header */}
                    <div className="mb-5">
                        <p className="brand-kicker mb-2">Create a group</p>
                        <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                            {pageTitle}
                        </h1>
                        <p className="text-sm text-text-secondary">
                            {forkOfPartyId
                                ? 'Start an alternative group at the same level so people can choose the approach they want to support.'
                                : parentPartyId
                                    ? 'Answer a few short questions to launch a local chapter under the parent group.'
                                    : 'Answer a few short questions to launch a group around one clear public demand.'}
                        </p>
                    </div>

                    <div className="rounded-xl border border-border-primary bg-bg-secondary/70 px-4 py-3 mb-5 text-sm text-text-secondary">
                        Keep it simple: one issue, one location scope, one clear description. You can refine the details after the group is live.
                    </div>

                    {/* Context banners (fork / child) */}
                    {forkOfPartyId && (
                        <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 mb-5">
                            <p className="text-sm text-text-secondary leading-relaxed">
                                Alternative to:{' '}
                                {forkSourceParty ? (
                                    <Link href={`/party/${forkSourceParty.id}`} className="text-primary hover:underline font-medium">
                                        {forkSourceParty.issue_text.slice(0, 120)}
                                    </Link>
                                ) : (
                                    <span className="text-warning">Loading selected group...</span>
                                )}
                                {' '}at the same level.
                            </p>
                        </div>
                    )}

                    {parentPartyId && !forkOfPartyId && (
                        <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 mb-5">
                            <p className="text-sm text-text-secondary leading-relaxed">
                                Local chapter under:{' '}
                                {parentParty ? (
                                    <Link href={`/party/${parentParty.id}`} className="text-primary hover:underline font-medium">
                                        {parentParty.issue_text.slice(0, 120)}
                                    </Link>
                                ) : (
                                    <span className="text-warning">Loading parent group...</span>
                                )}
                            </p>
                        </div>
                    )}

                    {/* Eligibility banner */}
                    {eligibilityLoading ? null : hasBlockingMembership ? (
                        <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 mb-5 space-y-2">
                            <p className="text-xs text-warning">
                                You&apos;re already in a group. Leave it first to start a new one.
                            </p>
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={handleLeaveCurrentGroup}
                                disabled={isLeavingCurrentGroup}
                            >
                                {isLeavingCurrentGroup ? 'Leaving current group...' : 'Leave current group'}
                            </button>
                        </div>
                    ) : null}

                    <OnboardingStepIndicator
                        title="Group setup"
                        metaLabel={`Step ${currentCreateStepNumber} of ${createProgressSteps.length}`}
                        steps={createProgressSteps}
                    />

                    {/* â”€â”€ Conversational steps â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                    <form onSubmit={handleSubmit}>
                        <div className="mt-4 space-y-4">

                            {/* Step 1: Scope (only for standalone groups) */}
                            {showLocationScopeSelector && (
                                <ConversationalStep
                                    id="scope"
                                    emoji="🗺️"
                                    question="How broad should this group be?"
                                    summaryText={getScopeSummary(locationScope)}
                                    isVisible={steps.isStepVisible('scope')}
                                    isCompleted={steps.isStepCompleted('scope')}
                                    isEditing={steps.isStepEditing('scope')}
                                    isCurrent={steps.currentStep === 'scope'}
                                    canAdvance={steps.canAdvance('scope')}
                                    onContinue={() => steps.advanceFrom('scope')}
                                    onEdit={() => steps.startEditing('scope')}
                                >
                                    <LocationScopeSection
                                        locationScope={locationScope}
                                        onLocationScopeChange={setLocationScope}
                                        forkSourceParty={forkSourceParty}
                                        forkScopeValid={forkScopeValid}
                                        parentParty={parentParty}
                                        childScopeValid={childScopeValid}
                                    />
                                    {steps.isStepEditing('scope') && (
                                        <button type="button" className="btn btn-secondary btn-sm" onClick={steps.stopEditing}>
                                            Done editing
                                        </button>
                                    )}
                                </ConversationalStep>
                            )}

                            {/* Step 2: Issue selector (national standalone groups only) */}
                            {locationScope === 'national' && !parentPartyId && !forkOfPartyId && (
                                <ConversationalStep
                                    id="issue_selector"
                                    emoji="🏷️"
                                    question="Which national issue does this group belong to?"
                                    summaryText={issueId ? '✅ Issue selected' : newIssueName.trim() ? `New: "${newIssueName.slice(0, 50)}"` : '(not set)'}
                                    isVisible={steps.isStepVisible('issue_selector')}
                                    isCompleted={steps.isStepCompleted('issue_selector')}
                                    isEditing={steps.isStepEditing('issue_selector')}
                                    isCurrent={steps.currentStep === 'issue_selector'}
                                    canAdvance={steps.canAdvance('issue_selector')}
                                    onContinue={() => steps.advanceFrom('issue_selector')}
                                    onEdit={() => steps.startEditing('issue_selector')}
                                >
                                    <IssueSelectorSection
                                        issueId={issueId}
                                        onIssueIdChange={setIssueId}
                                        newIssueName={newIssueName}
                                        onNewIssueNameChange={setNewIssueName}
                                    />
                                    {steps.isStepEditing('issue_selector') && (
                                        <button type="button" className="btn btn-secondary btn-sm" onClick={steps.stopEditing}>
                                            Done editing
                                        </button>
                                    )}
                                </ConversationalStep>
                            )}

                            {/* Step 3: Group's issue statement */}
                            <ConversationalStep
                                id="issue"
                                emoji="💬"
                                question={
                                    locationScope === 'national' && !parentPartyId
                                        ? "What specific, searchable position should this group take on the issue?"
                                        : "What clear, searchable issue title should this group use?"
                                }
                                summaryText={getIssueSummary(issueText)}
                                isVisible={steps.isStepVisible('issue')}
                                isCompleted={steps.isStepCompleted('issue')}
                                isEditing={steps.isStepEditing('issue')}
                                isCurrent={steps.currentStep === 'issue'}
                                canAdvance={steps.canAdvance('issue')}
                                onContinue={() => steps.advanceFrom('issue')}
                                onEdit={() => steps.startEditing('issue')}
                            >
                                <IssueSection
                                    issueText={issueText}
                                    onIssueTextChange={setIssueText}
                                    titleImageUrl={titleImageUrl}
                                    onTitleImageUrlChange={setTitleImageUrl}
                                    titleImageUploading={titleImageUploading}
                                    onTitleImageFileChange={handleTitleImageFileChange}
                                    locationScope={locationScope}
                                    parentParty={parentParty}
                                />
                                {steps.isStepEditing('issue') && (
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={steps.stopEditing}>
                                        Done editing
                                    </button>
                                )}
                            </ConversationalStep>


                            {/* Step 4: Scope details (skip for national) */}
                            {locationScope !== 'national' && (
                                <ConversationalStep
                                    id="scope_details"
                                    emoji="📌"
                                    question="Which location should this group represent?"
                                    summaryText={getScopeDetailsSummary(locationScope, stateName, districtName, blockName, panchayatName, villageName)}
                                    isVisible={steps.isStepVisible('scope_details')}
                                    isCompleted={steps.isStepCompleted('scope_details')}
                                    isEditing={steps.isStepEditing('scope_details')}
                                    isCurrent={steps.currentStep === 'scope_details'}
                                    canAdvance={steps.canAdvance('scope_details')}
                                    onContinue={() => steps.advanceFrom('scope_details')}
                                    onEdit={() => steps.startEditing('scope_details')}
                                >
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
                                    {steps.isStepEditing('scope_details') && (
                                        <button type="button" className="btn btn-secondary btn-sm" onClick={steps.stopEditing}>
                                            Done editing
                                        </button>
                                    )}
                                </ConversationalStep>
                            )}
                            {/* Step 5: Category */}
                            <ConversationalStep
                                id="category"
                                emoji="🏷️"
                                question="Pick a topic area for this group."
                                summaryText={getCategorySummary(categoryId, categories)}
                                isVisible={steps.isStepVisible('category')}
                                isCompleted={steps.isStepCompleted('category')}
                                isEditing={steps.isStepEditing('category')}
                                isCurrent={steps.currentStep === 'category'}
                                canAdvance={steps.canAdvance('category')}
                                onContinue={() => steps.advanceFrom('category')}
                                onEdit={() => steps.startEditing('category')}
                            >
                                <CategorySection
                                    categoryId={categoryId}
                                    onCategoryIdChange={setCategoryId}
                                    categories={categories}
                                />
                                {steps.isStepEditing('category') && (
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={steps.stopEditing}>
                                        Done editing
                                    </button>
                                )}
                            </ConversationalStep>
                            {/* Step 6: Review & Create */}
                            {steps.isStepVisible('review') && (
                                <div className="animate-fade-in pt-2">
                                    {/* Review card */}
                                    <div className="rounded-2xl border border-primary/30 bg-primary/5 px-5 py-4 space-y-3 mb-4">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-primary-light/80 mb-2">
                                            Review your group
                                        </p>
                                        <ReviewRow label="Issue" value={getIssueSummary(issueText)} />
                                        {!parentPartyId && !forkOfPartyId && (
                                            <ReviewRow label="Scope" value={getScopeSummary(locationScope)} />
                                        )}
                                        {locationScope !== 'national' && (
                                            <ReviewRow
                                                label="Place"
                                                value={getScopeDetailsSummary(locationScope, stateName, districtName, blockName, panchayatName, villageName)}
                                            />
                                        )}
                                        {categoryId && (
                                            <ReviewRow label="Category" value={getCategorySummary(categoryId, categories)} />
                                        )}
                                        {parentParty && (
                                            <ReviewRow label="Parent group" value={getParentSummary(parentParty)} />
                                        )}
                                    </div>

                                    {/* Eligibility note */}
                                    {!eligibilityLoading && (
                                        <p className="text-xs text-text-muted mb-3">
                                            {isLoggedIn === false
                                                ? "You'll be asked to sign in before creating this group."
                                                : canCreateChildWithoutJoining
                                                    ? ''
                                                    : "You'll automatically join as the first member."}
                                        </p>
                                    )}

                                    {/* Error */}
                                    {displayError && (
                                        <div role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-danger text-sm mb-4">
                                            {displayError}
                                        </div>
                                    )}

                                    {/* Submit buttons */}
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <button
                                            type="button"
                                            onClick={() => router.back()}
                                            className="btn btn-secondary sm:flex-1"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="btn btn-primary sm:flex-[2]"
                                            disabled={isSubmitDisabled}
                                        >
                                            {loading
                                                ? 'Creating...'
                                                : forkOfPartyId
                                                    ? 'Create alternative group'
                                                    : parentPartyId
                                                        ? createChildGroupLabel
                                                        : 'Create group'}
                                        </button>
                                    </div>

                                    {isAdmin && parentPartyId && (
                                        <p className="text-xs text-text-muted mt-3 text-center">
                                            Admin mode: local chapters can be created without auto-joining.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </form>

                    {/* Rules - collapsed by default */}
                    <details className="mt-6">
                        <summary className="cursor-pointer text-xs text-text-muted hover:text-text-secondary select-none">
                            How groups work
                        </summary>
                        <div className="mt-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3">
                            <p className="text-sm text-text-secondary leading-relaxed">
                                One issue per group.<br />
                                Add a clear scope and location.<br />
                                Avoid logos, symbols, and manifestos in the title and cover image.<br />
                                You can join only one active group per level, but you can save as many groups as you want.
                            </p>
                        </div>
                    </details>

                </div>
            </div >
        </section >
    );
}

// â”€â”€ Small helper for review rows â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ReviewRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-start gap-2 text-sm">
            <span className="text-text-muted min-w-[80px] flex-shrink-0">{label}</span>
            <span className="text-text-primary font-medium leading-snug">{value}</span>
        </div>
    );
}










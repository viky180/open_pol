import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Party } from '@/types/database';
import { getChildDefaultScope, buildAutoName, getLocationQualifier } from '@/lib/partyCreation';

interface UsePartyPrefillOptions {
    forkOfPartyId: string;
    parentPartyId: string;
    categoryId: string;
    onSetParentPartyId: (id: string) => void;
    onSetLocationScope: (scope: string) => void;
    onSetStateName: (v: string) => void;
    onSetDistrictName: (v: string) => void;
    onSetBlockName: (v: string) => void;
    onSetPanchayatName: (v: string) => void;
    onSetVillageName: (v: string) => void;
    onSetCategoryId: (id: string) => void;
    onSetIssueText: (v: string) => void;
}

interface UsePartyPrefillReturn {
    forkSourceParty: Party | null;
    parentParty: Party | null;
}

export function usePartyPrefill({
    forkOfPartyId,
    parentPartyId,
    categoryId,
    onSetParentPartyId,
    onSetLocationScope,
    onSetStateName,
    onSetDistrictName,
    onSetBlockName,
    onSetPanchayatName,
    onSetVillageName,
    onSetCategoryId,
    onSetIssueText,
}: UsePartyPrefillOptions): UsePartyPrefillReturn {
    const [forkSourceParty, setForkSourceParty] = useState<Party | null>(null);
    const forkPrefillApplied = useRef(false);

    const [parentParty, setParentParty] = useState<Party | null>(null);
    const childScopeAutoApplied = useRef(false);

    // Reset applied flags when IDs change (URL navigation)
    useEffect(() => {
        forkPrefillApplied.current = false;
    }, [forkOfPartyId]);

    useEffect(() => {
        childScopeAutoApplied.current = false;
    }, [parentPartyId]);

    // Load fork source party
    useEffect(() => {
        const load = async () => {
            if (!forkOfPartyId) {
                setForkSourceParty(null);
                return;
            }
            const { data } = await createClient()
                .from('parties')
                .select('*')
                .eq('id', forkOfPartyId)
                .maybeSingle();
            setForkSourceParty(data || null);
        };
        load();
    }, [forkOfPartyId]);

    // Apply fork prefill once source is loaded
    useEffect(() => {
        if (!forkSourceParty || forkPrefillApplied.current) return;

        onSetParentPartyId(forkSourceParty.parent_party_id || '');
        onSetLocationScope(forkSourceParty.location_scope || 'district');
        onSetStateName(forkSourceParty.state_name || '');
        onSetDistrictName(forkSourceParty.district_name || '');
        onSetBlockName(forkSourceParty.block_name || '');
        onSetPanchayatName(forkSourceParty.panchayat_name || '');
        onSetVillageName(forkSourceParty.village_name || '');
        if (!categoryId && forkSourceParty.category_id) {
            onSetCategoryId(forkSourceParty.category_id);
        }
        forkPrefillApplied.current = true;
    }, [forkSourceParty, categoryId, onSetParentPartyId, onSetLocationScope, onSetStateName, onSetDistrictName, onSetBlockName, onSetPanchayatName, onSetVillageName, onSetCategoryId]);

    // Load parent party
    useEffect(() => {
        const load = async () => {
            if (!parentPartyId) {
                setParentParty(null);
                return;
            }
            const { data } = await createClient()
                .from('parties')
                .select('*')
                .eq('id', parentPartyId)
                .maybeSingle();
            setParentParty(data || null);
        };
        load();
    }, [parentPartyId]);

    // Auto-apply child scope and auto-name once parent is loaded
    useEffect(() => {
        if (!parentParty || !parentPartyId || !!forkSourceParty || childScopeAutoApplied.current) return;

        const childDefaultScope = getChildDefaultScope(parentParty.location_scope);
        onSetLocationScope(childDefaultScope);
        if (childDefaultScope === 'district' && (parentParty.location_scope || 'district') === 'district') {
            onSetStateName(parentParty.state_name || '');
            onSetDistrictName(parentParty.district_name || '');
        } else if (childDefaultScope === 'block' && (parentParty.location_scope || 'district') === 'district') {
            // For district/city parent -> block/corporation child,
            // carry parent district/city context forward.
            onSetStateName(parentParty.state_name || '');
            onSetDistrictName(parentParty.district_name || '');
        } else {
            onSetStateName('');
            onSetDistrictName('');
        }
        onSetBlockName('');
        onSetPanchayatName('');
        onSetVillageName('');

        // Auto-name: strip parent qualifier, child qualifier will be added
        // once the user selects a location (handled in page.tsx)
        const parentQualifier = getLocationQualifier(parentParty);
        const autoName = buildAutoName(
            parentParty.issue_text || '',
            parentQualifier,
            '', // child location not yet chosen
            childDefaultScope,
        );
        if (autoName) onSetIssueText(autoName);

        childScopeAutoApplied.current = true;
    }, [parentParty, parentPartyId, forkSourceParty, onSetLocationScope, onSetStateName, onSetDistrictName, onSetBlockName, onSetPanchayatName, onSetVillageName, onSetIssueText]);

    return { forkSourceParty, parentParty };
}

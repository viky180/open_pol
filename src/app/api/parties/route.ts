import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { isAdminUserId } from '@/lib/admin';
import {
    CREATION_LOCATION_SCOPES,
    LOCATION_SCOPE_LEVELS,
    isCreationLocationScope,
    isValidHierarchyScopeTransition,
} from '@/types/database';

const VALID_LOCATION_SCOPES = LOCATION_SCOPE_LEVELS.map(l => l.value);

// GET /api/parties - List parties with pagination (uses view to avoid N+1 membership counts)
export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    // Pagination params
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Optional filters
    const pincode = searchParams.get('pincode');
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    const radiusKmParam = searchParams.get('radiusKm');
    const minLevel = searchParams.get('minLevel');
    const categoryId = searchParams.get('category_id');
    const locationScope = searchParams.get('location_scope');
    const includeTotal = searchParams.get('includeTotal') === '1';
    const sort = searchParams.get('sort');

    const lat = latParam ? Number(latParam) : null;
    const lng = lngParam ? Number(lngParam) : null;
    const radiusKm = radiusKmParam ? Number(radiusKmParam) : 25;
    const hasGeoFilter = Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(radiusKm) && radiusKm > 0;

    // Build data query (fetch one extra row to derive hasMore without count query)
    let dataQuery = supabase
        .from('parties_with_member_counts')
        .select('*')
        .range(offset, offset + limit);

    if (sort === 'recent') {
        dataQuery = dataQuery.order('created_at', { ascending: false });
    } else {
        // Keep legacy default ordering for callers that don't pass sort.
        dataQuery = dataQuery
            .order('member_count', { ascending: false })
            .order('created_at', { ascending: false });
    }

    // Apply filters
    if (pincode) {
        dataQuery = dataQuery.contains('pincodes', [pincode]);
    }

    if (hasGeoFilter) {
        const latDelta = radiusKm / 111;
        const lngDelta = radiusKm / (111 * Math.max(Math.cos((lat as number) * Math.PI / 180), 0.1));
        dataQuery = dataQuery
            .not('lat', 'is', null)
            .not('lng', 'is', null)
            .gte('lat', (lat as number) - latDelta)
            .lte('lat', (lat as number) + latDelta)
            .gte('lng', (lng as number) - lngDelta)
            .lte('lng', (lng as number) + lngDelta);
    }

    if (minLevel) {
        const level = parseInt(minLevel, 10);
        if (!Number.isNaN(level)) {
            dataQuery = dataQuery.gte('level', level);
        }
    }

    if (categoryId) {
        dataQuery = dataQuery.eq('category_id', categoryId);
    }

    if (locationScope && VALID_LOCATION_SCOPES.includes(locationScope as never)) {
        dataQuery = dataQuery.eq('location_scope', locationScope);
    }

    const dataResult = await dataQuery;

    if (dataResult.error) {
        return NextResponse.json({ error: dataResult.error.message }, { status: 500 });
    }

    const rows = dataResult.data || [];
    const hasMore = rows.length > limit;
    const parties = hasMore ? rows.slice(0, limit) : rows;

    // Enrich parties with issue_name.
    // NOTE: The parties_with_member_counts view was created before issue_id was added to the
    // parties table. PostgreSQL views with `p.*` don't auto-expand to include new columns unless
    // the view is recreated. So we look up issue_id directly from the parties table, then join issues.
    const partyIds = parties.map((p: Record<string, unknown>) => p.id as string);
    let issueNameMap: Record<string, string> = {};
    if (partyIds.length > 0) {
        const { data: partyRows } = await supabase
            .from('parties')
            .select('id, issue_id')
            .in('id', partyIds);

        const issueIds = [...new Set((partyRows || []).map(r => r.issue_id).filter(Boolean) as string[])];
        if (issueIds.length > 0) {
            const { data: issueRows } = await supabase
                .from('issues')
                .select('id, issue_text')
                .in('id', issueIds);
            const issueMap: Record<string, string> = {};
            for (const row of (issueRows || [])) {
                issueMap[row.id] = row.issue_text;
            }
            // Build partyId -> issue_name map
            for (const row of (partyRows || [])) {
                if (row.issue_id && issueMap[row.issue_id]) {
                    issueNameMap[row.id] = issueMap[row.issue_id];
                }
            }
        }
    }
    const enrichedParties = parties.map((p: Record<string, unknown>) => ({
        ...p,
        issue_name: issueNameMap[p.id as string] ?? null,
    }));

    let total: number | null = null;
    if (includeTotal) {
        let countQuery = supabase
            .from('parties_with_member_counts')
            .select('id', { count: 'exact', head: true });

        if (pincode) {
            countQuery = countQuery.contains('pincodes', [pincode]);
        }

        if (hasGeoFilter) {
            const latDelta = radiusKm / 111;
            const lngDelta = radiusKm / (111 * Math.max(Math.cos((lat as number) * Math.PI / 180), 0.1));
            countQuery = countQuery
                .not('lat', 'is', null)
                .not('lng', 'is', null)
                .gte('lat', (lat as number) - latDelta)
                .lte('lat', (lat as number) + latDelta)
                .gte('lng', (lng as number) - lngDelta)
                .lte('lng', (lng as number) + lngDelta);
        }

        if (minLevel) {
            const level = parseInt(minLevel, 10);
            if (!Number.isNaN(level)) {
                countQuery = countQuery.gte('level', level);
            }
        }

        if (categoryId) {
            countQuery = countQuery.eq('category_id', categoryId);
        }

        if (locationScope && VALID_LOCATION_SCOPES.includes(locationScope as never)) {
            countQuery = countQuery.eq('location_scope', locationScope);
        }

        const countResult = await countQuery;
        total = countResult.count || 0;
    }

    return NextResponse.json({
        parties: enrichedParties,
        total,
        hasMore,
        offset,
        limit
    });
}

// POST /api/parties - Create a new party
export async function POST(request: NextRequest) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
        issue_text,
        is_founding_group,
        title_image_url,
        pincodes,
        lat,
        lng,
        category_id,
        parent_party_id,
        fork_of,
        node_type,
        location_scope,
        location_label,
        state_name,
        district_name,
        block_name,
        panchayat_name,
        village_name,
        issue_id,
    } = body;

    // Validation
    if (!issue_text || issue_text.length > 280) {
        return NextResponse.json(
            { error: 'Issue text is required and must be 280 characters or less' },
            { status: 400 }
        );
    }

    const normalizedTitleImageUrl = typeof title_image_url === 'string' ? title_image_url.trim() : '';
    if (normalizedTitleImageUrl) {
        try {
            // Accept only valid absolute http/https URLs for now.
            const parsed = new URL(normalizedTitleImageUrl);
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                return NextResponse.json({ error: 'title_image_url must be a valid http/https URL' }, { status: 400 });
            }
        } catch {
            return NextResponse.json({ error: 'title_image_url must be a valid URL' }, { status: 400 });
        }
    }

    const normalizedPincodes = Array.isArray(pincodes)
        ? pincodes.filter((p: unknown): p is string => typeof p === 'string' && /^\d{6}$/.test(p.trim())).map(p => p.trim())
        : [];
    const validLat = typeof lat === 'number' && Number.isFinite(lat) && lat >= -90 && lat <= 90;
    const validLng = typeof lng === 'number' && Number.isFinite(lng) && lng >= -180 && lng <= 180;

    if (normalizedPincodes.length === 0 && !(validLat && validLng) && !parent_party_id) {
        return NextResponse.json(
            { error: 'Provide at least one valid pincode or allow location access' },
            { status: 400 }
        );
    }

    if ((lat !== undefined || lng !== undefined) && !(validLat && validLng)) {
        return NextResponse.json(
            { error: 'Invalid lat/lng values' },
            { status: 400 }
        );
    }

    // If category_id is provided, require admin
    if (category_id && !isAdminUserId(user.id)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const normalizedNodeType = (typeof node_type === 'string' ? node_type : '').trim() as 'community' | 'sub_community' | 'group' | '';
    const resolvedNodeType = normalizedNodeType || (parent_party_id ? 'group' : 'community');

    if (!['community', 'sub_community', 'group'].includes(resolvedNodeType)) {
        return NextResponse.json(
            { error: 'node_type must be one of community, sub_community, group' },
            { status: 400 }
        );
    }

    const normalizedScope = (typeof location_scope === 'string' ? location_scope : '').trim();
    const resolvedScope = normalizedScope && VALID_LOCATION_SCOPES.includes(normalizedScope as never) ? normalizedScope : 'district';

    if (normalizedScope && !VALID_LOCATION_SCOPES.includes(normalizedScope as never)) {
        return NextResponse.json(
            { error: `location_scope must be one of ${VALID_LOCATION_SCOPES.join(', ')}` },
            { status: 400 }
        );
    }

    if (resolvedNodeType === 'community' && parent_party_id) {
        return NextResponse.json(
            { error: 'community cannot have a parent' },
            { status: 400 }
        );
    }

    const normalizedStateName = typeof state_name === 'string' ? state_name.trim() : '';
    const normalizedDistrictName = typeof district_name === 'string' ? district_name.trim() : '';
    const normalizedBlockName = typeof block_name === 'string' ? block_name.trim() : '';
    const normalizedPanchayatName = typeof panchayat_name === 'string' ? panchayat_name.trim() : '';
    const normalizedVillageName = typeof village_name === 'string' ? village_name.trim() : '';
    const normalizedLocationLabelInput = typeof location_label === 'string' ? location_label.trim() : '';

    const computedLocationLabel = (() => {
        if (resolvedScope === 'national') return 'India';
        if (resolvedScope === 'state') return normalizedStateName;
        if (resolvedScope === 'district') return normalizedDistrictName;
        if (resolvedScope === 'block') return normalizedBlockName;
        if (resolvedScope === 'panchayat') return normalizedPanchayatName;
        if (resolvedScope === 'village') return normalizedVillageName;
        return normalizedLocationLabelInput;
    })();

    if (resolvedScope === 'state' && !normalizedStateName) {
        return NextResponse.json({ error: 'Please select a state for state-level party' }, { status: 400 });
    }
    if (resolvedScope === 'district' && (!normalizedStateName || !normalizedDistrictName)) {
        return NextResponse.json({ error: 'Please select state and district for district-level party' }, { status: 400 });
    }
    if (resolvedScope === 'block' && (!normalizedStateName || !normalizedBlockName)) {
        return NextResponse.json({ error: 'Please select state and enter city name for city-level party' }, { status: 400 });
    }
    if (resolvedScope === 'panchayat' && !normalizedPanchayatName) {
        return NextResponse.json({ error: 'Please enter panchayat name for panchayat-level party' }, { status: 400 });
    }
    if (resolvedScope === 'village' && !normalizedVillageName) {
        return NextResponse.json({ error: 'Please enter village name for village-level party' }, { status: 400 });
    }

    // Validate issue_id if provided and allow parent inheritance below.
    let resolvedIssueId: string | null = null;
    if (issue_id && typeof issue_id === 'string') {
        const { data: issueRow } = await supabase
            .from('issues')
            .select('id')
            .eq('id', issue_id)
            .maybeSingle();
        if (!issueRow) {
            return NextResponse.json({ error: 'Referenced issue not found' }, { status: 404 });
        }
        resolvedIssueId = issueRow.id;
    }

    if (parent_party_id) {
        const { data: parentParty } = await supabase
            .from('parties')
            .select('location_scope, issue_id')
            .eq('id', parent_party_id)
            .maybeSingle();

        if (!parentParty) {
            return NextResponse.json({ error: 'Parent party not found' }, { status: 404 });
        }

        const allowed = isValidHierarchyScopeTransition(parentParty.location_scope || 'district', resolvedScope);

        if (!allowed) {
            return NextResponse.json(
                { error: 'Child party scope is not valid for the selected parent scope.' },
                { status: 400 }
            );
        }

        // Inherit issue_id from parent if not explicitly provided
        if (!issue_id && parentParty.issue_id) {
            resolvedIssueId = parentParty.issue_id;
        }
    }

    // Launch-phase creation policy:
    // only allow creating national/state/district/village groups.
    if (!isCreationLocationScope(resolvedScope)) {
        return NextResponse.json(
            { error: `location_scope must be one of ${CREATION_LOCATION_SCOPES.join(', ')} during launch` },
            { status: 400 }
        );
    }

    if (fork_of) {
        const { data: sourceParty } = await supabase
            .from('parties')
            .select('id, parent_party_id, location_scope')
            .eq('id', fork_of)
            .maybeSingle();

        if (!sourceParty) {
            return NextResponse.json({ error: 'Fork source party not found' }, { status: 404 });
        }

        if ((parent_party_id || null) !== sourceParty.parent_party_id) {
            return NextResponse.json(
                { error: 'Forked party must share the same parent as the selected source party' },
                { status: 400 }
            );
        }

        if ((resolvedScope || 'district') !== (sourceParty.location_scope || 'district')) {
            return NextResponse.json(
                { error: 'Forked party must use the same location scope as the selected source party' },
                { status: 400 }
            );
        }

        if (!resolvedIssueId) {
            const { data: forkSourceIssue } = await supabase
                .from('parties')
                .select('issue_id')
                .eq('id', fork_of)
                .maybeSingle();
            resolvedIssueId = forkSourceIssue?.issue_id || resolvedIssueId;
        }
    }

    // Create party
    const { data: party, error: partyError } = await supabase
        .from('parties')
        .insert({
            issue_text,
            title_image_url: normalizedTitleImageUrl || null,
            pincodes: normalizedPincodes,
            lat: validLat ? lat : null,
            lng: validLng ? lng : null,
            created_by: user.id,
            is_founding_group: Boolean(is_founding_group),
            category_id: category_id || null,
            parent_party_id: parent_party_id || null,
            issue_id: resolvedIssueId,
            node_type: resolvedNodeType,
            location_scope: resolvedScope,
            location_label: computedLocationLabel || null,
            state_name: normalizedStateName || null,
            district_name: normalizedDistrictName || null,
            block_name: normalizedBlockName || null,
            panchayat_name: normalizedPanchayatName || null,
            village_name: normalizedVillageName || null,
        })
        .select()
        .single();

    if (partyError) {
        return NextResponse.json({ error: partyError.message }, { status: 500 });
    }

    // Auto-join creator
    await supabase
        .from('memberships')
        .insert({
            party_id: party.id,
            user_id: user.id
        });

    return NextResponse.json(party, { status: 201 });
}

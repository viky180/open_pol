import type { Category, Party } from '@/types/database';
import { CREATION_LOCATION_SCOPE_LEVELS, LOCATION_SCOPE_LEVELS } from '@/types/database';
import { INDIA_STATES_AND_UTS } from '@/lib/indiaLocations';
import Image from 'next/image';

type PartyWithMemberCount = Party & {
    member_count: number;
    level: number;
};

type SetString = (value: string) => void;

// ── Summary helpers (used by the collapsed conversation pill) ─────────────────

export function getIssueSummary(issueText: string): string {
    if (!issueText.trim()) return '(no issue yet)';
    return issueText.length > 80 ? issueText.slice(0, 80) + '...' : issueText;
}

export function getLocationSummary(
    hasGeoLocation: boolean,
    hasValidPincodes: boolean,
    pincodes: string,
    coordinates: { lat: number; lng: number } | null,
): string {
    if (hasGeoLocation && coordinates) return `GPS (${coordinates.lat.toFixed(3)}, ${coordinates.lng.toFixed(3)})`;
    if (hasValidPincodes) return `Postal codes: ${pincodes.trim()}`;
    return '(location not set)';
}

export function getCategorySummary(categoryId: string, categories: Category[]): string {
    if (!categoryId) return 'No category';
    const cat = categories.find((c) => c.id === categoryId);
    return cat ? cat.name : 'No category';
}

export function getScopeSummary(locationScope: string): string {
    const level = LOCATION_SCOPE_LEVELS.find((s) => s.value === locationScope);
    return level ? `${level.icon} ${level.label}` : locationScope;
}

export function getScopeDetailsSummary(
    locationScope: string,
    stateName: string,
    districtName: string,
    blockName: string,
    panchayatName: string,
    villageName: string,
): string {
    if (locationScope === 'national') return 'India';
    if (locationScope === 'state') return stateName || 'Not set';
    if (locationScope === 'district') return [stateName, districtName].filter(Boolean).join(', ') || 'Not set';
    if (locationScope === 'block') return [districtName, blockName].filter(Boolean).join(' > ') || 'Not set';
    if (locationScope === 'panchayat') return panchayatName || 'Not set';
    if (locationScope === 'village') return villageName || 'Not set';
    return 'Not set';
}

export function getParentSummary(parentParty: Party | null): string {
    if (!parentParty) return 'Independent group';
    return `Under: ${parentParty.issue_text.slice(0, 60)}${parentParty.issue_text.length > 60 ? '...' : ''}`;
}

// ── Issue Section ─────────────────────────────────────────────────────────────

export function IssueSection({
    issueText,
    onIssueTextChange,
    titleImageUrl,
    onTitleImageUrlChange,
    titleImageUploading,
    onTitleImageFileChange,
    locationScope,
    parentParty,
}: {
    issueText: string;
    onIssueTextChange: SetString;
    titleImageUrl: string;
    onTitleImageUrlChange: SetString;
    titleImageUploading: boolean;
    onTitleImageFileChange: (file: File | null) => void;
    locationScope: string;
    parentParty: Party | null;
}) {
    const issueWordCount = issueText.trim() ? issueText.trim().split(/\s+/).length : 0;
    const hasActionVerb = /\b(demand|repair|protect|stop|expand|ensure|guarantee|restore|fund|build|remove|end|reduce|oppose|save|improve|upgrade|provide|keep|open)\b/i.test(issueText);
    const starterTemplates = getIssueStarterTemplates(locationScope);
    const liveHints: string[] = [];

    if (issueText.trim() && !hasActionVerb) {
        liveHints.push('Start with a verb people search for, like Demand, Repair, Protect, Stop, Expand, or Ensure.');
    }
    if (issueText.trim() && issueWordCount < 3) {
        liveHints.push('Add the concrete problem or service, not just a broad slogan.');
    }

    return (
        <div className="space-y-3">
            <div>
                <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-text-muted">Issue statement</span>
                    <span className={`text-xs ${issueText.length > 280 ? 'text-danger' : 'text-text-muted'}`}>
                        {issueText.length}/280
                    </span>
                </div>
                <div className="mb-3 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">Make it discoverable</p>
                    <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                        Write this like a searchable headline: <strong className="text-text-primary">action + concrete problem</strong>.
                        {' '}
                        {locationScope === 'national'
                            ? 'The platform adds the national scope separately, so focus this line on the demand itself.'
                            : 'The platform adds the place name in the next step, so focus this line on wording other people would actually search.'}
                    </p>
                    {parentParty && (
                        <p className="mt-2 text-xs text-text-muted">
                            Starting from parent group: <span className="font-medium text-text-secondary">{parentParty.issue_text.slice(0, 100)}</span>
                        </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                        {starterTemplates.map((template) => (
                            <button
                                key={template}
                                type="button"
                                className="badge cursor-pointer transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                                onClick={() => onIssueTextChange(template)}
                            >
                                {template}
                            </button>
                        ))}
                    </div>
                    <p className="mt-2 text-xs text-text-muted">Tap a starter and rewrite it to match your exact demand.</p>
                </div>
                <textarea
                    className="input textarea"
                    placeholder={getIssueStatementPlaceholder(locationScope)}
                    value={issueText}
                    onChange={(e) => onIssueTextChange(e.target.value)}
                    maxLength={300}
                    rows={3}
                    autoFocus
                    required
                />
                <div className="mt-2 flex flex-wrap gap-2">
                    <span className={`badge ${hasActionVerb ? 'border-success/30 bg-success/10 text-success' : ''}`}>
                        {hasActionVerb ? 'Action word included' : 'Add an action word'}
                    </span>
                    <span className={`badge ${issueWordCount >= 3 ? 'border-success/30 bg-success/10 text-success' : ''}`}>
                        {issueWordCount >= 3 ? 'Specific enough to scan' : 'Be more specific than a slogan'}
                    </span>
                </div>
                {liveHints.length > 0 && (
                    <div className="mt-2 space-y-1">
                        {liveHints.map((hint) => (
                            <p key={hint} className="text-xs text-text-muted">{hint}</p>
                        ))}
                    </div>
                )}
                {issueText.length > 280 && (
                    <p className="text-xs text-danger mt-1">Must be 280 characters or less.</p>
                )}
            </div>

            {/* Image upload — collapsible details */}
            <details className="group">
                <summary className="cursor-pointer text-xs text-text-muted hover:text-text-secondary select-none list-none flex items-center gap-1">
                    <svg
                        className="w-3 h-3 transition-transform group-open:rotate-90"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                    >
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    Add a cover image (optional)
                </summary>
                <div className="mt-2 space-y-2">
                    <input
                        type="file"
                        accept="image/*"
                        className="input text-xs"
                        onChange={(e) => onTitleImageFileChange(e.target.files?.[0] || null)}
                    />
                    {titleImageUploading && (
                        <p className="text-xs text-text-muted">Uploading image...</p>
                    )}
                    {titleImageUrl && (
                        <div className="space-y-2">
                            <p className="text-xs text-success">Image uploaded.</p>
                            <div className="rounded-lg border border-border-primary overflow-hidden max-w-xs">
                                <Image
                                    src={titleImageUrl}
                                    alt="Title preview"
                                    className="w-full h-24 object-cover"
                                    width={420}
                                    height={192}
                                />
                            </div>
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => onTitleImageUrlChange('')}
                            >
                                Remove image
                            </button>
                        </div>
                    )}
                </div>
            </details>
        </div>
    );
}

function getIssueStarterTemplates(locationScope: string): string[] {
    if (locationScope === 'national') {
        return [
            'Guarantee MSP for small farmers',
            'Expand jobs for disabled workers',
            'Protect forest rights for Adivasi communities',
        ];
    }

    return [
        'Demand reliable drinking water',
        'Repair unsafe roads near schools',
        'Stop illegal dumping near homes',
    ];
}

function getIssueStatementPlaceholder(locationScope: string): string {
    if (locationScope === 'national') {
        return 'e.g. "Guarantee MSP for small farmers"';
    }

    return 'e.g. "Demand reliable drinking water"';
}

// ── Location Section ──────────────────────────────────────────────────────────

export function LocationSection({
    locationPermissionState,
    coordinates,
    requestCurrentLocation,
    pincodes,
    onPincodesChange,
    hasValidPincodes,
    hasGeoLocation,
}: {
    locationPermissionState: 'idle' | 'requesting' | 'granted' | 'denied' | 'error';
    coordinates: { lat: number; lng: number } | null;
    requestCurrentLocation: () => void;
    pincodes: string;
    onPincodesChange: SetString;
    hasValidPincodes: boolean;
    hasGeoLocation: boolean;
}) {
    return (
        <div className="space-y-3">
            {/* GPS button */}
            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    className={`btn btn-sm ${hasGeoLocation ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={requestCurrentLocation}
                    disabled={locationPermissionState === 'requesting'}
                >
                    {locationPermissionState === 'requesting'
                        ? 'Detecting location...'
                        : hasGeoLocation
                            ? 'Location added'
                            : 'Use my location'}
                </button>
                {locationPermissionState === 'granted' && coordinates && (
                    <span className="text-xs text-emerald-500">
                        {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
                    </span>
                )}
                {(locationPermissionState === 'denied' || locationPermissionState === 'error') && (
                    <span className="text-xs text-warning">Location unavailable.</span>
                )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-border-primary" />
                <span className="text-[11px] uppercase tracking-wide text-text-muted">or enter postal codes</span>
                <div className="flex-1 h-px bg-border-primary" />
            </div>

            {/* Pincode input */}
            <div>
                <input
                    type="text"
                    className="input"
                    placeholder="302001, 302002, 302003"
                    value={pincodes}
                    onChange={(e) => onPincodesChange(e.target.value)}
                />
                <span className="form-hint">Separate 6-digit codes with commas.</span>
                {pincodes.trim().length > 0 && !hasValidPincodes && !hasGeoLocation && (
                    <p className="text-xs text-danger mt-1">Enter at least one valid 6-digit code.</p>
                )}
            </div>
        </div>
    );
}

// ── Category Section ──────────────────────────────────────────────────────────

export function CategorySection({
    categoryId,
    onCategoryIdChange,
    categories,
}: {
    categoryId: string;
    onCategoryIdChange: SetString;
    categories: Category[];
}) {
    return (
        <div className="space-y-1">
            <select
                className="input"
                value={categoryId}
                onChange={(e) => onCategoryIdChange(e.target.value)}
            >
                <option value="">No category</option>
                {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                ))}
            </select>
            <span className="form-hint">Categories help cluster related issue groups. This is optional.</span>
        </div>
    );
}

// ── Location Scope Section ────────────────────────────────────────────────────

export function LocationScopeSection({
    locationScope,
    onLocationScopeChange,
    forkSourceParty,
    forkScopeValid,
    parentParty,
    childScopeValid,
}: {
    locationScope: string;
    onLocationScopeChange: SetString;
    forkSourceParty: Party | null;
    forkScopeValid: boolean;
    parentParty: Party | null;
    childScopeValid: boolean;
}) {
    return (
        <div className="space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CREATION_LOCATION_SCOPE_LEVELS.map((scope) => (
                    <button
                        key={scope.value}
                        type="button"
                        onClick={() => onLocationScopeChange(scope.value)}
                        className={`rounded-xl border px-3 py-2 text-sm text-left transition-colors ${locationScope === scope.value
                            ? 'border-primary bg-primary/10 text-primary-light font-medium'
                            : 'border-border-primary bg-bg-secondary text-text-secondary hover:border-primary/50'
                            }`}
                    >
                        <span className="text-base mr-1">{scope.icon}</span>
                        {scope.label}
                    </button>
                ))}
            </div>
            {forkSourceParty && !forkScopeValid && (
                <p className="text-xs text-danger">
                    Must match the forked group ({forkSourceParty.location_scope || 'district'}).
                </p>
            )}
            {parentParty && !childScopeValid && (
                <p className="text-xs text-danger">
                    Must be exactly one level below the parent movement.
                </p>
            )}
        </div>
    );
}

// ── Scope Details Section ─────────────────────────────────────────────────────

export function ScopeDetailsSection({
    locationScope,
    stateName,
    onStateNameChange,
    districtName,
    onDistrictNameChange,
    blockName,
    onBlockNameChange,
    panchayatName,
    onPanchayatNameChange,
    villageName,
    onVillageNameChange,
    computedLocationLabel,
    isDistrictScopeInheritedFromParent,
    isBlockScopeInheritedFromDistrictParent,
}: {
    locationScope: string;
    stateName: string;
    onStateNameChange: SetString;
    districtName: string;
    onDistrictNameChange: SetString;
    blockName: string;
    onBlockNameChange: SetString;
    panchayatName: string;
    onPanchayatNameChange: SetString;
    villageName: string;
    onVillageNameChange: SetString;
    computedLocationLabel: string;
    isDistrictScopeInheritedFromParent: boolean;
    isBlockScopeInheritedFromDistrictParent: boolean;
}) {
    return (
        <div className="space-y-2">
            {locationScope === 'national' && (
                <div className="rounded-xl border border-border-primary bg-bg-secondary px-3 py-2 text-sm text-text-secondary">
                    Scope is fixed as <strong>India</strong>.
                </div>
            )}

            {locationScope === 'state' && (
                <select
                    className="input"
                    value={stateName}
                    onChange={(e) => onStateNameChange(e.target.value)}
                    required
                >
                    <option value="">Select state / UT</option>
                    {INDIA_STATES_AND_UTS.map((state) => (
                        <option key={state} value={state}>{state}</option>
                    ))}
                </select>
            )}

            {locationScope === 'district' && (
                <div className="space-y-2">
                    <select
                        className="input"
                        value={stateName}
                        onChange={(e) => onStateNameChange(e.target.value)}
                        disabled={isDistrictScopeInheritedFromParent}
                        required
                    >
                        <option value="">Select state / UT first</option>
                        {INDIA_STATES_AND_UTS.map((state) => (
                            <option key={state} value={state}>{state}</option>
                        ))}
                    </select>
                    <input
                        type="text"
                        className="input"
                        placeholder="Enter district or city name"
                        value={districtName}
                        onChange={(e) => onDistrictNameChange(e.target.value)}
                        disabled={!stateName || isDistrictScopeInheritedFromParent}
                        required
                    />
                    {isDistrictScopeInheritedFromParent && (
                        <p className="text-xs text-text-muted">Inherited from parent movement.</p>
                    )}
                </div>
            )}

            {locationScope === 'block' && (
                <div className="space-y-2">
                    <select
                        className="input"
                        value={stateName}
                        onChange={(e) => onStateNameChange(e.target.value)}
                        disabled={isBlockScopeInheritedFromDistrictParent}
                        required
                    >
                        <option value="">Select state / UT first</option>
                        {INDIA_STATES_AND_UTS.map((state) => (
                            <option key={state} value={state}>{state}</option>
                        ))}
                    </select>
                    <input
                        type="text"
                        className="input"
                        placeholder="Parent district / city"
                        value={districtName}
                        onChange={(e) => onDistrictNameChange(e.target.value)}
                        disabled={isBlockScopeInheritedFromDistrictParent}
                        required
                    />
                    <input
                        type="text"
                        className="input"
                        placeholder="Enter block or corporation name"
                        value={blockName}
                        onChange={(e) => onBlockNameChange(e.target.value)}
                        disabled={!stateName}
                        required
                    />
                    {isBlockScopeInheritedFromDistrictParent && (
                        <p className="text-xs text-text-muted">State and district inherited from parent. Enter block name only.</p>
                    )}
                </div>
            )}

            {locationScope === 'panchayat' && (
                <input
                    type="text"
                    className="input"
                    placeholder="Enter panchayat or ward name"
                    value={panchayatName}
                    onChange={(e) => onPanchayatNameChange(e.target.value)}
                    required
                />
            )}

            {locationScope === 'village' && (
                <input
                    type="text"
                    className="input"
                    placeholder="Enter village or locality name"
                    value={villageName}
                    onChange={(e) => onVillageNameChange(e.target.value)}
                    required
                />
            )}

            {computedLocationLabel && (
                <p className="text-xs text-text-muted">
                    Location label: <strong className="text-text-secondary">{computedLocationLabel}</strong>
                </p>
            )}
        </div>
    );
}

// ── Parent Section ────────────────────────────────────────────────────────────

export function ParentSection({
    parentPartyId,
    showParentSelector,
    parentParty,
    onShowParentSelector,
    forkSourceParty,
    parentsLoading,
    availableParents,
    onParentPartyIdChange,
    onHideParentSelector,
}: {
    parentPartyId: string;
    showParentSelector: boolean;
    parentParty: Party | null;
    onShowParentSelector: () => void;
    forkSourceParty: Party | null;
    parentsLoading: boolean;
    availableParents: PartyWithMemberCount[];
    onParentPartyIdChange: SetString;
    onHideParentSelector: () => void;
}) {
    if (parentPartyId && !showParentSelector) {
        return (
            <div className="space-y-1">
                <div className="rounded-xl border border-border-primary bg-bg-secondary px-3 py-2 flex items-center justify-between gap-3">
                    <p className="text-sm text-text-secondary truncate">
                        {parentParty ? parentParty.issue_text : 'Selected parent group'}
                    </p>
                    <button
                        type="button"
                        className="btn btn-secondary btn-sm flex-shrink-0"
                        onClick={onShowParentSelector}
                        disabled={!!forkSourceParty}
                    >
                        Change
                    </button>
                </div>
                <span className="form-hint">Local chapter under the selected parent group.</span>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <select
                className="input"
                value={parentPartyId}
                onChange={(e) => onParentPartyIdChange(e.target.value)}
                disabled={parentsLoading || !!forkSourceParty}
            >
                <option value="">Independent group (no parent group)</option>
                {availableParents.map((p) => (
                    <option key={p.id} value={p.id}>
                        {p.issue_text.slice(0, 60)}{p.issue_text.length > 60 ? '...' : ''} ({p.member_count} members)
                    </option>
                ))}
            </select>
            <span className="form-hint">
                {forkSourceParty
                    ? 'Alternative-group mode: the parent is fixed to match the selected group.'
                    : parentPartyId
                        ? 'This will create a local chapter under the selected parent group.'
                        : 'This will create an independent group.'}
            </span>
            {showParentSelector && (
                <button
                    type="button"
                    className="text-xs text-text-muted hover:text-text-primary underline"
                    onClick={onHideParentSelector}
                >
                    Keep selected and hide
                </button>
            )}
        </div>
    );
}

import type { Category, Party } from '@/types/database';
import { LOCATION_SCOPE_LEVELS } from '@/types/database';
import { INDIA_STATES_AND_UTS } from '@/lib/indiaLocations';
import Image from 'next/image';

type PartyWithMemberCount = Party & {
    member_count: number;
    level: number;
};

type SetString = (value: string) => void;

export function IssueSection({
    issueText,
    onIssueTextChange,
    titleImageUrl,
    onTitleImageUrlChange,
    titleImageUploading,
    onTitleImageFileChange,
}: {
    issueText: string;
    onIssueTextChange: SetString;
    titleImageUrl: string;
    onTitleImageUrlChange: SetString;
    titleImageUploading: boolean;
    onTitleImageFileChange: (file: File | null) => void;
}) {
    return (
        <div className="form-group">
            <label className="label flex items-center justify-between">
                Issue Statement
                <span className={`text-xs ${issueText.length > 280 ? 'text-danger' : 'text-text-muted'}`}>
                    {issueText.length}/280
                </span>
            </label>
            <textarea
                className="input textarea"
                placeholder="Describe your single political issue clearly. Be specific about what you want to achieve."
                value={issueText}
                onChange={(e) => onIssueTextChange(e.target.value)}
                maxLength={300}
                required
            />
            <span className="form-hint">
                Example: &quot;Demand clean drinking water supply for Jaipur 302001. Current water quality is unsafe for consumption.&quot;
            </span>
            {issueText.length > 280 && (
                <p className="text-xs text-danger mt-1">Issue statement must be 280 characters or less.</p>
            )}

            <div className="mt-4">
                <label className="label">Issue Group Title Image (optional)</label>
                <input
                    type="file"
                    accept="image/*"
                    className="input"
                    onChange={(e) => onTitleImageFileChange(e.target.files?.[0] || null)}
                />
                <span className="form-hint">
                    Upload an image file for the group title (JPG, PNG, WEBP).
                </span>
                {titleImageUploading && (
                    <p className="text-xs text-text-muted mt-1">Uploading image...</p>
                )}
                {titleImageUrl && (
                    <div className="mt-2 space-y-2">
                        <p className="text-xs text-success">Image uploaded successfully.</p>
                        <div className="rounded-lg border border-border-primary overflow-hidden max-w-sm">
                            <Image
                                src={titleImageUrl}
                                alt="Title preview"
                                className="w-full h-28 object-cover"
                                width={560}
                                height={224}
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
        </div>
    );
}

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
        <div className="form-group">
            <label className="label">Location (permission-first)</label>
            <p className="text-xs text-text-muted mb-2">Choose one method: use current location, or enter postal codes.</p>
            <div className="mb-2 flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={requestCurrentLocation}
                    disabled={locationPermissionState === 'requesting'}
                >
                    {locationPermissionState === 'requesting' ? 'Detecting location...' : 'Use current location'}
                </button>
                {locationPermissionState === 'granted' && coordinates && (
                    <span className="text-xs text-emerald-600">
                        Location added ({coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)})
                    </span>
                )}
                {(locationPermissionState === 'denied' || locationPermissionState === 'error') && (
                    <span className="text-xs text-warning">Location unavailable. Use postal code fallback below.</span>
                )}
            </div>
            <div className="text-[11px] uppercase tracking-wide text-text-muted mb-2">or</div>
            <input
                type="text"
                className="input"
                placeholder="302001, 302002, 302003"
                value={pincodes}
                onChange={(e) => onPincodesChange(e.target.value)}
            />
            <span className="form-hint">
                Enter 6-digit postal codes separated by commas if you skip location permission.
            </span>
            {pincodes.trim().length > 0 && !hasValidPincodes && !hasGeoLocation && (
                <p className="text-xs text-danger mt-1">Enter at least one valid 6-digit postal code.</p>
            )}
        </div>
    );
}

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
        <div className="form-group">
            <label className="label">Category (optional)</label>
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
            <span className="form-hint">
                Categories help cluster related issue groups.
            </span>
        </div>
    );
}

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
        <div className="form-group">
            <label className="label">Location Scope</label>
            <select
                className="input"
                value={locationScope}
                onChange={(e) => onLocationScopeChange(e.target.value)}
            >
                {LOCATION_SCOPE_LEVELS.map((scope) => (
                    <option key={scope.value} value={scope.value}>
                        {scope.icon} {scope.label}
                    </option>
                ))}
            </select>
            <span className="form-hint">
                What level does this group operate at? Multiple groups can coexist at the same level.
            </span>
            {forkSourceParty && !forkScopeValid && (
                <p className="text-xs text-danger mt-2">
                    Forked group scope must match the selected group scope ({forkSourceParty.location_scope || 'district'}).
                </p>
            )}
            {parentParty && !childScopeValid && (
                <p className="text-xs text-danger mt-2">
                    Child group scope must be exactly one level below.
                </p>
            )}
        </div>
    );
}

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
        <div className="form-group">
            <label className="label">Scope Details</label>

            {locationScope === 'national' && (
                <div className="rounded-xl border border-border-primary bg-bg-secondary px-3 py-2 text-sm text-text-secondary">
                    Country scope location is fixed as <strong>India</strong>.
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
                        <p className="text-xs text-text-muted">
                            District/City scope details are inherited from the selected parent group.
                        </p>
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
                        placeholder="Parent district/city"
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
                        <p className="text-xs text-text-muted">
                            State and district/city are inherited from the selected parent group. Enter only block/corporation name.
                        </p>
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

            <span className="form-hint">
                Scope label: {computedLocationLabel || '—'}
            </span>
        </div>
    );
}

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
            <div className="form-group">
                <label className="label">Parent Group</label>
                <div className="rounded-xl border border-border-primary bg-bg-secondary px-3 py-2 flex items-center justify-between gap-3">
                    <p className="text-sm text-text-secondary truncate">
                        {parentParty ? parentParty.issue_text : 'Selected parent group'}
                    </p>
                    <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={onShowParentSelector}
                        disabled={!!forkSourceParty}
                    >
                        Change
                    </button>
                </div>
                <span className="form-hint">Keep this parent for a faster child-group flow.</span>
            </div>
        );
    }

    return (
        <div className="form-group">
            <label className="label">Parent Community (optional)</label>
            <select
                className="input"
                value={parentPartyId}
                onChange={(e) => onParentPartyIdChange(e.target.value)}
                disabled={parentsLoading || !!forkSourceParty}
            >
                <option value="">🌐 Top-level community (no parent)</option>
                {availableParents.map((p) => (
                    <option key={p.id} value={p.id}>
                        {(p as PartyWithMemberCount & { node_type?: string }).node_type === 'sub_community' ? '📁' : '🌐'} {p.issue_text.slice(0, 60)}{p.issue_text.length > 60 ? '...' : ''} ({p.member_count} members)
                    </option>
                ))}
            </select>
            <span className="form-hint">
                {forkSourceParty
                    ? '🍴 Fork mode: parent is fixed to match the selected group.'
                    : parentPartyId
                        ? '👥 Will create as: Group (under the selected parent)'
                        : '🌐 Will create as: Community (top-level)'}
            </span>
            {showParentSelector && (
                <div className="mt-2">
                    <button
                        type="button"
                        className="text-xs text-text-muted hover:text-text-primary underline"
                        onClick={onHideParentSelector}
                    >
                        Keep selected parent and hide this selector
                    </button>
                </div>
            )}
        </div>
    );
}
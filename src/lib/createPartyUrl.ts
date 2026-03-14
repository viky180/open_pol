export type CreatePartyUrlParams = {
    issue?: string | null;
    title_image_url?: string | null;
    category?: string | null;
    parent?: string | null;
    fork_of?: string | null;
    location_scope?: string | null;
    location_label?: string | null;
    state_name?: string | null;
    district_name?: string | null;
    block_name?: string | null;
    panchayat_name?: string | null;
    village_name?: string | null;
};

/**
 * Builds a /group/create URL with optional prefilled query params.
 *
 * Supported query params:
 * - issue: prefill Issue Statement
 * - category: preselect category (category_id)
 * - parent: create as child group under this party id
 * - fork_of: fork (compete with) this party at the same level under the same parent
 * - location_scope/location_label/state_name/...: prefill location-first fields
 */
export function createPartyUrl({
    issue,
    title_image_url,
    category,
    parent,
    fork_of,
    location_scope,
    location_label,
    state_name,
    district_name,
    block_name,
    panchayat_name,
    village_name,
}: CreatePartyUrlParams): string {
    const sp = new URLSearchParams();

    if (issue) sp.set('issue', issue);
    if (title_image_url) sp.set('title_image_url', title_image_url);

    if (category) sp.set('category', category);
    if (parent) sp.set('parent', parent);
    if (fork_of) sp.set('fork_of', fork_of);

    if (location_scope) sp.set('location_scope', location_scope);
    if (location_label) sp.set('location_label', location_label);
    if (state_name) sp.set('state_name', state_name);
    if (district_name) sp.set('district_name', district_name);
    if (block_name) sp.set('block_name', block_name);
    if (panchayat_name) sp.set('panchayat_name', panchayat_name);
    if (village_name) sp.set('village_name', village_name);

    const qs = sp.toString();
    return qs ? `/group/create?${qs}` : '/group/create';
}



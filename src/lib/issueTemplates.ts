export type IssueTemplate = {
    id: string;
    title: string;
    issueText: string;
    /** Optional hint for matching category; callers can map this to category_id if desired */
    categorySlug?: string;
};

/**
 * Lightweight templates to reduce “blank page” friction.
 * Keep these generic and local-problem oriented.
 */
export const ISSUE_TEMPLATES: IssueTemplate[] = [
    {
        id: 'water-quality',
        title: 'Clean drinking water',
        issueText:
            'Demand clean, safe drinking water supply in my area. Publish water quality test reports weekly and fix contamination sources.',
        categorySlug: 'water',
    },
    {
        id: 'garbage',
        title: 'Garbage collection',
        issueText:
            'Fix irregular garbage collection in my area. Ensure daily pickup, covered vehicles, and strict penalties for dumping.',
        categorySlug: 'sanitation',
    },
    {
        id: 'roads',
        title: 'Potholes & road safety',
        issueText:
            'Repair dangerous potholes and broken roads in my area within 30 days. Publish repair schedule and contractor accountability.',
        categorySlug: 'roads',
    },
    {
        id: 'streetlights',
        title: 'Street lights',
        issueText:
            'Restore non-functioning street lights in my area. Create a public list of outages and fix within 72 hours.',
        categorySlug: 'safety',
    },
    {
        id: 'drainage',
        title: 'Drainage / flooding',
        issueText:
            'Prevent monsoon flooding in my area. Clean drains, fix choke points, and publish weekly progress updates before monsoon.',
        categorySlug: 'infrastructure',
    },
    {
        id: 'air-noise',
        title: 'Air / noise pollution',
        issueText:
            'Reduce air and noise pollution in my area. Enforce vehicle checks, regulate construction timings, and publish monthly readings.',
        categorySlug: 'environment',
    },
];

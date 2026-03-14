'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Globe, Folder, Users } from 'lucide-react';

type AncestorNode = {
    party_id: string;
    issue_text: string;
    node_type: 'community' | 'sub_community' | 'group';
};

type BreadcrumbsProps = {
    partyId: string;
    categoryName?: string | null;
};

const NODE_TYPE_ICONS = {
    community: Globe,
    sub_community: Folder,
    group: Users,
} as const;

const NODE_TYPE_LABELS = {
    community: 'Community',
    sub_community: 'Sub-community',
    group: 'Group',
} as const;

export function Breadcrumbs({ partyId, categoryName }: BreadcrumbsProps) {
    const [ancestors, setAncestors] = useState<AncestorNode[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const loadAncestors = async () => {
            try {
                const res = await fetch(`/api/parties/${partyId}/hierarchy`);
                if (!isMounted) return;
                if (res.ok) {
                    const data = await res.json();
                    setAncestors(data.ancestors || []);
                }
            } catch {
                // Ignore errors
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        void loadAncestors();
        return () => {
            isMounted = false;
        };
    }, [partyId]);

    // Don't show breadcrumbs if only current party (no hierarchy)
    if (isLoading) {
        return (
            <div className="h-6 w-48 bg-bg-tertiary rounded animate-pulse mb-4" />
        );
    }

    if (ancestors.length <= 1) {
        // No parent hierarchy, just show category if available
        if (categoryName) {
            return (
                <nav className="flex items-center gap-2 text-sm text-text-muted mb-4 flex-wrap">
                    <Link href="/discover" className="hover:text-primary transition-colors">
                        Discover
                    </Link>
                    <span className="text-text-muted/50">›</span>
                    <span className="text-text-secondary">{categoryName}</span>
                </nav>
            );
        }
        return null;
    }

    return (
        <nav className="flex items-center gap-2 text-sm text-text-muted mb-4 flex-wrap">
            <Link href="/discover" className="hover:text-primary transition-colors">
                Discover
            </Link>

            {categoryName && (
                <>
                    <span className="text-text-muted/50">›</span>
                    <span className="text-text-secondary">{categoryName}</span>
                </>
            )}

            {ancestors.map((ancestor, index) => {
                const isLast = index === ancestors.length - 1;
                const nodeType = ancestor.node_type in NODE_TYPE_ICONS ? ancestor.node_type : 'group';
                const IconComponent = NODE_TYPE_ICONS[nodeType];
                const label = NODE_TYPE_LABELS[nodeType];
                const truncatedText = ancestor.issue_text.length > 30
                    ? ancestor.issue_text.slice(0, 30) + '...'
                    : ancestor.issue_text;

                return (
                    <span key={ancestor.party_id} className="flex items-center gap-2">
                        <span className="text-text-muted/50">›</span>
                        {isLast ? (
                            <span className="flex items-center gap-1 text-text-primary font-medium">
                                <IconComponent className="w-3.5 h-3.5" />
                                <span>{truncatedText}</span>
                            </span>
                        ) : (
                            <Link
                                href={`/group/${ancestor.party_id}`}
                                className="flex items-center gap-1 hover:text-primary transition-colors"
                            >
                                <IconComponent className="w-3.5 h-3.5" />
                                <span>{truncatedText}</span>
                            </Link>
                        )}
                    </span>
                );
            })}
        </nav>
    );
}

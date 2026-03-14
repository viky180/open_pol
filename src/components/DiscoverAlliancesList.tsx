import Link from 'next/link';
import { Handshake } from 'lucide-react';
import { getLocationScopeConfig } from '@/types/database';
import { LocationScopeIcon } from '@/lib/locationIcons';
import type { DiscoverAllianceItem } from '@/types/discover';

interface DiscoverAlliancesListProps {
    alliances: DiscoverAllianceItem[];
}

export function DiscoverAlliancesList({ alliances }: DiscoverAlliancesListProps) {
    if (alliances.length === 0) {
        return (
            <div className="empty-state py-16">
                <div className="mb-2 opacity-60 flex justify-center"><Handshake className="w-10 h-10" /></div>
                <p className="text-text-primary font-medium">No alliances yet</p>
                <p className="text-text-muted text-sm mt-1">
                    Be the first to create an alliance and unite groups for greater impact.
                </p>
                <Link href="/alliance/create" className="btn btn-primary btn-sm mt-4">
                    Create Alliance
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {alliances.map((item) => {
                const scopeEntries = item.scopes.map((scope) => {
                    const scopeConfig = getLocationScopeConfig(scope);
                    return { scope, icon: scopeConfig.icon, label: scopeConfig.label };
                });

                return (
                    <Link
                        key={item.alliance.id}
                        href={`/alliance/${item.alliance.id}`}
                        className="block card hover:border-primary/40 transition-all"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                <h2 className="text-base font-semibold text-text-primary flex items-center gap-1"><Handshake className="w-4 h-4" /> {item.alliance.name}</h2>
                                {item.alliance.description && (
                                    <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                                        {item.alliance.description}
                                    </p>
                                )}
                                <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-text-muted">
                                    <span>
                                        {item.groupCount} group{item.groupCount !== 1 ? 's' : ''}
                                    </span>
                                    {scopeEntries.map(({ scope, icon, label }) => (
                                        <span key={scope} className="flex items-center gap-0.5"><LocationScopeIcon iconName={icon} className="w-3 h-3" /> {label}</span>
                                    ))}
                                </div>
                                {item.members.length > 0 && (
                                    <p className="text-xs text-text-muted mt-2 line-clamp-1">
                                        Includes: {item.members.slice(0, 3).map((m) => m.issueText).join(', ')}
                                        {item.members.length > 3 ? ` +${item.members.length - 3} more` : ''}
                                    </p>
                                )}
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-lg font-bold text-primary">{item.combinedMemberCount}</p>
                                <p className="text-[10px] text-text-muted uppercase tracking-wide">combined</p>
                            </div>
                        </div>
                    </Link>
                );
            })}
        </div>
    );
}

"use client";

import { useState } from 'react';
import { loadProgressiveDisclosureState } from '@/lib/progressiveDisclosure';

interface CollapsiblePincodeFilterProps {
    pincode: string;
    setPincode: (pincode: string) => void;
    nearbyCount: number | null;
    error: string | null;
}

function sanitizePincode(input: string): string {
    return input.replace(/\D/g, '').slice(0, 6);
}

/**
 * Collapsible location filter (postal code fallback) - collapsed by default for first-time users,
 * expanded if user has already set a postal code.
 */
export function CollapsiblePincodeFilter({
    pincode,
    setPincode,
    nearbyCount,
    error
}: CollapsiblePincodeFilterProps) {
    // Lazy init: avoid setState-in-effect (repo lint rule).
    const [isExpanded, setIsExpanded] = useState(() => {
        if (pincode.length > 0) return true;
        const state = loadProgressiveDisclosureState();
        return state.stage !== 'first_time';
    });

    const effectiveExpanded = isExpanded || pincode.length > 0;

    // If collapsed, show simple trigger button
    if (!effectiveExpanded && pincode.length === 0) {
        return (
            <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className="w-full card-glass flex items-center justify-between hover:bg-bg-secondary transition-colors cursor-pointer"
            >
                <div className="flex items-center gap-3">
                    <span className="text-xl">📍</span>
                    <span className="text-sm text-text-secondary">Filter by your location</span>
                </div>
                <span className="text-text-muted">▼</span>
            </button>
        );
    }

    // Expanded view with full filter
    return (
        <div className="card-glass">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
                        📍 Filter by Location
                        <button
                            type="button"
                            onClick={() => {
                                if (pincode.length === 0) setIsExpanded(false);
                            }}
                            className="text-xs text-text-muted hover:text-text-secondary"
                        >
                            {pincode.length === 0 && '(hide)'}
                        </button>
                    </h3>
                    <p className="text-sm text-text-secondary">
                        Enter your 6-digit postal code to see parties in your area.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <input
                        className="input sm:w-[180px]"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="e.g. 302001"
                        value={pincode}
                        onChange={(e) => setPincode(sanitizePincode(e.target.value))}
                        aria-label="Postal code"
                    />
                    {pincode && (
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setPincode('')}
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {pincode.length > 0 && pincode.length !== 6 && (
                <p className="text-xs text-warning mt-2">
                    Postal code must be 6 digits.
                </p>
            )}

            {pincode.length === 6 && nearbyCount !== null && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="badge bg-primary/10 text-primary border-primary/20">
                        📍 {pincode}
                    </span>
                    <span className="text-sm text-text-muted">
                        {nearbyCount === 0
                            ? 'No parties in this area yet — be the first!'
                            : `${nearbyCount} part${nearbyCount === 1 ? 'y' : 'ies'} near you`}
                    </span>
                </div>
            )}

            {error && (
                <div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-danger text-sm mt-3">
                    {error}
                </div>
            )}
        </div>
    );
}

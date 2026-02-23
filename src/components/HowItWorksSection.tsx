"use client";

import { useState } from 'react';
import { loadProgressiveDisclosureState, type ProgressiveStage } from '@/lib/progressiveDisclosure';

/**
 * Simplified "How It Works" section with progressive disclosure.
 * First-time users see 3 simple steps, collapsible.
 * Returning users see full 4 steps.
 */
export function HowItWorksSection() {
    const [stage] = useState<ProgressiveStage>(() => loadProgressiveDisclosureState().stage);
    const [isExpanded, setIsExpanded] = useState(false);

    const isFirstTime = stage === 'first_time';

    // Simplified steps for first-time users
    const simpleSteps = [
        {
            title: "1. Find Your Issue",
            description: "Browse parties for local issues you care about, or create your own."
        },
        {
            title: "2. Join & Vote",
            description: "Join a party and vote for a member you trust to lead."
        },
        {
            title: "3. Take Action",
            description: "Work together with others who share your concerns."
        }
    ];

    // Full steps for returning users
    const fullSteps = [
        {
            title: "1. Create Issue-Party",
            description: "One issue only. Tied to a real location. No ideology, no manifesto. Focus on what matters locally."
        },
        {
            title: "2. Join & Vote",
            description: "Members vote for their leader. Most voted member leads. Votes expire in 90 days ensuring active consent."
        },
        {
            title: "3. Ask Questions",
            description: "Public Q&A board. Questions can never be deleted. Accountability matters more than promises."
        },
        {
            title: "4. Support & Escalate",
            description: "Larger parties support smaller ones. Issues propagate up. Pressure builds from the bottom up."
        }
    ];

    const steps = isFirstTime ? simpleSteps : fullSteps;

    return (
        <div id="how-it-works" className="mt-12 sm:mt-16 px-6 py-8 sm:p-10 bg-bg-secondary rounded-2xl border border-border-primary">
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between text-left"
            >
                <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                    <span>🏛️</span> How it works (3 steps)
                </h3>
                <span className="text-text-muted text-sm">
                    {isExpanded ? '▲ Hide' : '▼ Show'}
                </span>
            </button>

            {isExpanded && (
                <div className={`mt-6 grid grid-cols-1 md:grid-cols-${isFirstTime ? '3' : '2'} lg:grid-cols-${isFirstTime ? '3' : '4'} gap-4 sm:gap-6 text-sm text-text-secondary animate-fade-in`}>
                    {steps.map((step, index) => (
                        <div key={index} className="p-4 bg-bg-card rounded-xl border border-border-primary hover:shadow-md transition-shadow">
                            <strong className="block text-primary-light mb-2 text-base">{step.title}</strong>
                            <p>{step.description}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

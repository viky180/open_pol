'use client';

import { useState } from 'react';
import type { Party } from '@/types/database';
import { isScopeLocationValid } from '@/lib/partyCreation';

export type StepId =
    | 'issue'
    | 'issue_selector'
    | 'scope'
    | 'scope_details'
    | 'category'
    | 'review';

export interface StepContext {
    // Fork / child pre-fill
    forkOfPartyId: string;
    parentPartyId: string;
    forkSourceParty: Party | null;
    parentParty: Party | null;

    // Form values
    issueText: string;
    locationScope: string;
    stateName: string;
    districtName: string;
    blockName: string;
    panchayatName: string;
    villageName: string;
    categoryId: string;
    scopeLocationValid: boolean;

    // Issue entity (for national groups)
    issueId: string;
    newIssueName: string;
}

export interface StepDefinition {
    id: StepId;
    question: string;
    emoji: string;
    /** Returns false when this step should be hidden (e.g. scope step with a fixed parent) */
    isApplicable: (ctx: StepContext) => boolean;
    /** Returns true when the user's input for this step is complete enough to continue */
    isComplete: (ctx: StepContext) => boolean;
}

export const STEP_DEFINITIONS: StepDefinition[] = [
    {
        id: 'scope',
        question: 'How big is the impact area?',
        emoji: 'MapPin',
        isApplicable: (ctx) => !ctx.parentPartyId && !ctx.forkOfPartyId,
        isComplete: (ctx) => !!ctx.locationScope,
    },
    {
        id: 'issue_selector',
        question: 'Which issue does this national group belong to?',
        emoji: 'Tag',
        isApplicable: (ctx) => ctx.locationScope === 'national' && !ctx.parentPartyId && !ctx.forkOfPartyId,
        isComplete: (ctx) => !!(ctx.issueId || ctx.newIssueName.trim()),
    },
    {
        id: 'issue',
        question: "What's your group's specific stance on this issue?",
        emoji: 'MessageCircle',
        isApplicable: () => true,
        isComplete: (ctx) => ctx.issueText.trim().length > 0 && ctx.issueText.length <= 280,
    },
    {
        id: 'scope_details',
        question: 'Which specific location?',
        emoji: 'Pin',
        isApplicable: (ctx) => ctx.locationScope !== 'national',
        isComplete: (ctx) =>
            isScopeLocationValid({
                locationScope: ctx.locationScope,
                stateName: ctx.stateName,
                districtName: ctx.districtName,
                blockName: ctx.blockName,
                panchayatName: ctx.panchayatName,
                villageName: ctx.villageName,
            }),
    },
    {
        id: 'category',
        question: 'Pick a category for this group.',
        emoji: 'Tag',
        isApplicable: () => true,
        isComplete: () => true,
    },
    {
        id: 'review',
        question: "Here's your group summary.",
        emoji: 'CheckCircle',
        isApplicable: () => true,
        isComplete: () => true,
    },
];

export interface ConversationalStepsState {
    currentStep: StepId;
    completedSteps: Set<StepId>;
    editingStep: StepId | null;
    visibleSteps: StepDefinition[];
    isStepVisible: (id: StepId) => boolean;
    isStepEditing: (id: StepId) => boolean;
    isStepCompleted: (id: StepId) => boolean;
    canAdvance: (id: StepId) => boolean;
    advanceFrom: (id: StepId) => void;
    startEditing: (id: StepId) => void;
    stopEditing: () => void;
    resetTo: (id: StepId) => void;
}

export function useConversationalSteps(
    ctx: StepContext,
    options?: { startAtReview?: boolean }
): ConversationalStepsState {
    const visibleSteps = STEP_DEFINITIONS.filter((s) => s.isApplicable(ctx));
    const startAtReview = options?.startAtReview === true;

    // Derive first step id
    const firstStepId = visibleSteps[0]?.id ?? 'issue';
    const hasReviewStep = visibleSteps.some((s) => s.id === 'review');
    const initialStep: StepId = startAtReview && hasReviewStep ? 'review' : firstStepId;

    const [currentStep, setCurrentStep] = useState<StepId>(initialStep);
    const [completedSteps, setCompletedSteps] = useState<Set<StepId>>(() => {
        if (!startAtReview) return new Set<StepId>();
        return new Set(
            visibleSteps
                .filter((step) => step.id !== 'review')
                .map((step) => step.id)
        );
    });
    const [editingStep, setEditingStep] = useState<StepId | null>(null);

    const visibleIds = new Set(visibleSteps.map((s) => s.id));
    const normalizedCurrentStep: StepId = visibleIds.has(currentStep) ? currentStep : firstStepId;
    const normalizedEditingStep: StepId | null = editingStep && visibleIds.has(editingStep) ? editingStep : null;

    const isStepVisible = (id: StepId): boolean => {
        const idx = visibleSteps.findIndex((s) => s.id === id);
        if (idx === -1) return false;
        const currentIdx = visibleSteps.findIndex((s) => s.id === normalizedCurrentStep);
        return idx <= currentIdx;
    };

    const isStepEditing = (id: StepId): boolean => normalizedEditingStep === id;

    const isStepCompleted = (id: StepId): boolean => completedSteps.has(id);

    const canAdvance = (id: StepId): boolean => {
        const def = STEP_DEFINITIONS.find((s) => s.id === id);
        return def?.isComplete(ctx) ?? false;
    };

    const advanceFrom = (id: StepId) => {
        const def = STEP_DEFINITIONS.find((s) => s.id === id);
        if (!def?.isComplete(ctx)) return;

        setCompletedSteps((prev) => new Set([...prev, id]));

        const idx = visibleSteps.findIndex((s) => s.id === id);
        if (idx === -1) {
            setCurrentStep(firstStepId);
            return;
        }
        const next = visibleSteps[idx + 1];
        if (next) {
            setCurrentStep(next.id);
        }
    };

    const startEditing = (id: StepId) => {
        setEditingStep(id);
    };

    const stopEditing = () => {
        setEditingStep(null);
    };

    const resetTo = (id: StepId) => {
        if (!visibleIds.has(id)) {
            setCurrentStep(firstStepId);
            setEditingStep(null);
            setCompletedSteps(new Set<StepId>());
            return;
        }

        setCurrentStep(id);
        setEditingStep(null);
        // Remove all steps from id onwards from completed
        const startIdx = visibleSteps.findIndex((s) => s.id === id);
        setCompletedSteps((prev) => {
            const next = new Set(prev);
            visibleSteps.slice(startIdx).forEach((s) => next.delete(s.id));
            return next;
        });
    };

    return {
        currentStep: normalizedCurrentStep,
        completedSteps,
        editingStep: normalizedEditingStep,
        visibleSteps,
        isStepVisible,
        isStepEditing,
        isStepCompleted,
        canAdvance,
        advanceFrom,
        startEditing,
        stopEditing,
        resetTo,
    };
}


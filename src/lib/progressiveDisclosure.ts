/*
Progressive disclosure for first-time / early-stage users.

Goal:
- Hide jargon-y or advanced concepts until the user has done the basics.
- Persist state client-side (localStorage) without requiring a schema migration.

Design:
- We track a simple “stage” and a few one-time events.
- Components can read stage once (lazy init) and update it on user actions.
*/

export type ProgressiveStage = 'first_time' | 'basics_done' | 'advanced';

export type ProgressiveDisclosureState = {
    stage: ProgressiveStage;
    events: {
        joinedAnyParty: boolean;
        votedTrust: boolean;
        askedOrAnswered: boolean;
    };
    dismissedHints: boolean;
};

const KEY = 'openpolitics:progressive_disclosure:v1';

export function defaultProgressiveDisclosureState(): ProgressiveDisclosureState {
    return {
        stage: 'first_time',
        events: {
            joinedAnyParty: false,
            votedTrust: false,
            askedOrAnswered: false,
        },
        dismissedHints: false,
    };
}

function safeParse(json: string | null): unknown {
    if (!json) return null;
    try {
        return JSON.parse(json);
    } catch {
        return null;
    }
}

function coerce(input: unknown): ProgressiveDisclosureState {
    const base = defaultProgressiveDisclosureState();
    const obj = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
    const events = obj.events && typeof obj.events === 'object' ? (obj.events as Record<string, unknown>) : {};

    const stage = obj.stage;
    const stageValue: ProgressiveStage =
        stage === 'first_time' || stage === 'basics_done' || stage === 'advanced'
            ? stage
            : base.stage;

    return {
        stage: stageValue,
        events: {
            joinedAnyParty: typeof events.joinedAnyParty === 'boolean' ? events.joinedAnyParty : base.events.joinedAnyParty,
            votedTrust: typeof events.votedTrust === 'boolean' ? events.votedTrust : base.events.votedTrust,
            askedOrAnswered:
                typeof events.askedOrAnswered === 'boolean' ? events.askedOrAnswered : base.events.askedOrAnswered,
        },
        dismissedHints: typeof obj.dismissedHints === 'boolean' ? obj.dismissedHints : base.dismissedHints,
    };
}

export function loadProgressiveDisclosureState(): ProgressiveDisclosureState {
    if (typeof window === 'undefined') return defaultProgressiveDisclosureState();
    const parsed = safeParse(window.localStorage.getItem(KEY));
    return coerce(parsed);
}

export function saveProgressiveDisclosureState(next: ProgressiveDisclosureState) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(KEY, JSON.stringify(next));
}

export function computeStageFromEvents(events: ProgressiveDisclosureState['events']): ProgressiveStage {
    // “Basics” = joined + did one participation action.
    const basicsDone = events.joinedAnyParty && (events.votedTrust || events.askedOrAnswered);
    if (!basicsDone) return 'first_time';

    // “Advanced” = joined + did both participation actions.
    const advanced = events.joinedAnyParty && events.votedTrust && events.askedOrAnswered;
    return advanced ? 'advanced' : 'basics_done';
}

export function updateDisclosureEvent(
    state: ProgressiveDisclosureState,
    event: keyof ProgressiveDisclosureState['events']
): ProgressiveDisclosureState {
    const next = {
        ...state,
        events: { ...state.events, [event]: true },
    };
    return { ...next, stage: computeStageFromEvents(next.events) };
}

export function dismissHints(state: ProgressiveDisclosureState): ProgressiveDisclosureState {
    return { ...state, dismissedHints: true };
}

export function enableAdvanced(state: ProgressiveDisclosureState): ProgressiveDisclosureState {
    return { ...state, stage: 'advanced' };
}

export function resetProgressiveDisclosure() {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(KEY);
}

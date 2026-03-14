'use client';

import Link from 'next/link';
import type { OnboardingStatus } from '@/lib/onboarding';
import { CREATION_LOCATION_SCOPE_LEVELS } from '@/types/database';
import { LocationScopeIcon } from '@/lib/locationIcons';

type GroupItem = {
  id: string;
  name: string;
  memberCount: number;
  category: string;
  joinedAt: string;
  lastActivityPreview: string;
  locationScope: string | null;
};

type Representation = {
  partyId: string;
  partyName: string;
  leaderName: string | null;
  trustExpiresInDays: number | null;
} | null;

type OnboardingStep = {
  id: 'profile' | 'group';
  label: string;
  description: string;
  done: boolean;
  href: string;
};

function getRelativeTimeLabel(input: string) {
  const target = new Date(input);
  if (Number.isNaN(target.getTime())) return 'recently';

  const diffMs = Date.now() - target.getTime();
  const hours = Math.round(diffMs / (1000 * 60 * 60));
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (hours < 24) return `${Math.max(1, hours)}h ago`;
  return `${Math.max(1, days)}d ago`;
}

function ResumeOnboardingCard({ onboardingStatus }: { onboardingStatus: OnboardingStatus | null }) {
  const totalCount = onboardingStatus?.totalSteps ?? 2;
  const doneCount = onboardingStatus?.progressCount ?? 0;
  const progressPct = Math.round((doneCount / totalCount) * 100);
  const steps: OnboardingStep[] = [
    {
      id: 'profile',
      label: 'Complete your profile',
      description: onboardingStatus?.hasDisplayName
        ? onboardingStatus?.hasPincode
          ? 'Your basic profile is ready. You can still update your details any time.'
          : 'Your name is saved. Add a pincode during onboarding for better nearby group suggestions.'
        : 'Add your name so people can recognize you when you join local issue groups.',
      done: onboardingStatus?.hasDisplayName ?? false,
      href: '/welcome?next=/',
    },
    {
      id: 'group',
      label: 'Choose a cause and join a group',
      description: 'Choose a cause, compare active groups, or create the first group if none fit yet.',
      done: onboardingStatus?.hasActiveMembership ?? false,
      href: '/welcome?next=/',
    },
  ];

  return (
    <section className="card-glass p-5 sm:p-6">
      <div className="editorial-section-head">
        <span className="editorial-section-head__label">Your civic home</span>
        <span className="editorial-section-head__rule" />
      </div>

      <div className="card p-5 sm:p-6">
        {/* ── Header ── */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge border-accent/20 bg-accent/10 text-accent">
            Continue onboarding
          </span>
          <span
            className="text-[11px] uppercase tracking-[0.18em] text-text-muted"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {doneCount} of {totalCount} activation steps done
          </span>
        </div>

        <h3
          className="mt-4 text-2xl text-text-primary"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Finish setup in one place
        </h3>
        <p className="mt-2 max-w-xl text-sm text-text-secondary">
          New-user setup now lives in the welcome flow. Finish your basics there, then come back here once your first group is active.
        </p>

        {/* ── Progress bar ── */}
        <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-border-primary">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* ── Steps ── */}
        <ol className="mt-5 space-y-3">
          {steps.map((step, idx) => {
            const isDone = step.done;
            const prevDone = idx === 0 || steps[idx - 1].done;
            const isActive = !isDone && prevDone;
            const isClickable = !isDone;

            return (
              <li
                key={step.id}
                className={`rounded-2xl border transition-colors duration-200 ${isDone
                  ? 'border-success/20 bg-success/5'
                  : isActive
                    ? 'border-accent/25 bg-accent/[0.06]'
                    : 'border-border-primary bg-bg-secondary/50'
                  }`}
              >
                {isClickable ? (
                  <Link
                    href={step.href}
                    className="group flex cursor-pointer items-start gap-4 p-4"
                    aria-label={`${step.label} — continue onboarding`}
                  >
                    <div
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${isDone
                        ? 'border-success/40 bg-success/15 text-success'
                        : isActive
                          ? 'border-accent/40 bg-accent/15 text-accent'
                          : 'border-border-primary bg-bg-secondary text-text-muted'
                        }`}
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {isDone ? '✓' : idx + 1}
                    </div>

                    {/* Step content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-base font-semibold leading-snug ${isDone
                            ? 'text-success line-through decoration-success/40'
                            : isActive
                              ? 'text-text-primary'
                              : 'text-text-muted'
                            } group-hover:text-accent group-hover:underline group-focus-visible:text-accent`}
                        >
                          {step.label}
                        </span>
                        {isDone && (
                          <span className="badge border-success/20 bg-success/10 text-[10px] text-success">
                            Done
                          </span>
                        )}
                        {isActive && !isDone && (
                          <span className="badge border-accent/20 bg-accent/10 text-[10px] text-accent">
                            Up next
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-sm text-text-secondary">{step.description}</p>
                    </div>
                  </Link>
                ) : (
                  <div className="flex items-start gap-4 p-4">
                    <div
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${isDone
                        ? 'border-success/40 bg-success/15 text-success'
                        : isActive
                          ? 'border-accent/40 bg-accent/15 text-accent'
                          : 'border-border-primary bg-bg-secondary text-text-muted'
                        }`}
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {isDone ? '✓' : idx + 1}
                    </div>

                    {/* Step content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-base font-semibold leading-snug ${isDone
                            ? 'text-success line-through decoration-success/40'
                            : isActive
                              ? 'text-text-primary'
                              : 'text-text-muted'
                            }`}
                        >
                          {step.label}
                        </span>
                        {isDone && (
                          <span className="badge border-success/20 bg-success/10 text-[10px] text-success">
                            Done
                          </span>
                        )}
                        {isActive && !isDone && (
                          <span className="badge border-accent/20 bg-accent/10 text-[10px] text-accent">
                            Up next
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-sm text-text-secondary">{step.description}</p>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ol>

        {onboardingStatus?.hasDisplayName && !onboardingStatus.hasPincode && (
          <div className="mt-5 rounded-2xl border border-border-primary bg-bg-secondary/70 p-4 text-sm text-text-secondary">
            Optional but helpful: add your pincode in onboarding so OpenPolitics can suggest more relevant nearby groups.
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link href="/welcome?next=/" className="btn btn-primary flex-1">
            {onboardingStatus?.nextStep === 'group' ? 'Choose your first group' : 'Continue onboarding'}
          </Link>
          <Link href="/discover" className="btn btn-secondary flex-1">
            Browse groups
          </Link>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
export function MyGroupsCard({
  groups,
  representation,
  actionCount,
  onboardingStatus,
}: {
  groups: GroupItem[];
  representation: Representation;
  actionCount: number;
  onboardingStatus: OnboardingStatus | null;
}) {
  const primaryGroup = representation?.partyId
    ? groups.find((group) => group.id === representation.partyId) || groups[0]
    : groups[0];

  if (!groups.length) {
    return <ResumeOnboardingCard onboardingStatus={onboardingStatus} />;
  }

  if (!primaryGroup) return null;

  const joinedLabel = getRelativeTimeLabel(primaryGroup.joinedAt);

  return (
    <section className="card-glass p-5 sm:p-6">
      <div className="editorial-section-head">
        <span className="editorial-section-head__label">Your civic home</span>
        <span className="editorial-section-head__count">{groups.length}</span>
        <span className="editorial-section-head__rule" />
      </div>

      <div className="card p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge border-primary/15 bg-primary/5 text-primary">Primary group</span>
              {actionCount > 0 ? (
                <span className="badge border-danger/20 bg-danger/10 text-danger">
                  {actionCount} action{actionCount === 1 ? '' : 's'} pending
                </span>
              ) : (
                <span className="badge border-success/20 bg-success/10 text-success">All clear</span>
              )}
            </div>
            <div className="mt-4 flex min-w-0 items-start gap-3">
              <div
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-accent/30 bg-accent/10 text-sm font-semibold text-accent"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {(primaryGroup.name[0] || 'G').toUpperCase()}
              </div>
              <div className="min-w-0">
                <p
                  className="line-clamp-2 text-2xl text-text-primary"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {primaryGroup.name}
                </p>
                {actionCount > 0 && (
                  <p className="mt-2 text-sm text-text-secondary">
                    {actionCount} action{actionCount === 1 ? '' : 's'} need your attention across your civic home. Start with this group.
                  </p>
                )}
                <p
                  className="mt-2 text-xs uppercase tracking-[0.18em] text-text-muted"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  Joined {joinedLabel}
                </p>
              </div>
            </div>
          </div>

        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="editorial-subcard">
            <div className="text-lg text-primary" style={{ fontFamily: 'var(--font-display)' }}>
              {primaryGroup.memberCount.toLocaleString('en-IN')}
            </div>
            <div
              className="mt-1 text-[11px] uppercase tracking-[0.16em] text-text-muted"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Members
            </div>
          </div>
          <div className="editorial-subcard">
            <div className="text-lg text-primary" style={{ fontFamily: 'var(--font-display)' }}>
              {representation?.leaderName || 'Open'}
            </div>
            <div
              className="mt-1 text-[11px] uppercase tracking-[0.16em] text-text-muted"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Representative
            </div>
          </div>
        </div>

        {primaryGroup.lastActivityPreview && (
          <div className="mt-4 rounded-2xl border border-border-primary bg-bg-secondary/70 p-4">
            <div
              className="text-[11px] uppercase tracking-[0.2em] text-text-muted"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Latest update
            </div>
            <p className="mt-2 text-sm text-text-primary">
              {primaryGroup.lastActivityPreview}
            </p>
          </div>
        )}

        {representation?.partyId && representation.trustExpiresInDays === null && (
          <div className="mt-4 rounded-2xl border border-accent/25 bg-accent/[0.06] p-4">
            <span className="badge border-accent/20 bg-accent/10 text-accent text-[10px]">
              Action needed
            </span>
            <p className="mt-2 text-sm text-text-primary">
              Cast your trust vote to elect a leader for this group.
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              Your vote decides who speaks for this group — and this group&apos;s leader can represent your level if it grows the most.
            </p>
            <Link
              href={`/group/${representation.partyId}?action=vote`}
              className="btn btn-primary btn-sm mt-3 inline-block"
            >
              Cast trust vote
            </Link>
          </div>
        )}

        {representation?.partyId && representation.trustExpiresInDays !== null && representation.trustExpiresInDays <= 30 && (
          <div className="mt-4 rounded-2xl border border-warning/25 bg-warning/[0.06] p-4">
            <span className="badge border-warning/20 bg-warning/10 text-warning text-[10px]">
              Renew soon
            </span>
            <p className="mt-2 text-sm text-text-primary">
              Your trust vote expires in {representation.trustExpiresInDays} day{representation.trustExpiresInDays === 1 ? '' : 's'}.
            </p>
            <Link
              href={`/group/${representation.partyId}`}
              className="btn btn-secondary btn-sm mt-3 inline-block"
            >
              Renew trust vote
            </Link>
          </div>
        )}

        <div className="mt-4">
          <div
            className="text-[11px] uppercase tracking-[0.18em] text-text-muted"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Your levels
          </div>
          <div className="mt-3 space-y-2">
            {CREATION_LOCATION_SCOPE_LEVELS.map((level) => {
              const match = groups.find((g) => g.locationScope === level.value);
              return (
                <div
                  key={level.value}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border-primary bg-bg-secondary/50 px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <LocationScopeIcon iconName={level.icon} className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span
                      className="text-[11px] uppercase tracking-[0.14em] text-text-muted shrink-0"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {level.label}
                    </span>
                    {match ? (
                      <Link
                        href={`/group/${match.id}`}
                        className="truncate text-sm text-text-primary hover:text-accent hover:underline"
                      >
                        {match.name}
                      </Link>
                    ) : (
                      <span className="text-sm text-text-muted">—</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {match ? (
                      <span
                        className="text-[11px] text-text-muted"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {match.memberCount.toLocaleString('en-IN')} members
                      </span>
                    ) : (
                      <Link
                        href={`/discover?scope=${level.value}`}
                        className="badge text-[10px] border-accent/20 bg-accent/10 text-accent hover:bg-accent/20 transition"
                      >
                        Join
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link href={`/group/${primaryGroup.id}`} className="btn btn-primary flex-1">
            Continue with group
          </Link>
          <Link href="/profile" className="btn btn-secondary flex-1">
            Open profile
          </Link>
        </div>
      </div>
    </section>
  );
}

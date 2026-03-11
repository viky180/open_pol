'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { MemberWithVotes } from '@/types/database';
import { TrustSelectionScreen } from '@/components/TrustSelectionScreen';
import type { JoinGroupOption } from '../hooks/usePartyMembership';
import { GroupIconBadge, getGroupIconSrc } from './PartyPrimitives';

/* ── Leave Modal ── */

interface LeaveModalProps {
    partyIssueText: string;
    joinLoading: boolean;
    onCancel: () => void;
    onLeave: () => void;
}

export function LeaveModal({ partyIssueText, joinLoading, onCancel, onLeave }: LeaveModalProps) {
    return (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
            <div className="card max-w-md w-full">
                <div className="mb-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-text-muted">
                        Walking away from group
                    </div>
                    <h2 className="text-lg font-semibold text-text-primary mt-2">
                        Leave {partyIssueText || 'this group'}?
                    </h2>
                    <p className="text-sm text-text-secondary mt-2">
                        You&apos;ll no longer be represented by this group, and your weight will be removed from its coalition.
                    </p>
                </div>
                <div className="rounded-xl border border-border-primary bg-bg-tertiary p-4 text-sm text-text-secondary">
                    <p className="text-xs uppercase tracking-[0.2em] text-text-muted mb-2">
                        What changes now
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Your choice is removed immediately</li>
                        <li>Representation ends</li>
                        <li>You can join another group anytime</li>
                    </ul>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                    <button
                        onClick={onCancel}
                        className="btn btn-secondary"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onLeave}
                        className="btn btn-primary"
                        disabled={joinLoading}
                    >
                        {joinLoading ? 'Leaving...' : 'Leave group'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Auth Modal ── */

interface AuthModalProps {
    partyId: string;
    onCancel: () => void;
}

export function AuthModal({ partyId, onCancel }: AuthModalProps) {
    const router = useRouter();

    return (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4">
            <div className="card max-w-md w-full">
                <h3 className="text-lg font-semibold mb-2">Create an account to join</h3>
                <p className="text-sm text-text-secondary mb-4">
                    We need a verified account so voting stays secure and one-person-one-vote is enforced.
                    You&apos;ll also be able to participate in Q&A and alliances.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                    <button
                        onClick={onCancel}
                        className="btn btn-secondary"
                    >
                        Not now
                    </button>
                    <button
                        onClick={() => {
                            const returnPath = `/party/${partyId}`;
                            router.push(`/auth?returnTo=${encodeURIComponent(returnPath)}`);
                        }}
                        className="btn btn-primary"
                    >
                        Continue to sign in
                    </button>
                </div>
                <p className="text-xs text-text-muted mt-4 text-center">
                    🔒 We never sell your data.
                </p>
            </div>
        </div>
    );
}

/* ── Join Group Selection Modal ── */

interface JoinGroupSelectionModalProps {
    options: JoinGroupOption[];
    joinLoading: boolean;
    onSelect: (partyId: string) => void;
    onCancel: () => void;
}

const RELATION_LABEL: Record<JoinGroupOption['relation'], string> = {
    current: 'This group',
    sibling: 'Other chapter',
    child: 'Local chapter',
};

export function JoinGroupSelectionModal({ options, joinLoading, onSelect, onCancel }: JoinGroupSelectionModalProps) {
    const hasSiblingOptions = options.some((option) => option.relation === 'sibling');
    const hasChildOptions = options.some((option) => option.relation === 'child');

    const sortedOptions = [...options].sort((a, b) => {
        if (a.relation === 'current' && b.relation !== 'current') return -1;
        if (a.relation !== 'current' && b.relation === 'current') return 1;
        return b.memberCount - a.memberCount;
    });

    return (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4">
            <div className="card max-w-lg w-full">
                <div className="mb-4">
                    <h3 className="text-lg font-semibold text-text-primary">Choose a chapter to join</h3>
                    <p className="mt-1 text-sm text-text-secondary">
                        {hasSiblingOptions && hasChildOptions
                            ? 'You can join this group, a nearby sibling chapter, or a local chapter below it.'
                            : hasChildOptions
                                ? 'Local chapters are available. Pick one for direct local representation.'
                                : 'Other chapters are available in this area. Pick one to join.'}
                    </p>
                </div>

                <div className="max-h-[60vh] overflow-y-auto space-y-2">
                    {sortedOptions.map((option) => (
                        <button
                            key={option.id}
                            type="button"
                            onClick={() => onSelect(option.id)}
                            disabled={joinLoading}
                            className="w-full rounded-lg border border-border-primary bg-bg-tertiary/40 px-3 py-2 text-left transition hover:bg-bg-tertiary disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0 flex items-center gap-2">
                                    <GroupIconBadge
                                        name={option.issue_text}
                                        iconSvg={option.icon_svg || null}
                                        iconImageUrl={option.icon_image_url || null}
                                        size={28}
                                    />
                                    <div className="min-w-0">
                                        <p className="line-clamp-1 text-sm font-medium text-text-primary">{option.issue_text}</p>
                                        <p className="text-xs text-text-muted">{RELATION_LABEL[option.relation]}</p>
                                    </div>
                                </div>
                                <span className="shrink-0 text-xs text-text-muted">
                                    {option.memberCount} {option.memberCount === 1 ? 'member' : 'members'}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>

                <div className="mt-4 flex justify-end">
                    <button type="button" onClick={onCancel} className="btn btn-secondary" disabled={joinLoading}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Trust Selection Modal ── */

interface TrustSelectionModalProps {
    partyId: string;
    partyName: string;
    members: MemberWithVotes[];
    currentUserId: string | null;
    votedFor: string | null;
    onVoteChange: () => void;
    onClose: () => void;
}

export function TrustSelectionModal({
    partyId,
    partyName,
    members,
    currentUserId,
    votedFor,
    onVoteChange,
    onClose,
}: TrustSelectionModalProps) {
    return (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
            <div className="card max-w-lg w-full my-8">
                <TrustSelectionScreen
                    partyId={partyId}
                    partyName={partyName}
                    members={members}
                    currentUserId={currentUserId}
                    votedFor={votedFor}
                    onVoteChange={onVoteChange}
                    onClose={onClose}
                />
            </div>
        </div>
    );
}

/* ── Petition Campaign Modal ── */

export interface PetitionCampaignDraft {
    title: string;
    description: string;
    targetSignatures: number;
    endsAt: string;
    authorityName: string;
    authorityEmail: string;
}

interface PetitionCampaignModalProps {
    partyIssueText: string;
    submitting: boolean;
    onClose: () => void;
    onSubmit: (draft: PetitionCampaignDraft) => void;
}

function buildDefaultEndDate() {
    const date = new Date();
    date.setDate(date.getDate() + 14);
    return date.toISOString().slice(0, 10);
}

export function PetitionCampaignModal({
    partyIssueText,
    submitting,
    onClose,
    onSubmit,
}: PetitionCampaignModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [targetSignatures, setTargetSignatures] = useState('100');
    const [endsAt, setEndsAt] = useState(buildDefaultEndDate);
    const [authorityName, setAuthorityName] = useState('');
    const [authorityEmail, setAuthorityEmail] = useState('');

    return (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
            <div className="card max-w-2xl w-full my-8">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="text-xs uppercase tracking-[0.2em] text-text-muted">
                            Petition campaign
                        </div>
                        <h3 className="mt-2 text-lg font-semibold text-text-primary">
                            Start a petition for {partyIssueText}
                        </h3>
                        <p className="mt-2 text-sm text-text-secondary">
                            Launch a public signature campaign with a target and deadline.
                        </p>
                    </div>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={submitting}>
                        Close
                    </button>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                        <label className="label" htmlFor="petition-title">Title</label>
                        <input
                            id="petition-title"
                            className="input mt-2"
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            placeholder="What should this petition ask for?"
                            disabled={submitting}
                        />
                    </div>

                    <div className="sm:col-span-2">
                        <label className="label" htmlFor="petition-description">Description</label>
                        <textarea
                            id="petition-description"
                            className="input textarea mt-2"
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                            placeholder="Explain the demand, why it matters, and what signatures should achieve."
                            disabled={submitting}
                        />
                    </div>

                    <div>
                        <label className="label" htmlFor="petition-target">Target signatures</label>
                        <input
                            id="petition-target"
                            type="number"
                            min="1"
                            className="input mt-2"
                            value={targetSignatures}
                            onChange={(event) => setTargetSignatures(event.target.value)}
                            disabled={submitting}
                        />
                    </div>

                    <div>
                        <label className="label" htmlFor="petition-ends-at">End date</label>
                        <input
                            id="petition-ends-at"
                            type="date"
                            className="input mt-2"
                            value={endsAt}
                            onChange={(event) => setEndsAt(event.target.value)}
                            disabled={submitting}
                        />
                    </div>

                    <div>
                        <label className="label" htmlFor="petition-authority-name">Authority name</label>
                        <input
                            id="petition-authority-name"
                            className="input mt-2"
                            value={authorityName}
                            onChange={(event) => setAuthorityName(event.target.value)}
                            placeholder="Optional"
                            disabled={submitting}
                        />
                    </div>

                    <div>
                        <label className="label" htmlFor="petition-authority-email">Authority email</label>
                        <input
                            id="petition-authority-email"
                            type="email"
                            className="input mt-2"
                            value={authorityEmail}
                            onChange={(event) => setAuthorityEmail(event.target.value)}
                            placeholder="Optional"
                            disabled={submitting}
                        />
                    </div>
                </div>

                <div className="mt-5 flex flex-wrap justify-end gap-2">
                    <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        disabled={submitting}
                        onClick={() => onSubmit({
                            title,
                            description,
                            targetSignatures: Number(targetSignatures || 0),
                            endsAt,
                            authorityName,
                            authorityEmail,
                        })}
                    >
                        {submitting ? 'Starting...' : 'Start petition'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Title Image Modal ── */

interface TitleImageModalProps {
    issueText: string;
    titleImageUrl: string;
    onClose: () => void;
}

export function TitleImageModal({ issueText, titleImageUrl, onClose }: TitleImageModalProps) {
    return (
        <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 bg-black/90 p-4 sm:p-6"
            onClick={onClose}
        >
            <button
                type="button"
                aria-label="Close full image"
                className="absolute right-4 top-4 rounded bg-black/70 px-3 py-1 text-white"
                onClick={onClose}
            >
                ✕
            </button>
            <div className="flex h-full w-full items-center justify-center">
                <div className="animate-scale-in">
                    <Image
                        src={titleImageUrl}
                        alt={`${issueText} full title image`}
                        width={1536}
                        height={1024}
                        className="max-h-full max-w-full object-contain"
                        onClick={(e) => e.stopPropagation()}
                        priority
                    />
                </div>
            </div>
        </div>
    );
}

/* ── Icon Preview Modal ── */

interface IconPreviewModalProps {
    issueText: string;
    iconSvg: string | null;
    iconImageUrl: string | null;
    onClose: () => void;
}

export function IconPreviewModal({ issueText, iconSvg, iconImageUrl, onClose }: IconPreviewModalProps) {
    return (
        <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 bg-black/90 p-4 sm:p-6"
            onClick={onClose}
        >
            <button
                type="button"
                aria-label="Close full icon"
                className="absolute right-4 top-4 rounded bg-black/70 px-3 py-1 text-white"
                onClick={onClose}
            >
                ✕
            </button>
            <div className="flex h-full w-full items-center justify-center">
                <div className="animate-scale-in">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={getGroupIconSrc(issueText, iconSvg, iconImageUrl)}
                        alt={`${issueText} full icon`}
                        className="max-h-[80vh] max-w-[80vw] rounded-xl border border-white/20 bg-white object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            </div>
        </div>
    );
}

/* ── Icon Editor Modal ── */

interface IconEditorModalProps {
    issueText: string;
    iconSvgDraft: string;
    onIconSvgDraftChange: (v: string) => void;
    iconImageUrlDraft: string;
    onIconImageUrlDraftChange: (v: string) => void;
    iconImageUploading: boolean;
    savingIcon: boolean;
    iconPromptText: string;
    onUploadIconImage: (file: File | null) => void;
    onSavePartyIcon: () => void;
    onReset: () => void;
    onClose: () => void;
    onShowStatusMessage: (tone: 'success' | 'error' | 'info', text: string) => void;
}

export function IconEditorModal({
    issueText,
    iconSvgDraft,
    onIconSvgDraftChange,
    iconImageUrlDraft,
    onIconImageUrlDraftChange,
    iconImageUploading,
    savingIcon,
    iconPromptText,
    onUploadIconImage,
    onSavePartyIcon,
    onReset,
    onClose,
    onShowStatusMessage,
}: IconEditorModalProps) {
    return (
        <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/70 p-4 sm:p-6"
            onClick={onClose}
        >
            <div
                className="animate-scale-in mx-auto my-8 w-full max-w-2xl max-h-[calc(100vh-4rem)] overflow-y-auto rounded-xl border border-border-primary bg-bg-primary p-4 sm:p-5"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h3 className="text-lg font-semibold text-text-primary">Edit Group Icon</h3>
                        <p className="mt-1 text-sm text-text-secondary">
                            Upload your own image, paste an image URL, or generate/paste SVG code.
                        </p>
                    </div>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
                        Close
                    </button>
                </div>

                <div className="mt-4 rounded-lg border border-border-primary bg-bg-tertiary/40 p-3">
                    <p className="text-xs text-text-muted mb-2">Use your own icon image (preferred)</p>
                    <input
                        type="file"
                        accept="image/*"
                        className="input"
                        onChange={(e) => onUploadIconImage(e.target.files?.[0] || null)}
                        disabled={iconImageUploading || savingIcon}
                    />
                    <p className="text-xs text-text-muted mt-2">or paste image URL</p>
                    <input
                        type="url"
                        className="input mt-1"
                        value={iconImageUrlDraft}
                        onChange={(e) => onIconImageUrlDraftChange(e.target.value)}
                        placeholder="https://..."
                        disabled={savingIcon}
                    />
                </div>

                <div className="mt-4 rounded-lg border border-border-primary bg-bg-tertiary/40 p-3">
                    <p className="text-xs text-text-muted mb-2">Suggested prompt</p>
                    <pre className="whitespace-pre-wrap text-xs text-text-secondary">{iconPromptText}</pre>
                    <button
                        type="button"
                        className="btn btn-secondary btn-sm mt-3"
                        onClick={async () => {
                            try {
                                await navigator.clipboard.writeText(iconPromptText);
                                onShowStatusMessage('success', 'Prompt copied.');
                            } catch {
                                onShowStatusMessage('error', 'Could not copy prompt.');
                            }
                        }}
                    >
                        Copy prompt
                    </button>
                </div>

                <div className="mt-4">
                    <label className="block text-sm text-text-secondary mb-2">Paste SVG code</label>
                    <textarea
                        className="input min-h-[180px] font-mono text-xs"
                        value={iconSvgDraft}
                        onChange={(e) => onIconSvgDraftChange(e.target.value)}
                        placeholder="<svg ...>...</svg>"
                    />
                    <p className="mt-2 text-xs text-text-muted">SVG is used as fallback if image URL is empty.</p>
                </div>

                <div className="mt-4">
                    <p className="text-xs text-text-muted mb-2">Preview</p>
                    <div className="rounded-lg border border-border-primary bg-bg-tertiary/40 p-3 inline-flex items-center gap-3">
                        <GroupIconBadge
                            name={issueText}
                            iconSvg={iconSvgDraft.trim() || null}
                            iconImageUrl={iconImageUrlDraft.trim() || null}
                            size={48}
                        />
                        <span className="text-sm text-text-secondary">{issueText}</span>
                    </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                    <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={savingIcon}
                        onClick={onReset}
                    >
                        Reset to default icon
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        disabled={savingIcon}
                        onClick={onSavePartyIcon}
                    >
                        {savingIcon ? 'Saving...' : 'Save icon'}
                    </button>
                </div>
            </div>
        </div>
    );
}

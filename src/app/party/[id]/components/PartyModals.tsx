'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { MemberWithVotes } from '@/types/database';
import { TrustSelectionScreen } from '@/components/TrustSelectionScreen';

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
                        Leave group
                    </div>
                    <h2 className="text-lg font-semibold text-text-primary mt-2">
                        Leave {partyIssueText || 'this group'}?
                    </h2>
                    <p className="text-sm text-text-secondary mt-2">
                        You will stop being represented by this group, and your support will no longer add to its wider reach.
                    </p>
                </div>
                <div className="rounded-xl border border-border-primary bg-bg-tertiary p-4 text-sm text-text-secondary">
                    <p className="text-xs uppercase tracking-[0.2em] text-text-muted mb-2">
                        What happens next
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>You stop being a member right away</li>
                        <li>This group no longer speaks for you</li>
                        <li>You can join another group any time</li>
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
                <h3 className="text-lg font-semibold mb-2">Sign in to join this group</h3>
                <p className="text-sm text-text-secondary mb-4">
                    You need an account so votes stay secure and each person gets one vote.
                    You&apos;ll also be able to ask questions and join alliances.
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
                    We never sell your data.
                </p>
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
                            Petition
                        </div>
                        <h3 className="mt-2 text-lg font-semibold text-text-primary">
                            Create a petition for {partyIssueText}
                        </h3>
                        <p className="mt-2 text-sm text-text-secondary">
                            Launch a public signature campaign with a goal and deadline.
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
                            placeholder="What is this petition asking for?"
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
                            placeholder="Explain the demand, why it matters, and what these signatures should help achieve."
                            disabled={submitting}
                        />
                    </div>

                    <div>
                        <label className="label" htmlFor="petition-target">Signature goal</label>
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
                        {submitting ? 'Creating...' : 'Create petition'}
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
                        <h3 className="text-lg font-semibold text-text-primary">Edit group icon</h3>
                        <p className="mt-1 text-sm text-text-secondary">
                            Upload an image, paste an image URL, or paste SVG code.
                        </p>
                    </div>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
                        Close
                    </button>
                </div>

                <div className="mt-4 rounded-lg border border-border-primary bg-bg-tertiary/40 p-3">
                    <p className="text-xs text-text-muted mb-2">Upload an image (recommended)</p>
                    <input
                        type="file"
                        accept="image/*"
                        className="input"
                        onChange={(e) => onUploadIconImage(e.target.files?.[0] || null)}
                        disabled={iconImageUploading || savingIcon}
                    />
                    <p className="text-xs text-text-muted mt-2">Or paste an image URL</p>
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
                    <p className="text-xs text-text-muted mb-2">Prompt for an image tool</p>
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
                    <p className="mt-2 text-xs text-text-muted">SVG will be used if no image is set.</p>
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

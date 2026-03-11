'use client';

import { useEffect, useState } from 'react';

type StatusTone = 'success' | 'error' | 'info';

interface UsePartyIconProps {
    partyId: string;
    initialIconSvg: string | null;
    initialIconImageUrl: string | null;
    canEdit: boolean;
    onStatusMessage: (tone: StatusTone, text: string) => void;
    onRefresh: () => void;
}

export function usePartyIcon({
    partyId,
    initialIconSvg,
    initialIconImageUrl,
    canEdit,
    onStatusMessage,
    onRefresh,
}: UsePartyIconProps) {
    const [partyIconSvg, setPartyIconSvg] = useState<string | null>(initialIconSvg);
    const [partyIconImageUrl, setPartyIconImageUrl] = useState<string | null>(initialIconImageUrl);
    const [iconSvgDraft, setIconSvgDraft] = useState((initialIconSvg || '').trim());
    const [iconImageUrlDraft, setIconImageUrlDraft] = useState((initialIconImageUrl || '').trim());
    const [iconImageUploading, setIconImageUploading] = useState(false);
    const [savingIcon, setSavingIcon] = useState(false);
    const [showIconPreviewModal, setShowIconPreviewModal] = useState(false);
    const [showIconEditorModal, setShowIconEditorModal] = useState(false);

    // Lock body scroll when editor is open
    useEffect(() => {
        if (!showIconEditorModal) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, [showIconEditorModal]);

    const handleUploadIconImage = async (file: File | null) => {
        if (!file) return;
        setIconImageUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await fetch('/api/uploads/party-icon-image', { method: 'POST', body: formData });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload?.error || 'Could not upload icon image');
            setIconImageUrlDraft(typeof payload?.url === 'string' ? payload.url : '');
            onStatusMessage('success', 'Icon image uploaded. Save to apply.');
        } catch (err) {
            onStatusMessage('error', err instanceof Error ? err.message : 'Could not upload icon image');
        } finally {
            setIconImageUploading(false);
        }
    };

    const handleSavePartyIcon = async () => {
        if (!canEdit) return;
        setSavingIcon(true);
        try {
            const response = await fetch(`/api/parties/${partyId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    icon_svg: iconSvgDraft.trim() || null,
                    icon_image_url: iconImageUrlDraft.trim() || null,
                }),
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload?.error || 'Could not save group icon');
            const nextIcon = payload?.icon_svg ?? null;
            const nextIconImageUrl = payload?.icon_image_url ?? null;
            setPartyIconSvg(nextIcon);
            setPartyIconImageUrl(nextIconImageUrl);
            setIconSvgDraft(nextIcon || '');
            setIconImageUrlDraft(nextIconImageUrl || '');
            setShowIconEditorModal(false);
            onStatusMessage('success', nextIcon ? 'Group icon updated.' : 'Group icon reset to default.');
            onRefresh();
        } catch (err) {
            onStatusMessage('error', err instanceof Error ? err.message : 'Could not save group icon');
        } finally {
            setSavingIcon(false);
        }
    };

    const handleResetIcon = () => {
        setIconSvgDraft('');
        setIconImageUrlDraft('');
    };

    return {
        partyIconSvg,
        partyIconImageUrl,
        iconSvgDraft,
        setIconSvgDraft,
        iconImageUrlDraft,
        setIconImageUrlDraft,
        iconImageUploading,
        savingIcon,
        showIconPreviewModal,
        setShowIconPreviewModal,
        showIconEditorModal,
        setShowIconEditorModal,
        handleUploadIconImage,
        handleSavePartyIcon,
        handleResetIcon,
    };
}

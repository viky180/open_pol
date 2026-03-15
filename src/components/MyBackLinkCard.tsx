'use client';

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';

interface MyBackLinkCardProps {
    groupId: string;
    groupName: string;
    currentUserId: string;
    currentUserName: string | null;
}

export function MyBackLinkCard({ groupId, groupName, currentUserId, currentUserName }: MyBackLinkCardProps) {
    const [showModal, setShowModal] = useState(false);

    return (
        <>
            <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary">Your back link</p>
                    <p className="text-xs text-text-muted mt-0.5">
                        Share a QR code so supporters can back you with one tap.
                    </p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="btn btn-sm btn-primary flex-shrink-0"
                >
                    Get QR code
                </button>
            </div>

            {showModal && (
                <QRModal
                    groupId={groupId}
                    groupName={groupName}
                    currentUserId={currentUserId}
                    currentUserName={currentUserName}
                    onClose={() => setShowModal(false)}
                />
            )}
        </>
    );
}

interface QRModalProps {
    groupId: string;
    groupName: string;
    currentUserId: string;
    currentUserName: string | null;
    onClose: () => void;
}

function QRModal({ groupId, groupName, currentUserId, currentUserName, onClose }: QRModalProps) {
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

    const backUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/back/${groupId}/${currentUserId}`
        : `/back/${groupId}/${currentUserId}`;

    useEffect(() => {
        QRCode.toDataURL(backUrl, {
            width: 280,
            margin: 2,
            color: { dark: '#1a2e1c', light: '#ffffff' },
        }).then(setQrDataUrl).catch(console.error);
    }, [backUrl]);

    const handleDownload = () => {
        if (!qrDataUrl) return;
        const a = document.createElement('a');
        a.href = qrDataUrl;
        a.download = `back-${currentUserName ?? 'me'}-qr.png`;
        a.click();
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(backUrl).catch(console.error);
    };

    return (
        <div
            className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="card max-w-xs w-full space-y-5"
                onClick={(e) => e.stopPropagation()}
            >
                <div>
                    <p className="text-xs uppercase tracking-[0.15em] text-text-muted">{groupName}</p>
                    <h2 className="text-lg font-semibold text-text-primary mt-1">
                        Your back QR code
                    </h2>
                    <p className="text-sm text-text-secondary mt-1">
                        Print or share this. Anyone who scans it will be taken straight to a page where they can back {currentUserName ?? 'you'} — no navigation needed.
                    </p>
                </div>

                <div className="flex justify-center">
                    {qrDataUrl ? (
                        <img
                            src={qrDataUrl}
                            alt={`QR code to back ${currentUserName ?? 'me'} in ${groupName}`}
                            className="rounded-xl border border-border-primary"
                            width={280}
                            height={280}
                        />
                    ) : (
                        <div className="w-[280px] h-[280px] rounded-xl border border-border-primary bg-bg-secondary animate-pulse" />
                    )}
                </div>

                <div className="flex flex-col gap-2">
                    <button
                        onClick={handleDownload}
                        disabled={!qrDataUrl}
                        className="btn btn-primary w-full"
                    >
                        Download QR code
                    </button>
                    <button
                        onClick={handleCopyLink}
                        className="btn btn-secondary w-full"
                    >
                        Copy link
                    </button>
                    <button
                        onClick={onClose}
                        className="btn btn-ghost w-full text-sm"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

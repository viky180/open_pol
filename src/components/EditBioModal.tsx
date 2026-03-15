'use client';

import { useState, useRef, useEffect } from 'react';
import { useToast } from '@/components/ToastContext';
import { useRouter } from 'next/navigation';

export function EditBioModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [bio, setBio] = useState('');
    const [loading, setLoading] = useState(false);
    const [isFetchingInfo, setIsFetchingInfo] = useState(false);
    const { showToast } = useToast();
    const router = useRouter();
    const dialogRef = useRef<HTMLDialogElement>(null);

    // Fetch initial value when opened
    useEffect(() => {
        if (!isOpen) return;

        const fetchBio = async () => {
            setIsFetchingInfo(true);
            try {
                const res = await fetch('/api/profile');
                if (res.ok) {
                    const data = await res.json();
                    setBio(data.bio || '');
                }
            } catch (err) {
                console.error('Failed to fetch bio:', err);
            } finally {
                setIsFetchingInfo(false);
            }
        };

        fetchBio();
    }, [isOpen]);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        if (isOpen) {
            dialog.showModal();
            document.body.style.overflow = 'hidden';
        } else {
            dialog.close();
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const handleOpen = () => setIsOpen(true);
    const handleClose = () => {
        if (!loading) setIsOpen(false);
    };

    const handleSave = async () => {
        if (loading) return;
        setLoading(true);

        try {
            const res = await fetch('/api/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bio: bio.trim() }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to update bio');
            }

            showToast('success', 'Bio updated successfully.');
            setIsOpen(false);
            router.refresh(); // Refresh page to show updated bio
        } catch (err) {
            showToast('error', err instanceof Error ? err.message : 'Failed to update bio.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={handleOpen}
                className="text-xs text-primary hover:text-primary/80 font-medium ml-2"
            >
                Edit bio
            </button>

            <dialog
                ref={dialogRef}
                className="modal"
                onCancel={(e) => {
                    e.preventDefault();
                    handleClose();
                }}
            >
                <div className="modal-box p-6 bg-bg-card border border-border-primary rounded-xl max-w-md w-full absolute inset-x-0 bottom-0 sm:relative translate-y-0 transition-transform sm:mx-auto">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-text-primary">Your Bio</h3>
                        <button
                            onClick={handleClose}
                            className="p-2 text-text-muted hover:text-text-primary hover:bg-bg-tertiary rounded-full transition-colors"
                            aria-label="Close"
                            disabled={loading}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="mb-6">
                        <p className="text-sm text-text-secondary mb-3">
                            Add a short bio to explain your credibility. This will be shown to other members when they are selecting a leader.
                        </p>

                        {isFetchingInfo ? (
                            <div className="animate-pulse bg-bg-tertiary h-24 rounded-lg w-full"></div>
                        ) : (
                            <div className="space-y-2">
                                <textarea
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    maxLength={300}
                                    placeholder="e.g. Community organizer for 5 years, running the local food bank..."
                                    className="w-full h-24 bg-bg-secondary border border-border-primary rounded-lg p-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none"
                                />
                                <div className="text-right text-xs text-text-muted">
                                    {bio.length}/300
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={handleClose}
                            className="btn btn-secondary px-6"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="btn btn-primary px-6"
                            disabled={loading || isFetchingInfo}
                        >
                            {loading ? 'Saving...' : 'Save bio'}
                        </button>
                    </div>
                </div>
                
                <form method="dialog" className="modal-backdrop">
                    <button onClick={handleClose} disabled={loading}>close</button>
                </form>
            </dialog>
        </>
    );
}

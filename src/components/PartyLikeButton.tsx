'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface PartyLikeButtonProps {
    partyId: string;
    currentUserId: string | null;
    initialLiked: boolean;
    initialLikeCount: number;
    showCount?: boolean;
}

export function PartyLikeButton({
    partyId,
    currentUserId,
    initialLiked,
    initialLikeCount,
    showCount = true
}: PartyLikeButtonProps) {
    const router = useRouter();
    const [liked, setLiked] = useState(initialLiked);
    const [count, setCount] = useState(initialLikeCount);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toggleLike = async () => {
        if (!currentUserId) {
            router.push('/auth');
            return;
        }
        if (loading) return;

        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/parties/${partyId}/like`, {
                method: liked ? 'DELETE' : 'POST',
            });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(payload?.error || 'Failed to update like');

            setLiked(!liked);
            setCount((c) => Math.max(0, c + (liked ? -1 : 1)));
            router.refresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to update like');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-start gap-1">
            <button
                onClick={toggleLike}
                disabled={loading}
                className={`btn btn-sm ${liked ? 'btn-danger' : 'btn-secondary'}`}
                title={liked ? 'Unlike this party' : 'Like this party'}
            >
                {loading ? '...' : liked ? '♥ Liked' : '♡ Like'}{showCount ? ` (${count})` : ''}
            </button>
            {error && <div className="text-xs text-warning">{error}</div>}
        </div>
    );
}

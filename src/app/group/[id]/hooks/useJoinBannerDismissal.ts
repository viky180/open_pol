'use client';

import { useEffect, useMemo, useState } from 'react';

interface UseJoinBannerDismissalParams {
    partyId: string;
    optimisticIsMember: boolean;
    optimisticMemberSince: string | null;
}

export function useJoinBannerDismissal({
    partyId,
    optimisticIsMember,
    optimisticMemberSince,
}: UseJoinBannerDismissalParams) {
    const [joinBannerDismissed, setJoinBannerDismissed] = useState(false);

    const isJustJoined = useMemo(() => {
        if (!optimisticIsMember || !optimisticMemberSince) return false;
        const joinedAt = new Date(optimisticMemberSince).getTime();
        // eslint-disable-next-line react-hooks/purity
        return Date.now() - joinedAt < 1000 * 60 * 60 * 24;
    }, [optimisticIsMember, optimisticMemberSince]);

    const joinBannerDismissKey = useMemo(
        () => `party:${partyId}:joinBannerDismissed:${optimisticMemberSince ?? 'none'}`,
        [partyId, optimisticMemberSince]
    );

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const dismissed = window.sessionStorage.getItem(joinBannerDismissKey) === 'true';
        setJoinBannerDismissed(dismissed);
    }, [joinBannerDismissKey]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!joinBannerDismissed) return;
        window.sessionStorage.setItem(joinBannerDismissKey, 'true');
    }, [joinBannerDismissed, joinBannerDismissKey]);

    return {
        isJustJoined,
        joinBannerDismissed,
        dismissJoinBanner: () => setJoinBannerDismissed(true),
    };
}

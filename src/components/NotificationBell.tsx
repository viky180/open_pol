'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthContext';
import {
    isPushSupported,
    getNotificationPermission,
    registerServiceWorker,
    getCurrentSubscription,
    subscribeUserToPush,
    unsubscribeFromPush
} from '@/lib/push';

type NotificationStatus = 'loading' | 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed';

export function NotificationBell() {
    const { user } = useAuth();
    const [status, setStatus] = useState<NotificationStatus>('loading');
    const [isProcessing, setIsProcessing] = useState(false);

    const checkSubscription = useCallback(async () => {
        if (!isPushSupported()) {
            setStatus('unsupported');
            return;
        }

        const permission = getNotificationPermission();
        if (permission === 'denied') {
            setStatus('denied');
            return;
        }

        const subscription = await getCurrentSubscription();
        setStatus(subscription ? 'subscribed' : 'unsubscribed');
    }, []);

    useEffect(() => {
        // Register service worker on mount
        registerServiceWorker();

        if (user) {
            checkSubscription();
        } else {
            setStatus('unsubscribed');
        }
    }, [user, checkSubscription]);

    const handleClick = async () => {
        if (!user) {
            // Could show login prompt
            return;
        }

        if (status === 'unsupported' || status === 'denied') {
            return;
        }

        setIsProcessing(true);

        try {
            if (status === 'subscribed') {
                const success = await unsubscribeFromPush();
                if (success) {
                    setStatus('unsubscribed');
                }
            } else {
                const subscription = await subscribeUserToPush();
                if (subscription) {
                    setStatus('subscribed');
                } else {
                    // Check if denied
                    if (getNotificationPermission() === 'denied') {
                        setStatus('denied');
                    }
                }
            }
        } catch (error) {
            console.error('Notification toggle error:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    // Don't show for logged out users
    if (!user) {
        return null;
    }

    const getIcon = () => {
        switch (status) {
            case 'loading':
                return (
                    <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                );
            case 'subscribed':
                return (
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" />
                    </svg>
                );
            case 'denied':
                return (
                    <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364l-2.828-2.828m0 0L12 12m3.536 3.536L12 12m0 0L8.464 8.464" />
                    </svg>
                );
            case 'unsupported':
                return (
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                );
            default:
                return (
                    <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                );
        }
    };

    const getTooltip = () => {
        switch (status) {
            case 'loading':
                return 'Loading...';
            case 'subscribed':
                return 'Notifications enabled (click to disable)';
            case 'denied':
                return 'Notifications blocked - enable in browser settings';
            case 'unsupported':
                return 'Notifications not supported in this browser';
            default:
                return 'Enable notifications';
        }
    };

    const isClickable = status !== 'loading' && status !== 'unsupported' && status !== 'denied';

    return (
        <button
            onClick={handleClick}
            disabled={!isClickable || isProcessing}
            className={`
        relative p-2 rounded-lg transition-all duration-200
        ${isClickable ? 'hover:bg-bg-tertiary cursor-pointer' : 'cursor-not-allowed opacity-50'}
        ${isProcessing ? 'animate-pulse' : ''}
      `}
            title={getTooltip()}
            aria-label={getTooltip()}
        >
            {getIcon()}

            {/* Active indicator dot */}
            {status === 'subscribed' && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full" />
            )}
        </button>
    );
}

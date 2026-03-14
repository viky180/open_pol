'use client';

import { useState } from 'react';
import { PartyPopper, CheckCircle, Hourglass } from 'lucide-react';
import type { FundingCampaignWithStats, FundingDonationWithDonor } from '@/types/database';

interface DonateModalProps {
    campaign: FundingCampaignWithStats;
    onClose: () => void;
    onDonationComplete: () => void;
}

export function DonateModal({ campaign, onClose, onDonationComplete }: DonateModalProps) {
    const [step, setStep] = useState<'amount' | 'pay' | 'confirm'>('amount');
    const [amount, setAmount] = useState<number>(100);
    const [donorName, setDonorName] = useState('');
    const [message, setMessage] = useState('');
    const [transactionId, setTransactionId] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const presetAmounts = [100, 500, 1000, 5000];

    // Generate UPI payment link
    const generateUpiLink = () => {
        const params = new URLSearchParams({
            pa: campaign.upi_id,
            pn: 'Funding Campaign',
            am: amount.toString(),
            cu: 'INR',
            tn: `Donation for: ${campaign.title.slice(0, 30)}`,
        });
        return `upi://pay?${params.toString()}`;
    };

    const handleProceedToPay = () => {
        if (!donorName.trim()) {
            setError('Please enter your name');
            return;
        }
        if (amount < 1) {
            setError('Amount must be at least ₹1');
            return;
        }
        setError('');
        setStep('pay');
    };

    const handleSubmitDonation = async () => {
        if (!transactionId.trim()) {
            setError('Please enter the UPI transaction ID');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch(`/api/funding/${campaign.id}/donate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount,
                    donor_name: donorName,
                    donor_message: message || null,
                    upi_transaction_id: transactionId,
                    is_anonymous: isAnonymous,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to submit donation');
            }

            setStep('confirm');
            setTimeout(() => {
                onDonationComplete();
                onClose();
            }, 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to submit donation');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-bg-secondary rounded-2xl max-w-md w-full p-6 shadow-xl animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-text-primary">
                        {step === 'confirm' ? <span className="flex items-center gap-2"><PartyPopper className="w-5 h-5" /> Thank You!</span> : 'Support This Cause'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-text-muted hover:text-text-primary text-2xl"
                    >
                        ×
                    </button>
                </div>

                {/* Campaign Info */}
                <div className="mb-4 p-3 rounded-lg bg-bg-tertiary">
                    <p className="text-sm font-medium text-text-secondary">{campaign.title}</p>
                    <p className="text-xs text-text-muted mt-1">
                        ₹{campaign.raised_amount.toLocaleString('en-IN')} raised of ₹{campaign.goal_amount.toLocaleString('en-IN')} goal
                    </p>
                </div>

                {/* Step: Amount */}
                {step === 'amount' && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-text-secondary mb-2">Your Name *</label>
                            <input
                                type="text"
                                value={donorName}
                                onChange={(e) => setDonorName(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="Enter your name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-text-secondary mb-2">Choose Amount</label>
                            <div className="flex flex-wrap gap-2">
                                {presetAmounts.map((preset) => (
                                    <button
                                        key={preset}
                                        onClick={() => setAmount(preset)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${amount === preset
                                            ? 'bg-primary text-white'
                                            : 'bg-bg-tertiary text-text-secondary hover:bg-primary/20'
                                            }`}
                                    >
                                        ₹{preset.toLocaleString('en-IN')}
                                    </button>
                                ))}
                            </div>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value))}
                                className="w-full mt-2 px-4 py-2 rounded-lg bg-bg-tertiary border border-border-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="Or enter custom amount"
                                min="1"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-text-secondary mb-2">Message (optional)</label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                                placeholder="Add a message of support..."
                                rows={2}
                            />
                        </div>

                        <label className="flex items-center gap-2 text-sm text-text-secondary">
                            <input
                                type="checkbox"
                                checked={isAnonymous}
                                onChange={(e) => setIsAnonymous(e.target.checked)}
                                className="rounded"
                            />
                            Keep my donation anonymous
                        </label>

                        {error && <p className="text-sm text-red-400">{error}</p>}

                        <button
                            onClick={handleProceedToPay}
                            className="w-full btn btn-primary"
                        >
                            Proceed to Pay ₹{amount.toLocaleString('en-IN')}
                        </button>
                    </div>
                )}

                {/* Step: Pay */}
                {step === 'pay' && (
                    <div className="space-y-4">
                        <div className="text-center p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30">
                            <p className="text-3xl font-bold text-green-400">
                                ₹{amount.toLocaleString('en-IN')}
                            </p>
                            <p className="text-sm text-text-muted mt-1">Amount to pay</p>
                        </div>

                        <div className="p-4 rounded-lg bg-bg-tertiary">
                            <p className="text-sm text-text-secondary mb-2">Pay to UPI ID:</p>
                            <p className="font-mono text-primary break-all">{campaign.upi_id}</p>
                        </div>

                        <a
                            href={generateUpiLink()}
                            className="block w-full btn btn-primary text-center"
                        >
                            📱 Open UPI App to Pay
                        </a>

                        <p className="text-xs text-text-muted text-center">
                            After payment, enter the UPI Transaction ID below
                        </p>

                        <div>
                            <label className="block text-sm text-text-secondary mb-2">UPI Transaction ID *</label>
                            <input
                                type="text"
                                value={transactionId}
                                onChange={(e) => setTransactionId(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg bg-bg-tertiary border border-border-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="e.g., 123456789012"
                            />
                        </div>

                        {error && <p className="text-sm text-red-400">{error}</p>}

                        <div className="flex gap-2">
                            <button
                                onClick={() => setStep('amount')}
                                className="btn btn-secondary flex-1"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleSubmitDonation}
                                disabled={loading}
                                className="btn btn-primary flex-1"
                            >
                                {loading ? 'Submitting...' : 'Submit Donation'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step: Confirm */}
                {step === 'confirm' && (
                    <div className="text-center py-6">
                        <div className="text-6xl mb-4">🙏</div>
                        <h3 className="text-xl font-semibold text-text-primary mb-2">
                            Donation Recorded!
                        </h3>
                        <p className="text-text-secondary">
                            Your donation of ₹{amount.toLocaleString('en-IN')} has been submitted.
                            It will appear once verified by the group leader.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

// Donation list component for transparency
interface DonationLedgerProps {
    campaignId: string;
    donations: FundingDonationWithDonor[];
}

export function DonationLedger({ donations }: Omit<DonationLedgerProps, never>) {
    if (donations.length === 0) {
        return (
            <div className="text-center py-4 text-text-muted text-sm">
                No donations yet. Be the first to support!
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <h4 className="text-sm font-medium text-text-secondary">Recent Supporters</h4>
            <div className="max-h-48 overflow-y-auto space-y-2">
                {donations.slice(0, 10).map((donation) => (
                    <div
                        key={donation.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-bg-tertiary"
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-lg">
                                {donation.is_verified ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Hourglass className="w-5 h-5 text-amber-500" />}
                            </span>
                            <div>
                                <p className="text-sm text-text-primary">
                                    {donation.display_donor_name}
                                </p>
                                {donation.donor_message && (
                                    <p className="text-xs text-text-muted">
                                        &ldquo;{donation.donor_message.slice(0, 50)}...&rdquo;
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-medium text-green-400">
                                ₹{donation.amount.toLocaleString('en-IN')}
                            </p>
                            <p className="text-xs text-text-muted">
                                {new Date(donation.created_at).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                })}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

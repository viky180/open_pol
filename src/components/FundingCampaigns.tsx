'use client';

import { useCallback, useEffect, useState } from 'react';
import { Banknote, Check, X } from 'lucide-react';
import { DonateModal, DonationLedger } from './DonateModal';
import type { FundingCampaignWithStats, FundingDonationWithDonor } from '@/types/database';

interface FundingCampaignsProps {
    partyId: string;
    isLeader: boolean;
    currentUserId: string | null;
}

export function FundingCampaigns({ partyId, isLeader, currentUserId }: FundingCampaignsProps) {
    const [campaigns, setCampaigns] = useState<FundingCampaignWithStats[]>([]);
    const [selectedCampaign, setSelectedCampaign] = useState<FundingCampaignWithStats | null>(null);
    const [donations, setDonations] = useState<Record<string, FundingDonationWithDonor[]>>({});
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [loading, setLoading] = useState(true);

    // Form state for creating new campaign
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        goal_amount: 10000,
        upi_id: '',
        ends_at: '',
    });
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');

    const fetchCampaigns = useCallback(async () => {
        try {
            const res = await fetch(`/api/parties/${partyId}/funding`);
            if (res.ok) {
                const data = await res.json();
                setCampaigns(data.campaigns || []);
            }
        } catch (err) {
            console.error('Error fetching campaigns:', err);
        } finally {
            setLoading(false);
        }
    }, [partyId]);

    const fetchDonations = useCallback(async (campaignId: string) => {
        try {
            const res = await fetch(`/api/funding/${campaignId}/donate`);
            if (res.ok) {
                const data = await res.json();
                setDonations(prev => ({ ...prev, [campaignId]: data.donations || [] }));
            }
        } catch (err) {
            console.error('Error fetching donations:', err);
        }
    }, []);

    useEffect(() => {
        fetchCampaigns();
    }, [fetchCampaigns]);

    useEffect(() => {
        campaigns.forEach(campaign => {
            if (!donations[campaign.id]) {
                fetchDonations(campaign.id);
            }
        });
    }, [campaigns, donations, fetchDonations]);

    const handleCreateCampaign = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError('');

        try {
            const res = await fetch(`/api/parties/${partyId}/funding`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create campaign');
            }

            setShowCreateForm(false);
            setFormData({
                title: '',
                description: '',
                goal_amount: 10000,
                upi_id: '',
                ends_at: '',
            });
            fetchCampaigns();
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Failed to create campaign');
        } finally {
            setFormLoading(false);
        }
    };

    const handleVerifyDonation = async (campaignId: string, donationId: string, verify: boolean) => {
        try {
            const res = await fetch(`/api/funding/${campaignId}/donate`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ donation_id: donationId, is_verified: verify }),
            });

            if (res.ok) {
                fetchDonations(campaignId);
                fetchCampaigns();
            }
        } catch (err) {
            console.error('Error verifying donation:', err);
        }
    };

    const calculateProgress = (raised: number, goal: number) => {
        return Math.min((raised / goal) * 100, 100);
    };

    if (loading) {
        return (
            <div className="card animate-pulse">
                <div className="h-4 bg-bg-tertiary rounded w-1/3 mb-4"></div>
                <div className="h-20 bg-bg-tertiary rounded"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2"><Banknote className="w-5 h-5" /> Funding Campaigns</h3>
                    <p className="text-sm text-text-muted">
                        Support this cause with transparent crowdfunding
                    </p>
                </div>
                {isLeader && !showCreateForm && (
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="btn btn-primary btn-sm"
                    >
                        + New Campaign
                    </button>
                )}
            </div>

            {/* Create Campaign Form */}
            {showCreateForm && (
                <form onSubmit={handleCreateCampaign} className="card space-y-4">
                    <h4 className="font-medium text-text-primary">Create Funding Campaign</h4>

                    <div>
                        <label className="block text-sm text-text-secondary mb-1">Campaign Title *</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-primary text-text-primary"
                            placeholder="e.g., Legal Fund for RTI Appeals"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-text-secondary mb-1">Description *</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-primary text-text-primary resize-none"
                            placeholder="Explain what the funds will be used for..."
                            rows={3}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-text-secondary mb-1">Goal Amount (₹) *</label>
                            <input
                                type="number"
                                value={formData.goal_amount}
                                onChange={(e) => setFormData(prev => ({ ...prev, goal_amount: Number(e.target.value) }))}
                                className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-primary text-text-primary"
                                min="100"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-text-secondary mb-1">End Date *</label>
                            <input
                                type="date"
                                value={formData.ends_at}
                                onChange={(e) => setFormData(prev => ({ ...prev, ends_at: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-primary text-text-primary"
                                min={new Date().toISOString().split('T')[0]}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-text-secondary mb-1">Your UPI ID *</label>
                        <input
                            type="text"
                            value={formData.upi_id}
                            onChange={(e) => setFormData(prev => ({ ...prev, upi_id: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg bg-bg-tertiary border border-border-primary text-text-primary"
                            placeholder="yourname@upi"
                            required
                        />
                        <p className="text-xs text-text-muted mt-1">
                            Donations will be sent directly to this UPI ID
                        </p>
                    </div>

                    {formError && <p className="text-sm text-red-400">{formError}</p>}

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setShowCreateForm(false)}
                            className="btn btn-secondary flex-1"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={formLoading}
                            className="btn btn-primary flex-1"
                        >
                            {formLoading ? 'Creating...' : 'Create Campaign'}
                        </button>
                    </div>
                </form>
            )}

            {/* Campaign List */}
            {campaigns.length === 0 && !showCreateForm ? (
                <div className="card text-center py-8">
                    <div className="text-4xl mb-3">💸</div>
                    <p className="text-text-secondary">No active funding campaigns</p>
                    {isLeader && (
                        <p className="text-sm text-text-muted mt-2">
                            Create a campaign to raise funds for your cause
                        </p>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {campaigns.map((campaign) => (
                        <div key={campaign.id} className="card">
                            {/* Campaign Header */}
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h4 className="font-semibold text-text-primary">{campaign.title}</h4>
                                    <p className="text-sm text-text-muted mt-1">
                                        by {campaign.creator_name || 'Group Leader'}
                                    </p>
                                </div>
                                <span className={`badge ${campaign.status === 'active' ? 'bg-green-500/20 text-green-400' :
                                    campaign.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                                        'bg-gray-500/20 text-gray-400'
                                    }`}>
                                    {campaign.status}
                                </span>
                            </div>

                            {/* Description */}
                            <p className="text-sm text-text-secondary mb-4">
                                {campaign.description}
                            </p>

                            {/* Progress */}
                            <div className="mb-4">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-text-secondary">
                                        <span className="text-xl font-bold text-green-400">
                                            ₹{campaign.raised_amount.toLocaleString('en-IN')}
                                        </span>
                                        {' '}raised
                                    </span>
                                    <span className="text-text-muted">
                                        Goal: ₹{campaign.goal_amount.toLocaleString('en-IN')}
                                    </span>
                                </div>
                                <div className="h-3 bg-bg-tertiary rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500"
                                        style={{ width: `${calculateProgress(campaign.raised_amount, campaign.goal_amount)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-xs text-text-muted mt-1">
                                    <span>{campaign.donor_count} supporters</span>
                                    <span>
                                        Ends {new Date(campaign.ends_at).toLocaleDateString('en-IN', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                        })}
                                    </span>
                                </div>
                            </div>

                            {/* Donate Button */}
                            {campaign.status === 'active' && currentUserId && (
                                <button
                                    onClick={() => setSelectedCampaign(campaign)}
                                    className="w-full btn btn-primary mb-4"
                                >
                                    💝 Donate Now
                                </button>
                            )}

                            {!currentUserId && campaign.status === 'active' && (
                                <p className="text-sm text-text-muted text-center mb-4">
                                    <a href="/auth" className="text-primary hover:underline">Sign in</a> to donate
                                </p>
                            )}

                            {/* Donation Ledger */}
                            <DonationLedger
                                campaignId={campaign.id}
                                donations={donations[campaign.id] || []}
                            />

                            {/* Leader: Verify Donations */}
                            {isLeader && donations[campaign.id]?.some(d => !d.is_verified) && (
                                <div className="mt-4 pt-4 border-t border-border-primary">
                                    <h5 className="text-sm font-medium text-text-secondary mb-2">
                                        Pending Verification
                                    </h5>
                                    <div className="space-y-2">
                                        {donations[campaign.id]
                                            ?.filter(d => !d.is_verified)
                                            .map(donation => (
                                                <div
                                                    key={donation.id}
                                                    className="flex items-center justify-between p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30"
                                                >
                                                    <div>
                                                        <p className="text-sm text-text-primary">
                                                            {donation.donor_name} - ₹{donation.amount}
                                                        </p>
                                                        <p className="text-xs text-text-muted">
                                                            TXN: {donation.upi_transaction_id || 'N/A'}
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleVerifyDonation(campaign.id, donation.id, true)}
                                                            className="px-3 py-1 text-xs bg-green-500/20 text-green-400 rounded hover:bg-green-500/30"
                                                        >
                                                            <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Verify</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleVerifyDonation(campaign.id, donation.id, false)}
                                                            className="px-3 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                                                        >
                                                            <span className="flex items-center gap-1"><X className="w-3 h-3" /> Reject</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Donate Modal */}
            {selectedCampaign && (
                <DonateModal
                    campaign={selectedCampaign}
                    onClose={() => setSelectedCampaign(null)}
                    onDonationComplete={() => {
                        fetchCampaigns();
                        fetchDonations(selectedCampaign.id);
                    }}
                />
            )}
        </div>
    );
}

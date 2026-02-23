-- Migration: Add Advocacy Emails Table
-- Allows party leaders to send formal advocacy emails to government stakeholders
-- Rate limited by party level (Level N = N emails per week)

-- ============================================
-- ADVOCACY EMAILS
-- Formal emails from party leaders to stakeholders
-- ============================================
CREATE TABLE advocacy_emails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    sent_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    recipient_designation TEXT,
    subject TEXT NOT NULL CHECK (char_length(subject) <= 200),
    body TEXT NOT NULL CHECK (char_length(body) <= 5000),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'failed')),
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_advocacy_emails_party ON advocacy_emails(party_id);
CREATE INDEX idx_advocacy_emails_sent_by ON advocacy_emails(sent_by);
CREATE INDEX idx_advocacy_emails_party_sent ON advocacy_emails(party_id, sent_at) WHERE status = 'sent';

-- Enable RLS
ALTER TABLE advocacy_emails ENABLE ROW LEVEL SECURITY;

-- Policies
-- Everyone can view sent emails (transparency)
CREATE POLICY "Advocacy emails are viewable by everyone" 
    ON advocacy_emails FOR SELECT USING (true);

-- Only authenticated users can create (further validation in API)
CREATE POLICY "Authenticated users can create advocacy emails" 
    ON advocacy_emails FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Only sender can update their emails
CREATE POLICY "Only sender can update advocacy emails" 
    ON advocacy_emails FOR UPDATE USING (auth.uid() = sent_by);

-- ============================================
-- FUNCTION: Count emails sent by party this week
-- Used for rate limiting based on party level
-- ============================================
CREATE OR REPLACE FUNCTION get_party_weekly_email_count(p_party_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM advocacy_emails
        WHERE party_id = p_party_id 
            AND status = 'sent'
            AND sent_at >= NOW() - INTERVAL '7 days'
    );
END;
$$ LANGUAGE plpgsql;

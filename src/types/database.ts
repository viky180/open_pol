// Database types for Open Politics MVP
// Auto-generated from schema - keep in sync

export type Profile = {
  id: string;
  created_at: string;
  display_name: string | null;
  pincode: string | null;
  updated_at: string | null;
};

export type LocationScope = 'national' | 'state' | 'district' | 'block' | 'panchayat' | 'village';

export const LOCATION_SCOPE_LEVELS: { value: LocationScope; label: string; icon: string; rank: number }[] = [
  { value: 'national', label: 'Country', icon: '🇮🇳', rank: 1 },
  { value: 'state', label: 'State', icon: '🏛️', rank: 2 },
  { value: 'district', label: 'District/City', icon: '🏘️', rank: 3 },
  { value: 'block', label: 'Block/Corporation', icon: '🏙️', rank: 4 },
  { value: 'panchayat', label: 'Panchayat/Ward', icon: '🏡', rank: 5 },
  { value: 'village', label: 'Village/Locality', icon: '🌾', rank: 6 },
];

// Launch-phase creation scopes (simplified UX)
export const CREATION_LOCATION_SCOPES: LocationScope[] = ['national', 'state', 'district', 'village'];

export const CREATION_LOCATION_SCOPE_LEVELS = LOCATION_SCOPE_LEVELS.filter((level) =>
  CREATION_LOCATION_SCOPES.includes(level.value)
);

export function isCreationLocationScope(scope: string | null | undefined): scope is LocationScope {
  if (!scope) return false;
  return CREATION_LOCATION_SCOPES.includes(scope as LocationScope);
}

export function getLocationScopeRank(scope: LocationScope | string): number {
  return LOCATION_SCOPE_LEVELS.find(l => l.value === scope)?.rank ?? 99;
}

export function isValidHierarchyScopeTransition(
  parentScope: LocationScope | string | null | undefined,
  childScope: LocationScope | string | null | undefined
): boolean {
  if (!parentScope || !childScope) return false;

  // Adjacent hierarchy transition.
  const parentRank = getLocationScopeRank(parentScope);
  const childRank = getLocationScopeRank(childScope);
  if (childRank === parentRank + 1) return true;

  // Launch chain support: district -> village direct transition.
  return parentScope === 'district' && childScope === 'village';
}

export function getLocationScopeConfig(scope: LocationScope | string) {
  return LOCATION_SCOPE_LEVELS.find(l => l.value === scope) ?? { value: scope as LocationScope, label: scope, icon: '📍', rank: 99 };
}

export function getPartyLocationLabel(party: Partial<Party>): string {
  const scope = party.location_scope || 'district';
  if (party.location_label) return party.location_label;

  if (scope === 'national') return 'India';
  if (scope === 'state') return party.state_name || 'State';
  if (scope === 'district') return party.district_name || 'District/City';
  if (scope === 'block') return party.block_name || 'Block/Corporation';
  if (scope === 'panchayat') return party.panchayat_name || 'Panchayat/Ward';
  if (scope === 'village') return party.village_name || 'Village/Locality';

  return party.pincodes?.length ? party.pincodes.slice(0, 2).join(', ') : 'Location not set';
}

export type Issue = {
  id: string;
  issue_text: string;
  category_id?: string | null;
  created_by: string | null;
  created_at: string;
};

export type IssueWithGroupCount = Issue & {
  national_group_count: number;
};

export type Party = {
  id: string;
  created_at: string;
  issue_text: string;
  is_founding_group?: boolean | null;
  title_image_url?: string | null;
  icon_image_url?: string | null;
  icon_svg?: string | null;
  pincodes: string[];
  lat?: number | null;
  lng?: number | null;
  category_id?: string | null;
  parent_party_id?: string | null;
  issue_id?: string | null;
  node_type?: PartyNodeType;
  location_scope?: LocationScope;
  location_label?: string | null;
  state_name?: string | null;
  district_name?: string | null;
  block_name?: string | null;
  panchayat_name?: string | null;
  village_name?: string | null;
  created_by: string | null;
  updated_at: string | null;
};

export type PartyNodeType = 'community' | 'sub_community' | 'group';

export type Category = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
};

export type PartyWithStats = Party & {
  member_count: number;
  level: 1 | 2 | 3 | 4;
  leader_id: string | null;
  leader_name: string | null;
  unanswered_questions: number;
};

export type Membership = {
  id: string;
  party_id: string;
  user_id: string;
  joined_at: string;
  left_at: string | null;
  leave_feedback: string | null;
};

export type MemberWithVotes = {
  user_id: string;
  display_name: string | null;
  joined_at: string;
  trust_votes: number;
  is_leader: boolean;
};

export type TrustVote = {
  id: string;
  party_id: string;
  from_user_id: string;
  to_user_id: string;
  created_at: string;
  expires_at: string;
};

export type PartyLike = {
  id: string;
  party_id: string;
  user_id: string;
  created_at: string;
};

export type Question = {
  id: string;
  party_id: string;
  asked_by: string | null;
  question_text: string;
  created_at: string;
  asker_name?: string | null;
};

export type QuestionWithAnswers = Question & {
  answers: Answer[];
  response_time_hours: number | null;
};

export type Answer = {
  id: string;
  question_id: string;
  answered_by: string | null;
  answer_text: string;
  created_at: string;
  answerer_name?: string | null;
};

export type Alliance = {
  id: string;
  name: string;
  created_at: string;
  disbanded_at: string | null;
  created_by: string | null;
  description: string | null;
};

export type AllianceMember = {
  id: string;
  alliance_id: string;
  party_id: string;
  joined_at: string;
  left_at: string | null;
};

export type AllianceMemberWithParty = AllianceMember & {
  party: Party;
};

export type AllianceWithMembers = Alliance & {
  members: AllianceMemberWithParty[];
};

export type SupportType = 'explicit' | 'implicit';
export type TargetType = 'issue' | 'question';

export type PartySupport = {
  id: string;
  from_party_id: string;
  to_party_id: string;
  support_type: SupportType;
  target_type: TargetType;
  target_id: string | null;
  created_at: string;
  expires_at: string | null;
};



export type Revocation = {
  id: string;
  party_id: string;
  revoking_party_id: string;
  target_type: TargetType;
  target_id: string;
  reason: string | null;
  created_at: string;
};


// Advocacy Email types
export type AdvocacyEmailStatus = 'draft' | 'sent' | 'failed';

export type AdvocacyEmail = {
  id: string;
  party_id: string;
  sent_by: string;
  recipient_email: string;
  recipient_name: string | null;
  recipient_designation: string | null;
  subject: string;
  body: string;
  status: AdvocacyEmailStatus;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
};

export type AdvocacyEmailWithSender = AdvocacyEmail & {
  sender_name: string | null;
};

// Party Milestone event types
export type PartyMilestoneType = 'members_threshold';

export type PartyMilestone = {
  id: string;
  party_id: string;
  milestone_type: PartyMilestoneType;
  threshold: number;
  member_count_at_event: number;
  created_at: string;
};

// Trust Milestone - tracks when leaders cross trust vote thresholds
export type TrustMilestone = {
  id: string;
  party_id: string;
  user_id: string;
  threshold: number;
  trust_count_at_event: number;
  created_at: string;
};

// Invitation for referral tracking
export type Invitation = {
  id: string;
  party_id: string;
  inviter_id: string;
  invite_code: string;
  accepted_by: string | null;
  accepted_at: string | null;
  created_at: string;
  expires_at: string;
};

export type InvitationWithDetails = Invitation & {
  inviter_name: string | null;
  accepter_name: string | null;
  party_issue_text: string | null;
};


export type PetitionCampaignStatus = 'draft' | 'active' | 'threshold_met' | 'sent' | 'closed';

export type PetitionCampaign = {
  id: string;
  party_id: string;
  created_by: string | null;
  title: string;
  description: string;
  authority_name: string | null;
  authority_email: string | null;
  target_signatures: number;
  starts_at: string;
  ends_at: string;
  auto_send_enabled: boolean;
  status: PetitionCampaignStatus;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PetitionSignature = {
  id: string;
  campaign_id: string;
  user_id: string;
  signed_at: string;
  verification_method: string;
  is_verified: boolean;
};

export type CampaignEventType = 'rally' | 'rti_drive' | 'public_hearing' | 'other';

export type CampaignEvent = {
  id: string;
  party_id: string;
  created_by: string | null;
  event_type: CampaignEventType;
  title: string;
  description: string | null;
  venue_name: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  reminder_pincodes: string[];
  starts_at: string;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EventRsvpStatus = 'yes' | 'maybe' | 'no';

export type EventRsvp = {
  id: string;
  event_id: string;
  user_id: string;
  status: EventRsvpStatus;
  user_pincode_snapshot: string | null;
  updated_at: string;
};

// Party posts (member/leader announcements)
export type PartyPost = {
  id: string;
  party_id: string;
  created_by: string | null;
  content: string;
  created_at: string;
  author_name?: string | null;
};

// Party snapshots — periodic metric recordings for trend analysis
// Leader nomination — sub-group leaders must self-nominate for parent leadership
export type LeaderNomination = {
  id: string;
  user_id: string;
  from_party_id: string;
  to_party_id: string;
  created_at: string;
  withdrawn_at: string | null;
};

export type PartySnapshot = {
  id: string;
  party_id: string;
  member_count: number;
  supporter_count: number;
  like_count: number;
  recorded_at: string;
};

// Party level calculation (deterministic)
export function calculatePartyLevel(memberCount: number): 1 | 2 | 3 | 4 {
  if (memberCount <= 10) return 1;
  if (memberCount <= 100) return 2;
  if (memberCount <= 1000) return 3;
  return 4;
}

// Q&A metrics
export type QAMetrics = {
  total_questions: number;
  unanswered_questions: number;
  avg_response_time_hours: number | null;
};

// Funding Campaign types
export type FundingCampaignStatus = 'draft' | 'active' | 'completed' | 'closed';

export type FundingCampaign = {
  id: string;
  party_id: string;
  created_by: string | null;
  title: string;
  description: string;
  goal_amount: number;
  upi_id: string;
  starts_at: string;
  ends_at: string;
  status: FundingCampaignStatus;
  created_at: string;
  updated_at: string;
};

export type FundingCampaignWithStats = FundingCampaign & {
  raised_amount: number;
  donor_count: number;
  creator_name: string | null;
};

export type FundingDonation = {
  id: string;
  campaign_id: string;
  donor_id: string | null;
  amount: number;
  donor_name: string;
  donor_message: string | null;
  upi_transaction_id: string | null;
  is_anonymous: boolean;
  is_verified: boolean;
  verified_at: string | null;
  verified_by: string | null;
  created_at: string;
};

export type FundingDonationWithDonor = FundingDonation & {
  display_donor_name: string; // Respects is_anonymous flag
};

// Database schema type for Supabase client
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      categories: {
        Row: Category;
        Insert: Omit<Category, 'id' | 'created_at'>;
        Update: Partial<Omit<Category, 'id' | 'created_at'>>;
      };
      issues: {
        Row: Issue;
        Insert: Omit<Issue, 'id' | 'created_at'>;
        Update: Partial<Pick<Issue, 'issue_text' | 'category_id'>>;
      };
      parties: {
        Row: Party;
        Insert: Omit<Party, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Party, 'id' | 'created_at'>>;
      };
      memberships: {
        Row: Membership;
        Insert: Omit<Membership, 'id' | 'joined_at'>;
        Update: Partial<Omit<Membership, 'id' | 'party_id' | 'user_id' | 'joined_at'>>;
      };
      trust_votes: {
        Row: TrustVote;
        Insert: Omit<TrustVote, 'id' | 'created_at' | 'expires_at'>;
        Update: never;
      };
      party_likes: {
        Row: PartyLike;
        Insert: Omit<PartyLike, 'id' | 'created_at'>;
        Update: never;
      };
      questions: {
        Row: Question;
        Insert: Omit<Question, 'id' | 'created_at'>;
        Update: never;
      };
      answers: {
        Row: Answer;
        Insert: Omit<Answer, 'id' | 'created_at'>;
        Update: never;
      };
      alliances: {
        Row: Alliance;
        Insert: Omit<Alliance, 'id' | 'created_at' | 'disbanded_at'>;
        Update: Partial<Pick<Alliance, 'disbanded_at' | 'name' | 'description'>>;
      };
      alliance_members: {
        Row: AllianceMember;
        Insert: Omit<AllianceMember, 'id' | 'joined_at' | 'left_at'>;
        Update: Pick<AllianceMember, 'left_at'>;
      };
      party_supports: {
        Row: PartySupport;
        Insert: Omit<PartySupport, 'id' | 'created_at' | 'expires_at'>;
        Update: never;
      };

      revocations: {
        Row: Revocation;
        Insert: Omit<Revocation, 'id' | 'created_at'>;
        Update: never;
      };

      advocacy_emails: {
        Row: AdvocacyEmail;
        Insert: Omit<AdvocacyEmail, 'id' | 'created_at' | 'sent_at' | 'status' | 'error_message'>;
        Update: Partial<Pick<AdvocacyEmail, 'status' | 'sent_at' | 'error_message'>>;
      };

      party_milestones: {
        Row: PartyMilestone;
        Insert: Omit<PartyMilestone, 'id' | 'created_at'>;
        Update: never;
      };

      party_posts: {
        Row: PartyPost;
        Insert: Omit<PartyPost, 'id' | 'created_at' | 'author_name'>;
        Update: never;
      };
      petition_campaigns: {
        Row: PetitionCampaign;
        Insert: Omit<PetitionCampaign, 'id' | 'created_at' | 'updated_at' | 'status' | 'sent_at'>;
        Update: Partial<Omit<PetitionCampaign, 'id' | 'party_id' | 'created_by' | 'created_at'>>;
      };
      petition_signatures: {
        Row: PetitionSignature;
        Insert: Omit<PetitionSignature, 'id' | 'signed_at'>;
        Update: Partial<Pick<PetitionSignature, 'verification_method' | 'is_verified'>>;
      };
      campaign_events: {
        Row: CampaignEvent;
        Insert: Omit<CampaignEvent, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<CampaignEvent, 'id' | 'party_id' | 'created_by' | 'created_at'>>;
      };
      event_rsvps: {
        Row: EventRsvp;
        Insert: Omit<EventRsvp, 'id' | 'updated_at'>;
        Update: Pick<EventRsvp, 'status' | 'updated_at' | 'user_pincode_snapshot'>;
      };
      trust_milestones: {
        Row: TrustMilestone;
        Insert: Omit<TrustMilestone, 'id' | 'created_at'>;
        Update: never;
      };
      invitations: {
        Row: Invitation;
        Insert: Omit<Invitation, 'id' | 'created_at' | 'accepted_by' | 'accepted_at'>;
        Update: Partial<Pick<Invitation, 'accepted_by' | 'accepted_at'>>;
      };
      funding_campaigns: {
        Row: FundingCampaign;
        Insert: Omit<FundingCampaign, 'id' | 'created_at' | 'updated_at' | 'status'>;
        Update: Partial<Omit<FundingCampaign, 'id' | 'party_id' | 'created_by' | 'created_at'>>;
      };
      funding_donations: {
        Row: FundingDonation;
        Insert: Omit<FundingDonation, 'id' | 'created_at' | 'verified_at' | 'verified_by' | 'is_verified'>;
        Update: Partial<Pick<FundingDonation, 'is_verified' | 'verified_at' | 'verified_by'>>;
      };
      leader_nominations: {
        Row: LeaderNomination;
        Insert: Omit<LeaderNomination, 'id' | 'created_at' | 'withdrawn_at'>;
        Update: Partial<Pick<LeaderNomination, 'withdrawn_at'>>;
      };
      party_snapshots: {
        Row: PartySnapshot;
        Insert: Omit<PartySnapshot, 'id' | 'recorded_at'>;
        Update: never;
      };
    };
    Functions: {
      get_party_member_count: {
        Args: { p_party_id: string };
        Returns: number;
      };
      get_party_level: {
        Args: { p_party_id: string };
        Returns: number;
      };
      get_party_leader: {
        Args: { p_party_id: string };
        Returns: string | null;
      };

      get_user_trust_votes: {
        Args: { p_party_id: string; p_user_id: string };
        Returns: number;
      };
      get_party_total_members: {
        Args: { p_party_id: string };
        Returns: number;
      };

      check_party_cycle: {
        Args: { child_id: string; parent_id: string };
        Returns: boolean;
      };
      get_party_weekly_email_count: {
        Args: { p_party_id: string };
        Returns: number;
      };
      record_all_party_snapshots: {
        Args: Record<string, never>;
        Returns: number;
      };
    };
  };
};

export type Choice = {
  id: string;
  poll_id: string;
  label: string;
  position: number;
  choice_key?: string | null;
};

export type ThemeSlug = "politique" | "economie" | "societe" | "sport";

export type PollResourceType = "link" | "pdf" | "article" | "report" | "other";

export type PollResource = {
  id: string;
  poll_id: string;
  title: string;
  url: string;
  resource_type: PollResourceType;
  description: string | null;
  position: number;
  created_at?: string;
};

export type PollResourceInput = {
  title: string;
  url: string;
  resource_type: PollResourceType;
  description?: string | null;
};

export type Sex = "homme" | "femme";

export type Poll = {
  id: string;
  series_id?: string | null;
  wave_number?: number | null;
  question: string;
  description?: string | null;
  status: "open" | "closed";
  theme?: ThemeSlug;
  featured?: boolean;
  show_in_results?: boolean;
  archived?: boolean;
  trend_label?: string | null;
  created_at?: string;
  launched_at?: string | null;
  closes_at: string | null;
  choices: Choice[];
  resources?: PollResource[];
};

export type PollResult = {
  choice_id: string;
  label: string;
  votes: number;
};

export type PollHistoryPoint = {
  choice_id: string;
  label: string;
  captured_at: string;
  votes: number;
  percentage: number;
};

export type PollComment = {
  id: string;
  poll_id: string;
  parent_comment_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  author_label: string;
  likes: number;
  liked_by_me: boolean;
  image_path: string | null;
  image_mime_type: string | null;
  image_size: number | null;
  image_url: string | null;
};

export type PollCommentImage = {
  path: string;
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  size: number;
};

export type PollWithStats = Poll & {
  totalVotes: number;
  results?: PollResult[];
};

export type AdminCreatePollInput = {
  series_id?: string | null;
  question: string;
  description: string;
  theme: ThemeSlug;
  choices: string[];
  choice_keys?: string[];
  closes_at: string;
  status: "open" | "closed";
  featured: boolean;
  show_in_results?: boolean;
  trend_label?: string | null;
  resources?: PollResourceInput[];
};

export type AdminPollSummary = {
  id: string;
  series_id: string | null;
  wave_number: number | null;
  question: string;
  description: string | null;
  theme: ThemeSlug;
  status: "open" | "closed";
  closes_at: string | null;
  created_at: string;
  launched_at: string | null;
  featured: boolean;
  show_in_results: boolean;
  archived: boolean;
  trend_label: string | null;
  choice_count: number;
  total_votes: number;
  resources?: PollResource[];
};

export type AdminPollDetail = {
  poll: Poll & {
    choice_count?: number;
    total_votes?: number;
  };
  series: {
    id: string;
    canonical_question: string;
    canonical_description: string | null;
    theme: ThemeSlug;
    archived: boolean;
    created_at: string;
    updated_at: string;
  } | null;
  choices: Choice[];
  resources?: PollResource[];
  total_votes: number;
};

export type AdminSeriesSummary = {
  series_id: string;
  question: string;
  theme: ThemeSlug;
  waveCount: number;
  lastWave: AdminPollSummary;
  polls: AdminPollSummary[];
};

export type AdminRelaunchPollInput = {
  poll_id: string;
  closes_at: string;
  status?: "open" | "closed";
  featured?: boolean;
};

export type AdminUpdatePollInput = {
  poll_id: string;
  question: string;
  description: string;
  theme: ThemeSlug;
  choices?: string[];
  choice_keys?: string[];
  closes_at: string;
  status: "open" | "closed";
  featured: boolean;
  show_in_results: boolean;
  resources?: PollResourceInput[];
};

export type AdminSeriesHistoryPoint = {
  poll_id: string;
  wave_number: number | null;
  status: "open" | "closed";
  created_at: string;
  closes_at: string | null;
  show_in_results: boolean;
  archived: boolean;
  total_votes: number;
  results: Array<{
    choice_id: string;
    choice_key: string | null;
    label: string;
    votes: number;
  }>;
};

export type Profile = {
  id: string;
  email: string | null;
  username: string | null;
  username_normalized: string | null;
  sex: Sex;
  phone_last4: string | null;
  age: number | null;
  profession: string | null;
  region: string | null;
  reputation_score: number;
  created_at: string;
  updated_at: string;
};

export type ProfileUpdateField = "username" | "sex" | "age" | "profession" | "region";

export type AccountThemeParticipation = {
  theme: ThemeSlug;
  label: string;
  count: number;
  percentage: number;
};

export type AccountStats = {
  participations_30_days: number;
  participation_by_theme: AccountThemeParticipation[];
};

export type UserReputationStatus = "Observateur" | "Participant" | "Contributeur" | "Référent";

export function getUserReputationStatus(score: number): UserReputationStatus {
  if (score >= 100) return "Référent";
  if (score >= 25) return "Contributeur";
  if (score >= 5) return "Participant";
  return "Observateur";
}

export type UserPollAnswer = {
  id: string;
  user_id: string;
  poll_id: string;
  choice_id: string | null;
  created_at: string;
  polls?: {
    question: string;
    theme: ThemeSlug | null;
  } | null;
  choices?: {
    label: string;
  } | null;
};

export type SignupPayload = {
  email: string;
  password: string;
  username: string;
  sex: Sex;
  phoneLast4: string;
  age: number;
  profession: string;
  region: string;
};

export type StartVerificationResponse =
  | { status: "verification_started" }
  | { status: "invalid_phone_type" | "poll_closed" | "captcha_required" | "error"; message?: string };

export type VoteStatus =
  | { status: "accepted"; receipt_hash: string }
  | { status: "duplicate"; message: string }
  | { status: "invalid_phone_type" | "invalid_code" | "poll_closed" | "error"; message?: string };

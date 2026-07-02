export type Choice = {
  id: string;
  poll_id: string;
  label: string;
  position: number;
};

export type ThemeSlug = "politique" | "economie" | "societe" | "sport";

export type Sex = "homme" | "femme";

export type Poll = {
  id: string;
  question: string;
  description?: string | null;
  status: "open" | "closed";
  theme?: ThemeSlug;
  featured?: boolean;
  trend_label?: string | null;
  created_at?: string;
  closes_at: string | null;
  choices: Choice[];
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

export type Profile = {
  id: string;
  email: string | null;
  sex: Sex;
  phone_last4: string | null;
  age: number | null;
  profession: string | null;
  region: string | null;
  reputation_score: number;
  created_at: string;
  updated_at: string;
};

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

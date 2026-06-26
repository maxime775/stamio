export type Choice = {
  id: string;
  poll_id: string;
  label: string;
  position: number;
};

export type Poll = {
  id: string;
  question: string;
  status: "open" | "closed";
  closes_at: string | null;
  choices: Choice[];
};

export type PollResult = {
  choice_id: string;
  label: string;
  votes: number;
};

export type StartVerificationResponse =
  | { status: "ok" }
  | { status: "invalid_phone" | "poll_closed" | "turnstile_failed" | "error"; message?: string };

export type VoteStatus =
  | { status: "accepted"; receipt_hash: string }
  | { status: "duplicate"; message: string }
  | { status: "invalid_code" | "poll_closed" | "error"; message?: string };

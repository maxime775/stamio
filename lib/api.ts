import { supabase } from "@/lib/supabase";
import { FALLBACK_POLLS } from "@/lib/product";
import type {
  Poll,
  PollResult,
  PollWithStats,
  Profile,
  SignupPayload,
  StartVerificationResponse,
  ThemeSlug,
  UserPollAnswer,
  VoteStatus
} from "@/lib/types";

type StartPayload = {
  poll_id: string;
  choice_id: string;
  phone_e164: string;
  platform: "web" | "native";
  turnstile_token?: string;
};

type SubmitPayload = {
  poll_id: string;
  choice_id: string;
  phone_e164: string;
  otp_code: string;
};

export async function fetchPoll(pollId: string): Promise<Poll | null> {
  const enriched = await supabase
    .from("polls")
    .select("id, question, status, theme, featured, trend_label, created_at, closes_at, choices(id, poll_id, label, position)")
    .eq("id", pollId)
    .maybeSingle();

  if (!enriched.error && enriched.data) return normalizePoll(enriched.data);

  const { data, error } = await supabase
    .from("polls")
    .select("id, question, status, closes_at, choices(id, poll_id, label, position)")
    .eq("id", pollId)
    .maybeSingle();

  if (error || !data) return null;
  return normalizePoll(data);
}

export async function startVerification(payload: StartPayload): Promise<StartVerificationResponse> {
  const { data, error } = await supabase.functions.invoke<StartVerificationResponse>("start-verification", {
    body: payload
  });
  if (data) return data;
  const errorPayload = await readFunctionError<StartVerificationResponse>(error);
  return errorPayload ?? { status: "error", message: error?.message };
}

export async function submitVote(payload: SubmitPayload): Promise<VoteStatus> {
  const { data, error } = await supabase.functions.invoke<VoteStatus>("submit-vote", {
    body: payload
  });
  if (data) return data;
  const errorPayload = await readFunctionError<VoteStatus>(error);
  return errorPayload ?? { status: "error", message: error?.message };
}

export async function getResults(pollId: string): Promise<PollResult[]> {
  const { data, error } = await supabase.functions.invoke<{ results: PollResult[] }>("get-results", {
    body: { poll_id: pollId }
  });
  if (error || !data) return [];
  return data.results;
}

export async function getFeaturedPolls(): Promise<PollWithStats[]> {
  const polls = await fetchPollCollection({ featuredOnly: true, limit: 10 });
  return polls.length > 0 ? polls : FALLBACK_POLLS;
}

export async function getPollsByTheme(theme: ThemeSlug): Promise<PollWithStats[]> {
  const polls = await fetchPollCollection({ theme, limit: 20 });
  return polls.length > 0 ? polls : FALLBACK_POLLS.filter((poll) => poll.theme === theme);
}

export async function getLatestResults(): Promise<PollWithStats[]> {
  const polls = await fetchPollCollection({ limit: 10, includeResults: true });
  return polls.length > 0 ? polls : FALLBACK_POLLS;
}

export async function getCurrentUserProfile(): Promise<Profile | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, sex, phone_last4, age, profession, region, reputation_score, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) return null;
  return data as Profile;
}

export async function getLatestUserAnswers(): Promise<UserPollAnswer[]> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return [];

  const { data, error } = await supabase
    .from("user_poll_answers")
    .select("id, user_id, poll_id, choice_id, created_at, polls(question, theme), choices(label)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(8);

  if (error || !data) return [];
  return data.map((answer) => ({
    ...answer,
    polls: Array.isArray(answer.polls) ? answer.polls[0] ?? null : answer.polls,
    choices: Array.isArray(answer.choices) ? answer.choices[0] ?? null : answer.choices
  })) as unknown as UserPollAnswer[];
}

export async function signUpUser(payload: SignupPayload) {
  return supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: {
        sex: payload.sex,
        phone_last4: payload.phoneLast4,
        age: payload.age,
        profession: payload.profession,
        region: payload.region
      }
    }
  });
}

export async function signInUser(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOutUser() {
  return supabase.auth.signOut();
}

async function fetchPollCollection(options: {
  theme?: ThemeSlug;
  featuredOnly?: boolean;
  limit: number;
  includeResults?: boolean;
}) {
  let query = supabase
    .from("polls")
    .select("id, question, status, theme, featured, trend_label, created_at, closes_at, choices(id, poll_id, label, position)")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(options.limit);

  if (options.theme) query = query.eq("theme", options.theme);
  if (options.featuredOnly) query = query.eq("featured", true);

  const { data, error } = await query;
  if (error || !data) return [];

  const polls = data.map(normalizePoll) as PollWithStats[];
  return Promise.all(
    polls.map(async (poll) => {
      const results = await getResults(poll.id);
      const totalVotes = results.reduce((sum, result) => sum + result.votes, 0);
      return {
        ...poll,
        totalVotes,
        results: options.includeResults ? results : undefined
      };
    })
  );
}

function normalizePoll(data: Record<string, unknown>): Poll {
  const choices = Array.isArray(data.choices) ? data.choices : [];
  return {
    ...(data as Poll),
    choices: [...choices].sort((a, b) => Number(a.position) - Number(b.position))
  };
}

async function readFunctionError<T>(error: unknown): Promise<T | null> {
  if (!error || typeof error !== "object" || !("context" in error)) return null;
  const context = (error as { context?: unknown }).context;
  if (!(context instanceof Response)) return null;
  return context.clone().json().catch(() => null) as Promise<T | null>;
}

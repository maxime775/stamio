import { supabase } from "@/lib/supabase";
import { FALLBACK_POLLS, getPollDescription } from "@/lib/product";
import type {
  Poll,
  PollComment,
  PollCommentImage,
  PollHistoryPoint,
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
    .select("id, question, description, status, theme, featured, trend_label, created_at, closes_at, choices(id, poll_id, label, position)")
    .eq("id", pollId)
    .maybeSingle();

  if (!enriched.error && enriched.data) return normalizePoll(enriched.data);

  const { data, error } = await supabase
    .from("polls")
    .select("id, question, status, theme, featured, trend_label, created_at, closes_at, choices(id, poll_id, label, position)")
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

export async function getResultsHistory(pollId: string): Promise<PollHistoryPoint[]> {
  const { data, error } = await supabase.functions.invoke<{ history: PollHistoryPoint[] }>("get-results-history", {
    body: { poll_id: pollId }
  });
  if (error || !data) return [];
  return data.history.map((point) => ({ ...point, votes: Number(point.votes), percentage: Number(point.percentage) }));
}

export async function getPollComments(pollId: string): Promise<PollComment[]> {
  const { data, error } = await supabase.rpc("get_poll_comments_v2", { p_poll_id: pollId });
  if (error || !data) return [];
  return data.map((comment: Record<string, unknown>) => {
    const imagePath = typeof comment.image_path === "string" ? comment.image_path : null;
    const imageUrl = imagePath ? supabase.storage.from(COMMENT_IMAGE_BUCKET).getPublicUrl(imagePath).data.publicUrl : null;
    return { ...comment, likes: Number(comment.likes), image_size: comment.image_size ? Number(comment.image_size) : null, image_url: imageUrl };
  }) as PollComment[];
}

export async function createPollComment(pollId: string, body: string, parentCommentId: string | null = null, image?: PollCommentImage) {
  if (image) {
    return supabase.rpc("create_poll_comment_with_image", {
      p_poll_id: pollId,
      p_parent_comment_id: parentCommentId,
      p_body: body,
      p_image_path: image.path,
      p_image_mime_type: image.mimeType,
      p_image_size: image.size
    });
  }
  return supabase.rpc("create_poll_comment", {
    p_poll_id: pollId,
    p_parent_comment_id: parentCommentId,
    p_body: body
  });
}

export async function togglePollCommentLike(commentId: string) {
  return supabase.rpc("toggle_poll_comment_like", { p_comment_id: commentId });
}

const COMMENT_IMAGE_BUCKET = "poll-comment-images";

export async function uploadPollCommentImage(pollId: string, base64: string, mimeType: PollCommentImage["mimeType"], size: number): Promise<PollCommentImage> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("authentication_required");
  const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const path = `poll-comments/${pollId}/${data.user.id}/${createUuid()}.${extension}`;
  const bytes = decodeBase64(base64);
  if (bytes.byteLength !== size || size > 5 * 1024 * 1024) throw new Error("invalid_image_size");
  const payload = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const { error } = await supabase.storage.from(COMMENT_IMAGE_BUCKET).upload(path, payload, { contentType: mimeType, upsert: false });
  if (error) throw error;
  return { path, mimeType, size };
}

export async function removePollCommentImage(path: string) {
  return supabase.storage.from(COMMENT_IMAGE_BUCKET).remove([path]);
}

function decodeBase64(value: string) {
  const binary = globalThis.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function createUuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
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
    description: typeof data.description === "string" && data.description.trim() ? data.description : getPollDescription(String(data.id)),
    choices: [...choices].sort((a, b) => Number(a.position) - Number(b.position))
  };
}

async function readFunctionError<T>(error: unknown): Promise<T | null> {
  if (!error || typeof error !== "object" || !("context" in error)) return null;
  const context = (error as { context?: unknown }).context;
  if (!(context instanceof Response)) return null;
  return context.clone().json().catch(() => null) as Promise<T | null>;
}

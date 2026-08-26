import { supabase } from "@/lib/supabase";
import { getPollDescription } from "@/lib/product";
import { validatePollDescription } from "@/lib/pollDescription";
import type {
  Poll,
  PollComment,
  PollCommentImage,
  PollHistoryPoint,
  PollResult,
  PollWithStats,
  Profile,
  ProfileUpdateField,
  AccountStats,
  AdminCreatePollInput,
  AdminPollDetail,
  AdminPollSummary,
  AdminRelaunchPollInput,
  AdminSeriesHistoryPoint,
  AdminUpdatePollInput,
  SignupPayload,
  SignupEmailStatus,
  ThemeSlug,
  OpenPollStats,
  UserPollParticipation,
  VoteStatus
} from "@/lib/types";
import { clearPendingSignup } from "@/lib/auth/pendingSignup";

type SubmitPayload = {
  poll_id: string;
  choice_id: string;
};


const PUBLIC_CACHE_TTL_MS = 45_000;
const isDevRuntime = typeof __DEV__ !== "undefined" ? __DEV__ : process.env.NODE_ENV !== "production";

type CacheOptions = {
  force?: boolean;
  ttlMs?: number;
  label?: string;
};

type CacheEntry<T> = {
  value?: T;
  expiresAt: number;
  promise?: Promise<T>;
};

const publicCache = new Map<string, CacheEntry<unknown>>();

const cacheKeys = {
  poll: (pollId: string) => `poll:${pollId}`,
  questionRoute: (slug: string) => `question-route:${slug}`,
  resultRoute: (slug: string, waveNumber: number) => `result-route:${slug}:${waveNumber}`,
  legacyRoute: (pollId: string) => `legacy-route:${pollId}`,
  results: (pollId: string) => `results:${pollId}`,
  history: (pollId: string) => `history:${pollId}`,
  comments: (pollId: string) => `comments:${pollId}`,
  openPollStats: () => "open-poll-stats",
  collection: (options: { theme?: ThemeSlug; featuredOnly?: boolean; limit: number; includeResults?: boolean; status?: "open" | "closed"; showInResultsOnly?: boolean }) =>
    `collection:${options.status ?? "open"}:${options.theme ?? "all"}:${options.featuredOnly ? "featured" : "any"}:${options.showInResultsOnly ? "visible-results" : "any"}:${options.limit}:${options.includeResults ? "results" : "stats"}`
};

const BASE_POLL_SELECT = "id, series_id, wave_number, question, description, status, theme, featured, show_in_results, archived, trend_label, created_at, launched_at, closes_at, poll_series(slug), choices(id, poll_id, label, position, choice_key)";
const POLL_SELECT = `${BASE_POLL_SELECT}, poll_resources(id, poll_id, title, url, resource_type, description, position, created_at)`;

export type PublicPollResolution = {
  poll_id: string;
  series_id: string;
  series_slug: string;
  wave_number: number;
  route_kind?: "question" | "resultats";
};

export async function resolvePublicQuestion(slug: string): Promise<PublicPollResolution | null> {
  return cached(cacheKeys.questionRoute(slug), async () => {
    const { data, error } = await supabase.rpc("resolve_public_question", { p_slug: slug });
    return error ? null : readPublicPollResolution(data);
  }, { label: "resolvePublicQuestion" });
}

export async function resolvePublicHistoricalResult(slug: string, waveNumber: number): Promise<PublicPollResolution | null> {
  return cached(cacheKeys.resultRoute(slug, waveNumber), async () => {
    const { data, error } = await supabase.rpc("resolve_public_poll_result", {
      p_slug: slug,
      p_wave_number: waveNumber
    });
    return error ? null : readPublicPollResolution(data);
  }, { label: "resolvePublicHistoricalResult" });
}

export async function resolveLegacyPollUrl(pollId: string): Promise<PublicPollResolution | null> {
  return cached(cacheKeys.legacyRoute(pollId), async () => {
    const { data, error } = await supabase.rpc("resolve_legacy_poll_url", { p_poll_id: pollId });
    return error ? null : readPublicPollResolution(data);
  }, { label: "resolveLegacyPollUrl" });
}

export async function fetchPoll(pollId: string, options: CacheOptions = {}): Promise<Poll | null> {
  return cached(cacheKeys.poll(pollId), async () => {
    const enriched = await supabase
      .from("polls")
      .select(POLL_SELECT)
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
  }, { ...options, label: options.label ?? "fetchPoll" });
}

export async function submitVote(payload: SubmitPayload): Promise<VoteStatus> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const authorization = await authorizeVote(payload.poll_id);
    if (authorization.status !== "authorized") return authorization;

    const ballot = await submitBallot({
      poll_id: payload.poll_id,
      choice_id: payload.choice_id,
      permit: authorization.permit
    });
    if (ballot.status === "permit_invalid" && attempt === 0) continue;
    if (ballot.status === "permit_invalid") {
      return { status: "error", message: "L’autorisation de vote n’est plus valide." };
    }
    if (ballot.status !== "accepted") {
      const recovery = await finalizeVote(payload.poll_id, authorization.permit).catch(() => null);
      if (recovery?.status === "finalized") return { status: "accepted" };
      return ballot;
    }

    await finalizeVote(payload.poll_id, authorization.permit).catch(() => undefined);
    return { status: "accepted" };
  }
  return { status: "error", message: "L’autorisation de vote n’est plus valide." };
}

type VoteAuthorization =
  | { status: "authorized"; permit: string; expires_at: string }
  | Exclude<VoteStatus, { status: "accepted" }>;

type BallotSubmission =
  | { status: "accepted"; replay?: boolean }
  | { status: "permit_invalid" }
  | Exclude<VoteStatus, { status: "accepted" | "duplicate" | "authentication_required" | "passkey_required" | "rate_limited" }>;

async function authorizeVote(pollId: string): Promise<VoteAuthorization> {
  const headers = await getFunctionAuthHeaders();
  const { data, error } = await supabase.functions.invoke<VoteAuthorization>("authorize-vote", {
    body: { poll_id: pollId },
    headers
  });
  if (data) return data;
  const errorPayload = await readFunctionError<VoteAuthorization>(error);
  return errorPayload ?? { status: "error", message: error?.message };
}

async function submitBallot(payload: SubmitPayload & { permit: string }): Promise<BallotSubmission> {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return { status: "error", message: "Configuration du vote indisponible." };

  try {
    const response = await fetch(`${url}/functions/v1/submit-ballot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => null) as BallotSubmission | null;
    return data ?? { status: "error", message: "Réponse de vote invalide." };
  } catch {
    return { status: "error", message: "Le service de vote est inaccessible." };
  }
}

async function finalizeVote(pollId: string, permit: string) {
  const headers = await getFunctionAuthHeaders();
  const { data, error } = await supabase.functions.invoke<{ status: "finalized" | "pending" | "error" }>("finalize-vote", {
    body: { poll_id: pollId, permit },
    headers
  });
  if (error || !data) throw error ?? new Error("vote_finalization_failed");
  return data;
}

export async function verifyPasskeyEnrollment() {
  const headers = await getFunctionAuthHeaders();
  const { data, error } = await supabase.functions.invoke<{ enrolled: boolean }>("verify-passkey-enrollment", {
    body: {},
    headers
  });
  return { enrolled: data?.enrolled === true, error };
}


export async function getResults(pollId: string, options: CacheOptions = {}): Promise<PollResult[]> {
  return cached(cacheKeys.results(pollId), async () => {
    const { data, error } = await supabase.functions.invoke<{ results: PollResult[] }>("get-results", {
      body: { poll_id: pollId }
    });
    if (error || !data) return [];
    return data.results;
  }, { ...options, label: options.label ?? "getResults" });
}

export async function getResultsHistory(pollId: string, options: CacheOptions = {}): Promise<PollHistoryPoint[]> {
  return cached(cacheKeys.history(pollId), async () => {
    const { data, error } = await supabase.functions.invoke<{ history: PollHistoryPoint[] }>("get-results-history", {
      body: { poll_id: pollId }
    });
    if (error || !data) return [];
    return data.history.map((point) => ({ ...point, votes: Number(point.votes), percentage: Number(point.percentage) }));
  }, { ...options, label: options.label ?? "getResultsHistory" });
}

export async function getPollComments(pollId: string, options: CacheOptions = {}): Promise<PollComment[]> {
  return cached(cacheKeys.comments(pollId), async () => {
    const { data, error } = await supabase.rpc("get_poll_comments_v2", { p_poll_id: pollId });
    if (error || !data) return [];
    return data.map((comment: Record<string, unknown>) => {
      const imagePath = typeof comment.image_path === "string" ? comment.image_path : null;
      const imageUrl = imagePath ? supabase.storage.from(COMMENT_IMAGE_BUCKET).getPublicUrl(imagePath).data.publicUrl : null;
      return { ...comment, likes: Number(comment.likes), image_size: comment.image_size ? Number(comment.image_size) : null, image_url: imageUrl };
    }) as PollComment[];
  }, { ...options, label: options.label ?? "getPollComments" });
}

export async function createPollComment(pollId: string, body: string, parentCommentId: string | null = null, image?: PollCommentImage) {
  invalidatePollComments(pollId);
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
  invalidateCommentCaches();
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
  return fetchPollCollection({ featuredOnly: true, limit: 10 });
}

export function getCachedFeaturedPolls(): PollWithStats[] | null {
  return readCache<PollWithStats[]>(cacheKeys.collection({ featuredOnly: true, limit: 10 }));
}

export function getCachedOpenPollStats(): OpenPollStats | null {
  return readCache<OpenPollStats>(cacheKeys.openPollStats());
}

export async function getOpenPollStats(): Promise<OpenPollStats> {
  return cached(cacheKeys.openPollStats(), async () => {
    const stats = createEmptyOpenPollStats();
    const { data, error } = await supabase
      .from("polls")
      .select("theme")
      .eq("status", "open")
      .eq("archived", false)
      .or(`closes_at.is.null,closes_at.gt.${new Date().toISOString()}`);

    if (error) throw error;
    if (!data) throw new Error("open_poll_stats_unavailable");

    for (const row of data as Array<{ theme?: unknown }>) {
      stats.total += 1;
      const theme = row.theme;
      if (isThemeSlug(theme)) {
        stats.byTheme[theme] += 1;
      }
    }
    return stats;
  }, { label: "getOpenPollStats" });
}

export async function getPollsByTheme(theme: ThemeSlug): Promise<PollWithStats[]> {
  return fetchPollCollection({ theme, limit: 20 });
}

export async function getOpenPolls(): Promise<PollWithStats[]> {
  return fetchPollCollection({ limit: 40 });
}

export async function getLatestResults(): Promise<PollWithStats[]> {
  return fetchPollCollection({ limit: 10, includeResults: true, status: "closed", showInResultsOnly: true });
}

export function getCachedPoll(pollId: string): Poll | null {
  return readCache<Poll | null>(cacheKeys.poll(pollId)) ?? null;
}

export function getCachedResults(pollId: string): PollResult[] | null {
  return readCache<PollResult[]>(cacheKeys.results(pollId));
}

export function getCachedResultsHistory(pollId: string): PollHistoryPoint[] | null {
  return readCache<PollHistoryPoint[]>(cacheKeys.history(pollId));
}

export function prefetchPollDetail(pollId: string) {
  void Promise.allSettled([
    fetchPoll(pollId, { label: "prefetchPoll" }),
    getResults(pollId, { label: "prefetchResults" }),
    getResultsHistory(pollId, { label: "prefetchResultsHistory" })
  ]);
}

export function prefetchThemePolls(theme: ThemeSlug | "all") {
  void (theme === "all" ? getOpenPolls() : getPollsByTheme(theme));
}

export function prefetchLatestResults() {
  void getLatestResults();
}

export function invalidatePollCaches(pollId: string) {
  publicCache.delete(cacheKeys.poll(pollId));
  publicCache.delete(cacheKeys.results(pollId));
  publicCache.delete(cacheKeys.history(pollId));
  invalidateCollectionCaches();
}

export async function getAdminStatus(): Promise<boolean> {
  const { data, error } = await supabase.rpc("admin_get_status");
  if (error) return false;
  return data === true;
}

export async function adminCreatePoll(input: AdminCreatePollInput): Promise<{ pollId: string | null; error?: string }> {
  const descriptionError = validatePollDescription(input.description);
  if (descriptionError) return { pollId: null, error: descriptionError };

  const { data, error } = await supabase.rpc("admin_create_poll", {
    p_question: input.question,
    p_description: input.description,
    p_theme: input.theme,
    p_choices: input.choices,
    p_closes_at: input.closes_at,
    p_status: input.status,
    p_featured: input.featured,
    p_trend_label: input.trend_label ?? null,
    p_series_id: input.series_id ?? null,
    p_choice_keys: input.choice_keys ?? null,
    p_show_in_results: input.show_in_results ?? false,
    p_resources: input.resources ?? [],
    p_slug: input.slug
  });

  if (error) {
    const message = error.message.includes("slug_already_exists")
      ? "Ce slug public est déjà utilisé par une autre série. Choisissez un slug distinct."
      : error.message;
    return { pollId: null, error: message };
  }
  invalidatePublicCaches();

  const first = Array.isArray(data) ? data[0] : data;
  if (typeof first === "string") return { pollId: first };
  if (first && typeof first === "object" && "poll_id" in first && typeof first.poll_id === "string") {
    return { pollId: first.poll_id };
  }
  return { pollId: null, error: "Réponse admin_create_poll inattendue." };
}

export async function adminListPolls(): Promise<AdminPollSummary[]> {
  const { data, error } = await supabase.rpc("admin_list_polls");
  if (error || !data) return [];
  return (data as AdminPollSummary[]).map((poll) => ({
    ...poll,
    choice_count: Number(poll.choice_count ?? 0),
    total_votes: Number(poll.total_votes ?? 0)
  }));
}

export async function adminGetPoll(pollId: string): Promise<AdminPollDetail | null> {
  const { data, error } = await supabase.rpc("admin_get_poll", { p_poll_id: pollId });
  if (error || !data || typeof data !== "object") return null;
  const detail = data as unknown as AdminPollDetail;
  return {
    ...detail,
    choices: [...(detail.choices ?? [])].sort((a, b) => Number(a.position) - Number(b.position)),
    resources: [...(detail.resources ?? [])].sort((a, b) => Number(a.position) - Number(b.position)),
    total_votes: Number(detail.total_votes ?? 0)
  };
}

export async function adminRelaunchPoll(input: AdminRelaunchPollInput): Promise<{ pollId: string | null; error?: string }> {
  const { data, error } = await supabase.rpc("admin_relaunch_poll", {
    p_poll_id: input.poll_id,
    p_closes_at: input.closes_at,
    p_status: input.status ?? "open",
    p_featured: input.featured ?? false
  });

  if (error) return { pollId: null, error: error.message };
  invalidatePublicCaches(input.poll_id);
  const first = Array.isArray(data) ? data[0] : data;
  if (first && typeof first === "object" && "poll_id" in first && typeof first.poll_id === "string") {
    invalidatePollCaches(first.poll_id);
    return { pollId: first.poll_id };
  }
  return { pollId: null, error: "Unexpected admin_relaunch_poll response." };
}

export async function adminUpdatePoll(input: AdminUpdatePollInput): Promise<{ ok: boolean; error?: string }> {
  const descriptionError = validatePollDescription(input.description);
  if (descriptionError) return { ok: false, error: descriptionError };

  const { error } = await supabase.rpc("admin_update_poll", {
    p_poll_id: input.poll_id,
    p_question: input.question,
    p_description: input.description,
    p_theme: input.theme,
    p_closes_at: input.closes_at,
    p_status: input.status,
    p_featured: input.featured,
    p_show_in_results: input.show_in_results,
    p_choices: input.choices ?? null,
    p_choice_keys: input.choice_keys ?? null,
    p_resources: input.resources ?? null
  });
  if (error) return { ok: false, error: error.message };
  invalidatePublicCaches(input.poll_id);
  return { ok: true };
}

export async function adminClosePoll(pollId: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc("admin_close_poll", { p_poll_id: pollId });
  if (error) return { ok: false, error: error.message };
  invalidatePublicCaches(pollId);
  return { ok: true };
}

export async function adminSetPollResultsVisibility(pollId: string, show: boolean): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc("admin_set_poll_results_visibility", { p_poll_id: pollId, p_show: show });
  if (error) return { ok: false, error: error.message };
  invalidatePublicCaches(pollId);
  return { ok: true };
}

export async function adminDeleteOrArchivePoll(pollId: string): Promise<{ action: "deleted" | "archived" | null; error?: string }> {
  const { data, error } = await supabase.rpc("admin_delete_or_archive_poll", { p_poll_id: pollId });
  if (error) return { action: null, error: error.message };
  invalidatePublicCaches(pollId);
  return { action: data === "deleted" ? "deleted" : "archived" };
}

export async function adminGetSeriesHistory(seriesId: string): Promise<AdminSeriesHistoryPoint[]> {
  const { data, error } = await supabase.rpc("admin_get_series_history", { p_series_id: seriesId });
  if (error || !data) return [];
  return (data as AdminSeriesHistoryPoint[]).map((point) => ({
    ...point,
    total_votes: Number(point.total_votes ?? 0),
    results: Array.isArray(point.results) ? point.results.map((result) => ({ ...result, votes: Number(result.votes ?? 0) })) : []
  }));
}

export async function getCurrentUserProfile(): Promise<Profile | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, username, username_normalized, sex, phone_last4, phone_verified_at, phone_last_changed_at, age, profession, region, reputation_score, created_at, updated_at, passkey_required_at, passkey_enrolled_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    const fallback = await supabase
      .from("profiles")
      .select("id, email, username, username_normalized, sex, phone_last4, age, profession, region, reputation_score, created_at, updated_at")
      .eq("id", user.id)
      .maybeSingle();
    if (fallback.error || !fallback.data) return null;
    return fallback.data as Profile;
  }
  if (!data) return null;
  return data as Profile;
}

export async function updateMyProfileField(field: ProfileUpdateField, value: string): Promise<{ profile: Profile | null; error?: string }> {
  const { data, error } = await supabase.rpc("update_my_profile_field", {
    p_field: field,
    p_value: value
  });
  if (error) return { profile: null, error: error.message };
  if (!data || typeof data !== "object") return { profile: await getCurrentUserProfile() };
  return { profile: data as Profile };
}

export async function updateCurrentUserEmail(email: string) {
  return supabase.auth.updateUser({ email });
}

export async function getLatestUserParticipations(): Promise<UserPollParticipation[]> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return [];

  await supabase.rpc("reconcile_my_ballot_participations");

  const { data, error } = await supabase
    .from("user_poll_participations")
    .select("id, user_id, poll_id, participated_on, polls(question, theme, status, wave_number, poll_series(slug))")
    .eq("user_id", user.id)
    .order("participated_on", { ascending: false })
    .limit(8);

  if (error || !data) return [];
  return data.map((participation) => {
    const rawPoll = Array.isArray(participation.polls) ? participation.polls[0] ?? null : participation.polls;
    const rawSeries = rawPoll && "poll_series" in rawPoll
      ? (Array.isArray(rawPoll.poll_series) ? rawPoll.poll_series[0] ?? null : rawPoll.poll_series)
      : null;
    return {
      ...participation,
      polls: rawPoll ? {
        question: rawPoll.question,
        theme: rawPoll.theme,
        status: rawPoll.status,
        wave_number: rawPoll.wave_number,
        series_slug: rawSeries?.slug ?? null
      } : null
    };
  }) as unknown as UserPollParticipation[];
}

export async function getUserPollParticipation(pollId: string): Promise<UserPollParticipation | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  await supabase.rpc("reconcile_my_ballot_participations");

  const { data, error } = await supabase
    .from("user_poll_participations")
    .select("id, user_id, poll_id, participated_on")
    .eq("user_id", user.id)
    .eq("poll_id", pollId)
    .maybeSingle();

  if (error || !data) return null;
  return data as UserPollParticipation;
}

export async function getMyAccountStats(): Promise<AccountStats> {
  const empty = createEmptyAccountStats();
  const { data, error } = await supabase.rpc("get_my_account_stats");
  if (error || !data || typeof data !== "object") return empty;

  const payload = data as Partial<AccountStats>;
  const participationByTheme = Array.isArray(payload.participation_by_theme)
    ? payload.participation_by_theme
      .filter((item) => item && typeof item === "object")
      .map((item) => {
        const row = item as Partial<AccountStats["participation_by_theme"][number]>;
        return {
          theme: row.theme === "politique" || row.theme === "economie" || row.theme === "societe" || row.theme === "sport" ? row.theme : "societe",
          label: typeof row.label === "string" ? row.label : "",
          count: Number(row.count ?? 0),
          percentage: Number(row.percentage ?? 0)
        };
      })
    : empty.participation_by_theme;

  return {
    participations_30_days: Number(payload.participations_30_days ?? 0),
    participation_by_theme: participationByTheme
  };
}

export async function checkUsernameAvailability(username: string): Promise<{ available: boolean | null; error?: string }> {
  const normalized = username.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(normalized)) return { available: false };

  const { data, error } = await supabase.rpc("check_username_available", { p_username: normalized });
  if (error) return { available: null, error: error.message };
  return { available: data === true };
}

export async function signUpUser(payload: SignupPayload) {
  return supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: {
        username: payload.username,
        sex: payload.sex,
        age: payload.age,
        profession: payload.profession,
        region: payload.region
      },
      emailRedirectTo: getAuthRedirectUrl("/auth/callback")
    }
  });
}

export async function checkSignupEmail(email: string): Promise<{ status: SignupEmailStatus | "rate_limited" | "error" }> {
  const { data, error } = await supabase.functions.invoke<{ status: SignupEmailStatus | "rate_limited" | "error" }>("check-signup-email", {
    body: { email: email.trim().toLowerCase() }
  });
  if (data) return data;
  const errorPayload = await readFunctionError<{ status: SignupEmailStatus | "rate_limited" | "error" }>(error);
  return errorPayload ?? { status: "error" };
}

export async function resendSignupConfirmation(email: string) {
  return supabase.auth.resend({
    type: "signup",
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: getAuthRedirectUrl("/auth/callback") }
  });
}

export async function signInUser(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function requestPasswordReset(email: string, redirectTo?: string) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo
  });
}

function getAuthRedirectUrl(path: string) {
  return typeof window !== "undefined" && window.location?.origin
    ? `${window.location.origin}${path}`
    : undefined;
}

export async function updateCurrentUserPassword(password: string) {
  return supabase.auth.updateUser({ password });
}

export async function signOutUser() {
  const result = await supabase.auth.signOut();
  if (!result.error) clearPendingSignup();
  return result;
}

async function fetchPollCollection(options: {
  theme?: ThemeSlug;
  featuredOnly?: boolean;
  limit: number;
  includeResults?: boolean;
  status?: "open" | "closed";
  showInResultsOnly?: boolean;
}) {
  return cached(cacheKeys.collection(options), async () => {
    const status = options.status ?? "open";
    let query = supabase
      .from("polls")
      .select(POLL_SELECT)
      .eq("status", status)
      .eq("archived", false)
      .order("created_at", { ascending: false })
      .limit(options.limit);

    if (options.theme) query = query.eq("theme", options.theme);
    if (options.featuredOnly) query = query.eq("featured", true);
    if (options.showInResultsOnly) query = query.eq("show_in_results", true);
    if (status === "open") query = query.or(`closes_at.is.null,closes_at.gt.${new Date().toISOString()}`);

    const initial = await query;
    let rows = initial.data as Record<string, unknown>[] | null;
    let error = initial.error;
    if (error || !rows) {
      let fallbackQuery = supabase
        .from("polls")
        .select(BASE_POLL_SELECT)
        .eq("status", status)
        .eq("archived", false)
        .order("created_at", { ascending: false })
        .limit(options.limit);

      if (options.theme) fallbackQuery = fallbackQuery.eq("theme", options.theme);
      if (options.featuredOnly) fallbackQuery = fallbackQuery.eq("featured", true);
      if (options.showInResultsOnly) fallbackQuery = fallbackQuery.eq("show_in_results", true);
      if (status === "open") fallbackQuery = fallbackQuery.or(`closes_at.is.null,closes_at.gt.${new Date().toISOString()}`);

      const fallback = await fallbackQuery;
      rows = fallback.data as Record<string, unknown>[] | null;
      error = fallback.error;
    }
    if (error || !rows) return [];

    const polls = rows.map(normalizePoll) as PollWithStats[];
    const withStats = await Promise.all(
      polls.map(async (poll) => {
        writeCache(cacheKeys.poll(poll.id), poll);
        const results = await getResults(poll.id);
        const totalVotes = results.reduce((sum, result) => sum + result.votes, 0);
        return {
          ...poll,
          totalVotes,
          results: options.includeResults ? results : undefined
        };
      })
    );

    return withStats;
  }, { label: "fetchPollCollection" });
}

function normalizePoll(data: Record<string, unknown>): Poll {
  const choices = Array.isArray(data.choices) ? data.choices : [];
  const rawResources = Array.isArray(data.poll_resources) ? data.poll_resources : Array.isArray(data.resources) ? data.resources : [];
  const rawSeries = Array.isArray(data.poll_series) ? data.poll_series[0] : data.poll_series;
  const seriesSlug = rawSeries && typeof rawSeries === "object" && "slug" in rawSeries && typeof rawSeries.slug === "string"
    ? rawSeries.slug
    : null;
  return {
    ...(data as Poll),
    series_slug: seriesSlug,
    description: typeof data.description === "string" && data.description.trim() ? data.description : getPollDescription(String(data.id)),
    choices: [...choices].sort((a, b) => Number(a.position) - Number(b.position)),
    resources: [...rawResources].sort((a, b) => Number(a.position) - Number(b.position)) as Poll["resources"]
  };
}

function readPublicPollResolution(data: unknown): PublicPollResolution | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;
  const value = row as Record<string, unknown>;
  if (
    typeof value.poll_id !== "string"
    || typeof value.series_id !== "string"
    || typeof value.series_slug !== "string"
    || typeof value.wave_number !== "number"
  ) return null;
  return value as PublicPollResolution;
}

function createEmptyOpenPollStats(): OpenPollStats {
  return {
    total: 0,
    byTheme: {
      politique: 0,
      economie: 0,
      societe: 0,
      sport: 0
    }
  };
}

function isThemeSlug(value: unknown): value is ThemeSlug {
  return value === "politique" || value === "economie" || value === "societe" || value === "sport";
}

async function readFunctionError<T>(error: unknown): Promise<T | null> {
  if (!error || typeof error !== "object" || !("context" in error)) return null;
  const context = (error as { context?: unknown }).context;
  if (!(context instanceof Response)) return null;
  return context.clone().json().catch(() => null) as Promise<T | null>;
}

async function getFunctionAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

function readCache<T>(key: string): T | null {
  const entry = publicCache.get(key) as CacheEntry<T> | undefined;
  if (!entry || entry.value === undefined || entry.expiresAt <= Date.now()) return null;
  return entry.value;
}

function writeCache<T>(key: string, value: T, ttlMs = PUBLIC_CACHE_TTL_MS) {
  publicCache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function cached<T>(key: string, loader: () => Promise<T>, options: CacheOptions = {}) {
  const ttlMs = options.ttlMs ?? PUBLIC_CACHE_TTL_MS;
  const existing = publicCache.get(key) as CacheEntry<T> | undefined;
  if (!options.force) {
    if (existing?.value !== undefined && existing.expiresAt > Date.now()) return Promise.resolve(existing.value);
    if (existing?.promise) return existing.promise;
  }

  const startedAt = nowMs();
  const promise = loader()
    .then((value) => {
      writeCache(key, value, ttlMs);
      logPerf(options.label ?? key, startedAt);
      return value;
    })
    .catch((error) => {
      publicCache.delete(key);
      logPerf(`${options.label ?? key} failed`, startedAt);
      throw error;
    });

  publicCache.set(key, { value: existing?.value, expiresAt: existing?.expiresAt ?? 0, promise });
  return promise;
}

function invalidateCollectionCaches() {
  publicCache.delete(cacheKeys.openPollStats());
  for (const key of publicCache.keys()) {
    if (
      key.startsWith("collection:")
      || key.startsWith("question-route:")
      || key.startsWith("result-route:")
      || key.startsWith("legacy-route:")
    ) publicCache.delete(key);
  }
}

function invalidatePublicCaches(pollId?: string) {
  if (pollId) {
    publicCache.delete(cacheKeys.poll(pollId));
    publicCache.delete(cacheKeys.results(pollId));
    publicCache.delete(cacheKeys.history(pollId));
  }
  invalidateCollectionCaches();
}

function invalidatePollComments(pollId: string) {
  publicCache.delete(cacheKeys.comments(pollId));
}

function invalidateCommentCaches() {
  for (const key of publicCache.keys()) {
    if (key.startsWith("comments:")) publicCache.delete(key);
  }
}

function nowMs() {
  return globalThis.performance?.now?.() ?? Date.now();
}

function createEmptyAccountStats(): AccountStats {
  return {
    participations_30_days: 0,
    participation_by_theme: [
      { theme: "politique", label: "Politique", count: 0, percentage: 0 },
      { theme: "economie", label: "Economie", count: 0, percentage: 0 },
      { theme: "societe", label: "Societe", count: 0, percentage: 0 },
      { theme: "sport", label: "Sport", count: 0, percentage: 0 }
    ]
  };
}

function logPerf(label: string, startedAt: number) {
  if (!isDevRuntime) return;
  const elapsed = Math.round(nowMs() - startedAt);
  console.info(`[perf] ${label} ${elapsed}ms`);
}

import { supabase } from "@/lib/supabase";
import type { Poll, PollResult, StartVerificationResponse, VoteStatus } from "@/lib/types";

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
  const { data, error } = await supabase
    .from("polls")
    .select("id, question, status, closes_at, choices(id, poll_id, label, position)")
    .eq("id", pollId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    ...data,
    choices: [...(data.choices ?? [])].sort((a, b) => a.position - b.position)
  } as Poll;
}

export async function startVerification(payload: StartPayload): Promise<StartVerificationResponse> {
  const { data, error } = await supabase.functions.invoke<StartVerificationResponse>("start-verification", {
    body: payload
  });
  if (error || !data) return { status: "error", message: error?.message };
  return data;
}

export async function submitVote(payload: SubmitPayload): Promise<VoteStatus> {
  const { data, error } = await supabase.functions.invoke<VoteStatus>("submit-vote", {
    body: payload
  });
  if (error || !data) return { status: "error", message: error?.message };
  return data;
}

export async function getResults(pollId: string): Promise<PollResult[]> {
  const { data, error } = await supabase.functions.invoke<{ results: PollResult[] }>("get-results", {
    body: { poll_id: pollId }
  });
  if (error || !data) return [];
  return data.results;
}

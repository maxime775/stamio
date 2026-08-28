import { isValidSignupUsername, normalizeSignupUsername } from "@/lib/signupValidation";

export type DiscussionMentionSegment = {
  text: string;
  username: string | null;
};

export type ActiveDiscussionMention = {
  start: number;
  end: number;
  query: string;
};

const USERNAME_CHARACTER = /^[A-Za-z0-9_]$/;
const INVALID_MENTION_START_BOUNDARY = /^[A-Za-z0-9_.%+@-]$/;
const INVALID_MENTION_END_BOUNDARY = /^[A-Za-z0-9_@-]$/;

export function getDiscussionParticipants(authorLabels: readonly string[]) {
  const participants = new Map<string, string>();
  for (const label of authorLabels) {
    if (!label.startsWith("@")) continue;
    const username = label.slice(1);
    if (!isValidSignupUsername(username)) continue;
    const normalized = normalizeSignupUsername(username);
    if (!participants.has(normalized)) participants.set(normalized, username);
  }
  return [...participants.values()].sort((left, right) => left.localeCompare(right, "fr", { sensitivity: "base" }));
}

export function filterDiscussionParticipants(participants: readonly string[], query: string) {
  const normalizedQuery = normalizeSignupUsername(query);
  const matches = new Map<string, string>();
  for (const username of participants) {
    if (!isValidSignupUsername(username)) continue;
    const normalized = normalizeSignupUsername(username);
    if (!normalized.startsWith(normalizedQuery) || matches.has(normalized)) continue;
    matches.set(normalized, username);
  }
  return [...matches.values()];
}

export function getActiveDiscussionMention(value: string, cursor: number): ActiveDiscussionMention | null {
  const safeCursor = Math.max(0, Math.min(cursor, value.length));
  const beforeCursor = value.slice(0, safeCursor);
  const mentionStart = beforeCursor.lastIndexOf("@");
  if (mentionStart < 0 || !isMentionStartBoundary(value[mentionStart - 1])) return null;

  const query = beforeCursor.slice(mentionStart + 1);
  if (query.length > 20 || !/^[A-Za-z0-9_]*$/.test(query)) return null;
  return { start: mentionStart, end: safeCursor, query: normalizeSignupUsername(query) };
}

export function replaceActiveDiscussionMention(value: string, cursor: number, username: string) {
  const mention = getActiveDiscussionMention(value, cursor);
  if (!mention || !isValidSignupUsername(username)) return { value, cursor };
  const insertion = `@${username} `;
  const replaceEnd = value[mention.end] === " " ? mention.end + 1 : mention.end;
  return {
    value: `${value.slice(0, mention.start)}${insertion}${value.slice(replaceEnd)}`,
    cursor: mention.start + insertion.length
  };
}

export function prependReplyMention(value: string, username: string) {
  if (!isValidSignupUsername(username)) return { value, cursor: 0, inserted: false };
  const existing = value.match(/^@([A-Za-z0-9_]{3,20})(?:\s|$)/);
  if (existing && normalizeSignupUsername(existing[1]) === normalizeSignupUsername(username)) {
    return { value, cursor: existing[0].length, inserted: false };
  }
  const insertion = `@${username} `;
  return { value: `${insertion}${value}`, cursor: insertion.length, inserted: true };
}

export function splitDiscussionMentions(value: string, participants: readonly string[]): DiscussionMentionSegment[] {
  const participantNames = new Map(
    participants
      .filter(isValidSignupUsername)
      .map((username) => [normalizeSignupUsername(username), username] as const)
  );
  const segments: DiscussionMentionSegment[] = [];
  let plainTextStart = 0;
  let searchFrom = 0;

  while (searchFrom < value.length) {
    const mentionStart = value.indexOf("@", searchFrom);
    if (mentionStart < 0) break;
    if (!isMentionStartBoundary(value[mentionStart - 1])) {
      searchFrom = mentionStart + 1;
      continue;
    }

    let mentionEnd = mentionStart + 1;
    while (mentionEnd < value.length && USERNAME_CHARACTER.test(value[mentionEnd])) mentionEnd += 1;
    const username = value.slice(mentionStart + 1, mentionEnd);
    const normalized = normalizeSignupUsername(username);
    const participant = participantNames.get(normalized);
    if (!participant || !isValidSignupUsername(username) || !isMentionEndBoundary(value[mentionEnd])) {
      searchFrom = mentionStart + 1;
      continue;
    }

    if (plainTextStart < mentionStart) segments.push({ text: value.slice(plainTextStart, mentionStart), username: null });
    segments.push({ text: value.slice(mentionStart, mentionEnd), username: participant });
    plainTextStart = mentionEnd;
    searchFrom = mentionEnd;
  }

  if (plainTextStart < value.length) segments.push({ text: value.slice(plainTextStart), username: null });
  return segments.length > 0 ? segments : [{ text: value, username: null }];
}

function isMentionStartBoundary(character: string | undefined) {
  return character === undefined || !INVALID_MENTION_START_BOUNDARY.test(character);
}

function isMentionEndBoundary(character: string | undefined) {
  return character === undefined || !INVALID_MENTION_END_BOUNDARY.test(character);
}

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { VISITOR_VOTE_LIMIT } from "@/lib/product";

const VISITOR_COUNT_KEY = "verified-polls.visitor-participations";

export async function getVisitorVoteCount() {
  const stored = await getStoredValue();
  const parsed = Number.parseInt(stored ?? "0", 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function incrementVisitorVoteCount() {
  const next = Math.min((await getVisitorVoteCount()) + 1, VISITOR_VOTE_LIMIT);
  await setStoredValue(String(next));
  return next;
}

export async function hasReachedVisitorLimit() {
  return (await getVisitorVoteCount()) >= VISITOR_VOTE_LIMIT;
}

async function getStoredValue() {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    return localStorage.getItem(VISITOR_COUNT_KEY);
  }
  return AsyncStorage.getItem(VISITOR_COUNT_KEY);
}

async function setStoredValue(value: string) {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    localStorage.setItem(VISITOR_COUNT_KEY, value);
    return;
  }
  await AsyncStorage.setItem(VISITOR_COUNT_KEY, value);
}

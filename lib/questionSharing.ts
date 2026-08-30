import { getQuestionPath, validatePollSeriesSlug } from "@/lib/publicPollUrls";

export const STAMIO_PUBLIC_ORIGIN = "https://stamio.fr";
export const QUESTION_SHARE_TEXT = "Donnez votre avis sur Stamio.";

export type QuestionSharePayload = {
  title: string;
  text: string;
  url: string;
};

export function getQuestionShareUrl(seriesSlug: string) {
  if (validatePollSeriesSlug(seriesSlug)) return null;
  return `${STAMIO_PUBLIC_ORIGIN}${getQuestionPath(seriesSlug)}`;
}

export function getQuestionSharePayload(question: string, seriesSlug: string): QuestionSharePayload | null {
  const url = getQuestionShareUrl(seriesSlug);
  if (!url) return null;
  return {
    title: question,
    text: QUESTION_SHARE_TEXT,
    url
  };
}

export function getXShareUrl(payload: QuestionSharePayload) {
  const shareUrl = new URL("https://twitter.com/intent/tweet");
  shareUrl.searchParams.set("text", `${payload.title}\n${payload.text}`);
  shareUrl.searchParams.set("url", payload.url);
  return shareUrl.toString();
}

export function getWhatsAppShareUrl(payload: QuestionSharePayload) {
  const shareUrl = new URL("https://wa.me/");
  shareUrl.searchParams.set("text", `${payload.title}\n${payload.text}\n${payload.url}`);
  return shareUrl.toString();
}

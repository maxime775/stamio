export const MAX_POLL_SERIES_SLUG_LENGTH = 80;

export type PublicPollWave = {
  id: string;
  series_id: string;
  series_slug: string;
  wave_number: number;
  status: "open" | "closed";
  closes_at: string | null;
  show_in_results: boolean;
  archived: boolean;
  launched_at?: string | null;
};

const EDITORIAL_SLUG_OVERRIDES = new Map<string, string>([
  [
    normalizeQuestionKey("Êtes-vous pour ou contre la taxe Zucman ?"),
    "taxe-zucman"
  ],
  [
    normalizeQuestionKey("Une peine d’inéligibilité constitue-t-elle selon vous une entrave au fonctionnement démocratique ?"),
    "peine-ineligibilite-entrave-democratie"
  ],
  [
    normalizeQuestionKey("Pensez-vous qu’une peine d’inéligibilité confirmée par la cour d’appel de Paris à l’encontre de Marine Le Pen constituerait une entrave au fonctionnement démocratique ?"),
    "peine-ineligibilite-entrave-democratie"
  ],
  [
    normalizeQuestionKey("Pensez-vous que l’augmentation de la dette publique est un problème ?"),
    "dette-publique"
  ],
  [
    normalizeQuestionKey("Pensez-vous que la France doive sortir complétement du nucléaire ?"),
    "sortie-nucleaire-france"
  ]
]);

export function createPollSeriesSlug(question: string) {
  const editorialOverride = EDITORIAL_SLUG_OVERRIDES.get(normalizeQuestionKey(question));
  if (editorialOverride) return editorialOverride;

  const normalized = normalizeForSlug(question)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");

  if (normalized.length <= MAX_POLL_SERIES_SLUG_LENGTH) return normalized;
  return normalized
    .slice(0, MAX_POLL_SERIES_SLUG_LENGTH)
    .replace(/-[^-]*$/, "")
    .replace(/-+$/, "");
}

export function validatePollSeriesSlug(value: string): string | null {
  if (!value) return "Le slug public est obligatoire.";
  if (value.length < 3) return "Le slug public doit contenir au moins 3 caractères.";
  if (value.length > MAX_POLL_SERIES_SLUG_LENGTH) {
    return `Le slug public est limité à ${MAX_POLL_SERIES_SLUG_LENGTH} caractères.`;
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    return "Le slug public doit contenir uniquement des lettres minuscules non accentuées, des chiffres et des tirets.";
  }
  return null;
}

export function keepOrCreatePollSeriesSlug(existingSlug: string | null | undefined, question: string) {
  return existingSlug || createPollSeriesSlug(question);
}

export function assertPollSeriesSlugAvailable(slug: string, existingSlugs: Iterable<string>) {
  if ([...existingSlugs].includes(slug)) throw new Error("slug_already_exists");
  return slug;
}

export function getQuestionPath(seriesSlug: string) {
  return `/question/${seriesSlug}`;
}

export function getHistoricalResultPath(seriesSlug: string, waveNumber: number) {
  return `/resultats/${seriesSlug}/vague-${waveNumber}`;
}

export function getPollPublicPath(
  poll: Pick<PublicPollWave, "series_slug" | "wave_number" | "status" | "closes_at" | "show_in_results" | "archived">,
  now = new Date()
) {
  if (isWaveOpen(poll, now)) return getQuestionPath(poll.series_slug);
  if (isWavePublishedResult(poll)) return getHistoricalResultPath(poll.series_slug, poll.wave_number);
  return null;
}

export function resolveActiveSeriesWave(waves: PublicPollWave[], seriesSlug: string, now = new Date()) {
  return waves
    .filter((wave) => wave.series_slug === seriesSlug && isWaveOpen(wave, now))
    .sort(compareNewestWave)[0] ?? null;
}

export function resolveLatestPublishedSeriesWave(waves: PublicPollWave[], seriesSlug: string) {
  return waves
    .filter((wave) => wave.series_slug === seriesSlug && isWavePublishedResult(wave))
    .sort(compareNewestWave)[0] ?? null;
}

export function resolvePublicQuestionPath(waves: PublicPollWave[], seriesSlug: string, now = new Date()) {
  const active = resolveActiveSeriesWave(waves, seriesSlug, now);
  if (active) return getQuestionPath(seriesSlug);

  const published = resolveLatestPublishedSeriesWave(waves, seriesSlug);
  return published ? getHistoricalResultPath(seriesSlug, published.wave_number) : null;
}

export function resolveHistoricalSeriesWave(waves: PublicPollWave[], seriesSlug: string, waveNumber: number) {
  return waves.find((wave) =>
    wave.series_slug === seriesSlug
    && wave.wave_number === waveNumber
    && isWavePublishedResult(wave)
  ) ?? null;
}

export function resolveLegacyPollPath(waves: PublicPollWave[], pollId: string, now = new Date()) {
  const source = waves.find((wave) => wave.id === pollId && !wave.archived);
  if (!source) return null;
  const active = resolveActiveSeriesWave(waves, source.series_slug, now);
  if (active?.id === source.id) return getQuestionPath(source.series_slug);
  if (source.status === "closed" && source.show_in_results) {
    return getHistoricalResultPath(source.series_slug, source.wave_number);
  }
  return null;
}

function isWaveOpen(
  wave: Pick<PublicPollWave, "archived" | "status" | "closes_at">,
  now: Date
) {
  return !wave.archived
    && wave.status === "open"
    && (!wave.closes_at || new Date(wave.closes_at).getTime() > now.getTime());
}

function isWavePublishedResult(
  wave: Pick<PublicPollWave, "archived" | "status" | "show_in_results">
) {
  return !wave.archived && wave.status === "closed" && wave.show_in_results;
}

function compareNewestWave(left: PublicPollWave, right: PublicPollWave) {
  if (left.wave_number !== right.wave_number) return right.wave_number - left.wave_number;
  return String(right.launched_at ?? "").localeCompare(String(left.launched_at ?? ""));
}

function normalizeQuestionKey(value: string) {
  return normalizeForSlug(value).replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizeForSlug(value: string) {
  return value
    .replace(/œ/gi, (match) => match === "Œ" ? "OE" : "oe")
    .replace(/æ/gi, (match) => match === "Æ" ? "AE" : "ae")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .toLowerCase();
}

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { getQuestionPath, validatePollSeriesSlug } from "../lib/publicPollUrls.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const page = read("app/poll/[pollId].tsx");
const menu = read("components/QuestionShareMenu.tsx");
const votePanel = read("components/VotePanel.tsx");
const helper = read("lib/questionSharing.ts");
const xBrandIcon = read("lib/XBrandIcon.tsx");
const packageJson = JSON.parse(read("package.json"));

const compiledHelper = ts.transpileModule(helper, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const helperModule = { exports: {} };
Function("require", "module", "exports", compiledHelper)(
  (specifier) => {
    assert.equal(specifier, "@/lib/publicPollUrls");
    return { getQuestionPath, validatePollSeriesSlug };
  },
  helperModule,
  helperModule.exports
);
const {
  QUESTION_SHARE_TEXT,
  getQuestionSharePayload,
  getQuestionShareUrl,
  getWhatsAppShareUrl,
  getXShareUrl
} = helperModule.exports;

const question = "La France doit-elle développer davantage le ferroviaire ?";
const slug = "developper-ferroviaire-france";
const canonicalUrl = `https://stamio.fr/question/${slug}`;
const payload = getQuestionSharePayload(question, slug);

assert.deepEqual(payload, {
  title: question,
  text: "Donnez votre avis sur Stamio.",
  url: canonicalUrl
}, "Le payload doit rester neutre et limité à title, text et URL publique");
assert.equal(QUESTION_SHARE_TEXT, "Donnez votre avis sur Stamio.");
assert.equal(getQuestionShareUrl(slug), canonicalUrl);
assert.equal(getQuestionShareUrl(`${slug}?choice=secret`), null, "Les query params ne doivent jamais entrer dans l'URL partagée");
assert.equal(getQuestionShareUrl(`${slug}#permit`), null, "Les fragments ne doivent jamais entrer dans l'URL partagée");

const xShareUrl = new URL(getXShareUrl(payload));
assert.equal(xShareUrl.origin + xShareUrl.pathname, "https://twitter.com/intent/tweet");
assert.deepEqual([...xShareUrl.searchParams.keys()].sort(), ["text", "url"]);
assert.equal(xShareUrl.searchParams.get("url"), canonicalUrl);
assert.equal(xShareUrl.searchParams.get("text"), `${question}\nDonnez votre avis sur Stamio.`);

const whatsAppShareUrl = new URL(getWhatsAppShareUrl(payload));
assert.equal(whatsAppShareUrl.origin + whatsAppShareUrl.pathname, "https://wa.me/");
assert.deepEqual([...whatsAppShareUrl.searchParams.keys()], ["text"]);
assert.equal(whatsAppShareUrl.searchParams.get("text"), `${question}\nDonnez votre avis sur Stamio.\n${canonicalUrl}`);

for (const url of [canonicalUrl, xShareUrl.toString(), whatsAppShareUrl.toString()]) {
  assert.doesNotMatch(url, /utm_|token|session|permit|choice|vote|jwt|access_token/i, "Aucun tracking ni état utilisateur ne doit être partagé");
}

assert.match(page, /<View style=\{styles\.questionHeading\}>[\s\S]*?<QuestionShareMenu question=\{poll\.question\} seriesSlug=\{poll\.series_slug\} \/>[\s\S]*?style=\{StyleSheet\.flatten\(\[styles\.overview/, "L'action Partager doit rester entre le titre et le bloc Enjeux");
assert.match(menu, /<Share2 size=\{16\} color=\{EDITORIAL_AMBER\}/, "L'icône inline doit être ambre et discrète");
assert.match(menu, /inlineLabel: \{ color: EDITORIAL_AMBER,/, "Le texte inline doit utiliser l'ambre éditorial");
const inlineTriggerStyle = /inlineTrigger:\s*\{([\s\S]*?)\n  \},/.exec(menu)?.[1] ?? "";
assert.match(inlineTriggerStyle, /alignSelf: "flex-start"/);
assert.match(inlineTriggerStyle, /backgroundColor: "transparent"/);
assert.match(inlineTriggerStyle, /borderWidth: 0/);
assert.match(inlineTriggerStyle, /paddingHorizontal: 0/);
assert.doesNotMatch(inlineTriggerStyle, /borderColor|borderRadius|shadow|minWidth|\bwidth:/i, "L'action inline ne doit être ni card, ni pill, ni bouton large");
assert.match(menu, /inlineTriggerActive: \{ opacity: 0\.8 \}/, "L'assombrissement doit rester actif pendant tout le survol du partage");
assert.match(menu, /onPointerEnter=\{openMenuFromPointer\}[\s\S]*?onPointerLeave=\{scheduleCloseFromPointer\}/, "Le wrapper partagé doit ouvrir au hover et programmer sa fermeture à la sortie");
assert.match(menu, /onFocus=\{handleTriggerFocus\}[\s\S]*?onPress=\{openMenu\}/, "Focus clavier et clic doivent tous deux ouvrir le partage");
assert.match(menu, /\(hover: hover\) and \(pointer: fine\)/, "Le hover ne doit être activé que sur un dispositif qui le supporte réellement");
assert.match(menu, /ACCOUNT_MENU_CLOSE_DELAY_MS[\s\S]*?cancelAccountMenuClose[\s\S]*?scheduleAccountMenuClose/, "La mécanique éprouvée de Mon compte doit être réutilisée");
assert.match(menu, /delay: ACCOUNT_MENU_CLOSE_DELAY_MS/, "Le partage doit conserver le délai de fermeture validé de Mon compte");

const desktopRailStyle = /desktopRail:\s*\{([\s\S]*?)\n  \},/.exec(menu)?.[1] ?? "";
assert.match(desktopRailStyle, /position: "absolute"/, "Le rail ne doit pas pousser Enjeux dans la page");
assert.match(desktopRailStyle, /flexDirection: "row"/);
assert.match(desktopRailStyle, /flexWrap: "nowrap"/);
assert.match(desktopRailStyle, /backgroundColor: "transparent"/);
assert.match(desktopRailStyle, /borderWidth: 0/);
assert.match(desktopRailStyle, /padding: 0/);
assert.doesNotMatch(desktopRailStyle, /shadow|borderRadius|minWidth|\bwidth:/i, "Le rail desktop ne doit être ni card, ni panneau dimensionné artificiellement");
assert.match(menu, /const preferredLeft = width \+ RAIL_TRIGGER_GAP/, "La direction nominale du rail doit être vers la droite");
assert.match(menu, /const leftFallback = -menuSize\.width - RAIL_TRIGGER_GAP/, "Le rail doit pouvoir se replier à gauche près du bord droit");
assert.match(menu, /viewportWidth - VIEWPORT_MARGIN - menuSize\.width - x/, "Le rail doit être confiné au viewport");

assert.match(menu, /inlineUnderline:[\s\S]*?backgroundColor: EDITORIAL_AMBER[\s\S]*?transformOrigin: "left center"/, "Le soulignement ambre doit se déployer depuis la gauche");
assert.match(menu, /transform: \[\{ scaleX: underlineProgress \}\]/, "Le soulignement doit utiliser une animation transform fluide");
assert.match(menu, /duration: reducedMotion \? 1 : 190/, "Le soulignement doit rester sobre et respecter reduced motion");
assert.match(menu, /const triggerActive = menuMounted \|\| inlineHovered \|\| inlineFocused/, "Le soulignement doit rester actif pendant le passage vers les options");

assert.match(menu, /const RAIL_OPEN_DURATION_MS = 180/);
assert.match(menu, /const RAIL_CLOSE_DURATION_MS = 140/);
assert.match(menu, /const RAIL_STAGGER_MS = 25/);
assert.match(menu, /Animated\.stagger\(RAIL_STAGGER_MS/, "L'ouverture doit appliquer un stagger léger");
assert.match(menu, /outputRange: \[-6, 0\]/, "La translation horizontale doit rester subtile");
assert.match(menu, /opacity: railOpacity/, "Le rail doit apparaître avec une variation d'opacité");
assert.match(menu, /if \(reducedMotion\)[\s\S]*?setValue\(open \? 1 : 0\)/, "Reduced motion doit supprimer les translations progressives");

assert.match(votePanel, /label="Découvrir les autres sujets"[\s\S]*?<QuestionShareMenu[\s\S]*?label="Partager le sujet"/, "Les deux CTA post-vote doivent être voisins et dans l'ordre demandé");
assert.match(votePanel, /accent="amber"[\s\S]*?label="Partager le sujet"/, "Le nouveau CTA doit être la variante ambre du bouton existant");
assert.match(votePanel, /const accentColor = accent === "amber" \? EDITORIAL_AMBER : palette\.primaryStrong/, "Les variantes cyan et ambre doivent partager la même construction");
assert.match(votePanel, /duration: 220[\s\S]*?Easing\.out\(Easing\.cubic\)/, "La logique hover validée doit rester commune");
assert.match(votePanel, /successActions: \{ flexDirection: "row"[\s\S]*?flexWrap: "wrap"/, "Les CTA doivent être côte à côte puis se replier naturellement sur mobile");

for (const option of ["Copier le lien", "X", "WhatsApp", "Plus d'options"]) {
  assert.ok(menu.includes(option), `Option de partage manquante : ${option}`);
}
assert.match(menu, /label="X"[\s\S]*?icon=\{<XBrandIcon size=\{16\} color=\{palette\.inkSecondary\} \/>\}/, "L'entrée X doit conserver son libellé et utiliser le pictogramme de marque compact");
assert.doesNotMatch(menu, /<Text style=\{styles\.xIcon\}>X<\/Text>/, "Le pictogramme X ne doit plus être une seconde lettre typographique");
assert.match(xBrandIcon, /<Svg[\s\S]*?viewBox="0 0 24 24"[\s\S]*?<Path[\s\S]*?fill=\{color\}/, "Le pictogramme X doit être un vrai tracé vectoriel partagé Web et natif");
assert.ok(!menu.includes("Intégrer"), "L'option Intégrer est interdite");
assert.match(menu, /typeof navigator\.share === "function"/, "Plus d'options doit dépendre de la disponibilité de Web Share");
assert.match(menu, /webShareAvailable \? \(/, "Plus d'options doit être masquée si Web Share est indisponible");
assert.match(menu, /await navigator\.share\(payload!\)/, "Plus d'options doit utiliser navigator.share");
assert.match(menu, /navigator\.clipboard\?\.writeText[\s\S]*?Clipboard\.setStringAsync/, "Copier doit prévoir un fallback si navigator.clipboard est indisponible");
assert.match(menu, /copied \? "Lien copié" : "Copier le lien"/, "Le feedback Lien copié doit rester dans la ligne");
assert.match(menu, /const COPY_FEEDBACK_MS = 1800/, "Le feedback de copie doit être discret et temporaire");
assert.match(menu, /window\.addEventListener\("keydown", closeFromEscape, true\)/, "Escape doit fermer le menu avant le modal parent");
assert.match(menu, /document\.addEventListener\("pointerdown", closeFromOutsidePointer\)/, "Un clic extérieur doit fermer le menu");
assert.match(menu, /measureInWindow[\s\S]*?railLeft[\s\S]*?alignRight[\s\S]*?openAbove/, "Le rail desktop et le popover compact doivent s'adapter au viewport");
assert.doesNotMatch(`${menu}\n${helper}`, /dangerouslySetInnerHTML|utm_|access_token|choice_id|ballot|permit|passkey|email/i, "Le partage ne doit contenir ni injection HTML, ni tracking, ni donnée sensible");

const sharingDependencies = Object.keys(packageJson.dependencies).filter((name) => /share/i.test(name));
assert.deepEqual(sharingDependencies, [], "Aucune dépendance de partage ne doit être ajoutée");
assert.ok(packageJson.dependencies["expo-clipboard"], "Le fallback de copie doit réutiliser la dépendance existante");

const changedFiles = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => line.slice(3).replaceAll("\\", "/"));
assert.ok(!changedFiles.some((path) => path.startsWith("supabase/")), "Aucun backend ou migration Supabase ne doit être modifié");
assert.ok(!changedFiles.includes("package-lock.json"), "Aucune dépendance ne doit modifier le lockfile");

console.log("Question sharing verification passed: canonical URL, amber hover trigger, horizontal desktop rail, subtle motion, responsive compact mode, and no backend changes.");

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const root = process.cwd();
const read = (path) => readFileSync(join(root, ...path.split("/")), "utf8");

const discussion = read("components/PollDiscussion.tsx");
const richNative = read("components/RichDiscussionEditor.tsx");
const richWeb = read("components/RichDiscussionEditor.web.tsx");
const mentionSource = read("lib/discussionMentions.ts");
const stamioColors = read("lib/stamioColors.ts");
const signupValidation = read("lib/signupValidation.ts");
const api = read("lib/api.ts");
const migration = read("supabase/migrations/20260827150000_discussion_public_usernames.sql");

function loadMentionHelpers() {
  const output = ts.transpileModule(mentionSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const loaded = { exports: {} };
  const requireForTest = (specifier) => {
    assert.equal(specifier, "@/lib/signupValidation", "Le parser doit réutiliser la validation de pseudo du signup");
    return {
      normalizeSignupUsername: (value) => value.trim().toLowerCase(),
      isValidSignupUsername: (value) => /^[a-z0-9_]{3,20}$/.test(value.trim().toLowerCase())
    };
  };
  Function("require", "module", "exports", output)(requireForTest, loaded, loaded.exports);
  return loaded.exports;
}

const {
  filterDiscussionParticipants,
  getActiveDiscussionMention,
  getDiscussionParticipants,
  prependReplyMention,
  replaceActiveDiscussionMention,
  splitDiscussionMentions
} = loadMentionHelpers();

assert.match(signupValidation, /\^\[a-z0-9_\]\{3,20\}\$/, "La grammaire signup attendue doit rester [a-z0-9_]{3,20}");
assert.match(mentionSource, /from "@\/lib\/signupValidation"/, "Les mentions doivent réutiliser les helpers du signup");

const participants = getDiscussionParticipants(["@maxime", "@alice75", "@maxime", "Compte supprimé"]);
assert.deepEqual(participants, ["alice75", "maxime"], "Les auteurs du fil doivent être dédupliqués et le fallback exclu");
assert.deepEqual(filterDiscussionParticipants(participants, "MA"), ["maxime"], "@ma doit filtrer les participants sans tenir compte de la casse");
assert.deepEqual(filterDiscussionParticipants(participants, "outsider"), [], "Un compte absent du fil ne doit pas être découvrable");

const selected = replaceActiveDiscussionMention("Je pense comme @ma sur ce point.", 18, "maxime");
assert.equal(selected.value, "Je pense comme @maxime sur ce point.", "La sélection doit remplacer uniquement le token actif par @pseudo suivi d'un espace");
assert.equal(selected.cursor, "Je pense comme @maxime ".length, "Le curseur doit suivre l'espace inséré");
assert.ok(!selected.value.includes("@["), "Aucune syntaxe @[pseudo] ne doit être insérée");

const middleSelection = replaceActiveDiscussionMention("@alice75 répond à @ma demain", 21, "maxime");
assert.equal(middleSelection.value, "@alice75 répond à @maxime demain", "Une seconde mention ne doit pas supprimer le reste du commentaire");

const reply = prependReplyMention("Merci pour ce point.", "maxime");
assert.equal(reply.value, "@maxime Merci pour ce point.", "Répondre doit préremplir exactement @pseudo et un espace");
assert.equal(reply.inserted, true);
const duplicateReply = prependReplyMention(reply.value, "MAXIME");
assert.equal(duplicateReply.value, reply.value, "Répondre ne doit pas doubler une mention déjà présente au début");
assert.equal(duplicateReply.inserted, false);

const styled = splitDiscussionMentions("D'accord avec @maxime.", participants);
assert.equal(styled.map((segment) => segment.text).join(""), "D'accord avec @maxime.", "Le rendu doit conserver exactement le texte stocké");
assert.equal(styled.find((segment) => segment.username)?.text, "@maxime", "Un participant réel peut être stylisé comme @pseudo");

const multipleStyledMentions = splitDiscussionMentions("@bymo4 et @alice75", ["bymo4", "alice75"])
  .filter((segment) => segment.username);
assert.deepEqual(multipleStyledMentions.map((segment) => segment.text), ["@bymo4", "@alice75"], "Plusieurs mentions valides doivent être reconnues intégralement, caractère @ inclus");

for (const invalid of ["@", "@ ", "@@", "@!", "@pseudo-invalide", "@pseudo_inconnu"]) {
  assert.ok(splitDiscussionMentions(invalid, participants).every((segment) => segment.username === null), `La séquence invalide ou inconnue doit rester du texte : ${invalid}`);
}
for (const invalidBoundary of ["@@maxime", "abc@maxime", "test@example.com"]) {
  assert.ok(splitDiscussionMentions(invalidBoundary, ["maxime", "example"]).every((segment) => segment.username === null), `Le début de mention invalide doit rester du texte : ${invalidBoundary}`);
}
for (const validBoundary of ["(@maxime)", "@maxime,", "@maxime.", "« @maxime »"]) {
  const mention = splitDiscussionMentions(validBoundary, ["maxime"]).find((segment) => segment.username === "maxime");
  assert.equal(mention?.text, "@maxime", `La ponctuation doit conserver la mention : ${validBoundary}`);
}
assert.equal(getActiveDiscussionMention("test@example", 12), null, "L'autocomplétion ne doit pas s'ouvrir dans une adresse email");

assert.match(migration, /security definer[\s\S]*?set search_path = pg_catalog, public/i, "La RPC doit fixer explicitement son search_path");
assert.match(migration, /left join public\.profiles p on p\.id = c\.user_id/i, "La résolution du pseudo doit rester dans la RPC contrôlée");
assert.match(migration, /case when p\.id is null then 'Compte supprimé' else '@' \|\| p\.username end/i, "@pseudo doit être public et le fallback réservé à un profil absent");
assert.match(migration, /grant execute on function public\.get_poll_comments_v2\(uuid\) to anon, authenticated/i, "La même RPC minimale doit servir les visiteurs et les comptes connectés");
assert.doesNotMatch(migration, /grant\s+select[\s\S]*?public\.profiles/i, "La table profiles ne doit pas devenir publiquement lisible");
assert.doesNotMatch(migration, /p\.(?:email|first_name|last_name|age|sex|profession|region|passkey_required_at|passkey_enrolled_at)/i, "La RPC ne doit lire aucun autre champ de profil");
const publicReturnContracts = [...migration.matchAll(/returns table\(([\s\S]*?)\)\s*language/gi)].map((match) => match[1]).join("\n");
assert.doesNotMatch(publicReturnContracts, /\b(?:user_id|author_id|email|first_name|last_name)\b/i, "Le contrat public ne doit exposer ni identifiant auteur ni donnée personnelle");
assert.doesNotMatch(migration, /\b(?:votes?|ballot|passkey|credential)\b/i, "La migration de discussion ne doit toucher ni au vote ni aux Passkeys");
assert.doesNotMatch(migration, /Membre (?:Sayit|Stamio)/i, "Les RPC actives ne doivent plus produire de libellé membre générique");

assert.match(discussion, /comments\.map\(\(comment\) => comment\.author_label\)/, "Les suggestions doivent être construites depuis les auteurs du fil déjà chargé");
assert.match(discussion, /<Text style=\{styles\.author\}>\{comment\.author_label\}<\/Text>/, "Tous les lecteurs doivent afficher le même author_label");
assert.match(discussion, /const authorUsername = getDiscussionParticipants\(\[comment\.author_label\]\)\[0\]/, "L'avatar doit dériver l'initiale du pseudo sans afficher @");
assert.match(discussion, /authorUsername\?\.slice\(0, 1\)\.toLocaleUpperCase\("fr-FR"\) \?\? "\?"/, "L'avatar doit utiliser une initiale majuscule ou un fallback neutre");
assert.match(discussion, /setReplyTo\(reply\)/, "Répondre à une réponse doit mentionner son véritable auteur");
assert.match(discussion, /parent\.parent_comment_id \?\? parent\.id/, "La structure existante des réponses doit rester à un seul niveau");
assert.match(discussion, /ArrowDown[\s\S]*ArrowUp[\s\S]*Enter[\s\S]*Escape/, "L'autocomplétion web doit gérer clavier et fermeture");
assert.match(discussion, /accessibilityLabel=\{`Mentionner @\$\{username\}`\}/, "Les suggestions tactiles doivent être correctement labellisées");
assert.match(richWeb, /editor\.view\.coordsAtPos\(editor\.state\.selection\.from\)/, "Le popover web doit s'ancrer sur les coordonnées du curseur TipTap");
assert.match(richWeb, /left: Math\.max\(0, caret\.right - frameBounds\.left \+ 3\)/, "La suggestion web doit conserver un gap optique de 3 px après le curseur");
assert.match(richWeb, /top: Math\.max\(0, caret\.top - frameBounds\.top \+ 4\)/, "La suggestion web doit être abaissée optiquement de 4 px");
assert.match(richWeb, /minTop: Math\.max\(0, editorBounds\.top - frameBounds\.top \+ 4\)/, "La liste web doit connaître sa limite haute dans la zone d'édition");
assert.match(richWeb, /bottom: Math\.max\(0, frameBounds\.height - 5\)/, "La liste web doit conserver une marge avec la bordure basse");
assert.match(richWeb, /window\.addEventListener\("scroll", updateAnchor, true\)/, "L'ancre web doit être recalculée pendant le scroll");
assert.match(discussion, /richEditorEnabled \? <View pointerEvents="box-none" style=\{styles\.mentionSuggestionClipWeb\}>\{mentionMenu\}<\/View> : null/, "Le popover web doit être rendu dans sa couche de confinement à l'intérieur du cadre de l'éditeur");
assert.match(discussion, /!richEditorEnabled \? mentionMenu : null/, "Le menu sous l'éditeur doit être conservé uniquement pour le natif");
assert.match(discussion, /const MAX_MENTION_SUGGESTIONS = 5/, "Le nombre de suggestions visibles doit être plafonné à cinq");
assert.match(discussion, /const exactMentionRecognized = mentionQuery !== null[\s\S]*?username\.toLowerCase\(\) === mentionQuery/, "Un pseudo complet doit être reconnu uniquement par égalité exacte avec un participant filtré");
assert.match(discussion, /const mentionSuggestions = exactMentionRecognized\s*\? \[\]/, "La suggestion fantôme doit disparaître dès que la mention courante est reconnue");
assert.match(discussion, /mentionSuggestions\.slice\(0, inlineMentionLayout\?\.visibleCount \?\? 0\)/, "Le web doit afficher toutes les suggestions qui tiennent dans l'éditeur");
assert.match(discussion, /Math\.max\(1, Math\.floor\(availableHeight \/ INLINE_MENTION_LINE_HEIGHT\)\)/, "Une correspondance doit garder au moins une ligne visible");
assert.match(discussion, /Math\.min\(MAX_MENTION_SUGGESTIONS, suggestionCount, linesThatFit\)/, "Le web doit limiter dynamiquement la liste à cinq lignes ou à l'espace disponible");
assert.match(discussion, /Math\.max\(anchor\.minTop, Math\.min\(anchor\.top, latestTop\)\)/, "La liste web doit remonter juste assez pour rester dans l'éditeur");
assert.match(discussion, /\{richEditorEnabled \? username : `@\$\{username\}`\}/, "La suggestion inline web doit afficher le pseudo sans ajouter un second @");
assert.match(richWeb, /`@\$\{username\} `/, "L'insertion finale doit rester @pseudo suivie d'un espace");
assert.match(discussion, /mentionSuggestionInlineWeb: \{ position: "absolute", alignSelf: "flex-start", zIndex: 30 \}/, "La suggestion web doit être un texte absolu de largeur intrinsèque");
const inlineSuggestionStyles = ["mentionSuggestionInlineWeb", "mentionSuggestionInlineActionWeb", "mentionSuggestionInlineTextWeb", "mentionSuggestionInlineTextActiveWeb"]
  .map((styleName) => discussion.match(new RegExp(`${styleName}: \\{([^}]*)\\}`))?.[1] ?? "")
  .join("\n");
assert.doesNotMatch(inlineSuggestionStyles, /backgroundColor|border(?:Width|Color|LeftWidth|LeftColor|Radius)|shadow|minWidth|maxWidth|\bwidth:|padding/i, "La suggestion web ne doit avoir aucun style de carte");
assert.match(discussion, /mentionSuggestionClipWeb: \{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, overflow: "hidden", zIndex: 30 \}/, "Une couche transparente doit masquer tout dépassement accidentel sans créer de carte");
assert.match(stamioColors, /editorialAmber:/, "La charte doit exposer le token ambre éditorial Stamio");
assert.match(discussion, /mentionSuggestionInlineTextWeb: \{ color: STAMIO_CORE_COLORS\.editorialAmber,/, "Les suggestions web doivent utiliser le token ambre éditorial existant");
assert.match(discussion, /mentionUsernames=\{mentionParticipants\}/, "L'éditeur doit recevoir uniquement les participants du fil pour reconnaître les mentions");
assert.match(richWeb, /splitDiscussionMentions\(text, mentionUsernames\)/, "Les décorations TipTap doivent réutiliser le parser sécurisé limité aux participants");
assert.match(richWeb, /textRun \+= child\.text/, "La détection doit réunir les fragments texte adjacents séparés par des marques TipTap");
assert.match(richWeb, /Decoration\.inline\([\s\S]*?textPosition \+ offset[\s\S]*?textPosition \+ offset \+ segment\.text\.length/, "La décoration doit couvrir le token @pseudo complet");
assert.match(richWeb, /DecorationSet\.create\(doc, decorations\)/, "Toutes les mentions valides du document doivent être décorées ensemble");
assert.match(richWeb, /color: \$\{STAMIO_CORE_COLORS\.editorialAmber\} !important;/, "Les mentions reconnues dans l'éditeur doivent utiliser l'ambre éditorial existant");
assert.match(richWeb, /-webkit-text-fill-color: \$\{STAMIO_CORE_COLORS\.editorialAmber\} !important;/, "Le token @pseudo complet doit rester ambre dans les moteurs WebKit");
assert.doesNotMatch(discussion, /search.*users|users.*search/i, "Aucune recherche globale d'utilisateurs ne doit être ajoutée");
assert.doesNotMatch(`${discussion}\n${richNative}\n${richWeb}`, /dangerouslySetInnerHTML/, "Le rendu ne doit injecter aucun HTML brut");
assert.doesNotMatch(`${discussion}\n${richNative}\n${richWeb}\n${mentionSource}`, /@\[/, "Le frontend ne doit contenir aucune syntaxe @[pseudo]");
assert.match(`${richNative}\n${richWeb}`, /splitDiscussionMentions/, "Les corps texte et riches doivent partager le parser sûr de mentions");
assert.match(api, /supabase\.rpc\("get_poll_comments_v2"/, "Le chargement doit rester limité à la RPC de discussion");

console.log("Discussion usernames and mentions verification passed: minimal public @username resolution, participant-only autocomplete, safe parsing, reply prefill, and no private profile exposure.");

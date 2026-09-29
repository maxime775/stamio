import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const page = read("app/poll/[pollId].tsx");
const questionRoute = read("app/question/[slug].tsx");
const layout = read("app/_layout.tsx");
const staticHtml = read("public/index.html");
const helmetRuntime = read("node_modules/react-helmet-async/lib/index.js");

const expectedGenericDescription = "Exprimez votre position sur les sujets qui vous animent, échangez et découvrez les résultats agrégés des sondages Stamio.";
const expectedDescriptionSuffix = "Comprenez les enjeux, donnez votre avis anonymement et consultez les résultats agrégés sur Stamio.";

const sourceFile = ts.createSourceFile(
  "app/poll/[pollId].tsx",
  page,
  ts.ScriptTarget.ES2022,
  true,
  ts.ScriptKind.TSX
);
const h1Elements = [];

function visit(node) {
  if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(sourceFile) === "h1") {
    h1Elements.push(node);
  }
  ts.forEachChild(node, visit);
}

visit(sourceFile);
assert.equal(h1Elements.length, 1, "PollScreen doit déclarer exactement un élément h1 Web");

const compiledPage = ts.transpileModule(page, {
  compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022
  },
  fileName: "app/poll/[pollId].tsx"
}).outputText;
assert.equal((compiledPage.match(/jsx[s]?\("h1"/g) ?? []).length, 1, "Le JSX Web doit compiler vers un véritable élément h1");

const questionTitle = /function QuestionTitle[\s\S]*?\n}\n\nfunction ResourceBand/.exec(page)?.[0] ?? "";
assert.match(questionTitle, /if \(Platform\.OS !== "web"\)[\s\S]*?<Text style=\{titleStyle\}>[\s\S]*?<NonBreakingFinalPunctuation value=\{question\} \/>/, "La branche native doit conserver Text et NonBreakingFinalPunctuation");
assert.match(questionTitle, /<h1 style=\{webTitleStyle\}>[\s\S]*?parts\.leadingText[\s\S]*?<span style=\{\{ whiteSpace: "nowrap" \}\}>\{parts\.nonBreakingTail\}<\/span>/, "La branche Web doit conserver le dernier mot et la ponctuation insécables");
assert.match(questionTitle, /lineHeight: typeof titleStyle\.lineHeight === "number" \? `\$\{titleStyle\.lineHeight\}px` : titleStyle\.lineHeight/, "Le line-height React Native doit rester exprimé en pixels sur le h1 Web");

for (const reset of [
  'font: "inherit"',
  'fontWeight: "normal"',
  "margin: 0",
  "padding: 0",
  'whiteSpace: "pre-wrap"',
  'overflowWrap: "break-word"'
]) {
  assert.ok(page.includes(reset), `Reset h1 manquant : ${reset}`);
}

assert.ok(page.includes(`? \`\${poll.question} ${expectedDescriptionSuffix}\``), "La description spécifique doit être construite depuis poll.question");
assert.equal((page.match(/<meta name="description"/g) ?? []).length, 1, "PollScreen doit déclarer une seule description spécifique");
assert.match(page, /<title>\{poll\.question\} — Stamio<\/title>/, "Le title existant doit rester inchangé");
assert.equal((page.match(/<link rel="canonical"/g) ?? []).length, 1, "PollScreen doit conserver un seul canonical");
assert.match(page, /<link rel="canonical" href=\{canonicalUrl\} \/>/);
assert.match(questionRoute, /canonicalPath=\{resolution \? getQuestionPath\(resolution\.series_slug\) : undefined\}/, "La route question doit conserver son canonical /question/<slug>");

const validMetadataBlock = page.slice(page.indexOf("{poll && canonicalUrl ? ("), page.indexOf("<LinearGradient", page.indexOf("{poll && canonicalUrl ? (")));
assert.doesNotMatch(validMetadataBlock, /noindex|name="robots"/, "Une question valide ne doit pas injecter noindex");
assert.doesNotMatch(validMetadataBlock, /\/poll\//, "Le canonical valide ne doit pas utiliser /poll/<uuid>");

const staticDescriptionTag = staticHtml.match(/<meta name="description"[^>]*>/g) ?? [];
assert.equal(staticDescriptionTag.length, 1, "Le shell statique doit contenir une seule description générique");
assert.ok(staticDescriptionTag[0].includes(`content="${expectedGenericDescription}"`));
assert.ok(staticDescriptionTag[0].includes('data-rh="true"'), "La description statique doit être gérée par Helmet");
assert.ok(layout.includes(`const DEFAULT_META_DESCRIPTION = "${expectedGenericDescription}";`));
assert.match(layout, /<Head>[\s\S]*?<meta name="description" content=\{DEFAULT_META_DESCRIPTION\} \/>[\s\S]*?<\/Head>/, "Le layout doit restaurer la description générique hors page sujet");

assert.match(helmetRuntime, /querySelectorAll\(t\+"\[data-rh\]"\)/, "La version installée de Helmet doit reprendre les balises statiques data-rh");
assert.match(helmetRuntime, /metaTags:x\(m\.META,\["name","charset","http-equiv","property","itemprop"\]/, "Helmet doit dédupliquer les meta par attribut name");

console.log("Question SEO checks passed: one compiled h1 host element, native Text parity, managed single description, unchanged title/canonical, and no valid-page noindex.");

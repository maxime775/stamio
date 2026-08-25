import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import {
  MAX_POLL_DESCRIPTION_LENGTH,
  POLL_DESCRIPTION_TOO_LONG_MESSAGE,
  validatePollDescription
} from "../lib/pollDescription.ts";

const root = process.cwd();

for (const length of [3_999, 4_001, 10_000, 20_000]) {
  const value = createMarkdownFixture(length);
  assert.equal(value.length, length);
  assert.equal(validatePollDescription(value), null, `${length} characters should be accepted`);
}

const oversized = createMarkdownFixture(20_001);
assert.equal(
  validatePollDescription(oversized),
  POLL_DESCRIPTION_TOO_LONG_MESSAGE,
  "20,001 characters should return the explicit validation message"
);

const original = createMarkdownFixture(10_000);
const locallyStored = JSON.stringify({ description: original });
const loaded = JSON.parse(locallyStored).description;
assert.equal(loaded.length, 10_000);
assert.equal(loaded, original, "the local save/read cycle must preserve the complete question text");
assert.match(loaded, /\n\n## Contexte\n/);
assert.match(loaded, /\*\*important\*\*/);

const { parseBlocks } = await loadMarkdownParser();
const renderedBlocks = parseBlocks(loaded);
assert.equal(renderedBlocks[0]?.type, "paragraph");
assert.equal(renderedBlocks[1]?.type, "heading");
assert.equal(renderedBlocks[1]?.text, "Contexte");
assert.equal(renderedBlocks.at(-1)?.text?.length, 10_000 - createMarkdownFixture(0, true).length);
assert.ok(renderedBlocks.at(-1)?.text?.endsWith("x"), "the Markdown renderer must reach the final character");

const apiSource = read("lib/api.ts");
const pollPageSource = read("app/poll/[pollId].tsx");
const markdownSource = read("components/MarkdownContent.tsx");
const adminSource = read("app/admin/index.tsx");
const migrationSource = read("supabase/migrations/20260824120000_increase_poll_question_text_limit.sql");

assert.match(apiSource, /p_description:\s*input\.description/);
assert.equal((apiSource.match(/validatePollDescription\(input\.description\)/g) ?? []).length, 2);
assert.match(pollPageSource, /<MarkdownContent value=\{poll\.description/);
assert.doesNotMatch(
  `${apiSource}\n${pollPageSource}\n${markdownSource}\n${adminSource}`,
  /(?:description|question)[^\n]{0,100}(?:slice\s*\(\s*0\s*,\s*4_?000|substring\s*\(|truncate\s*\()/i,
  "the question flow must not silently truncate content"
);
assert.equal((migrationSource.match(/length\(v_description\) > 20000/g) ?? []).length, 2);
assert.doesNotMatch(migrationSource, /length\(v_description\) > 4000/);
assert.equal(MAX_POLL_DESCRIPTION_LENGTH, 20_000);

console.log("Poll description length checks passed (3,999 / 4,001 / 10,000 / 20,000 accepted; 20,001 rejected). ");

function createMarkdownFixture(length, prefixOnly = false) {
  const prefix = "Introduction complete.\n\n## Contexte\nUne idee **important** conserve son Markdown.\n\n";
  if (prefixOnly) return prefix;
  assert.ok(prefix.length <= length);
  return `${prefix}${"x".repeat(length - prefix.length)}`;
}

function read(relativePath) {
  return readFileSync(join(root, ...relativePath.split("/")), "utf8");
}

async function loadMarkdownParser() {
  const source = read("components/MarkdownContent.tsx");
  const sourceFile = ts.createSourceFile("MarkdownContent.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declaration = sourceFile.statements.find(
    (statement) => ts.isFunctionDeclaration(statement) && statement.name?.text === "parseBlocks"
  );
  assert.ok(declaration, "Markdown block parser should exist");
  const moduleSource = `${declaration.getText(sourceFile)}\nexport { parseBlocks };`;
  const output = ts.transpileModule(moduleSource, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

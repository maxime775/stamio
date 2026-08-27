import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();

function parse(relativePath) {
  const absolutePath = path.join(root, relativePath);
  const sourceText = fs.readFileSync(absolutePath, "utf8");
  return {
    relativePath,
    sourceText,
    sourceFile: ts.createSourceFile(
      relativePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    )
  };
}

function visit(node, predicate, matches = []) {
  if (predicate(node)) matches.push(node);
  ts.forEachChild(node, (child) => {
    visit(child, predicate, matches);
  });
  return matches;
}

function jsxComponents(file, componentName) {
  return visit(
    file.sourceFile,
    (node) =>
      ts.isJsxSelfClosingElement(node) &&
      node.tagName.getText(file.sourceFile) === componentName
  );
}

function jsxAttribute(element, name, sourceFile) {
  const attribute = element.attributes.properties.find(
    (property) =>
      ts.isJsxAttribute(property) &&
      property.name.getText(sourceFile) === name
  );
  assert(attribute && ts.isJsxAttribute(attribute), `${name} doit être transmis`);
  if (!attribute.initializer) return true;
  if (ts.isStringLiteral(attribute.initializer)) return attribute.initializer.text;
  assert(
    ts.isJsxExpression(attribute.initializer) && attribute.initializer.expression,
    `${name} doit avoir une valeur exploitable`
  );
  return attribute.initializer.expression.getText(sourceFile);
}

function optionalJsxAttribute(element, name, sourceFile) {
  const attribute = element.attributes.properties.find(
    (property) =>
      ts.isJsxAttribute(property) &&
      property.name.getText(sourceFile) === name
  );
  if (!attribute || !ts.isJsxAttribute(attribute)) return undefined;
  if (!attribute.initializer) return true;
  if (ts.isStringLiteral(attribute.initializer)) return attribute.initializer.text;
  if (ts.isJsxExpression(attribute.initializer) && attribute.initializer.expression) {
    return attribute.initializer.expression.getText(sourceFile);
  }
  return undefined;
}

function componentByLabel(file, label) {
  const matches = jsxComponents(file, "HeroActionButton").filter(
    (element) => jsxAttribute(element, "label", file.sourceFile) === label
  );
  assert.equal(matches.length, 1, `Un unique HeroActionButton « ${label} » est attendu`);
  return matches[0];
}

function assertAuthButton(file, label, stateName, callbackName, disabledOpacity, disabledExpression = stateName) {
  const button = componentByLabel(file, label);
  assert.equal(jsxAttribute(button, "variant", file.sourceFile), "primary");
  assert.equal(jsxAttribute(button, "compact", file.sourceFile), true);
  assert.equal(jsxAttribute(button, "fullWidth", file.sourceFile), true);
  assert.equal(jsxAttribute(button, "elevated", file.sourceFile), "false");
  assert.equal(jsxAttribute(button, "showArrow", file.sourceFile), "false");
  assert.equal(jsxAttribute(button, "loading", file.sourceFile), stateName);
  assert.equal(jsxAttribute(button, "disabled", file.sourceFile), disabledExpression);
  assert.equal(jsxAttribute(button, "disabledOpacity", file.sourceFile), disabledOpacity);
  assert.equal(jsxAttribute(button, "onPress", file.sourceFile), callbackName);
}

function objectProperty(objectLiteral, name) {
  const property = objectLiteral.properties.find(
    (candidate) =>
      ts.isPropertyAssignment(candidate) &&
      (candidate.name.getText().replaceAll("\"", "") === name)
  );
  assert(property && ts.isPropertyAssignment(property), `Propriété ${name} introuvable`);
  return property.initializer;
}

function findStyleObject(file, styleName) {
  const styleCalls = visit(
    file.sourceFile,
    (node) =>
      ts.isCallExpression(node) &&
      node.expression.getText(file.sourceFile) === "StyleSheet.create"
  );
  assert.equal(styleCalls.length, 1, "Une unique feuille de styles est attendue");
  const stylesObject = styleCalls[0].arguments[0];
  assert(ts.isObjectLiteralExpression(stylesObject), "La feuille de styles doit être statique");
  const style = objectProperty(stylesObject, styleName);
  assert(ts.isObjectLiteralExpression(style), `Le style ${styleName} doit être un objet`);
  return style;
}

const hero = parse("components/HeroActionButton.tsx");
const home = parse("app/index.tsx");
const login = parse("components/LoginForm.tsx");
const signup = parse("components/SignupForm.tsx");

assertAuthButton(
  login,
  "Se connecter avec une clé d’accès",
  "passkeyLoading",
  "handlePasskeySignIn",
  "0.72"
);
assertAuthButton(login, "Se connecter", "loading", "handleSubmit", "0.72");
assertAuthButton(signup, "S'inscrire", "loading", "handleSubmit", "0.52", "loading || !legalAccepted");

assert.equal(
  jsxComponents(login, "HeroActionButton").length,
  2,
  "Login doit utiliser la primitive partagée pour ses deux actions principales"
);
assert.equal(
  jsxComponents(signup, "HeroActionButton").length,
  1,
  "Signup doit utiliser la primitive partagée uniquement pour son action finale"
);

const homepageCta = componentByLabel(home, "Découvrir les questions");
assert.equal(jsxAttribute(homepageCta, "variant", home.sourceFile), "primary");
for (const authOnlyProp of [
  "compact",
  "disabledOpacity",
  "elevated",
  "fullWidth",
  "showArrow",
  "style"
]) {
  assert.equal(
    optionalJsxAttribute(homepageCta, authOnlyProp, home.sourceFile),
    undefined,
    `Le CTA homepage ne doit pas recevoir ${authOnlyProp}`
  );
}

const timingCalls = visit(
  hero.sourceFile,
  (node) =>
    ts.isCallExpression(node) &&
    node.expression.getText(hero.sourceFile) === "Animated.timing"
);
assert.equal(timingCalls.length, 1, "Une seule animation hover doit piloter la primitive");
const timingConfig = timingCalls[0].arguments[1];
assert(ts.isObjectLiteralExpression(timingConfig), "La configuration Animated.timing doit être statique");
assert.equal(objectProperty(timingConfig, "duration").getText(hero.sourceFile), "190");
assert.equal(
  objectProperty(timingConfig, "easing").getText(hero.sourceFile),
  "Easing.out(Easing.cubic)"
);
assert.equal(
  objectProperty(timingConfig, "useNativeDriver").getText(hero.sourceFile),
  "true"
);

const interpolationRanges = visit(
  hero.sourceFile,
  (node) =>
    ts.isPropertyAssignment(node) &&
    node.name.getText(hero.sourceFile) === "outputRange"
).map((property) => property.initializer.getText(hero.sourceFile));
assert.deepEqual(
  interpolationRanges.sort(),
  ["[0, -2]", "[0, 3]"].sort(),
  "Le mouvement du bouton et de la flèche doit rester celui du CTA homepage"
);

const compactButton = findStyleObject(hero, "compactButton");
assert.equal(objectProperty(compactButton, "minHeight").getText(hero.sourceFile), "44");
assert.equal(objectProperty(compactButton, "paddingHorizontal").getText(hero.sourceFile), "0");
const compactText = findStyleObject(hero, "compactText");
assert.equal(objectProperty(compactText, "fontSize").getText(hero.sourceFile), "15");
const primary = findStyleObject(hero, "primary");
assert.equal(objectProperty(primary, "backgroundColor").getText(hero.sourceFile), "palette.primary");
const primaryPressed = findStyleObject(hero, "primaryPressed");
assert.equal(
  objectProperty(primaryPressed, "backgroundColor").getText(hero.sourceFile),
  "palette.primaryPressed"
);
const primaryText = findStyleObject(hero, "primaryText");
assert.equal(objectProperty(primaryText, "color").getText(hero.sourceFile), "palette.onPrimary");

assert.match(
  hero.sourceText,
  /const unavailable = disabled \|\| loading;/,
  "Les états loading et disabled doivent neutraliser la primitive"
);
assert.match(
  hero.sourceText,
  /disabled=\{unavailable\}/,
  "Pressable doit rester désactivé pendant loading ou disabled"
);
assert.match(
  hero.sourceText,
  /focusable=\{!unavailable\}/,
  "Un bouton indisponible ne doit pas rester focusable"
);
assert.match(
  hero.sourceText,
  /onHoverIn=\{\(\) => \{\s*animateHover\(1\);/,
  "L’entrée hover doit piloter l’animation partagée"
);
assert.match(
  hero.sourceText,
  /onHoverOut=\{\(\) => animateHover\(0\)\}/,
  "La sortie hover doit inverser l’animation partagée"
);
assert.match(
  hero.sourceText,
  /outlineStyle: "solid"[\s\S]*outlineWidth: 2[\s\S]*outlineColor: palette\.primaryStrong[\s\S]*outlineOffset: 3/,
  "Le focus clavier partagé doit rester visible"
);
assert.match(
  login.sourceText,
  /await signInWithPasskey\(lease\.signal\);/,
  "Le parcours Passkey doit transmettre le signal de la cérémonie à signInWithPasskey"
);
assert.match(
  signup.sourceText,
  /await signUpUser\(/,
  "La soumission Signup doit rester branchée sur signUpUser"
);

console.log(
  "Auth button hover verification passed: shared HeroActionButton, 190 ms cubic-out motion, preserved labels, callbacks, loading, disabled, and compact layout."
);

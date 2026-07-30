import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import ts from "typescript";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const loadPureTypeScriptModule = async (path) => {
  const output = ts.transpileModule(read(path), {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
};

const failures = [];
const hover = await loadPureTypeScriptModule("lib/accountMenuHover.ts");
const header = read("components/AppHeader.tsx");

let now = 0;
let nextTimerId = 1;
const timers = new Map();
const setTimer = (callback, delay) => {
  const id = nextTimerId++;
  timers.set(id, { callback, dueAt: now + delay });
  return id;
};
const clearTimer = (id) => {
  timers.delete(id);
};
const advanceBy = (duration) => {
  now += duration;
  for (const [id, timer] of [...timers].sort((left, right) => left[1].dueAt - right[1].dueAt)) {
    if (timer.dueAt > now) continue;
    timers.delete(id);
    timer.callback();
  }
};
const resetClock = () => {
  now = 0;
  nextTimerId = 1;
  timers.clear();
};
const schedule = ({ timerRef, onClose, shouldRemainOpen = () => false }) => {
  hover.scheduleAccountMenuClose({
    timerRef,
    onClose,
    shouldRemainOpen,
    setTimer,
    clearTimer
  });
};

if (hover.ACCOUNT_MENU_CLOSE_DELAY_MS < 100 || hover.ACCOUNT_MENU_CLOSE_DELAY_MS > 150) {
  failures.push("account menu close delay must stay between 100 and 150 ms");
}
if (hover.ACCOUNT_MENU_CLOSE_DELAY_MS !== 120) failures.push("account menu close delay must be 120 ms");

resetClock();
{
  const timerRef = { current: null };
  let closeCount = 0;
  schedule({ timerRef, onClose: () => closeCount++ });
  const firstTimer = timerRef.current;
  schedule({ timerRef, onClose: () => closeCount++ });
  if (timers.size !== 1 || timerRef.current === firstTimer) failures.push("rescheduling must replace the previous close timer");
  advanceBy(hover.ACCOUNT_MENU_CLOSE_DELAY_MS);
  if (closeCount !== 1 || timerRef.current !== null) failures.push("only the latest timer may close the menu");
}

resetClock();
{
  const timerRef = { current: null };
  let closeCount = 0;
  schedule({ timerRef, onClose: () => closeCount++ });
  advanceBy(hover.ACCOUNT_MENU_CLOSE_DELAY_MS - 1);
  hover.cancelAccountMenuClose(timerRef, clearTimer);
  advanceBy(1);
  if (closeCount !== 0 || timers.size !== 0 || timerRef.current !== null) failures.push("pointer re-entry must cancel a pending close");
}

resetClock();
{
  const timerRef = { current: null };
  let closeCount = 0;
  schedule({ timerRef, onClose: () => closeCount++ });
  advanceBy(hover.ACCOUNT_MENU_CLOSE_DELAY_MS - 1);
  if (closeCount !== 0) failures.push("the menu must stay open throughout the tolerance delay");
  advanceBy(1);
  if (closeCount !== 1) failures.push("a real exit must close after the tolerance delay");
}

resetClock();
{
  const timerRef = { current: null };
  let closeCount = 0;
  schedule({ timerRef, onClose: () => closeCount++, shouldRemainOpen: () => true });
  advanceBy(hover.ACCOUNT_MENU_CLOSE_DELAY_MS);
  if (closeCount !== 0 || timerRef.current !== null) failures.push("focus inside the menu region must prevent timer-driven closure");
}

resetClock();
{
  const timerRef = { current: null };
  let closeCount = 0;
  schedule({ timerRef, onClose: () => closeCount++ });
  hover.cancelAccountMenuClose(timerRef, clearTimer);
  advanceBy(hover.ACCOUNT_MENU_CLOSE_DELAY_MS);
  if (closeCount !== 0 || timers.size !== 0) failures.push("unmount cleanup must cancel the close timer");
}

if (!/<View[\s\S]*?ref=\{accountMenuWrapRef\}[\s\S]*?onPointerEnter=\{handleAccountMenuPointerEnter\}[\s\S]*?onPointerLeave=\{handleAccountMenuPointerLeave\}/m.test(header)) {
  failures.push("trigger and menu must share wrapper-level pointer enter and leave handlers");
}
if (!header.includes('event.nativeEvent.pointerType === "touch"')) failures.push("touch pointers must not trigger desktop hover behavior");
if (!header.includes("styles.accountMenuBridge") || !/accountMenuBridge:\s*\{[^}]*top: 40,[^}]*height: 6/s.test(header)) {
  failures.push("the six-pixel trigger-to-menu gap must have an invisible interactive bridge");
}
if (/accessibilityRole="menu"[\s\S]{0,220}onPointer(?:Enter|Leave)=/.test(header)) {
  failures.push("the menu must not maintain competing pointer enter or leave handlers");
}
for (const preserved of [
  'document.addEventListener("pointerdown", closeFromOutsidePointer)',
  'document.addEventListener("focusin", closeFromOutsideFocus)',
  'document.addEventListener("keydown", closeFromEscape)',
  'if (event.key !== "Escape") return',
  'onPress={toggleAccountMenu}'
]) {
  if (!header.includes(preserved)) failures.push(`preserved account-menu behavior missing: ${preserved}`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Account menu hover behavior checks passed.");

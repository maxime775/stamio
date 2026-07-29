export type VotePanelStep =
  | "checking"
  | "visitor"
  | "email"
  | "passkey"
  | "confirm"
  | "submitting"
  | "success"
  | "duplicate"
  | "closed"
  | "error";

export function isTerminalVotePanelStep(step: VotePanelStep) {
  return step === "success" || step === "duplicate";
}

export function canTransitionVotePanel(
  current: VotePanelStep,
  next: VotePanelStep,
  reset = false
) {
  if (reset) return next === "checking";
  if (current === next) return true;
  if (isTerminalVotePanelStep(current)) return false;
  if (current === "submitting" && next === "confirm") return false;
  return true;
}

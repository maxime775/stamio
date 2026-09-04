declare function __prefetchImport(path: string): void;

let requested = false;

export function prefetchQuestionRoute() {
  if (requested) return;
  requested = true;
  __prefetchImport("../app/question/[slug]");
}

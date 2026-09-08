declare function __prefetchImport(path: string): void;

let requested = false;

export function prefetchThemesRoute() {
  if (requested) return;
  requested = true;
  __prefetchImport("../app/themes/index");
}

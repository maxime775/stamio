export type PasskeyCeremonyLease = {
  id: number;
  signal: AbortSignal;
};

export type PasskeyCeremonyController = {
  begin: () => PasskeyCeremonyLease | null;
  finish: (lease: PasskeyCeremonyLease) => void;
  cancel: (lease?: PasskeyCeremonyLease) => void;
  dispose: () => void;
  isActive: (lease?: PasskeyCeremonyLease) => boolean;
};

export function createPasskeyCeremonyController(): PasskeyCeremonyController {
  let active: { id: number; controller: AbortController } | null = null;
  let nextId = 0;
  let disposed = false;

  return {
    begin() {
      if (disposed || active) return null;
      const controller = new AbortController();
      active = { id: ++nextId, controller };
      return { id: active.id, signal: controller.signal };
    },
    finish(lease) {
      if (active?.id === lease.id) active = null;
    },
    cancel(lease) {
      if (!active || (lease && active.id !== lease.id)) return;
      const controller = active.controller;
      active = null;
      controller.abort();
    },
    dispose() {
      disposed = true;
      if (!active) return;
      const controller = active.controller;
      active = null;
      controller.abort();
    },
    isActive(lease) {
      return Boolean(active && (!lease || active.id === lease.id));
    }
  };
}

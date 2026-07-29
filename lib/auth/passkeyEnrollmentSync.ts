export const PASSKEY_ENROLLMENT_CHANNEL = "stamio_passkey_enrollment";
export const PASSKEY_ENROLLMENT_STORAGE_KEY = "stamio_passkey_enrollment_event_v1";
export const PASSKEY_ENROLLMENT_TAB_KEY = "stamio_passkey_enrollment_tab_v1";
export const PASSKEY_ENROLLMENT_EVENT_TTL_MS = 2 * 60 * 1000;

export type PasskeyEnrollmentSyncEvent = {
  type: "passkey-enrollment-complete";
  sourceTabId: string;
  timestamp: number;
  nonce: string;
};

type SyncSubscription = {
  publishSuccess: () => void;
  cleanup: () => void;
};

function randomIdentifier(prefix: string) {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === "function") {
    return `${prefix}${cryptoApi.randomUUID()}`;
  }

  if (typeof cryptoApi?.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    cryptoApi.getRandomValues(bytes);
    return `${prefix}${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  }

  return `${prefix}${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function createPasskeyEnrollmentTabId() {
  const tabId = randomIdentifier("tab-");
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(PASSKEY_ENROLLMENT_TAB_KEY, tabId);
    } catch {
      // The in-memory identifier still keeps this page instance distinct.
    }
  }
  return tabId;
}

export function createPasskeyEnrollmentSyncEvent(
  sourceTabId: string,
  timestamp = Date.now()
): PasskeyEnrollmentSyncEvent {
  return {
    type: "passkey-enrollment-complete",
    sourceTabId,
    timestamp,
    nonce: randomIdentifier("event-")
  };
}

export function isPasskeyEnrollmentSyncEvent(value: unknown): value is PasskeyEnrollmentSyncEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<PasskeyEnrollmentSyncEvent>;
  return event.type === "passkey-enrollment-complete"
    && typeof event.sourceTabId === "string"
    && event.sourceTabId.startsWith("tab-")
    && typeof event.timestamp === "number"
    && Number.isFinite(event.timestamp)
    && typeof event.nonce === "string"
    && event.nonce.startsWith("event-");
}

export function shouldHandlePasskeyEnrollmentSyncEvent(
  value: unknown,
  currentTabId: string,
  now = Date.now()
): value is PasskeyEnrollmentSyncEvent {
  if (!isPasskeyEnrollmentSyncEvent(value)) return false;
  const age = now - value.timestamp;
  return value.sourceTabId !== currentTabId
    && age >= 0
    && age <= PASSKEY_ENROLLMENT_EVENT_TTL_MS;
}

export function subscribeToPasskeyEnrollmentSync(
  tabId: string,
  onExternalSuccess: (event: PasskeyEnrollmentSyncEvent) => void
): SyncSubscription {
  let channel: BroadcastChannel | null = null;
  let channelListener: ((event: MessageEvent) => void) | null = null;
  let storageListener: ((event: StorageEvent) => void) | null = null;

  const handleMessage = (value: unknown) => {
    if (!shouldHandlePasskeyEnrollmentSyncEvent(value, tabId)) return;
    onExternalSuccess(value);
  };

  if (typeof window !== "undefined" && typeof BroadcastChannel !== "undefined") {
    try {
      channel = new BroadcastChannel(PASSKEY_ENROLLMENT_CHANNEL);
      channelListener = (event) => handleMessage(event.data);
      channel.addEventListener("message", channelListener);
    } catch {
      channel = null;
      channelListener = null;
    }
  }

  if (!channel && typeof window !== "undefined") {
    storageListener = (event) => {
      if (event.key !== PASSKEY_ENROLLMENT_STORAGE_KEY || !event.newValue) return;
      try {
        handleMessage(JSON.parse(event.newValue));
      } catch {
        // Ignore malformed or unrelated localStorage events.
      }
    };
    window.addEventListener("storage", storageListener);
  }

  return {
    publishSuccess() {
      const event = createPasskeyEnrollmentSyncEvent(tabId);
      if (channel) {
        channel.postMessage(event);
        return;
      }
      if (typeof window === "undefined") return;
      try {
        window.localStorage.setItem(PASSKEY_ENROLLMENT_STORAGE_KEY, JSON.stringify(event));
        window.localStorage.removeItem(PASSKEY_ENROLLMENT_STORAGE_KEY);
      } catch {
        // Cross-tab synchronization is optional when browser storage is blocked.
      }
    },
    cleanup() {
      if (channel && channelListener) {
        channel.removeEventListener("message", channelListener);
      }
      channel?.close();
      channel = null;
      channelListener = null;
      if (storageListener && typeof window !== "undefined") {
        window.removeEventListener("storage", storageListener);
      }
      storageListener = null;
    }
  };
}

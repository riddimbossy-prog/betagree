const TAG = "betagree-board";
export const BOARD_SYNC_EVENT = "betagree:board-sync";

function notifyPage(detail?: unknown) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(BOARD_SYNC_EVENT, { detail }));
}

export async function requestBoardSync() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const syncManager = (reg as ServiceWorkerRegistration & { sync?: { register: (tag: string) => Promise<void> } }).sync;
    if (syncManager) {
      await syncManager.register(TAG);
      return true;
    }
    reg.active?.postMessage({ type: "SYNC_NOW" });
    return true;
  } catch {
    return false;
  }
}

export async function requestPeriodicBoardSync() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const periodic = (
      reg as ServiceWorkerRegistration & {
        periodicSync?: { register: (tag: string, opts: { minInterval: number }) => Promise<void> };
      }
    ).periodicSync;
    if (!periodic) return false;
    const status = await navigator.permissions.query({ name: "periodic-background-sync" as PermissionName });
    if (status.state !== "granted") return false;
    await periodic.register(TAG, { minInterval: 15 * 60 * 1000 });
    return true;
  } catch {
    return false;
  }
}

export function listenForBoardSync(onSync: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => onSync();
  window.addEventListener(BOARD_SYNC_EVENT, handler);
  return () => window.removeEventListener(BOARD_SYNC_EVENT, handler);
}

export function wireServiceWorkerSync(reg: ServiceWorkerRegistration) {
  const onMessage = (event: MessageEvent) => {
    if (event.data?.type === "BOARD_SYNCED") notifyPage(event.data);
  };
  navigator.serviceWorker.addEventListener("message", onMessage);

  const onOnline = () => {
    void requestBoardSync();
  };
  window.addEventListener("online", onOnline);

  return () => {
    navigator.serviceWorker.removeEventListener("message", onMessage);
    window.removeEventListener("online", onOnline);
  };
}

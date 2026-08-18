import { useEffect } from "react";
import { wireServiceWorkerSync } from "@/lib/background-sync";

export function ServiceWorkerGate() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const host = window.location.hostname;
    const preview = import.meta.env.DEV || host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0";
    if (preview) {
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) void reg.unregister();
      });
      return;
    }
    let cancelled = false;
    let unwire: (() => void) | undefined;
    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        if (cancelled) return;
        unwire = wireServiceWorkerSync(reg);
        reg.addEventListener("updatefound", () => {
          const worker = reg.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              worker.postMessage("SKIP_WAITING");
            }
          });
        });
      } catch {
        /* preview / insecure context */
      }
    };
    const idle = window.setTimeout(() => void register(), 4000);
    return () => {
      cancelled = true;
      window.clearTimeout(idle);
      unwire?.();
    };
  }, []);
  return null;
}

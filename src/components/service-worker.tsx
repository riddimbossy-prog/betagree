import { useEffect } from "react";
import { wireServiceWorkerSync } from "@/lib/background-sync";

export function ServiceWorkerGate() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
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
    void register();
    return () => {
      cancelled = true;
      unwire?.();
    };
  }, []);
  return null;
}

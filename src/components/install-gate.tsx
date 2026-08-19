import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useRouterState } from "@tanstack/react-router";
import { Download, Share, Smartphone, X } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";

const KEY = "betagree.install-gate.v1";
export const APK_HREF = "/app/betagree.apk";

type Step = "choose" | "android" | "ios";
type Kind = "ios" | "android" | "other";

function alreadyApp() {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone) return true;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  const ua = nav.userAgent || "";
  return /Android/i.test(ua) && /; wv\)/.test(ua);
}

function deviceKind(): Kind {
  const ua = navigator.userAgent || "";
  const touch = navigator.maxTouchPoints || 0;
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && touch > 1)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

function markSeen() {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* private mode */
  }
}

export function InstallGate() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.searchStr });
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("choose");
  const [kind, setKind] = useState<Kind>("other");

  useEffect(() => {
    if (pathname === "/get-app" || pathname === "/login") return;
    if (search.includes("install=1")) return;
    try {
      if (localStorage.getItem(KEY) === "1") return;
    } catch {
      return;
    }
    if (alreadyApp()) {
      markSeen();
      return;
    }
    setKind(deviceKind());
    const t = window.setTimeout(() => setOpen(true), 480);
    return () => window.clearTimeout(t);
  }, [pathname, search]);

  function close() {
    markSeen();
    setOpen(false);
  }

  function pickAndroid() {
    setStep("android");
    const a = document.createElement("a");
    a.href = APK_HREF;
    a.download = "betagree.apk";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="install-gate-overlay fixed inset-0 z-[70] bg-[hsl(262_40%_6%/0.72)] backdrop-blur-md" />
        <Dialog.Content
          aria-describedby={undefined}
          className="install-gate-card glass-strong fixed inset-x-3 z-[71] max-h-[min(90dvh,40rem)] overflow-y-auto rounded-[28px] text-card-foreground outline-none top-[max(1.25rem,env(safe-area-inset-top))] bottom-auto fold:inset-auto fold:top-1/2 fold:left-1/2 fold:w-[min(26.5rem,92vw)] fold:-translate-x-1/2 fold:-translate-y-1/2"
        >
          <div className="install-gate-hero relative overflow-hidden px-12 pt-5 pb-4 text-primary-foreground">
            <Dialog.Close className="glass absolute top-3 right-3 grid size-10 place-items-center rounded-full text-primary-foreground">
              <X className="size-5" />
              <span className="sr-only">Continue in the browser</span>
            </Dialog.Close>
            <div className="flex justify-center">
              <BrandLogo />
            </div>
            <p className="mt-4 text-center text-[11px] tracking-[0.22em] text-or uppercase">First visit</p>
            <Dialog.Title className="mt-1.5 text-center text-[1.65rem] leading-tight font-semibold tracking-tight fold:text-3xl">
              Take the desk <span className="font-serif italic font-normal">with you</span>
            </Dialog.Title>
            <p className="mx-auto mt-1.5 max-w-sm text-center text-sm text-primary-foreground/80">
              Home screen icon. Same board.
            </p>
          </div>

          <div className="space-y-3 px-4 pt-4 pb-4">
            {step === "choose" ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={pickAndroid}
                    className={cn(
                      "glass-lime flex flex-col items-start gap-1.5 rounded-[22px] p-3.5 text-left text-primary-foreground",
                      kind === "android" && "ring-2 ring-or",
                    )}
                  >
                    <Download className="size-5" />
                    <span className="text-[10px] tracking-[0.16em] uppercase opacity-80">Android</span>
                    <span className="text-base font-semibold leading-tight">Download APK</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("ios")}
                    className={cn(
                      "glass-purpure flex flex-col items-start gap-1.5 rounded-[22px] p-3.5 text-left text-primary-foreground",
                      kind === "ios" && "ring-2 ring-or",
                    )}
                  >
                    <Smartphone className="size-5" />
                    <span className="text-[10px] tracking-[0.16em] uppercase opacity-80">iPhone</span>
                    <span className="text-base font-semibold leading-tight">Home Screen</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={close}
                  className="flex w-full items-center justify-center py-1.5 text-sm text-subtle hover:text-foreground"
                >
                  Continue in the browser
                </button>
              </>
            ) : null}

            {step === "android" ? (
              <AndroidSteps onBack={() => setStep("choose")} onDone={close} />
            ) : null}
            {step === "ios" ? (
              <IosSteps onBack={() => setStep("choose")} onDone={close} />
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function AndroidSteps({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  return (
    <div className="space-y-4">
      <ol className="glass space-y-3 rounded-[22px] p-4 text-sm leading-relaxed text-muted-foreground">
        <li>
          <b className="text-foreground">1.</b> The Betagree package is downloading.
        </li>
        <li>
          <b className="text-foreground">2.</b> Open the file. Allow this browser to install apps if Android asks.
        </li>
        <li>
          <b className="text-foreground">3.</b> Open Betagree from your home screen.
        </li>
      </ol>
      <a
        href={APK_HREF}
        download="betagree.apk"
        className="glass-lime flex items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-semibold text-primary-foreground no-underline"
      >
        <Download className="size-4" />
        Download again
      </a>
      <div className="flex items-center justify-between gap-3 text-sm">
        <button type="button" onClick={onBack} className="text-subtle hover:text-foreground">
          Back
        </button>
        <button type="button" onClick={onDone} className="font-semibold text-or">
          I have the app
        </button>
      </div>
    </div>
  );
}

function IosSteps({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  return (
    <div className="space-y-4">
      <ol className="glass space-y-3 rounded-[22px] p-4 text-sm leading-relaxed text-muted-foreground">
        <li>
          <b className="text-foreground">1.</b> Open this site in <b className="text-foreground">Safari</b> — not Chrome.
        </li>
        <li>
          <b className="text-foreground">2.</b> Tap <Share className="mx-0.5 inline size-3.5 align-[-2px]" /> Share, then{" "}
          <b className="text-foreground">Add to Home Screen</b>.
        </li>
        <li>
          <b className="text-foreground">3.</b> Tap Add. Betagree sits next to your other apps.
        </li>
      </ol>
      <div className="flex items-center justify-between gap-3 text-sm">
        <button type="button" onClick={onBack} className="text-subtle hover:text-foreground">
          Back
        </button>
        <button type="button" onClick={onDone} className="font-semibold text-or">
          I have the app
        </button>
      </div>
    </div>
  );
}

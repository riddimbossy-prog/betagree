import { createFileRoute, Link } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return (
    <div className="mx-auto grid min-h-[60vh] max-w-md place-items-center">
      <div className="w-full rounded-2xl bg-card p-6 shadow-border sm:p-8">
        <BrandLogo className="mb-5" />
        <p className="text-xs tracking-widest text-subtle uppercase">Account</p>
        <h1 className="font-display mt-2 text-3xl">Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Save the consensus card on this device. Betagree never places a bet.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          {authEnabled ? (
            GROK_PROVIDERS.map((p) => (
              <Button
                key={p.providerId}
                type="button"
                variant="outline"
                className="w-full justify-center"
                onClick={() => signIn(p.providerId, { callbackURL: "/" })}
              >
                Continue with {p.label}
              </Button>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Sign-in is disabled in this build.</p>
          )}
        </div>
        <p className="mt-6 text-center text-xs text-subtle">
          <Link to="/" className="underline-offset-4 hover:underline">
            Back to the desk
          </Link>
        </p>
      </div>
    </div>
  );
}

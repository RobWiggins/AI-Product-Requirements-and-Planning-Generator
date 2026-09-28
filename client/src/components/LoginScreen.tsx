import { AlertCircle, ArrowRight, Loader2, Sparkles, UserRound } from "lucide-react";
import type { AuthProviders, OAuthProviderName } from "../lib/api";
import { GitHubIcon, GoogleIcon } from "./BrandIcons";

interface Props {
  providers: AuthProviders;
  pending: boolean;
  notice: { kind: "info" | "error"; text: string } | null;
  onGuest: () => void;
  onOAuth: (provider: OAuthProviderName) => void;
}

/**
 * The entry point for a visitor:
 *
 *                 ┌─ Continue as Guest
 *   Visitor ──────┼─ Continue with Google
 *                 └─ Continue with GitHub
 *
 * Every branch ends in the same place — a session for an internal user whose
 * UUID owns the plans they create.
 */
export function LoginScreen({ providers, pending, notice, onGuest, onOAuth }: Props) {
  const optionClass =
    "w-full inline-flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left font-ui text-[15px] transition-colors disabled:cursor-not-allowed";

  return (
    <div className="relative z-10 min-h-screen flex flex-col">
      <header className="px-5 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-accent text-[22px] -translate-y-px select-none">◐</span>
          <span className="font-serif text-[22px] font-semibold tracking-tight text-ink">StoryFlow</span>
        </div>
        <span className="hidden sm:inline font-ui text-[13px] text-ink-3">Product plans from a paragraph</span>
      </header>

      <main className="flex-1 flex items-center">
        <div className="max-w-6xl w-full mx-auto px-5 sm:px-8 py-12 grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,420px)] gap-12 lg:gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-wash text-accent-ink font-mono text-[11px] uppercase tracking-[0.14em] mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              For solo founders &amp; indie makers
            </div>
            <h1 className="font-serif text-[clamp(40px,5.4vw,68px)] leading-[1.05] tracking-[-0.025em] font-normal text-ink mb-5">
              From <em className="italic font-medium text-accent-ink">a single paragraph</em>
              <br />
              to a full product plan.
            </h1>
            <p className="font-ui text-[18px] leading-relaxed text-ink-2 max-w-xl">
              Describe the problem you want to solve. StoryFlow drafts a PRD, user stories with
              acceptance criteria, Gherkin scenarios, and engineering tasks — saved to your account
              so you can pick up where you left off.
            </p>
          </div>

          <section
            aria-labelledby="signin-heading"
            className="bg-paper border border-rule rounded-2xl p-6 sm:p-7 shadow-[0_2px_0_var(--color-rule-soft),0_18px_40px_-24px_oklch(0.4_0.06_50/.28)]"
          >
            <span className="eyebrow">Get started</span>
            <h2 id="signin-heading" className="font-serif text-[26px] font-medium tracking-tight text-ink mt-1 mb-5">
              Choose how to continue
            </h2>

            {notice && (
              <div
                role={notice.kind === "error" ? "alert" : "status"}
                className={`mb-4 p-3 rounded-xl flex items-start gap-2.5 text-[13px] font-ui border ${
                  notice.kind === "error"
                    ? "bg-accent-wash border-accent/20 text-accent-ink"
                    : "bg-paper-2 border-rule-soft text-ink-2"
                }`}
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="m-0">{notice.text}</p>
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onGuest}
                disabled={pending}
                className={`${optionClass} border-ink bg-ink text-paper hover:bg-accent-ink hover:border-accent-ink disabled:opacity-60`}
              >
                <span className="w-8 h-8 rounded-lg bg-paper/15 flex items-center justify-center shrink-0">
                  {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserRound className="w-4 h-4" />}
                </span>
                <span className="flex-1">
                  <span className="block font-medium">Continue as Guest</span>
                  <span className="block text-[12px] opacity-75">No sign-up. Link an account later to keep your work.</span>
                </span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>

              <ProviderButton
                label="Continue with Google"
                enabled={providers.google}
                onClick={() => onOAuth("google")}
                icon={<GoogleIcon />}
                className={optionClass}
              />
              <ProviderButton
                label="Continue with GitHub"
                enabled={providers.github}
                onClick={() => onOAuth("github")}
                icon={<GitHubIcon className="w-4 h-4 text-ink" />}
                className={optionClass}
              />
            </div>

            <p className="mt-5 font-ui text-[12px] leading-relaxed text-ink-3">
              Each option creates a private workspace tied to your account. Guests can sign in with
              Google or GitHub at any time to carry their plans over.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

function ProviderButton({
  label,
  enabled,
  onClick,
  icon,
  className,
}: {
  label: string;
  enabled: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  className: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!enabled}
      title={enabled ? undefined : "Not configured on this server"}
      className={`${className} border-rule bg-paper text-ink hover:border-accent/40 hover:bg-accent-wash/30 disabled:opacity-50`}
    >
      <span className="w-8 h-8 rounded-lg border border-rule-soft bg-paper-2 flex items-center justify-center shrink-0">
        {icon}
      </span>
      <span className="flex-1">
        <span className="block font-medium">{label}</span>
        {!enabled && <span className="block text-[12px] text-ink-3">Not configured on this server</span>}
      </span>
      <ArrowRight className="w-4 h-4 shrink-0 text-ink-3" />
    </button>
  );
}

export default LoginScreen;

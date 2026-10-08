import { useEffect, useRef, useState } from "react";
import { ChevronDown, Link2, LogOut } from "lucide-react";
import type { AuthProviders, AuthUser, OAuthProviderName } from "../lib/api";
import { initials } from "../lib/format";
import { GitHubIcon, GoogleIcon } from "./BrandIcons";

interface Props {
  user: AuthUser;
  providers: AuthProviders;
  onSignOut: () => void;
  onLinkProvider: (provider: OAuthProviderName) => void;
}

/** Avatar + name in the header; opens account actions (link / sign out). */
export function UserMenu({ user, providers, onSignOut, onLinkProvider }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const linkable = (["google", "github"] as OAuthProviderName[]).filter(
    (p) => providers[p] && !user.providers.includes(p),
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="inline-flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full border border-rule-soft bg-paper hover:border-accent/40 transition-colors"
      >
        <Avatar user={user} />
        <span className="hidden sm:inline font-ui text-[13px] text-ink max-w-[10rem] truncate">{user.name}</span>
        {user.isGuest && (
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-full bg-paper-2 text-ink-3 border border-rule-soft">
            Guest
          </span>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-ink-3" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-rule bg-paper shadow-[0_18px_40px_-24px_oklch(0.4_0.06_50/.4)] p-2 z-30"
        >
          <div className="px-3 py-2.5 flex items-center gap-3 border-b border-rule-soft mb-1">
            <Avatar user={user} size="lg" />
            <div className="min-w-0">
              <div className="font-ui text-[14px] font-medium text-ink truncate">{user.name}</div>
              <div className="font-mono text-[11px] text-ink-3 truncate">
                {user.isGuest ? "Guest session" : user.email ?? "Signed in"}
              </div>
            </div>
          </div>

          {user.isGuest && linkable.length > 0 && (
            <div className="px-3 pt-2 pb-1">
              <div className="eyebrow inline-flex items-center gap-1.5 mb-2">
                <Link2 className="w-3 h-3" />
                Keep your work
              </div>
              <p className="font-ui text-[12px] text-ink-2 leading-snug mb-2 m-0">
                Link an account and your saved plans come with you.
              </p>
            </div>
          )}

          {linkable.map((p) => (
            <button
              key={p}
              type="button"
              role="menuitem"
              onClick={() => onLinkProvider(p)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-ui text-[13px] text-ink hover:bg-paper-2 transition-colors"
            >
              {p === "google" ? <GoogleIcon /> : <GitHubIcon className="w-4 h-4 text-ink" />}
              {user.isGuest ? `Continue with ${p === "google" ? "Google" : "GitHub"}` : `Link ${p === "google" ? "Google" : "GitHub"}`}
            </button>
          ))}

          {!user.isGuest && user.providers.length > 0 && (
            <div className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
              Linked: {user.providers.join(", ")}
            </div>
          )}

          <button
            type="button"
            role="menuitem"
            onClick={onSignOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-ui text-[13px] text-ink-2 hover:bg-paper-2 hover:text-accent-ink transition-colors mt-1"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function Avatar({ user, size = "sm" }: { user: AuthUser; size?: "sm" | "lg" }) {
  const dim = size === "lg" ? "w-10 h-10 text-[13px]" : "w-7 h-7 text-[11px]";
  if (user.avatarUrl) {
    return <img src={user.avatarUrl} alt="" className={`${dim} rounded-full object-cover`} referrerPolicy="no-referrer" />;
  }
  return (
    <span
      aria-hidden
      className={`${dim} rounded-full bg-accent-wash text-accent-ink font-mono font-medium flex items-center justify-center`}
    >
      {initials(user.name)}
    </span>
  );
}

export default UserMenu;

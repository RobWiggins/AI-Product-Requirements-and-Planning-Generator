import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { LoginScreen, Workspace, type TweakSettings } from "./components";
import { authApi } from "./lib/api";
import { useAppDispatch, useAppSelector } from "./hooks";
import { bootstrapSession, continueAsGuest, setAuthNotice } from "./store/slices/authSlice";

const TWEAK_DEFAULTS: TweakSettings = {
  accentHue: 38,
  serif: "newsreader",
};

const SERIF_MAP: Record<TweakSettings["serif"], string> = {
  newsreader: `"Newsreader", "Source Serif 4", Georgia, serif`,
  source: `"Source Serif 4", "Newsreader", Georgia, serif`,
  system: `Georgia, "Times New Roman", serif`,
};

/**
 * Turn the `?auth=…` query the OAuth callback redirects with into a notice,
 * then strip it from the URL so a refresh doesn't replay it.
 */
function consumeAuthRedirect(): { kind: "info" | "error"; text: string } | null {
  const params = new URLSearchParams(window.location.search);
  const outcome = params.get("auth");
  if (!outcome) return null;

  const reason = params.get("reason");
  window.history.replaceState({}, "", window.location.pathname);

  if (outcome === "ok") return null;
  if (outcome === "cancelled") return { kind: "info", text: "Sign-in was cancelled." };
  return { kind: "error", text: `Sign-in failed${reason ? ` (${reason.replace(/_/g, " ")})` : ""}. Please try again.` };
}

/**
 * Auth gate:
 *   loading        → splash
 *   anonymous      → LoginScreen (Guest / Google / GitHub)
 *   authenticated  → Workspace for that user
 */
export default function App() {
  const dispatch = useAppDispatch();
  const auth = useAppSelector((s) => s.auth);
  const [settings, setSettings] = useState<TweakSettings>(TWEAK_DEFAULTS);

  useEffect(() => {
    const notice = consumeAuthRedirect();
    if (notice) dispatch(setAuthNotice(notice));
    dispatch(bootstrapSession());
  }, [dispatch]);

  useEffect(() => {
    const root = document.documentElement;
    const h = settings.accentHue;
    root.style.setProperty("--color-accent", `oklch(0.56 0.14 ${h})`);
    root.style.setProperty("--color-accent-ink", `oklch(0.35 0.1 ${h})`);
    root.style.setProperty("--color-accent-wash", `oklch(0.93 0.04 ${h})`);
    root.style.setProperty("--font-serif", SERIF_MAP[settings.serif]);
  }, [settings.accentHue, settings.serif]);

  return (
    <div className="relative flex flex-col min-h-screen h-screen overflow-x-hidden bg-paper text-ink font-ui selection:bg-accent-wash">
      {/* Soft, vibrant paper wash that follows the accent hue */}
      <div
        aria-hidden
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(1200px 600px at 10% -10%, oklch(0.93 0.05 ${settings.accentHue} / 0.55), transparent 60%),
            radial-gradient(900px 500px at 110% 5%, oklch(0.94 0.04 150 / 0.4), transparent 60%),
            radial-gradient(700px 600px at 50% 110%, oklch(0.95 0.03 235 / 0.35), transparent 60%)
          `,
        }}
      />

      {auth.status === "loading" ? (
        <div className="relative z-10 flex-1 flex items-center justify-center" role="status" aria-label="Loading">
          <Loader2 className="w-5 h-5 animate-spin text-ink-3" />
        </div>
      ) : auth.status === "anonymous" || !auth.user ? (
        <LoginScreen
          providers={auth.providers}
          pending={auth.pending}
          notice={auth.notice}
          onGuest={() => dispatch(continueAsGuest())}
          onOAuth={(provider) => authApi.startOAuth(provider)}
        />
      ) : (
        <Workspace
          key={auth.user.id}
          user={auth.user}
          settings={settings}
          onSetSettings={(patch: Partial<TweakSettings>) => setSettings((s) => ({ ...s, ...patch }))}
        />
      )}
    </div>
  );
}

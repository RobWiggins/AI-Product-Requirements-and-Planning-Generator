import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ApiError, authApi, AuthProviders, AuthUser } from "../../lib/api";

/**
 *                 ┌─ Continue as Guest
 *   Visitor ──────┼─ Continue with Google  ──▶ session cookie ──▶ AuthUser (UUID)
 *                 └─ Continue with GitHub
 *
 * `status` drives the top-level gate in App.tsx:
 *   loading        → splash while we ask the server who we are
 *   anonymous      → LoginScreen
 *   authenticated  → Workspace (user-owned data)
 */
export type AuthStatus = "loading" | "anonymous" | "authenticated";

export interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  providers: AuthProviders;
  /** Transient message from an OAuth redirect (`?auth=…`) or a failed action. */
  notice: { kind: "info" | "error"; text: string } | null;
  pending: boolean;
}

const initialState: AuthState = {
  status: "loading",
  user: null,
  providers: { guest: true, google: false, github: false },
  notice: null,
  pending: false,
};

const message = (err: unknown, fallback: string) =>
  err instanceof ApiError ? err.message : err instanceof Error ? err.message : fallback;

/** Ask the server which providers exist and whether a session cookie is valid. */
export const bootstrapSession = createAsyncThunk("auth/bootstrap", async () => {
  const [providers, me] = await Promise.all([
    authApi.providers().catch((): AuthProviders => initialState.providers),
    authApi.me().then(
      (r) => r.user,
      (err) => {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      },
    ),
  ]);
  return { providers, user: me };
});

export const continueAsGuest = createAsyncThunk("auth/guest", async (_, { rejectWithValue }) => {
  try {
    return (await authApi.guest()).user;
  } catch (err) {
    return rejectWithValue(message(err, "Could not start a guest session."));
  }
});

export const signOut = createAsyncThunk("auth/signOut", async () => {
  await authApi.logout();
});

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuthNotice(state, action: PayloadAction<AuthState["notice"]>) {
      state.notice = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapSession.pending, (state) => {
        state.status = "loading";
      })
      .addCase(bootstrapSession.fulfilled, (state, { payload }) => {
        state.providers = payload.providers;
        state.user = payload.user;
        state.status = payload.user ? "authenticated" : "anonymous";
      })
      .addCase(bootstrapSession.rejected, (state, action) => {
        state.status = "anonymous";
        state.user = null;
        state.notice = { kind: "error", text: action.error.message ?? "Could not reach the server." };
      })

      .addCase(continueAsGuest.pending, (state) => {
        state.pending = true;
        state.notice = null;
      })
      .addCase(continueAsGuest.fulfilled, (state, { payload }) => {
        state.pending = false;
        state.user = payload;
        state.status = "authenticated";
      })
      .addCase(continueAsGuest.rejected, (state, action) => {
        state.pending = false;
        state.notice = { kind: "error", text: (action.payload as string) ?? "Could not start a guest session." };
      })

      .addCase(signOut.fulfilled, (state) => {
        state.user = null;
        state.status = "anonymous";
        state.notice = null;
      })
      .addCase(signOut.rejected, (state) => {
        // Even if the server call failed, drop the local session so the UI resets.
        state.user = null;
        state.status = "anonymous";
      });
  },
});

export const { setAuthNotice } = authSlice.actions;
export default authSlice.reducer;

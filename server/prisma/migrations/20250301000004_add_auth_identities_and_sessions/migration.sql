-- Authentication: external identities + server-side sessions.
--
--                 ┌─ Continue as Guest      (users.is_guest = true, no identity)
--   Visitor ──────┼─ Continue with Google   (auth_identities.provider = 'google')
--                 └─ Continue with GitHub   (auth_identities.provider = 'github')
--                            ↓
--                     sessions (cookie)  ──▶  users.id (UUID)  ──▶  projects…
--
-- users was designed for password login. It becomes the internal user record:
--   * email is optional (guests have none) but still unique when present
--   * password_hash is dropped — there is no password flow
--   * avatar_url / is_guest carry provider profile + guest state

ALTER TABLE users
  DROP COLUMN password_hash,
  ADD COLUMN avatar_url text,
  ADD COLUMN is_guest   boolean NOT NULL DEFAULT false,
  ALTER COLUMN email DROP NOT NULL;

-- One row per external login. A user may link several providers.
CREATE TABLE auth_identities (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider            text NOT NULL CHECK (provider IN ('google', 'github')),
  -- Provider's stable subject id (Google `sub`, GitHub numeric id)
  provider_account_id text NOT NULL,
  -- Email as reported by the provider at sign-in time
  email               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_account_id)
);

CREATE INDEX idx_auth_identities_user_id ON auth_identities(user_id);

-- Server-side sessions. The cookie holds a random token; only its SHA-256
-- hash is stored, so a database leak cannot be replayed.
CREATE TABLE sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   text NOT NULL UNIQUE,
  expires_at   timestamptz NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_user_id    ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

GRANT ALL PRIVILEGES ON TABLE auth_identities, sessions TO storyflow;

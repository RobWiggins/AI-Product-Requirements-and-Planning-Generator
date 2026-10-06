DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS auth_identities;

ALTER TABLE users
  DROP COLUMN IF EXISTS avatar_url,
  DROP COLUMN IF EXISTS is_guest;

-- Guests have NULL email; the original users.email column was NOT NULL.
UPDATE users
SET email = 'recovered-' || id::text || '@local.invalid'
WHERE email IS NULL;

ALTER TABLE users ALTER COLUMN email SET NOT NULL;

ALTER TABLE users ADD COLUMN password_hash text NOT NULL DEFAULT '';
ALTER TABLE users ALTER COLUMN password_hash DROP DEFAULT;

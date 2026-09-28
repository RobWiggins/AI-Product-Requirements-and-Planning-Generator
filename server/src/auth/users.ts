import { prisma } from "../db/prisma";
import { OAuthProfile } from "./oauth";
import { SessionUser, toSessionUser } from "./session";

const withIdentities = { identities: { select: { provider: true } } } as const;

/** Creates an anonymous internal user. Their UUID owns data like anyone else's. */
export async function createGuestUser(): Promise<SessionUser> {
  const user = await prisma.user.create({
    data: { name: "Guest", isGuest: true },
    include: withIdentities,
  });
  return toSessionUser(user);
}

/**
 * Maps an external identity onto an internal user, creating or linking as
 * needed. Resolution order:
 *
 *  1. Identity already linked            → that user
 *  2. Caller is a guest                  → upgrade the guest in place (keeps their data),
 *                                          unless the verified email belongs to someone else
 *  3. Verified email matches a user      → link identity to that user
 *  4. Otherwise                          → brand-new user
 */
export async function resolveUserForProfile(
  profile: OAuthProfile,
  current: SessionUser | undefined,
): Promise<SessionUser> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.authIdentity.findUnique({
      where: { provider_providerAccountId: { provider: profile.provider, providerAccountId: profile.providerAccountId } },
      include: { user: { include: withIdentities } },
    });

    if (existing) {
      if (existing.email !== profile.verifiedEmail) {
        await tx.authIdentity.update({ where: { id: existing.id }, data: { email: profile.verifiedEmail } });
      }
      // Fill in profile details a guest-turned-user may still be missing.
      const patch: { avatarUrl?: string; name?: string } = {};
      if (!existing.user.avatarUrl && profile.avatarUrl) patch.avatarUrl = profile.avatarUrl;
      if (existing.user.name === "Guest") patch.name = profile.name;
      const user = Object.keys(patch).length
        ? await tx.user.update({ where: { id: existing.user.id }, data: patch, include: withIdentities })
        : existing.user;
      return toSessionUser(user);
    }

    const emailOwner = profile.verifiedEmail
      ? await tx.user.findUnique({ where: { email: profile.verifiedEmail }, include: withIdentities })
      : null;

    let targetId: string;

    if (current?.isGuest && (!emailOwner || emailOwner.id === current.id)) {
      // Upgrade the guest: same UUID, so every project they made stays theirs.
      await tx.user.update({
        where: { id: current.id },
        data: {
          isGuest: false,
          name: profile.name,
          email: profile.verifiedEmail ?? undefined,
          avatarUrl: profile.avatarUrl ?? undefined,
        },
      });
      targetId = current.id;
    } else if (emailOwner) {
      targetId = emailOwner.id;
    } else {
      const created = await tx.user.create({
        data: { name: profile.name, email: profile.verifiedEmail, avatarUrl: profile.avatarUrl },
      });
      targetId = created.id;
    }

    await tx.authIdentity.create({
      data: {
        userId: targetId,
        provider: profile.provider,
        providerAccountId: profile.providerAccountId,
        email: profile.verifiedEmail,
      },
    });

    const user = await tx.user.findUniqueOrThrow({ where: { id: targetId }, include: withIdentities });
    return toSessionUser(user);
  });
}

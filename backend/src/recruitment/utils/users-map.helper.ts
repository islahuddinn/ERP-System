export const RECRUITMENT_USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
} as const;

export interface RecruitmentUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export type UsersMap = Record<string, RecruitmentUser>;

// User info is resolved via the users-map pattern (no Prisma relation from
// recruitment tables to users) — see purchase-order.repository.ts for the canonical version.
export async function fetchUsersMap(
  prisma: any,
  ids: (string | null | undefined)[],
): Promise<UsersMap> {
  const uniqueIds = [...new Set(ids.filter(Boolean))] as string[];
  if (!uniqueIds.length) return {};

  const users = await prisma.user.findMany({
    where: { id: { in: uniqueIds } },
    select: RECRUITMENT_USER_SELECT,
  });
  return Object.fromEntries(users.map((user: RecruitmentUser) => [user.id, user]));
}

export function toUserOrNull(
  userId: string | null | undefined,
  usersMap: UsersMap,
): RecruitmentUser | null {
  return userId ? (usersMap[userId] ?? null) : null;
}

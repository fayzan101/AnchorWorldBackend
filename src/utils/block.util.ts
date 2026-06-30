/**
 * Returns user IDs blocked by or blocking the viewer.
 * Phase 7 will implement real block filtering.
 */
export async function getBlockedUserIds(_userId: string): Promise<string[]> {
  return [];
}

export async function isEitherBlocked(
  userId1: string,
  userId2: string
): Promise<boolean> {
  const [blockedByUser1, blockedByUser2] = await Promise.all([
    getBlockedUserIds(userId1),
    getBlockedUserIds(userId2),
  ]);
  return (
    blockedByUser1.includes(userId2) || blockedByUser2.includes(userId1)
  );
}

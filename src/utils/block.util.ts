import { BlockRepository } from "../repositories/block.repository";

const blockRepository = new BlockRepository();

/**
 * Returns user IDs blocked by or blocking the viewer (bidirectional).
 */
export async function getBlockedUserIds(userId: string): Promise<string[]> {
  return blockRepository.findBlockedPairIds(userId);
}

/**
 * True if either user has blocked the other.
 */
export async function isEitherBlocked(
  userId1: string,
  userId2: string
): Promise<boolean> {
  return blockRepository.isEitherBlocked(userId1, userId2);
}

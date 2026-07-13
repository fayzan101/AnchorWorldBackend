import { BlockRepository } from "../repositories/block.repository";

let blockRepository: BlockRepository | null = null;

function getBlockRepository(): BlockRepository {
  if (!blockRepository) {
    blockRepository = new BlockRepository();
  }
  return blockRepository;
}

/**
 * Returns user IDs blocked by or blocking the viewer (bidirectional).
 */
export async function getBlockedUserIds(userId: string): Promise<string[]> {
  return getBlockRepository().findBlockedPairIds(userId);
}

/**
 * True if either user has blocked the other.
 */
export async function isEitherBlocked(
  userId1: string,
  userId2: string
): Promise<boolean> {
  return getBlockRepository().isEitherBlocked(userId1, userId2);
}

import { BlockRepository } from "../repositories/block.repository";

let blockRepository: BlockRepository | undefined;

function getBlockRepository(): BlockRepository {
  if (!blockRepository) {
    blockRepository = new BlockRepository();
  }
  return blockRepository;
}

/**
 * Returns user IDs blocked by or blocking the viewer.
 */
export async function getBlockedUserIds(userId: string): Promise<string[]> {
  return getBlockRepository().getBlockedUserIds(userId);
}

export async function isEitherBlocked(
  userId1: string,
  userId2: string
): Promise<boolean> {
  return getBlockRepository().isEitherBlocked(userId1, userId2);
}

/** @internal Test helper */
export function resetBlockRepositoryForTests(): void {
  blockRepository = undefined;
}

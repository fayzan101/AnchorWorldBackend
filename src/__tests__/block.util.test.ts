jest.mock("../repositories/block.repository", () => {
  const findBlockedPairIds = jest.fn();
  const isEitherBlocked = jest.fn();
  return {
    BlockRepository: jest.fn().mockImplementation(() => ({
      findBlockedPairIds,
      isEitherBlocked,
    })),
    __mocks: { findBlockedPairIds, isEitherBlocked },
  };
});

import { getBlockedUserIds, isEitherBlocked } from "../utils/block.util";

const repoMocks = (
  jest.requireMock("../repositories/block.repository") as {
    __mocks: {
      findBlockedPairIds: jest.Mock;
      isEitherBlocked: jest.Mock;
    };
  }
).__mocks;

describe("block.util", () => {
  beforeEach(() => {
    repoMocks.findBlockedPairIds.mockReset();
    repoMocks.isEitherBlocked.mockReset();
  });

  it("getBlockedUserIds returns bidirectional blocked ids", async () => {
    repoMocks.findBlockedPairIds.mockResolvedValue(["user-b", "user-c"]);

    await expect(getBlockedUserIds("user-a")).resolves.toEqual([
      "user-b",
      "user-c",
    ]);
    expect(repoMocks.findBlockedPairIds).toHaveBeenCalledWith("user-a");
  });

  it("isEitherBlocked returns repository result", async () => {
    repoMocks.isEitherBlocked.mockResolvedValue(true);

    await expect(isEitherBlocked("user-a", "user-b")).resolves.toBe(true);
    expect(repoMocks.isEitherBlocked).toHaveBeenCalledWith("user-a", "user-b");
  });
});

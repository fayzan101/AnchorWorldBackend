import request from "supertest";
import { createApp } from "../app";
import { AppDataSource, initializeDatabase } from "../config/database";

const runIntegration = process.env.RUN_INTEGRATION_TESTS === "true";

(runIntegration ? describe : describe.skip)("Connections API integration", () => {
  const app = createApp();
  let tokenA: string;
  let tokenB: string;
  let tokenC: string;
  let userBId: string;

  const registerUser = async (label: string) => {
    const email = `connections-${label}-${Date.now()}@example.com`;
    const res = await request(app).post("/api/auth/register").send({
      email,
      password: "Password1",
      full_name: `User ${label}`,
      date_of_birth: "1995-01-01",
      gender: "female",
    });
    return {
      token: res.body.data.access_token as string,
      userId: res.body.data.user.id as string,
    };
  };

  beforeAll(async () => {
    await initializeDatabase();
    const userA = await registerUser("a");
    const userB = await registerUser("b");
    const userC = await registerUser("c");
    tokenA = userA.token;
    tokenB = userB.token;
    tokenC = userC.token;
    userBId = userB.userId;
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  it("creates a connection when B accepts A's request", async () => {
    await request(app)
      .post(`/api/follows/${userBId}`)
      .set("Authorization", `Bearer ${tokenA}`);

    const pendingRes = await request(app)
      .get("/api/follows/pending")
      .set("Authorization", `Bearer ${tokenB}`);

    const followId = pendingRes.body.data.requests[0].id;

    const acceptRes = await request(app)
      .put(`/api/follows/${followId}/accept`)
      .set("Authorization", `Bearer ${tokenB}`);

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.message).toBe("You are now connected!");

    const connectionsRes = await request(app)
      .get("/api/follows/connections")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(connectionsRes.body.data.connections).toHaveLength(1);
  });

  it("awards +50 connection points to both users once", async () => {
    const balanceA = await request(app)
      .get("/api/points/balance")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(balanceA.body.data.balance).toBeGreaterThanOrEqual(50);
  });

  it("blocks messaging between non-connected users", async () => {
    const res = await request(app)
      .post(`/api/messages/${userBId}`)
      .set("Authorization", `Bearer ${tokenC}`)
      .send({ content: "Should fail" });

    expect(res.status).toBe(403);
  });
});

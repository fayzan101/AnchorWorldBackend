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

  it("returns empty connections before any follow", async () => {
    const res = await request(app)
      .get("/api/follows/connections")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data.connections).toEqual([]);
  });

  it("returns deprecated matches alias with X-Deprecated header", async () => {
    const res = await request(app)
      .get("/api/follows/matches")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.headers["x-deprecated"]).toBe("true");
    expect(res.body.data).toHaveProperty("matches");
  });

  it("creates a connection when B accepts A's request", async () => {
    const followRes = await request(app)
      .post(`/api/follows/${userBId}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(followRes.status).toBe(201);

    const pendingRes = await request(app)
      .get("/api/follows/pending")
      .set("Authorization", `Bearer ${tokenB}`);

    expect(pendingRes.body.data.requests).toHaveLength(1);
    const followId = pendingRes.body.data.requests[0].id;

    const acceptRes = await request(app)
      .put(`/api/follows/${followId}/accept`)
      .set("Authorization", `Bearer ${tokenB}`);

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.message).toBe("You are now connected!");

    const connectionsRes = await request(app)
      .get("/api/follows/connections")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(connectionsRes.status).toBe(200);
    expect(connectionsRes.body.data.connections).toHaveLength(1);
    expect(connectionsRes.body.data.connections[0].id).toBe(userBId);
  });

  it("awards +50 connection points to both users once", async () => {
    const balanceA = await request(app)
      .get("/api/points/balance")
      .set("Authorization", `Bearer ${tokenA}`);
    const balanceB = await request(app)
      .get("/api/points/balance")
      .set("Authorization", `Bearer ${tokenB}`);

    expect(balanceA.body.data.balance).toBeGreaterThanOrEqual(50);
    expect(balanceB.body.data.balance).toBeGreaterThanOrEqual(50);

    const txA = await request(app)
      .get("/api/points/transactions")
      .set("Authorization", `Bearer ${tokenA}`);
    const connectionTx = txA.body.data.items.filter(
      (tx: { type: string }) => tx.type === "connection_made"
    );
    expect(connectionTx.length).toBeGreaterThanOrEqual(1);
    expect(connectionTx[0].amount).toBe(50);
  });

  it("includes connection_status on user profile", async () => {
    const res = await request(app)
      .get(`/api/users/${userBId}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data.connection_status).toBe("connected");
  });

  it("allows messaging between connected users", async () => {
    const res = await request(app)
      .post(`/api/messages/${userBId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ content: "Hello connection!" });

    expect(res.status).toBe(201);
    expect(res.body.data.content).toBe("Hello connection!");
  });

  it("blocks messaging between non-connected users", async () => {
    const res = await request(app)
      .post(`/api/messages/${userBId}`)
      .set("Authorization", `Bearer ${tokenC}`)
      .send({ content: "Should fail" });

    expect(res.status).toBe(403);
  });

  it("returns connected relationship_status in user search", async () => {
    const res = await request(app)
      .get("/api/users?purpose=search&search=User")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    const userB = res.body.data.items.find(
      (u: { id: string }) => u.id === userBId
    );
    expect(userB?.relationship_status).toBe("connected");
  });
});

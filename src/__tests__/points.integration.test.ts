import request from "supertest";
import { createApp } from "../app";
import { AppDataSource, initializeDatabase } from "../config/database";

const runIntegration = process.env.RUN_INTEGRATION_TESTS === "true";

(runIntegration ? describe : describe.skip)("Points API integration", () => {
  const app = createApp();
  let accessToken: string;
  const uniqueEmail = `points-test-${Date.now()}@example.com`;

  beforeAll(async () => {
    await initializeDatabase();
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  it("registers, logs in, awards daily login points, and returns balance", async () => {
    await request(app).post("/api/auth/register").send({
      email: uniqueEmail,
      password: "Password1",
      full_name: "Points Tester",
      date_of_birth: "1995-01-01",
      gender: "female",
    });

    const loginRes = await request(app).post("/api/auth/login").send({
      email: uniqueEmail,
      password: "Password1",
    });

    expect(loginRes.status).toBe(200);
    accessToken = loginRes.body.data.access_token;

    const balanceRes = await request(app)
      .get("/api/points/balance")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(balanceRes.status).toBe(200);
    expect(balanceRes.body.data.balance).toBeGreaterThanOrEqual(10);

    const secondLogin = await request(app).post("/api/auth/login").send({
      email: uniqueEmail,
      password: "Password1",
    });

    const balanceAfterSecondLogin = await request(app)
      .get("/api/points/balance")
      .set("Authorization", `Bearer ${secondLogin.body.data.access_token}`);

    expect(balanceAfterSecondLogin.body.data.balance).toBe(
      balanceRes.body.data.balance
    );
  });

  it("returns community profile without dating fields", async () => {
    const profileRes = await request(app)
      .get("/api/profile")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(profileRes.status).toBe(200);
    expect(profileRes.body.data).toHaveProperty("interests");
    expect(profileRes.body.data).toHaveProperty("points_balance");
    expect(profileRes.body.data).not.toHaveProperty("seeking_relation");
    expect(profileRes.body.data).not.toHaveProperty("relationship_goals");
  });
});

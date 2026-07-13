import request from "supertest";
import { createApp } from "../app";
import { AppDataSource, initializeDatabase } from "../config/database";
import { seedCircles } from "../scripts/seed-circles";

const runIntegration = process.env.RUN_INTEGRATION_TESTS === "true";

(runIntegration ? describe : describe.skip)("Circles API integration", () => {
  const app = createApp();
  let accessToken: string;
  let circleId: string;
  const uniqueEmail = `circles-test-${Date.now()}@example.com`;

  beforeAll(async () => {
    await initializeDatabase();
    await seedCircles();

    const registerRes = await request(app).post("/api/auth/register").send({
      email: uniqueEmail,
      password: "Password1",
      full_name: "Circles Tester",
      date_of_birth: "1995-01-01",
      gender: "female",
    });

    accessToken = registerRes.body.data.access_token;
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  it("lists seeded circles with featured endpoint", async () => {
    const listRes = await request(app)
      .get("/api/circles")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(7);

    const featuredRes = await request(app)
      .get("/api/circles/featured")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(featuredRes.status).toBe(200);
    expect(featuredRes.body.data.length).toBeGreaterThan(0);
    expect(featuredRes.body.data.length).toBeLessThanOrEqual(5);

    circleId = listRes.body.data[0].id;
  });

  it("joins a circle, awards points once, and shows on profile", async () => {
    const listRes = await request(app)
      .get("/api/circles")
      .set("Authorization", `Bearer ${accessToken}`);

    circleId = listRes.body.data[0].id;

    const joinRes = await request(app)
      .post(`/api/circles/${circleId}/join`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(joinRes.status).toBe(201);
    expect(joinRes.body.data.points_awarded).toBe(30);
    expect(joinRes.body.data.circle.is_joined).toBe(true);

    const balanceRes = await request(app)
      .get("/api/points/balance")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(balanceRes.body.data.balance).toBeGreaterThanOrEqual(30);

    const profileRes = await request(app)
      .get("/api/profile")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(profileRes.body.data.circles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: circleId }),
      ])
    );

    const secondJoinRes = await request(app)
      .post(`/api/circles/${circleId}/join`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(secondJoinRes.status).toBe(409);
  });

  it("leaves a circle and returns members list", async () => {
    const listRes = await request(app)
      .get("/api/circles")
      .set("Authorization", `Bearer ${accessToken}`);

    circleId = listRes.body.data[1].id;

    await request(app)
      .post(`/api/circles/${circleId}/join`)
      .set("Authorization", `Bearer ${accessToken}`);

    const membersRes = await request(app)
      .get(`/api/circles/${circleId}/members`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(membersRes.status).toBe(200);
    expect(membersRes.body.data.items.length).toBeGreaterThanOrEqual(1);

    const leaveRes = await request(app)
      .delete(`/api/circles/${circleId}/leave`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(leaveRes.status).toBe(200);

    const detailRes = await request(app)
      .get(`/api/circles/${circleId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(detailRes.body.data.is_joined).toBe(false);
  });

  it("returns circle posts feed", async () => {
    const listRes = await request(app)
      .get("/api/circles")
      .set("Authorization", `Bearer ${accessToken}`);

    const postsRes = await request(app)
      .get(`/api/circles/${listRes.body.data[0].id}/posts`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(postsRes.status).toBe(200);
    expect(postsRes.body.data.items).toBeDefined();
    expect(postsRes.body.data.pagination).toBeDefined();
  });
});

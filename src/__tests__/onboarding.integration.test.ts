import request from "supertest";
import { createApp } from "../app";
import { AppDataSource, initializeDatabase } from "../config/database";
import { seedCircles } from "../scripts/seed-circles";
import { HobbyRepository } from "../repositories/hobby.repository";

const runIntegration = process.env.RUN_INTEGRATION_TESTS === "true";

(runIntegration ? describe : describe.skip)("Onboarding & Discover API integration", () => {
  const app = createApp();
  let accessToken: string;
  let circleIds: string[] = [];
  let hobbyId: string;
  const uniqueEmail = `onboarding-test-${Date.now()}@example.com`;

  beforeAll(async () => {
    await initializeDatabase();
    await seedCircles();

    const registerRes = await request(app).post("/api/auth/register").send({
      email: uniqueEmail,
      password: "Password1",
      full_name: "Onboarding Tester",
      date_of_birth: "1995-01-01",
      gender: "female",
    });

    accessToken = registerRes.body.data.access_token;

    const circlesRes = await request(app)
      .get("/api/circles")
      .set("Authorization", `Bearer ${accessToken}`);

    circleIds = circlesRes.body.data.slice(0, 2).map((c: { id: string }) => c.id);

    const hobbiesRes = await request(app)
      .get("/api/hobbies")
      .set("Authorization", `Bearer ${accessToken}`);

    if (hobbiesRes.body.data?.length > 0) {
      hobbyId = hobbiesRes.body.data[0].id;
    } else {
      const hobbyRepo = new HobbyRepository();
      const hobby = await hobbyRepo.create("Hiking");
      hobbyId = hobby.id;
    }
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  it("returns incomplete onboarding status with suggested circles", async () => {
    const res = await request(app)
      .get("/api/onboarding/status")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.completed).toBe(false);
    expect(res.body.data.suggested_circles.length).toBeGreaterThan(0);
  });

  it("rejects user browse without purpose=search", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(400);
  });

  it("completes community onboarding", async () => {
    const res = await request(app)
      .post("/api/onboarding/community")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        bio: "Community member",
        city: "Austin",
        country: "USA",
        location_opt_in: true,
        interests: [hobbyId],
        conversation_style: "Deep Conversations",
        humor_type: "Witty",
        suggested_circle_ids: circleIds,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.profile_completed).toBe(true);
    expect(res.body.data.onboarding_completed_at).toBeTruthy();
    expect(res.body.data.circles_joined).toBeGreaterThanOrEqual(2);
  });

  it("updates profile location", async () => {
    const res = await request(app)
      .put("/api/profile/location")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        city: "Dallas",
        country: "USA",
        location_opt_in: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.city).toBe("Dallas");
    expect(res.body.data.location_opt_in).toBe(true);
  });

  it("returns local discover when location is enabled", async () => {
    const res = await request(app)
      .get("/api/discover/local")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("local_posts");
    expect(res.body.data).toHaveProperty("active_circles");
    expect(res.body.data).toHaveProperty("recent_circle_activity");
  });

  it("allows user search with purpose=search", async () => {
    const res = await request(app)
      .get("/api/users?purpose=search&page=1&limit=10")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toBeDefined();
  });
});

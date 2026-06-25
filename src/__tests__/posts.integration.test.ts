import request from "supertest";
import { createApp } from "../app";
import { AppDataSource, initializeDatabase } from "../config/database";
import { seedCircles } from "../scripts/seed-circles";

const runIntegration = process.env.RUN_INTEGRATION_TESTS === "true";

(runIntegration ? describe : describe.skip)("Posts API integration", () => {
  const app = createApp();
  let accessToken: string;
  let circleId: string;
  let postId: string;
  const uniqueEmail = `posts-test-${Date.now()}@example.com`;

  beforeAll(async () => {
    await initializeDatabase();
    await seedCircles();

    const registerRes = await request(app).post("/api/auth/register").send({
      email: uniqueEmail,
      password: "Password1",
      full_name: "Posts Tester",
      date_of_birth: "1995-01-01",
      gender: "female",
    });

    accessToken = registerRes.body.data.access_token;

    const circlesRes = await request(app)
      .get("/api/circles")
      .set("Authorization", `Bearer ${accessToken}`);

    circleId = circlesRes.body.data[0].id;

    await request(app)
      .post(`/api/circles/${circleId}/join`)
      .set("Authorization", `Bearer ${accessToken}`);
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  it("creates a circle post and returns it in feed", async () => {
    const createRes = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${accessToken}`)
      .field("content", "Hello from the Fitness circle community!")
      .field("circle_id", circleId);

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.content).toContain("Fitness circle");
    expect(createRes.body.data.circle_id).toBe(circleId);
    postId = createRes.body.data.id;

    const feedRes = await request(app)
      .get("/api/posts/feed?filter=circles")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(feedRes.status).toBe(200);
    expect(feedRes.body.data.items.length).toBeGreaterThanOrEqual(1);
    expect(feedRes.body.data.items[0].id).toBe(postId);
  });

  it("likes and comments on a post", async () => {
    const likeRes = await request(app)
      .post(`/api/posts/${postId}/like`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(likeRes.status).toBe(200);
    expect(likeRes.body.data.like_count).toBe(1);

    const commentRes = await request(app)
      .post(`/api/posts/${postId}/comments`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ content: "Great post!" });

    expect(commentRes.status).toBe(201);

    const commentsRes = await request(app)
      .get(`/api/posts/${postId}/comments`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(commentsRes.body.data.items).toHaveLength(1);

    const detailRes = await request(app)
      .get(`/api/posts/${postId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(detailRes.body.data.is_liked_by_me).toBe(true);
    expect(detailRes.body.data.comment_count).toBe(1);
  });

  it("returns circle posts and user posts endpoints", async () => {
    const profileRes = await request(app)
      .get("/api/profile")
      .set("Authorization", `Bearer ${accessToken}`);

    const userId = profileRes.body.data.id;

    const circlePostsRes = await request(app)
      .get(`/api/circles/${circleId}/posts`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(circlePostsRes.status).toBe(200);
    expect(circlePostsRes.body.data.items.length).toBeGreaterThanOrEqual(1);

    const userPostsRes = await request(app)
      .get(`/api/users/${userId}/posts`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(userPostsRes.status).toBe(200);
    expect(userPostsRes.body.data.items.length).toBeGreaterThanOrEqual(1);
    expect(profileRes.body.data.post_count).toBeGreaterThanOrEqual(1);
  });
});

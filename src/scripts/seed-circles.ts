import { AppDataSource, initializeDatabase } from "../config/database";
import { CircleRepository } from "../repositories/circle.repository";

const SEED_CIRCLES = [
  {
    name: "Fitness & Health",
    slug: "fitness-health",
    description:
      "Share workouts, wellness tips, and healthy habits with people who love staying active.",
    icon_url:
      "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Food & Cooking",
    slug: "food-cooking",
    description:
      "Recipes, restaurant finds, and kitchen experiments — from quick meals to weekend feasts.",
    icon_url:
      "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Books & Reading",
    slug: "books-reading",
    description:
      "Discuss what you're reading, swap recommendations, and join book-club style conversations.",
    icon_url:
      "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Travel",
    slug: "travel",
    description:
      "Trip stories, travel tips, and destination inspiration from explorers near and far.",
    icon_url:
      "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Faith & Values",
    slug: "faith-values",
    description:
      "A respectful space to share beliefs, values, and meaningful conversations.",
    icon_url:
      "https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Music & Arts",
    slug: "music-arts",
    description:
      "Creators and fans sharing music, art, performances, and creative projects.",
    icon_url:
      "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Career & Growth",
    slug: "career-growth",
    description:
      "Professional development, career advice, and personal growth with a supportive community.",
    icon_url:
      "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=900&q=80",
  },
];

export async function seedCircles(): Promise<void> {
  const circleRepository = new CircleRepository();

  for (const circle of SEED_CIRCLES) {
    await circleRepository.upsertBySlug({
      ...circle,
      is_featured: true,
    });
    console.log(`✓ Circle seeded: ${circle.name}`);
  }
}

async function main(): Promise<void> {
  await initializeDatabase();
  await seedCircles();
  await AppDataSource.destroy();
  console.log("Circle seed complete.");
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Circle seed failed:", error);
    process.exit(1);
  });
}

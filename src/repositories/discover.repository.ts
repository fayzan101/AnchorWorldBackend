import { AppDataSource } from "../config/database";

export interface ActiveCircleRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon_url: string | null;
  member_count: number;
  is_featured: boolean;
  post_count_in_city: number;
}

export interface CircleActivityRow {
  circle_id: string;
  circle_name: string;
  post_id: string;
}

export class DiscoverRepository {
  async getActiveCirclesByCity(
    city: string,
    limit = 10
  ): Promise<ActiveCircleRow[]> {
    const rows = await AppDataSource.query(
      `
      SELECT
        c.id,
        c.name,
        c.slug,
        c.description,
        c.icon_url,
        c.member_count,
        c.is_featured,
        COUNT(p.id) AS post_count_in_city
      FROM circles c
      INNER JOIN posts p
        ON p.circle_id = c.id
        AND p.city = ?
        AND p.deleted_at IS NULL
      GROUP BY c.id
      ORDER BY post_count_in_city DESC, c.member_count DESC
      LIMIT ?
      `,
      [city, limit]
    );

    return rows.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      name: String(row.name),
      slug: String(row.slug),
      description: row.description ? String(row.description) : null,
      icon_url: row.icon_url ? String(row.icon_url) : null,
      member_count: Number(row.member_count ?? 0),
      is_featured: Boolean(row.is_featured),
      post_count_in_city: Number(row.post_count_in_city ?? 0),
    }));
  }

  async getRecentCircleIdsByCity(city: string, limit = 5): Promise<string[]> {
    const rows = await AppDataSource.query(
      `
      SELECT p.circle_id AS circle_id, MAX(p.created_at) AS latest_at
      FROM posts p
      WHERE p.city = ?
        AND p.circle_id IS NOT NULL
        AND p.deleted_at IS NULL
      GROUP BY p.circle_id
      ORDER BY latest_at DESC
      LIMIT ?
      `,
      [city, limit]
    );

    return rows
      .map((row: { circle_id: string }) => row.circle_id)
      .filter(Boolean);
  }
}

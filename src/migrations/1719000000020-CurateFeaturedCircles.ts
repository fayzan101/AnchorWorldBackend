import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Featured carousel should only highlight a curated subset, not every circle.
 */
export class CurateFeaturedCircles1719000000020 implements MigrationInterface {
  name = "CurateFeaturedCircles1719000000020";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE circles SET is_featured = 0`);
    await queryRunner.query(`
      UPDATE circles
      SET is_featured = 1
      WHERE slug IN ('fitness-health', 'food-cooking', 'books-reading')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Previous seed marked all circles featured — restore that broad flag if rolled back.
    await queryRunner.query(`UPDATE circles SET is_featured = 1`);
  }
}

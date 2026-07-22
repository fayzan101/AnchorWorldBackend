import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from "typeorm";
import { createTableIfNotExists, dropTableIfExists } from "./helpers";

/**
 * Drops leftover dating-era tables that are no longer used by the community app:
 * - relationship_goals / partner_qualities (lookup tables; join tables already dropped in 0016)
 * - likes (profile-to-profile likes; post/comment likes use post_likes / comment_likes)
 *
 * Idempotent: safe if 0016 already removed the join tables.
 */
export class DropUnusedDatingLookupTables1719000000018
  implements MigrationInterface
{
  name = "DropUnusedDatingLookupTables1719000000018";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Join tables first (may already be gone after 0016).
    await dropTableIfExists(queryRunner, "user_goals");
    await dropTableIfExists(queryRunner, "user_partner_qualities");

    // Lookup tables.
    await dropTableIfExists(queryRunner, "relationship_goals");
    await dropTableIfExists(queryRunner, "partner_qualities");

    // Deprecated profile likes (not post_likes / comment_likes).
    await dropTableIfExists(queryRunner, "likes");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await createTableIfNotExists(
      queryRunner,
      new Table({
        name: "relationship_goals",
        columns: [
          {
            name: "id",
            type: "varchar",
            length: "36",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "uuid",
          },
          { name: "name", type: "varchar", length: "255" },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "updated_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            onUpdate: "CURRENT_TIMESTAMP",
          },
        ],
      })
    );

    await createTableIfNotExists(
      queryRunner,
      new Table({
        name: "partner_qualities",
        columns: [
          {
            name: "id",
            type: "varchar",
            length: "36",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "uuid",
          },
          { name: "name", type: "varchar", length: "255" },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "updated_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            onUpdate: "CURRENT_TIMESTAMP",
          },
        ],
      })
    );

    await createTableIfNotExists(
      queryRunner,
      new Table({
        name: "user_goals",
        columns: [
          { name: "user_id", type: "varchar", length: "36", isPrimary: true },
          { name: "goal_id", type: "varchar", length: "36", isPrimary: true },
        ],
      })
    );

    if (await queryRunner.hasTable("user_goals")) {
      const userGoals = await queryRunner.getTable("user_goals");
      if (userGoals && userGoals.foreignKeys.length === 0) {
        await queryRunner.createForeignKey(
          "user_goals",
          new TableForeignKey({
            columnNames: ["user_id"],
            referencedTableName: "users",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          })
        );
        await queryRunner.createForeignKey(
          "user_goals",
          new TableForeignKey({
            columnNames: ["goal_id"],
            referencedTableName: "relationship_goals",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          })
        );
      }
    }

    await createTableIfNotExists(
      queryRunner,
      new Table({
        name: "user_partner_qualities",
        columns: [
          { name: "user_id", type: "varchar", length: "36", isPrimary: true },
          {
            name: "partner_quality_id",
            type: "varchar",
            length: "36",
            isPrimary: true,
          },
        ],
      })
    );

    if (await queryRunner.hasTable("user_partner_qualities")) {
      const upq = await queryRunner.getTable("user_partner_qualities");
      if (upq && upq.foreignKeys.length === 0) {
        await queryRunner.createForeignKey(
          "user_partner_qualities",
          new TableForeignKey({
            columnNames: ["user_id"],
            referencedTableName: "users",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          })
        );
        await queryRunner.createForeignKey(
          "user_partner_qualities",
          new TableForeignKey({
            columnNames: ["partner_quality_id"],
            referencedTableName: "partner_qualities",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          })
        );
      }
    }

    await createTableIfNotExists(
      queryRunner,
      new Table({
        name: "likes",
        columns: [
          {
            name: "id",
            type: "varchar",
            length: "36",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "uuid",
          },
          { name: "liker_id", type: "varchar", length: "36" },
          { name: "liked_id", type: "varchar", length: "36" },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
        ],
      })
    );

    if (await queryRunner.hasTable("likes")) {
      const likes = await queryRunner.getTable("likes");
      if (likes && likes.foreignKeys.length === 0) {
        await queryRunner.createForeignKey(
          "likes",
          new TableForeignKey({
            columnNames: ["liker_id"],
            referencedTableName: "users",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          })
        );
        await queryRunner.createForeignKey(
          "likes",
          new TableForeignKey({
            columnNames: ["liked_id"],
            referencedTableName: "users",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          })
        );
      }
      if (likes && likes.indices.every((i) => i.name !== "IDX_likes_liker_liked")) {
        await queryRunner.createIndex(
          "likes",
          new TableIndex({
            name: "IDX_likes_liker_liked",
            columnNames: ["liker_id", "liked_id"],
            isUnique: true,
          })
        );
      }
    }
  }
}

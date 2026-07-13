import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from "typeorm";
import { createTableIfNotExists, dropTableIfExists } from "./helpers";

export class PostsTables1719000000004 implements MigrationInterface {
  name = "PostsTables1719000000004";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await createTableIfNotExists(
      queryRunner,
      new Table({
        name: "posts",
        columns: [
          {
            name: "id",
            type: "varchar",
            length: "36",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "uuid",
          },
          {
            name: "user_id",
            type: "varchar",
            length: "36",
          },
          {
            name: "content",
            type: "text",
          },
          {
            name: "media_url",
            type: "varchar",
            length: "500",
            isNullable: true,
          },
          {
            name: "media_type",
            type: "enum",
            enum: ["none", "image", "video"],
            default: "'none'",
          },
          {
            name: "circle_id",
            type: "varchar",
            length: "36",
            isNullable: true,
          },
          {
            name: "city",
            type: "varchar",
            length: "255",
            isNullable: true,
          },
          {
            name: "country",
            type: "varchar",
            length: "255",
            isNullable: true,
          },
          {
            name: "like_count",
            type: "int",
            default: 0,
          },
          {
            name: "comment_count",
            type: "int",
            default: 0,
          },
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
          {
            name: "deleted_at",
            type: "timestamp",
            isNullable: true,
          },
        ],
      })
    );

    await this.ensurePostsIndexes(queryRunner);
    await this.ensurePostsForeignKeys(queryRunner);

    await createTableIfNotExists(
      queryRunner,
      new Table({
        name: "post_likes",
        columns: [
          {
            name: "id",
            type: "varchar",
            length: "36",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "uuid",
          },
          {
            name: "post_id",
            type: "varchar",
            length: "36",
          },
          {
            name: "user_id",
            type: "varchar",
            length: "36",
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
        ],
      })
    );

    const likesTable = await queryRunner.getTable("post_likes");
    if (
      !likesTable?.indices.some(
        (index) => index.name === "IDX_post_likes_post_user"
      )
    ) {
      await queryRunner.createIndex(
        "post_likes",
        new TableIndex({
          name: "IDX_post_likes_post_user",
          columnNames: ["post_id", "user_id"],
          isUnique: true,
        })
      );
    }

    if (
      !likesTable?.foreignKeys.some((fk) =>
        fk.columnNames.includes("post_id")
      )
    ) {
      await queryRunner.createForeignKey(
        "post_likes",
        new TableForeignKey({
          columnNames: ["post_id"],
          referencedTableName: "posts",
          referencedColumnNames: ["id"],
          onDelete: "CASCADE",
        })
      );
    }

    const likesTableAfter = await queryRunner.getTable("post_likes");
    if (
      !likesTableAfter?.foreignKeys.some((fk) =>
        fk.columnNames.includes("user_id")
      )
    ) {
      await queryRunner.createForeignKey(
        "post_likes",
        new TableForeignKey({
          columnNames: ["user_id"],
          referencedTableName: "users",
          referencedColumnNames: ["id"],
          onDelete: "CASCADE",
        })
      );
    }

    await createTableIfNotExists(
      queryRunner,
      new Table({
        name: "post_comments",
        columns: [
          {
            name: "id",
            type: "varchar",
            length: "36",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "uuid",
          },
          {
            name: "post_id",
            type: "varchar",
            length: "36",
          },
          {
            name: "user_id",
            type: "varchar",
            length: "36",
          },
          {
            name: "content",
            type: "text",
          },
          {
            name: "parent_id",
            type: "varchar",
            length: "36",
            isNullable: true,
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "deleted_at",
            type: "timestamp",
            isNullable: true,
          },
        ],
      })
    );

    const commentsTable = await queryRunner.getTable("post_comments");
    if (
      !commentsTable?.indices.some(
        (index) => index.name === "IDX_post_comments_post_created"
      )
    ) {
      await queryRunner.createIndex(
        "post_comments",
        new TableIndex({
          name: "IDX_post_comments_post_created",
          columnNames: ["post_id", "created_at"],
        })
      );
    }

    if (
      !commentsTable?.foreignKeys.some((fk) =>
        fk.columnNames.includes("post_id")
      )
    ) {
      await queryRunner.createForeignKey(
        "post_comments",
        new TableForeignKey({
          columnNames: ["post_id"],
          referencedTableName: "posts",
          referencedColumnNames: ["id"],
          onDelete: "CASCADE",
        })
      );
    }

    const commentsTableAfter = await queryRunner.getTable("post_comments");
    if (
      !commentsTableAfter?.foreignKeys.some((fk) =>
        fk.columnNames.includes("user_id")
      )
    ) {
      await queryRunner.createForeignKey(
        "post_comments",
        new TableForeignKey({
          columnNames: ["user_id"],
          referencedTableName: "users",
          referencedColumnNames: ["id"],
          onDelete: "CASCADE",
        })
      );
    }
  }

  private async ensurePostsIndexes(queryRunner: QueryRunner): Promise<void> {
    const postsTable = await queryRunner.getTable("posts");
    if (
      !postsTable?.indices.some(
        (index) => index.name === "IDX_posts_user_created"
      )
    ) {
      await queryRunner.createIndex(
        "posts",
        new TableIndex({
          name: "IDX_posts_user_created",
          columnNames: ["user_id", "created_at"],
        })
      );
    }

    const postsTableAfter = await queryRunner.getTable("posts");
    if (
      !postsTableAfter?.indices.some(
        (index) => index.name === "IDX_posts_circle_created"
      )
    ) {
      await queryRunner.createIndex(
        "posts",
        new TableIndex({
          name: "IDX_posts_circle_created",
          columnNames: ["circle_id", "created_at"],
        })
      );
    }
  }

  private async ensurePostsForeignKeys(
    queryRunner: QueryRunner
  ): Promise<void> {
    const postsTable = await queryRunner.getTable("posts");
    if (
      !postsTable?.foreignKeys.some((fk) =>
        fk.columnNames.includes("user_id")
      )
    ) {
      await queryRunner.createForeignKey(
        "posts",
        new TableForeignKey({
          columnNames: ["user_id"],
          referencedTableName: "users",
          referencedColumnNames: ["id"],
          onDelete: "CASCADE",
        })
      );
    }

    const postsTableAfter = await queryRunner.getTable("posts");
    if (
      !postsTableAfter?.foreignKeys.some((fk) =>
        fk.columnNames.includes("circle_id")
      )
    ) {
      await queryRunner.createForeignKey(
        "posts",
        new TableForeignKey({
          columnNames: ["circle_id"],
          referencedTableName: "circles",
          referencedColumnNames: ["id"],
          onDelete: "SET NULL",
        })
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await dropTableIfExists(queryRunner, "post_comments");
    await dropTableIfExists(queryRunner, "post_likes");
    await dropTableIfExists(queryRunner, "posts");
  }
}

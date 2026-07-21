import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey, TableIndex } from "typeorm";
import { addColumnIfNotExists, dropColumnIfExists, dropTableIfExists } from "./helpers";

export class CommentLikesAndReply1719000000017 implements MigrationInterface {
  name = "CommentLikesAndReply1719000000017";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await addColumnIfNotExists(
      queryRunner,
      "post_comments",
      new TableColumn({
        name: "like_count",
        type: "int",
        default: 0,
      })
    );

    const exists = await queryRunner.hasTable("comment_likes");
    if (!exists) {
      await queryRunner.createTable(
        new Table({
          name: "comment_likes",
          columns: [
            {
              name: "id",
              type: "varchar",
              length: "36",
              isPrimary: true,
              isGenerated: true,
              generationStrategy: "uuid",
            },
            { name: "comment_id", type: "varchar", length: "36" },
            { name: "user_id", type: "varchar", length: "36" },
            {
              name: "created_at",
              type: "timestamp",
              default: "CURRENT_TIMESTAMP",
            },
          ],
        }),
        true
      );

      await queryRunner.createIndex(
        "comment_likes",
        new TableIndex({
          name: "IDX_comment_likes_unique",
          columnNames: ["comment_id", "user_id"],
          isUnique: true,
        })
      );

      await queryRunner.createForeignKey(
        "comment_likes",
        new TableForeignKey({
          columnNames: ["comment_id"],
          referencedTableName: "post_comments",
          referencedColumnNames: ["id"],
          onDelete: "CASCADE",
        })
      );

      await queryRunner.createForeignKey(
        "comment_likes",
        new TableForeignKey({
          columnNames: ["user_id"],
          referencedTableName: "users",
          referencedColumnNames: ["id"],
          onDelete: "CASCADE",
        })
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await dropTableIfExists(queryRunner, "comment_likes");
    await dropColumnIfExists(queryRunner, "post_comments", "like_count");
  }
}

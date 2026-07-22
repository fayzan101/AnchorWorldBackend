import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from "typeorm";
import { addColumnIfNotExists, dropColumnIfExists } from "./helpers";

const NOTIFICATION_TYPES = [
  "new_message",
  "friend_request",
  "friend_accept",
  "new_like",
  "post_liked",
  "post_commented",
  "post_shared",
  "points_earned",
  "video_call_request",
  "video_call_accepted",
  "video_call_rejected",
  "connection_made",
  "circle_join",
];

export class PostShareSourceAndNotify1719000000021 implements MigrationInterface {
  name = "PostShareSourceAndNotify1719000000021";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await addColumnIfNotExists(
      queryRunner,
      "posts",
      new TableColumn({
        name: "source_post_id",
        type: "varchar",
        length: "36",
        isNullable: true,
      })
    );

    const postsTable = await queryRunner.getTable("posts");
    const hasFk = postsTable?.foreignKeys.some((fk) =>
      fk.columnNames.includes("source_post_id")
    );
    if (!hasFk) {
      await queryRunner.createForeignKey(
        "posts",
        new TableForeignKey({
          columnNames: ["source_post_id"],
          referencedTableName: "posts",
          referencedColumnNames: ["id"],
          onDelete: "SET NULL",
        })
      );
    }

    await queryRunner.query(
      `ALTER TABLE \`notifications\` MODIFY COLUMN \`type\` enum(${NOTIFICATION_TYPES.map(
        (value) => `'${value}'`
      ).join(", ")}) NOT NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const postsTable = await queryRunner.getTable("posts");
    const fk = postsTable?.foreignKeys.find((f) =>
      f.columnNames.includes("source_post_id")
    );
    if (fk) {
      await queryRunner.dropForeignKey("posts", fk);
    }
    await dropColumnIfExists(queryRunner, "posts", "source_post_id");

    const previous = NOTIFICATION_TYPES.filter((t) => t !== "post_shared");
    await queryRunner.query(
      `ALTER TABLE \`notifications\` MODIFY COLUMN \`type\` enum(${previous
        .map((value) => `'${value}'`)
        .join(", ")}) NOT NULL`
    );
  }
}

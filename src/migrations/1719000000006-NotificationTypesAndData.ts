import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";
import { addColumnIfNotExists, dropColumnIfExists } from "./helpers";

const NOTIFICATION_TYPES = [
  "new_message",
  "friend_request",
  "friend_accept",
  "new_like",
  "post_liked",
  "post_commented",
  "points_earned",
  "video_call_request",
  "video_call_accepted",
  "video_call_rejected",
  "connection_made",
  "circle_join",
];

export class NotificationTypesAndData1719000000006
  implements MigrationInterface
{
  name = "NotificationTypesAndData1719000000006";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await addColumnIfNotExists(
      queryRunner,
      "notifications",
      new TableColumn({
        name: "data",
        type: "json",
        isNullable: true,
      })
    );

    await queryRunner.query(
      `ALTER TABLE \`notifications\` MODIFY COLUMN \`type\` enum(${NOTIFICATION_TYPES.map(
        (value) => `'${value}'`
      ).join(", ")}) NOT NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`notifications\` MODIFY COLUMN \`type\` enum('new_message', 'friend_request', 'friend_accept', 'new_like') NOT NULL`
    );

    await dropColumnIfExists(queryRunner, "notifications", "data");
  }
}

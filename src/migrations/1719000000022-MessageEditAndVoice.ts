import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";
import { addColumnIfNotExists, dropColumnIfExists } from "./helpers";

export class MessageEditAndVoice1719000000022 implements MigrationInterface {
  name = "MessageEditAndVoice1719000000022";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await addColumnIfNotExists(
      queryRunner,
      "messages",
      new TableColumn({
        name: "edited_at",
        type: "timestamp",
        isNullable: true,
      })
    );

    await addColumnIfNotExists(
      queryRunner,
      "messages",
      new TableColumn({
        name: "message_type",
        type: "varchar",
        length: "20",
        isNullable: false,
        default: "'text'",
      })
    );

    await addColumnIfNotExists(
      queryRunner,
      "messages",
      new TableColumn({
        name: "media_url",
        type: "varchar",
        length: "500",
        isNullable: true,
      })
    );

    await addColumnIfNotExists(
      queryRunner,
      "messages",
      new TableColumn({
        name: "duration_ms",
        type: "int",
        isNullable: true,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await dropColumnIfExists(queryRunner, "messages", "duration_ms");
    await dropColumnIfExists(queryRunner, "messages", "media_url");
    await dropColumnIfExists(queryRunner, "messages", "message_type");
    await dropColumnIfExists(queryRunner, "messages", "edited_at");
  }
}

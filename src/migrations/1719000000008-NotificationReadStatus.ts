import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";
import { addColumnIfNotExists, dropColumnIfExists } from "./helpers";

export class NotificationReadStatus1719000000008 implements MigrationInterface {
  name = "NotificationReadStatus1719000000008";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await addColumnIfNotExists(
      queryRunner,
      "notifications",
      new TableColumn({
        name: "is_read",
        type: "boolean",
        default: false,
        isNullable: false,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await dropColumnIfExists(queryRunner, "notifications", "is_read");
  }
}

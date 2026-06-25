import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";
import { addColumnIfNotExists, dropColumnIfExists } from "./helpers";

export class CommunityUserFields1719000000001 implements MigrationInterface {
  name = "CommunityUserFields1719000000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const columns: TableColumn[] = [
      new TableColumn({
        name: "city",
        type: "varchar",
        length: "255",
        isNullable: true,
      }),
      new TableColumn({
        name: "country",
        type: "varchar",
        length: "255",
        isNullable: true,
      }),
      new TableColumn({
        name: "location_opt_in",
        type: "boolean",
        default: false,
      }),
      new TableColumn({
        name: "onboarding_completed_at",
        type: "timestamp",
        isNullable: true,
      }),
      new TableColumn({
        name: "intro_video_url",
        type: "varchar",
        length: "500",
        isNullable: true,
      }),
      new TableColumn({
        name: "conversation_style",
        type: "varchar",
        length: "255",
        isNullable: true,
      }),
      new TableColumn({
        name: "humor_type",
        type: "varchar",
        length: "255",
        isNullable: true,
      }),
    ];

    for (const column of columns) {
      await addColumnIfNotExists(queryRunner, "users", column);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const columnNames = [
      "humor_type",
      "conversation_style",
      "intro_video_url",
      "onboarding_completed_at",
      "location_opt_in",
      "country",
      "city",
    ];

    for (const columnName of columnNames) {
      await dropColumnIfExists(queryRunner, "users", columnName);
    }
  }
}

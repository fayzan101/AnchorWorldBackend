import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";
import { addColumnIfNotExists, dropColumnIfExists } from "./helpers";

export class PremiumSubscription1719000000009 implements MigrationInterface {
  name = "PremiumSubscription1719000000009";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await addColumnIfNotExists(
      queryRunner,
      "users",
      new TableColumn({
        name: "is_premium",
        type: "boolean",
        default: false,
        isNullable: false,
      })
    );
    await addColumnIfNotExists(
      queryRunner,
      "users",
      new TableColumn({
        name: "premium_until",
        type: "timestamp",
        isNullable: true,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await dropColumnIfExists(queryRunner, "users", "premium_until");
    await dropColumnIfExists(queryRunner, "users", "is_premium");
  }
}

import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";
import { addColumnIfNotExists, dropColumnIfExists } from "./helpers";

export class PremiumProductId1719000000010 implements MigrationInterface {
  name = "PremiumProductId1719000000010";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await addColumnIfNotExists(
      queryRunner,
      "users",
      new TableColumn({
        name: "premium_product_id",
        type: "varchar",
        length: "128",
        isNullable: true,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await dropColumnIfExists(queryRunner, "users", "premium_product_id");
  }
}

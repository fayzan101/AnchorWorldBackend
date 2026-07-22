import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";
import { addColumnIfNotExists, dropColumnIfExists } from "./helpers";

export class EmailVerification1719000000019 implements MigrationInterface {
  name = "EmailVerification1719000000019";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await addColumnIfNotExists(
      queryRunner,
      "users",
      new TableColumn({
        name: "email_verified_at",
        type: "timestamp",
        isNullable: true,
      })
    );
    await addColumnIfNotExists(
      queryRunner,
      "users",
      new TableColumn({
        name: "email_verification_code",
        type: "varchar",
        length: "16",
        isNullable: true,
      })
    );
    await addColumnIfNotExists(
      queryRunner,
      "users",
      new TableColumn({
        name: "email_verification_expires",
        type: "timestamp",
        isNullable: true,
      })
    );

    // Existing accounts are treated as already verified so login is not blocked.
    await queryRunner.query(
      `UPDATE users SET email_verified_at = COALESCE(created_at, NOW()) WHERE email_verified_at IS NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await dropColumnIfExists(queryRunner, "users", "email_verification_expires");
    await dropColumnIfExists(queryRunner, "users", "email_verification_code");
    await dropColumnIfExists(queryRunner, "users", "email_verified_at");
  }
}

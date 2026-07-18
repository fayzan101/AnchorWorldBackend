import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from "typeorm";
import {
  addColumnIfNotExists,
  createTableIfNotExists,
  dropColumnIfExists,
  dropTableIfExists,
} from "./helpers";

export class Referrals1719000000011 implements MigrationInterface {
  name = "Referrals1719000000011";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await addColumnIfNotExists(
      queryRunner,
      "users",
      new TableColumn({
        name: "referral_code",
        type: "varchar",
        length: "16",
        isNullable: true,
        isUnique: true,
      })
    );
    await addColumnIfNotExists(
      queryRunner,
      "users",
      new TableColumn({
        name: "referred_by_user_id",
        type: "varchar",
        length: "36",
        isNullable: true,
      })
    );

    const usersTable = await queryRunner.getTable("users");
    const hasFk = usersTable?.foreignKeys.some(
      (fk) => fk.columnNames.includes("referred_by_user_id")
    );
    if (!hasFk) {
      await queryRunner.createForeignKey(
        "users",
        new TableForeignKey({
          columnNames: ["referred_by_user_id"],
          referencedTableName: "users",
          referencedColumnNames: ["id"],
          onDelete: "SET NULL",
        })
      );
    }

    await createTableIfNotExists(
      queryRunner,
      new Table({
        name: "referrals",
        columns: [
          {
            name: "id",
            type: "varchar",
            length: "36",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "uuid",
          },
          { name: "referrer_id", type: "varchar", length: "36", isNullable: false },
          { name: "referee_id", type: "varchar", length: "36", isNullable: false },
          {
            name: "status",
            type: "varchar",
            length: "32",
            default: "'pending'",
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "completed_at",
            type: "timestamp",
            isNullable: true,
          },
        ],
        indices: [
          new TableIndex({
            name: "IDX_referrals_referee_unique",
            columnNames: ["referee_id"],
            isUnique: true,
          }),
          new TableIndex({
            name: "IDX_referrals_referrer",
            columnNames: ["referrer_id"],
          }),
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ["referrer_id"],
            referencedTableName: "users",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          }),
          new TableForeignKey({
            columnNames: ["referee_id"],
            referencedTableName: "users",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          }),
        ],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await dropTableIfExists(queryRunner, "referrals");
    const usersTable = await queryRunner.getTable("users");
    const fk = usersTable?.foreignKeys.find((f) =>
      f.columnNames.includes("referred_by_user_id")
    );
    if (fk) await queryRunner.dropForeignKey("users", fk);
    await dropColumnIfExists(queryRunner, "users", "referred_by_user_id");
    await dropColumnIfExists(queryRunner, "users", "referral_code");
  }
}

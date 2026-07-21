import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
} from "typeorm";
import { dropColumnIfExists, dropTableIfExists } from "./helpers";

/**
 * Removes unused dating-era columns from `users` via ALTER TABLE DROP COLUMN.
 * This does NOT recreate or truncate `users` — all other columns and rows stay.
 *
 * Also drops dating join tables (`user_goals`, `user_partner_qualities`) that
 * only linked users to dating lookup data. Lookup tables themselves are left
 * in place (can be removed in a follow-up if those APIs are retired).
 */
export class DropUnusedDatingUserColumns1719000000016
  implements MigrationInterface
{
  name = "DropUnusedDatingUserColumns1719000000016";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Join tables first (FK → users / lookup tables).
    await dropTableIfExists(queryRunner, "user_goals");
    await dropTableIfExists(queryRunner, "user_partner_qualities");

    // Dating columns on users — DROP COLUMN only; row identity and other fields remain.
    const datingColumns = [
      "seeking_relation",
      "interested_in",
      "height",
      "have_kids",
      "kids",
      "date_you_reason",
    ] as const;

    for (const columnName of datingColumns) {
      await dropColumnIfExists(queryRunner, "users", columnName);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const users = await queryRunner.getTable("users");
    if (!users) return;

    const columnsToRestore: TableColumn[] = [
      new TableColumn({
        name: "seeking_relation",
        type: "enum",
        enum: ["date", "bff"],
        isNullable: true,
      }),
      new TableColumn({
        name: "interested_in",
        type: "enum",
        enum: ["male", "female", "other"],
        isNullable: true,
      }),
      new TableColumn({
        name: "height",
        type: "varchar",
        length: "500",
        isNullable: true,
      }),
      new TableColumn({
        name: "have_kids",
        type: "varchar",
        length: "500",
        isNullable: true,
      }),
      new TableColumn({
        name: "kids",
        type: "varchar",
        length: "500",
        isNullable: true,
      }),
      new TableColumn({
        name: "date_you_reason",
        type: "text",
        isNullable: true,
      }),
    ];

    for (const column of columnsToRestore) {
      if (!users.findColumnByName(column.name)) {
        await queryRunner.addColumn("users", column);
      }
    }

    // Recreate empty join tables (previous per-user dating links cannot be restored).
    if (!(await queryRunner.hasTable("user_goals"))) {
      await queryRunner.createTable(
        new Table({
          name: "user_goals",
          columns: [
            {
              name: "user_id",
              type: "varchar",
              length: "36",
              isPrimary: true,
            },
            {
              name: "goal_id",
              type: "varchar",
              length: "36",
              isPrimary: true,
            },
          ],
        }),
        true
      );
      await queryRunner.createForeignKey(
        "user_goals",
        new TableForeignKey({
          columnNames: ["user_id"],
          referencedTableName: "users",
          referencedColumnNames: ["id"],
          onDelete: "CASCADE",
        })
      );
      if (await queryRunner.hasTable("relationship_goals")) {
        await queryRunner.createForeignKey(
          "user_goals",
          new TableForeignKey({
            columnNames: ["goal_id"],
            referencedTableName: "relationship_goals",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          })
        );
      }
    }

    if (!(await queryRunner.hasTable("user_partner_qualities"))) {
      await queryRunner.createTable(
        new Table({
          name: "user_partner_qualities",
          columns: [
            {
              name: "user_id",
              type: "varchar",
              length: "36",
              isPrimary: true,
            },
            {
              name: "partner_quality_id",
              type: "varchar",
              length: "36",
              isPrimary: true,
            },
          ],
        }),
        true
      );
      await queryRunner.createForeignKey(
        "user_partner_qualities",
        new TableForeignKey({
          columnNames: ["user_id"],
          referencedTableName: "users",
          referencedColumnNames: ["id"],
          onDelete: "CASCADE",
        })
      );
      if (await queryRunner.hasTable("partner_qualities")) {
        await queryRunner.createForeignKey(
          "user_partner_qualities",
          new TableForeignKey({
            columnNames: ["partner_quality_id"],
            referencedTableName: "partner_qualities",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          })
        );
      }
    }
  }
}

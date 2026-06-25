import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from "typeorm";
import { createTableIfNotExists, dropTableIfExists } from "./helpers";

export class PointsTables1719000000002 implements MigrationInterface {
  name = "PointsTables1719000000002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await createTableIfNotExists(
      queryRunner,
      new Table({
        name: "user_points",
        columns: [
          {
            name: "user_id",
            type: "varchar",
            length: "36",
            isPrimary: true,
          },
          {
            name: "balance",
            type: "int",
            default: 0,
          },
          {
            name: "lifetime_earned",
            type: "int",
            default: 0,
          },
          {
            name: "updated_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            onUpdate: "CURRENT_TIMESTAMP",
          },
        ],
      })
    );

    const userPointsTable = await queryRunner.getTable("user_points");
    const hasUserPointsFk = userPointsTable?.foreignKeys.some((fk) =>
      fk.columnNames.includes("user_id")
    );
    if (!hasUserPointsFk) {
      await queryRunner.createForeignKey(
        "user_points",
        new TableForeignKey({
          columnNames: ["user_id"],
          referencedTableName: "users",
          referencedColumnNames: ["id"],
          onDelete: "CASCADE",
        })
      );
    }

    await createTableIfNotExists(
      queryRunner,
      new Table({
        name: "point_transactions",
        columns: [
          {
            name: "id",
            type: "varchar",
            length: "36",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "uuid",
          },
          {
            name: "user_id",
            type: "varchar",
            length: "36",
          },
          {
            name: "amount",
            type: "int",
          },
          {
            name: "type",
            type: "varchar",
            length: "64",
          },
          {
            name: "reference_id",
            type: "varchar",
            length: "36",
            isNullable: true,
          },
          {
            name: "description",
            type: "varchar",
            length: "500",
            isNullable: true,
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
        ],
      })
    );

    const txTable = await queryRunner.getTable("point_transactions");
    const hasTxFk = txTable?.foreignKeys.some((fk) =>
      fk.columnNames.includes("user_id")
    );
    if (!hasTxFk) {
      await queryRunner.createForeignKey(
        "point_transactions",
        new TableForeignKey({
          columnNames: ["user_id"],
          referencedTableName: "users",
          referencedColumnNames: ["id"],
          onDelete: "CASCADE",
        })
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await dropTableIfExists(queryRunner, "point_transactions");
    await dropTableIfExists(queryRunner, "user_points");
  }
}

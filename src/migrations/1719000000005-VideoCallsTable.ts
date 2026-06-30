import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from "typeorm";
import { createTableIfNotExists, dropTableIfExists } from "./helpers";

export class VideoCallsTable1719000000005 implements MigrationInterface {
  name = "VideoCallsTable1719000000005";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await createTableIfNotExists(
      queryRunner,
      new Table({
        name: "video_calls",
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
            name: "caller_id",
            type: "varchar",
            length: "36",
          },
          {
            name: "callee_id",
            type: "varchar",
            length: "36",
          },
          {
            name: "status",
            type: "enum",
            enum: [
              "pending",
              "active",
              "completed",
              "rejected",
              "cancelled",
              "missed",
            ],
            default: "'pending'",
          },
          {
            name: "duration_minutes",
            type: "int",
          },
          {
            name: "points_spent",
            type: "int",
          },
          {
            name: "channel_name",
            type: "varchar",
            length: "100",
          },
          {
            name: "started_at",
            type: "timestamp",
            isNullable: true,
          },
          {
            name: "ended_at",
            type: "timestamp",
            isNullable: true,
          },
          {
            name: "expires_at",
            type: "timestamp",
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
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

    const table = await queryRunner.getTable("video_calls");
    if (table) {
      const callerFk = table.foreignKeys.find((fk) =>
        fk.columnNames.includes("caller_id")
      );
      if (!callerFk) {
        await queryRunner.createForeignKey(
          "video_calls",
          new TableForeignKey({
            columnNames: ["caller_id"],
            referencedTableName: "users",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          })
        );
      }

      const calleeFk = table.foreignKeys.find((fk) =>
        fk.columnNames.includes("callee_id")
      );
      if (!calleeFk) {
        await queryRunner.createForeignKey(
          "video_calls",
          new TableForeignKey({
            columnNames: ["callee_id"],
            referencedTableName: "users",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          })
        );
      }

      if (!table.indices.some((idx) => idx.name === "IDX_video_calls_caller_created")) {
        await queryRunner.createIndex(
          "video_calls",
          new TableIndex({
            name: "IDX_video_calls_caller_created",
            columnNames: ["caller_id", "created_at"],
          })
        );
      }

      if (!table.indices.some((idx) => idx.name === "IDX_video_calls_callee_created")) {
        await queryRunner.createIndex(
          "video_calls",
          new TableIndex({
            name: "IDX_video_calls_callee_created",
            columnNames: ["callee_id", "created_at"],
          })
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await dropTableIfExists(queryRunner, "video_calls");
  }
}

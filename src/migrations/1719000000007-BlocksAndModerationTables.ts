import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from "typeorm";
import { createTableIfNotExists, dropTableIfExists } from "./helpers";

export class BlocksAndModerationTables1719000000007
  implements MigrationInterface
{
  name = "BlocksAndModerationTables1719000000007";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await createTableIfNotExists(
      queryRunner,
      new Table({
        name: "user_blocks",
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
            name: "blocker_id",
            type: "varchar",
            length: "36",
          },
          {
            name: "blocked_id",
            type: "varchar",
            length: "36",
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
        ],
      })
    );

    const blocksTable = await queryRunner.getTable("user_blocks");
    if (blocksTable) {
      if (
        !blocksTable.foreignKeys.find((fk) =>
          fk.columnNames.includes("blocker_id")
        )
      ) {
        await queryRunner.createForeignKey(
          "user_blocks",
          new TableForeignKey({
            columnNames: ["blocker_id"],
            referencedTableName: "users",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          })
        );
      }

      if (
        !blocksTable.foreignKeys.find((fk) =>
          fk.columnNames.includes("blocked_id")
        )
      ) {
        await queryRunner.createForeignKey(
          "user_blocks",
          new TableForeignKey({
            columnNames: ["blocked_id"],
            referencedTableName: "users",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          })
        );
      }

      if (
        !blocksTable.indices.some(
          (idx) => idx.name === "IDX_user_blocks_blocker_blocked"
        )
      ) {
        await queryRunner.createIndex(
          "user_blocks",
          new TableIndex({
            name: "IDX_user_blocks_blocker_blocked",
            columnNames: ["blocker_id", "blocked_id"],
            isUnique: true,
          })
        );
      }
    }

    await createTableIfNotExists(
      queryRunner,
      new Table({
        name: "content_reports",
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
            name: "reporter_id",
            type: "varchar",
            length: "36",
          },
          {
            name: "target_type",
            type: "enum",
            enum: ["user", "post", "comment"],
          },
          {
            name: "target_id",
            type: "varchar",
            length: "36",
          },
          {
            name: "reason",
            type: "varchar",
            length: "500",
            isNullable: true,
          },
          {
            name: "status",
            type: "enum",
            enum: ["open", "reviewed", "dismissed", "actioned"],
            default: "'open'",
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

    const reportsTable = await queryRunner.getTable("content_reports");
    if (reportsTable) {
      if (
        !reportsTable.foreignKeys.find((fk) =>
          fk.columnNames.includes("reporter_id")
        )
      ) {
        await queryRunner.createForeignKey(
          "content_reports",
          new TableForeignKey({
            columnNames: ["reporter_id"],
            referencedTableName: "users",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          })
        );
      }

      if (
        !reportsTable.indices.some(
          (idx) => idx.name === "IDX_content_reports_status_created"
        )
      ) {
        await queryRunner.createIndex(
          "content_reports",
          new TableIndex({
            name: "IDX_content_reports_status_created",
            columnNames: ["status", "created_at"],
          })
        );
      }
    }

    await createTableIfNotExists(
      queryRunner,
      new Table({
        name: "moderation_actions",
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
            name: "report_id",
            type: "varchar",
            length: "36",
          },
          {
            name: "admin_id",
            type: "varchar",
            length: "36",
          },
          {
            name: "action",
            type: "enum",
            enum: ["hide_content", "dismiss", "warn_user", "ban_user"],
          },
          {
            name: "notes",
            type: "varchar",
            length: "1000",
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

    const actionsTable = await queryRunner.getTable("moderation_actions");
    if (actionsTable) {
      if (
        !actionsTable.foreignKeys.find((fk) =>
          fk.columnNames.includes("report_id")
        )
      ) {
        await queryRunner.createForeignKey(
          "moderation_actions",
          new TableForeignKey({
            columnNames: ["report_id"],
            referencedTableName: "content_reports",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          })
        );
      }

      if (
        !actionsTable.foreignKeys.find((fk) =>
          fk.columnNames.includes("admin_id")
        )
      ) {
        await queryRunner.createForeignKey(
          "moderation_actions",
          new TableForeignKey({
            columnNames: ["admin_id"],
            referencedTableName: "users",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          })
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await dropTableIfExists(queryRunner, "moderation_actions");
    await dropTableIfExists(queryRunner, "content_reports");
    await dropTableIfExists(queryRunner, "user_blocks");
  }
}

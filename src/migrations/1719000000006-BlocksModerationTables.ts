import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from "typeorm";
import { createTableIfNotExists, dropTableIfExists } from "./helpers";

export class BlocksModerationTables1719000000006 implements MigrationInterface {
  name = "BlocksModerationTables1719000000006";

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
          { name: "blocker_id", type: "varchar", length: "36" },
          { name: "blocked_id", type: "varchar", length: "36" },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
        ],
        uniques: [
          {
            name: "UQ_user_blocks_blocker_blocked",
            columnNames: ["blocker_id", "blocked_id"],
          },
        ],
      })
    );

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
          { name: "reporter_id", type: "varchar", length: "36" },
          {
            name: "target_type",
            type: "enum",
            enum: ["user", "post", "comment"],
          },
          { name: "target_id", type: "varchar", length: "36" },
          { name: "reason", type: "text", isNullable: true },
          {
            name: "status",
            type: "enum",
            enum: ["open", "dismissed", "actioned"],
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
          { name: "report_id", type: "varchar", length: "36" },
          { name: "admin_id", type: "varchar", length: "36" },
          {
            name: "action",
            type: "enum",
            enum: ["hide_content", "dismiss", "warn_user"],
          },
          { name: "notes", type: "text", isNullable: true },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
        ],
      })
    );

    await this.ensureForeignKeys(queryRunner);
    await this.ensureIndexes(queryRunner);
  }

  private async ensureForeignKeys(queryRunner: QueryRunner): Promise<void> {
    const blocks = await queryRunner.getTable("user_blocks");
    if (blocks && !blocks.foreignKeys.some((fk) => fk.columnNames.includes("blocker_id"))) {
      await queryRunner.createForeignKey(
        "user_blocks",
        new TableForeignKey({
          columnNames: ["blocker_id"],
          referencedTableName: "users",
          referencedColumnNames: ["id"],
          onDelete: "CASCADE",
        })
      );
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

    const reports = await queryRunner.getTable("content_reports");
    if (reports && !reports.foreignKeys.some((fk) => fk.columnNames.includes("reporter_id"))) {
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

    const actions = await queryRunner.getTable("moderation_actions");
    if (actions && !actions.foreignKeys.some((fk) => fk.columnNames.includes("report_id"))) {
      await queryRunner.createForeignKey(
        "moderation_actions",
        new TableForeignKey({
          columnNames: ["report_id"],
          referencedTableName: "content_reports",
          referencedColumnNames: ["id"],
          onDelete: "CASCADE",
        })
      );
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

  private async ensureIndexes(queryRunner: QueryRunner): Promise<void> {
    const reports = await queryRunner.getTable("content_reports");
    if (reports && !reports.indices.some((i) => i.name === "IDX_content_reports_status")) {
      await queryRunner.createIndex(
        "content_reports",
        new TableIndex({
          name: "IDX_content_reports_status",
          columnNames: ["status", "created_at"],
        })
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await dropTableIfExists(queryRunner, "moderation_actions");
    await dropTableIfExists(queryRunner, "content_reports");
    await dropTableIfExists(queryRunner, "user_blocks");
  }
}

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

export class BasicPlanChatUnlockCallType1719000000012
  implements MigrationInterface
{
  name = "BasicPlanChatUnlockCallType1719000000012";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await addColumnIfNotExists(
      queryRunner,
      "users",
      new TableColumn({
        name: "is_basic",
        type: "boolean",
        default: false,
        isNullable: false,
      })
    );
    await addColumnIfNotExists(
      queryRunner,
      "users",
      new TableColumn({
        name: "basic_until",
        type: "timestamp",
        isNullable: true,
      })
    );
    await addColumnIfNotExists(
      queryRunner,
      "users",
      new TableColumn({
        name: "basic_product_id",
        type: "varchar",
        length: "128",
        isNullable: true,
      })
    );

    await addColumnIfNotExists(
      queryRunner,
      "video_calls",
      new TableColumn({
        name: "call_type",
        type: "enum",
        enum: ["voice", "video"],
        default: "'video'",
        isNullable: false,
      })
    );

    await createTableIfNotExists(
      queryRunner,
      new Table({
        name: "chat_unlocks",
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
            name: "user_a",
            type: "varchar",
            length: "36",
          },
          {
            name: "user_b",
            type: "varchar",
            length: "36",
          },
          {
            name: "unlocked_by",
            type: "varchar",
            length: "36",
          },
          {
            name: "points_spent",
            type: "int",
            default: 0,
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

    const unlocks = await queryRunner.getTable("chat_unlocks");
    if (unlocks) {
      if (
        !unlocks.indices.some((idx) => idx.name === "UQ_chat_unlocks_pair")
      ) {
        await queryRunner.createIndex(
          "chat_unlocks",
          new TableIndex({
            name: "UQ_chat_unlocks_pair",
            columnNames: ["user_a", "user_b"],
            isUnique: true,
          })
        );
      }
      if (
        !unlocks.indices.some((idx) => idx.name === "IDX_chat_unlocks_unlocked_by")
      ) {
        await queryRunner.createIndex(
          "chat_unlocks",
          new TableIndex({
            name: "IDX_chat_unlocks_unlocked_by",
            columnNames: ["unlocked_by"],
          })
        );
      }
      for (const col of ["user_a", "user_b", "unlocked_by"] as const) {
        const hasFk = unlocks.foreignKeys.some((fk) =>
          fk.columnNames.includes(col)
        );
        if (!hasFk) {
          await queryRunner.createForeignKey(
            "chat_unlocks",
            new TableForeignKey({
              columnNames: [col],
              referencedTableName: "users",
              referencedColumnNames: ["id"],
              onDelete: "CASCADE",
            })
          );
        }
      }
    }

    // Grandfather existing message pairs as unlocked (points_spent = 0).
    await queryRunner.query(`
      INSERT IGNORE INTO chat_unlocks (id, user_a, user_b, unlocked_by, points_spent, created_at, updated_at)
      SELECT
        UUID(),
        LEAST(m.sender_id, m.receiver_id) AS user_a,
        GREATEST(m.sender_id, m.receiver_id) AS user_b,
        MIN(m.sender_id) AS unlocked_by,
        0 AS points_spent,
        MIN(m.created_at) AS created_at,
        MIN(m.created_at) AS updated_at
      FROM messages m
      GROUP BY LEAST(m.sender_id, m.receiver_id), GREATEST(m.sender_id, m.receiver_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await dropTableIfExists(queryRunner, "chat_unlocks");
    await dropColumnIfExists(queryRunner, "video_calls", "call_type");
    await dropColumnIfExists(queryRunner, "users", "basic_product_id");
    await dropColumnIfExists(queryRunner, "users", "basic_until");
    await dropColumnIfExists(queryRunner, "users", "is_basic");
  }
}

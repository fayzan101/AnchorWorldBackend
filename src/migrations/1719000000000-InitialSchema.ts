import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from "typeorm";
import { createTableIfNotExists, dropTableIfExists } from "./helpers";

/**
 * Baseline schema for fresh databases (CI, new environments).
 * Skips tables that already exist on production (createTableIfNotExists).
 */
export class InitialSchema1719000000000 implements MigrationInterface {
  name = "InitialSchema1719000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await createTableIfNotExists(
      queryRunner,
      new Table({
        name: "users",
        columns: [
          {
            name: "id",
            type: "varchar",
            length: "36",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "uuid",
          },
          { name: "full_name", type: "varchar", length: "255" },
          { name: "email", type: "varchar", length: "255", isUnique: true },
          { name: "password_hash", type: "varchar", length: "255" },
          { name: "date_of_birth", type: "date" },
          {
            name: "gender",
            type: "enum",
            enum: ["male", "female", "other"],
          },
          {
            name: "profile_completed",
            type: "boolean",
            default: false,
          },
          {
            name: "seeking_relation",
            type: "enum",
            enum: ["date", "bff"],
            isNullable: true,
          },
          {
            name: "interested_in",
            type: "enum",
            enum: ["male", "female", "other"],
            isNullable: true,
          },
          { name: "height", type: "varchar", length: "500", isNullable: true },
          { name: "have_kids", type: "varchar", length: "500", isNullable: true },
          { name: "kids", type: "varchar", length: "500", isNullable: true },
          { name: "date_you_reason", type: "text", isNullable: true },
          {
            name: "profile_picture",
            type: "varchar",
            length: "500",
            isNullable: true,
          },
          { name: "location", type: "varchar", length: "255", isNullable: true },
          { name: "is_online", type: "boolean", default: false },
          { name: "last_seen", type: "timestamp", isNullable: true },
          { name: "bio", type: "text", isNullable: true },
          { name: "report_count", type: "int", default: 0 },
          {
            name: "reset_token",
            type: "varchar",
            length: "255",
            isNullable: true,
          },
          {
            name: "reset_token_expires",
            type: "timestamp",
            isNullable: true,
          },
          {
            name: "fcm_token",
            type: "varchar",
            length: "500",
            isNullable: true,
          },
          {
            name: "notifications_enabled",
            type: "boolean",
            default: true,
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
        name: "hobbies",
        columns: [
          {
            name: "id",
            type: "varchar",
            length: "36",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "uuid",
          },
          { name: "name", type: "varchar", length: "255" },
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
        name: "relationship_goals",
        columns: [
          {
            name: "id",
            type: "varchar",
            length: "36",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "uuid",
          },
          { name: "name", type: "varchar", length: "255" },
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
        name: "partner_qualities",
        columns: [
          {
            name: "id",
            type: "varchar",
            length: "36",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "uuid",
          },
          { name: "name", type: "varchar", length: "255" },
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
        name: "user_hobbies",
        columns: [
          { name: "user_id", type: "varchar", length: "36", isPrimary: true },
          { name: "hobby_id", type: "varchar", length: "36", isPrimary: true },
        ],
      })
    );

    await createTableIfNotExists(
      queryRunner,
      new Table({
        name: "user_goals",
        columns: [
          { name: "user_id", type: "varchar", length: "36", isPrimary: true },
          { name: "goal_id", type: "varchar", length: "36", isPrimary: true },
        ],
      })
    );

    await createTableIfNotExists(
      queryRunner,
      new Table({
        name: "user_partner_qualities",
        columns: [
          { name: "user_id", type: "varchar", length: "36", isPrimary: true },
          {
            name: "partner_quality_id",
            type: "varchar",
            length: "36",
            isPrimary: true,
          },
        ],
      })
    );

    await createTableIfNotExists(
      queryRunner,
      new Table({
        name: "follows",
        columns: [
          {
            name: "id",
            type: "varchar",
            length: "36",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "uuid",
          },
          { name: "follower_id", type: "varchar", length: "36" },
          { name: "following_id", type: "varchar", length: "36" },
          {
            name: "status",
            type: "enum",
            enum: ["pending", "accepted"],
            default: "'pending'",
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
        name: "messages",
        columns: [
          {
            name: "id",
            type: "varchar",
            length: "36",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "uuid",
          },
          { name: "sender_id", type: "varchar", length: "36" },
          { name: "receiver_id", type: "varchar", length: "36" },
          { name: "content", type: "text" },
          { name: "is_read", type: "boolean", default: false },
          { name: "read_at", type: "timestamp", isNullable: true },
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
        name: "refresh_tokens",
        columns: [
          {
            name: "id",
            type: "varchar",
            length: "36",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "uuid",
          },
          { name: "user_id", type: "varchar", length: "36" },
          { name: "token", type: "varchar", length: "500", isUnique: true },
          { name: "expires_at", type: "timestamp" },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
        ],
      })
    );

    await createTableIfNotExists(
      queryRunner,
      new Table({
        name: "likes",
        columns: [
          {
            name: "id",
            type: "varchar",
            length: "36",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "uuid",
          },
          { name: "liker_id", type: "varchar", length: "36" },
          { name: "liked_id", type: "varchar", length: "36" },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
        ],
      })
    );

    await createTableIfNotExists(
      queryRunner,
      new Table({
        name: "notifications",
        columns: [
          {
            name: "id",
            type: "varchar",
            length: "36",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "uuid",
          },
          { name: "user_id", type: "varchar", length: "36", isNullable: true },
          { name: "title", type: "varchar", length: "255" },
          { name: "body", type: "text" },
          {
            name: "type",
            type: "enum",
            enum: [
              "new_message",
              "friend_request",
              "friend_accept",
              "new_like",
            ],
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

    await this.ensureForeignKeys(queryRunner);
    await this.ensureIndexes(queryRunner);
  }

  private async ensureForeignKeys(queryRunner: QueryRunner): Promise<void> {
    const fks: Array<{
      table: string;
      column: string;
      refTable: string;
      onDelete?: string;
    }> = [
      { table: "user_hobbies", column: "user_id", refTable: "users", onDelete: "CASCADE" },
      { table: "user_hobbies", column: "hobby_id", refTable: "hobbies", onDelete: "CASCADE" },
      { table: "user_goals", column: "user_id", refTable: "users", onDelete: "CASCADE" },
      { table: "user_goals", column: "goal_id", refTable: "relationship_goals", onDelete: "CASCADE" },
      { table: "user_partner_qualities", column: "user_id", refTable: "users", onDelete: "CASCADE" },
      { table: "user_partner_qualities", column: "partner_quality_id", refTable: "partner_qualities", onDelete: "CASCADE" },
      { table: "follows", column: "follower_id", refTable: "users", onDelete: "CASCADE" },
      { table: "follows", column: "following_id", refTable: "users", onDelete: "CASCADE" },
      { table: "messages", column: "sender_id", refTable: "users", onDelete: "CASCADE" },
      { table: "messages", column: "receiver_id", refTable: "users", onDelete: "CASCADE" },
      { table: "refresh_tokens", column: "user_id", refTable: "users", onDelete: "CASCADE" },
      { table: "likes", column: "liker_id", refTable: "users", onDelete: "CASCADE" },
      { table: "likes", column: "liked_id", refTable: "users", onDelete: "CASCADE" },
      { table: "notifications", column: "user_id", refTable: "users", onDelete: "SET NULL" },
    ];

    for (const fk of fks) {
      const table = await queryRunner.getTable(fk.table);
      if (!table) continue;
      const exists = table.foreignKeys.some((item) =>
        item.columnNames.includes(fk.column)
      );
      if (exists) continue;
      await queryRunner.createForeignKey(
        fk.table,
        new TableForeignKey({
          columnNames: [fk.column],
          referencedTableName: fk.refTable,
          referencedColumnNames: ["id"],
          onDelete: fk.onDelete ?? "CASCADE",
        })
      );
    }
  }

  private async ensureIndexes(queryRunner: QueryRunner): Promise<void> {
    const indexes: Array<{ table: string; name: string; columns: string[]; unique?: boolean }> = [
      { table: "follows", name: "IDX_follows_follower_following", columns: ["follower_id", "following_id"], unique: true },
      { table: "likes", name: "IDX_likes_liker_liked", columns: ["liker_id", "liked_id"], unique: true },
      { table: "messages", name: "IDX_messages_sender_receiver", columns: ["sender_id", "receiver_id"] },
      { table: "messages", name: "IDX_messages_receiver_is_read", columns: ["receiver_id", "is_read"] },
    ];

    for (const index of indexes) {
      const table = await queryRunner.getTable(index.table);
      if (!table) continue;
      if (table.indices.some((item) => item.name === index.name)) continue;
      await queryRunner.createIndex(
        index.table,
        new TableIndex({
          name: index.name,
          columnNames: index.columns,
          isUnique: index.unique ?? false,
        })
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      "notifications",
      "likes",
      "refresh_tokens",
      "messages",
      "follows",
      "user_partner_qualities",
      "user_goals",
      "user_hobbies",
      "partner_qualities",
      "relationship_goals",
      "hobbies",
      "users",
    ];

    for (const tableName of tables) {
      await dropTableIfExists(queryRunner, tableName);
    }
  }
}

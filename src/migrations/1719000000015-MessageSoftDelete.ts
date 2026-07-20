import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from "typeorm";

export class MessageSoftDelete1719000000015 implements MigrationInterface {
  name = "MessageSoftDelete1719000000015";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const messages = await queryRunner.getTable("messages");
    if (messages && !messages.findColumnByName("deleted_at")) {
      await queryRunner.addColumn(
        "messages",
        new TableColumn({
          name: "deleted_at",
          type: "timestamp",
          isNullable: true,
        })
      );
    }
    if (messages && !messages.findColumnByName("deleted_by_user_id")) {
      await queryRunner.addColumn(
        "messages",
        new TableColumn({
          name: "deleted_by_user_id",
          type: "varchar",
          length: "36",
          isNullable: true,
        })
      );
    }

    const hides = await queryRunner.getTable("message_hides");
    if (!hides) {
      await queryRunner.createTable(
        new Table({
          name: "message_hides",
          columns: [
            {
              name: "message_id",
              type: "varchar",
              length: "36",
              isPrimary: true,
            },
            {
              name: "user_id",
              type: "varchar",
              length: "36",
              isPrimary: true,
            },
            {
              name: "created_at",
              type: "timestamp",
              default: "CURRENT_TIMESTAMP",
            },
          ],
        }),
        true
      );

      await queryRunner.createForeignKey(
        "message_hides",
        new TableForeignKey({
          columnNames: ["message_id"],
          referencedTableName: "messages",
          referencedColumnNames: ["id"],
          onDelete: "CASCADE",
        })
      );

      await queryRunner.createForeignKey(
        "message_hides",
        new TableForeignKey({
          columnNames: ["user_id"],
          referencedTableName: "users",
          referencedColumnNames: ["id"],
          onDelete: "CASCADE",
        })
      );

      await queryRunner.createIndex(
        "message_hides",
        new TableIndex({
          name: "IDX_message_hides_user_id",
          columnNames: ["user_id"],
        })
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hides = await queryRunner.getTable("message_hides");
    if (hides) {
      await queryRunner.dropTable("message_hides");
    }

    const messages = await queryRunner.getTable("messages");
    if (messages?.findColumnByName("deleted_by_user_id")) {
      await queryRunner.dropColumn("messages", "deleted_by_user_id");
    }
    if (messages?.findColumnByName("deleted_at")) {
      await queryRunner.dropColumn("messages", "deleted_at");
    }
  }
}

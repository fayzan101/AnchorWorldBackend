import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from "typeorm";

export class MessageReplyTo1719000000014 implements MigrationInterface {
  name = "MessageReplyTo1719000000014";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("messages");
    if (!table?.findColumnByName("reply_to_message_id")) {
      await queryRunner.addColumn(
        "messages",
        new TableColumn({
          name: "reply_to_message_id",
          type: "uuid",
          isNullable: true,
        })
      );
      await queryRunner.createForeignKey(
        "messages",
        new TableForeignKey({
          columnNames: ["reply_to_message_id"],
          referencedTableName: "messages",
          referencedColumnNames: ["id"],
          onDelete: "SET NULL",
        })
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("messages");
    const fk = table?.foreignKeys.find((f) =>
      f.columnNames.includes("reply_to_message_id")
    );
    if (fk) await queryRunner.dropForeignKey("messages", fk);
    if (table?.findColumnByName("reply_to_message_id")) {
      await queryRunner.dropColumn("messages", "reply_to_message_id");
    }
  }
}

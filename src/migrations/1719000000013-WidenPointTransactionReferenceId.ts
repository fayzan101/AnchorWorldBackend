import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class WidenPointTransactionReferenceId1719000000013
  implements MigrationInterface
{
  name = "WidenPointTransactionReferenceId1719000000013";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("point_transactions");
    const col = table?.findColumnByName("reference_id");
    if (!col) return;

    await queryRunner.changeColumn(
      "point_transactions",
      "reference_id",
      new TableColumn({
        name: "reference_id",
        type: "varchar",
        length: "128",
        isNullable: true,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.changeColumn(
      "point_transactions",
      "reference_id",
      new TableColumn({
        name: "reference_id",
        type: "varchar",
        length: "36",
        isNullable: true,
      })
    );
  }
}

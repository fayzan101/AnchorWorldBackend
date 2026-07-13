import { QueryRunner, Table, TableColumn } from "typeorm";

export async function addColumnIfNotExists(
  queryRunner: QueryRunner,
  tableName: string,
  column: TableColumn
): Promise<void> {
  const table = await queryRunner.getTable(tableName);
  if (!table) {
    throw new Error(`Table "${tableName}" does not exist`);
  }

  if (!table.findColumnByName(column.name)) {
    await queryRunner.addColumn(tableName, column);
  }
}

export async function dropColumnIfExists(
  queryRunner: QueryRunner,
  tableName: string,
  columnName: string
): Promise<void> {
  const table = await queryRunner.getTable(tableName);
  if (table?.findColumnByName(columnName)) {
    await queryRunner.dropColumn(tableName, columnName);
  }
}

export async function createTableIfNotExists(
  queryRunner: QueryRunner,
  table: Table
): Promise<void> {
  const exists = await queryRunner.hasTable(table.name);
  if (!exists) {
    await queryRunner.createTable(table, true);
  }
}

export async function dropTableIfExists(
  queryRunner: QueryRunner,
  tableName: string
): Promise<void> {
  const exists = await queryRunner.hasTable(tableName);
  if (exists) {
    await queryRunner.dropTable(tableName, true, true, true);
  }
}

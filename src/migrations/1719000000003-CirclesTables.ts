import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from "typeorm";
import { createTableIfNotExists, dropTableIfExists } from "./helpers";

export class CirclesTables1719000000003 implements MigrationInterface {
  name = "CirclesTables1719000000003";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await createTableIfNotExists(
      queryRunner,
      new Table({
        name: "circles",
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
            name: "name",
            type: "varchar",
            length: "120",
          },
          {
            name: "slug",
            type: "varchar",
            length: "120",
            isUnique: true,
          },
          {
            name: "description",
            type: "text",
            isNullable: true,
          },
          {
            name: "icon_url",
            type: "varchar",
            length: "500",
            isNullable: true,
          },
          {
            name: "member_count",
            type: "int",
            default: 0,
          },
          {
            name: "is_featured",
            type: "boolean",
            default: false,
          },
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
        name: "circle_members",
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
            name: "circle_id",
            type: "varchar",
            length: "36",
          },
          {
            name: "user_id",
            type: "varchar",
            length: "36",
          },
          {
            name: "role",
            type: "enum",
            enum: ["member", "admin"],
            default: "'member'",
          },
          {
            name: "joined_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
        ],
      })
    );

    const membersTable = await queryRunner.getTable("circle_members");

    if (
      !membersTable?.indices.some(
        (index) => index.name === "IDX_circle_members_circle_user"
      )
    ) {
      await queryRunner.createIndex(
        "circle_members",
        new TableIndex({
          name: "IDX_circle_members_circle_user",
          columnNames: ["circle_id", "user_id"],
          isUnique: true,
        })
      );
    }

    if (
      !membersTable?.foreignKeys.some((fk) =>
        fk.columnNames.includes("circle_id")
      )
    ) {
      await queryRunner.createForeignKey(
        "circle_members",
        new TableForeignKey({
          columnNames: ["circle_id"],
          referencedTableName: "circles",
          referencedColumnNames: ["id"],
          onDelete: "CASCADE",
        })
      );
    }

    const membersTableAfter = await queryRunner.getTable("circle_members");
    if (
      !membersTableAfter?.foreignKeys.some((fk) =>
        fk.columnNames.includes("user_id")
      )
    ) {
      await queryRunner.createForeignKey(
        "circle_members",
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
    await dropTableIfExists(queryRunner, "circle_members");
    await dropTableIfExists(queryRunner, "circles");
  }
}

import type { Knex } from "knex";

export const up = async (knex: Knex): Promise<void> => {
  await knex.schema.createTable("transfers", (table) => {
    table.uuid("id").primary();
    table
      .uuid("from_wallet_id")
      .notNullable()
      .references("id")
      .inTable("wallets")
      .onDelete("RESTRICT");
    table
      .uuid("to_wallet_id")
      .notNullable()
      .references("id")
      .inTable("wallets")
      .onDelete("RESTRICT");
    table.decimal("amount", 20, 4).notNullable();
    table
      .enum("status", ["pending", "completed", "failed"])
      .notNullable()
      .defaultTo("pending");
    table.string("idempotency_key", 255).notNullable().unique();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());

    table.index(["from_wallet_id"]);
    table.index(["to_wallet_id"]);
    table.index(["idempotency_key"]);
  });
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.schema.dropTableIfExists("transfers");
};

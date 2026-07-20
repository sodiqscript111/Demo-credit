import type { Knex } from 'knex';

export const up = async (knex: Knex): Promise<void> => {
  await knex.schema.createTable('ledger_entries', (table) => {
    table.uuid('id').primary();
    table.uuid('wallet_id').notNullable().references('id').inTable('wallets').onDelete('CASCADE');
    table.uuid('transfer_id').nullable().references('id').inTable('transfers').onDelete('SET NULL');
    table.decimal('amount', 20, 4).notNullable();
    table.enum('type', ['credit', 'debit']).notNullable();
    table.string('reference', 255).nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index(['wallet_id']);
    table.index(['transfer_id']);
  });
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.schema.dropTableIfExists('ledger_entries');
};

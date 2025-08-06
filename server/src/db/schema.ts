
import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const itemTypeEnum = pgEnum('item_type', ['item', 'service']);
export const transactionStatusEnum = pgEnum('transaction_status', ['draft', 'confirmed', 'paid', 'cancelled']);
export const documentTypeEnum = pgEnum('document_type', [
  'sales_note',
  'payment_receipt', 
  'invoice',
  'bast',
  'purchase_order',
  'tax_invoice',
  'proforma_invoice'
]);

// Store Profile Table
export const storeProfilesTable = pgTable('store_profiles', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull(),
  npwp: text('npwp').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Catalog Items Table
export const catalogItemsTable = pgTable('catalog_items', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  type: itemTypeEnum('type').notNull(),
  unit_price: numeric('unit_price', { precision: 15, scale: 2 }).notNull(),
  description: text('description'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Transactions Table
export const transactionsTable = pgTable('transactions', {
  id: serial('id').primaryKey(),
  transaction_number: text('transaction_number').notNull().unique(),
  customer_name: text('customer_name').notNull(),
  customer_address: text('customer_address'),
  customer_phone: text('customer_phone'),
  customer_email: text('customer_email'),
  status: transactionStatusEnum('status').notNull().default('draft'),
  subtotal: numeric('subtotal', { precision: 15, scale: 2 }).notNull(),
  ppn_enabled: boolean('ppn_enabled').notNull().default(true),
  ppn_amount: numeric('ppn_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  regional_tax_enabled: boolean('regional_tax_enabled').notNull().default(false),
  regional_tax_amount: numeric('regional_tax_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  pph22_enabled: boolean('pph22_enabled').notNull().default(false),
  pph22_amount: numeric('pph22_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  pph23_enabled: boolean('pph23_enabled').notNull().default(false),
  pph23_amount: numeric('pph23_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  stamp_duty_required: boolean('stamp_duty_required').notNull().default(false),
  stamp_duty_amount: numeric('stamp_duty_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  total_amount: numeric('total_amount', { precision: 15, scale: 2 }).notNull(),
  notes: text('notes'),
  transaction_date: timestamp('transaction_date').notNull().defaultNow(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Transaction Items Table
export const transactionItemsTable = pgTable('transaction_items', {
  id: serial('id').primaryKey(),
  transaction_id: integer('transaction_id').notNull().references(() => transactionsTable.id, { onDelete: 'cascade' }),
  catalog_item_id: integer('catalog_item_id').notNull().references(() => catalogItemsTable.id),
  quantity: numeric('quantity', { precision: 10, scale: 3 }).notNull(),
  unit_price: numeric('unit_price', { precision: 15, scale: 2 }).notNull(),
  discount_percentage: numeric('discount_percentage', { precision: 5, scale: 2 }).notNull().default('0'),
  line_total: numeric('line_total', { precision: 15, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Documents Table
export const documentsTable = pgTable('documents', {
  id: serial('id').primaryKey(),
  transaction_id: integer('transaction_id').notNull().references(() => transactionsTable.id, { onDelete: 'cascade' }),
  document_type: documentTypeEnum('document_type').notNull(),
  document_number: text('document_number').notNull(),
  document_date: timestamp('document_date').notNull(),
  recipient_name: text('recipient_name'),
  custom_notes: text('custom_notes'),
  html_content: text('html_content').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const storeProfilesRelations = relations(storeProfilesTable, ({ many }) => ({
  transactions: many(transactionsTable),
}));

export const catalogItemsRelations = relations(catalogItemsTable, ({ many }) => ({
  transactionItems: many(transactionItemsTable),
}));

export const transactionsRelations = relations(transactionsTable, ({ many, one }) => ({
  items: many(transactionItemsTable),
  documents: many(documentsTable),
  storeProfile: one(storeProfilesTable),
}));

export const transactionItemsRelations = relations(transactionItemsTable, ({ one }) => ({
  transaction: one(transactionsTable, {
    fields: [transactionItemsTable.transaction_id],
    references: [transactionsTable.id],
  }),
  catalogItem: one(catalogItemsTable, {
    fields: [transactionItemsTable.catalog_item_id],
    references: [catalogItemsTable.id],
  }),
}));

export const documentsRelations = relations(documentsTable, ({ one }) => ({
  transaction: one(transactionsTable, {
    fields: [documentsTable.transaction_id],
    references: [transactionsTable.id],
  }),
}));

// TypeScript types for the table schemas
export type StoreProfile = typeof storeProfilesTable.$inferSelect;
export type NewStoreProfile = typeof storeProfilesTable.$inferInsert;
export type CatalogItem = typeof catalogItemsTable.$inferSelect;
export type NewCatalogItem = typeof catalogItemsTable.$inferInsert;
export type Transaction = typeof transactionsTable.$inferSelect;
export type NewTransaction = typeof transactionsTable.$inferInsert;
export type TransactionItem = typeof transactionItemsTable.$inferSelect;
export type NewTransactionItem = typeof transactionItemsTable.$inferInsert;
export type Document = typeof documentsTable.$inferSelect;
export type NewDocument = typeof documentsTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  storeProfiles: storeProfilesTable,
  catalogItems: catalogItemsTable,
  transactions: transactionsTable,
  transactionItems: transactionItemsTable,
  documents: documentsTable,
};

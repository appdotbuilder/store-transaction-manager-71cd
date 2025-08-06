
import { z } from 'zod';

// Store Profile Schema
export const storeProfileSchema = z.object({
  id: z.number(),
  name: z.string(),
  address: z.string(),
  phone: z.string(),
  email: z.string().email(),
  npwp: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type StoreProfile = z.infer<typeof storeProfileSchema>;

export const createStoreProfileInputSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  npwp: z.string().min(1)
});

export type CreateStoreProfileInput = z.infer<typeof createStoreProfileInputSchema>;

export const updateStoreProfileInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  email: z.string().email().optional(),
  npwp: z.string().min(1).optional()
});

export type UpdateStoreProfileInput = z.infer<typeof updateStoreProfileInputSchema>;

// Item/Service Catalog Schema
export const itemTypeEnum = z.enum(['item', 'service']);
export type ItemType = z.infer<typeof itemTypeEnum>;

export const catalogItemSchema = z.object({
  id: z.number(),
  code: z.string(),
  name: z.string(),
  type: itemTypeEnum,
  unit_price: z.number(),
  description: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type CatalogItem = z.infer<typeof catalogItemSchema>;

export const createCatalogItemInputSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  type: itemTypeEnum,
  unit_price: z.number().positive(),
  description: z.string().nullable().optional()
});

export type CreateCatalogItemInput = z.infer<typeof createCatalogItemInputSchema>;

export const updateCatalogItemInputSchema = z.object({
  id: z.number(),
  code: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  type: itemTypeEnum.optional(),
  unit_price: z.number().positive().optional(),
  description: z.string().nullable().optional()
});

export type UpdateCatalogItemInput = z.infer<typeof updateCatalogItemInputSchema>;

// Transaction Schema
export const transactionStatusEnum = z.enum(['draft', 'confirmed', 'paid', 'cancelled']);
export type TransactionStatus = z.infer<typeof transactionStatusEnum>;

export const transactionSchema = z.object({
  id: z.number(),
  transaction_number: z.string(),
  customer_name: z.string(),
  customer_address: z.string().nullable(),
  customer_phone: z.string().nullable(),
  customer_email: z.string().nullable(),
  status: transactionStatusEnum,
  subtotal: z.number(),
  ppn_enabled: z.boolean(),
  ppn_amount: z.number(),
  regional_tax_enabled: z.boolean(),
  regional_tax_amount: z.number(),
  pph22_enabled: z.boolean(),
  pph22_amount: z.number(),
  pph23_enabled: z.boolean(),
  pph23_amount: z.number(),
  stamp_duty_required: z.boolean(),
  stamp_duty_amount: z.number(),
  total_amount: z.number(),
  notes: z.string().nullable(),
  transaction_date: z.coerce.date(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Transaction = z.infer<typeof transactionSchema>;

export const createTransactionInputSchema = z.object({
  customer_name: z.string().min(1),
  customer_address: z.string().nullable().optional(),
  customer_phone: z.string().nullable().optional(),
  customer_email: z.string().email().nullable().optional(),
  ppn_enabled: z.boolean().default(true),
  regional_tax_enabled: z.boolean().default(false),
  pph22_enabled: z.boolean().default(false),
  pph23_enabled: z.boolean().default(false),
  notes: z.string().nullable().optional(),
  transaction_date: z.coerce.date().optional(),
  items: z.array(z.object({
    catalog_item_id: z.number(),
    quantity: z.number().positive(),
    unit_price: z.number().positive(),
    discount_percentage: z.number().min(0).max(100).default(0)
  })).min(1)
});

export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>;

export const updateTransactionInputSchema = z.object({
  id: z.number(),
  customer_name: z.string().min(1).optional(),
  customer_address: z.string().nullable().optional(),
  customer_phone: z.string().nullable().optional(),
  customer_email: z.string().email().nullable().optional(),
  status: transactionStatusEnum.optional(),
  ppn_enabled: z.boolean().optional(),
  regional_tax_enabled: z.boolean().optional(),
  pph22_enabled: z.boolean().optional(),
  pph23_enabled: z.boolean().optional(),
  notes: z.string().nullable().optional(),
  transaction_date: z.coerce.date().optional()
});

export type UpdateTransactionInput = z.infer<typeof updateTransactionInputSchema>;

// Transaction Item Schema
export const transactionItemSchema = z.object({
  id: z.number(),
  transaction_id: z.number(),
  catalog_item_id: z.number(),
  quantity: z.number(),
  unit_price: z.number(),
  discount_percentage: z.number(),
  line_total: z.number(),
  created_at: z.coerce.date()
});

export type TransactionItem = z.infer<typeof transactionItemSchema>;

// Document Type Schema
export const documentTypeEnum = z.enum([
  'sales_note',
  'payment_receipt',
  'invoice',
  'bast',
  'purchase_order',
  'tax_invoice',
  'proforma_invoice'
]);

export type DocumentType = z.infer<typeof documentTypeEnum>;

export const documentSchema = z.object({
  id: z.number(),
  transaction_id: z.number(),
  document_type: documentTypeEnum,
  document_number: z.string(),
  document_date: z.coerce.date(),
  recipient_name: z.string().nullable(),
  custom_notes: z.string().nullable(),
  html_content: z.string(),
  created_at: z.coerce.date()
});

export type Document = z.infer<typeof documentSchema>;

export const generateDocumentInputSchema = z.object({
  transaction_id: z.number(),
  document_type: documentTypeEnum,
  document_date: z.coerce.date().optional(),
  recipient_name: z.string().nullable().optional(),
  custom_notes: z.string().nullable().optional()
});

export type GenerateDocumentInput = z.infer<typeof generateDocumentInputSchema>;

// Search and Filter Schemas
export const catalogSearchInputSchema = z.object({
  query: z.string().optional(),
  type: itemTypeEnum.optional(),
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0)
});

export type CatalogSearchInput = z.infer<typeof catalogSearchInputSchema>;

export const transactionHistoryInputSchema = z.object({
  status: transactionStatusEnum.optional(),
  customer_name: z.string().optional(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0)
});

export type TransactionHistoryInput = z.infer<typeof transactionHistoryInputSchema>;

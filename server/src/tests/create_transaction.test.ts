
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { transactionsTable, transactionItemsTable, catalogItemsTable } from '../db/schema';
import { type CreateTransactionInput } from '../schema';
import { createTransaction } from '../handlers/create_transaction';
import { eq } from 'drizzle-orm';

describe('createTransaction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper to create test catalog item
  const createTestCatalogItem = async () => {
    const result = await db.insert(catalogItemsTable)
      .values({
        code: 'TEST-001',
        name: 'Test Item',
        type: 'item',
        unit_price: '1000.00',
        description: 'Test item for transactions'
      })
      .returning()
      .execute();
    return result[0];
  };

  const baseInput: CreateTransactionInput = {
    customer_name: 'John Doe',
    customer_address: '123 Main St',
    customer_phone: '081234567890',
    customer_email: 'john@example.com',
    ppn_enabled: true,
    regional_tax_enabled: false,
    pph22_enabled: false,
    pph23_enabled: false,
    notes: 'Test transaction',
    transaction_date: new Date('2024-01-15'),
    items: []
  };

  it('should create a basic transaction with PPN', async () => {
    const catalogItem = await createTestCatalogItem();
    
    const input: CreateTransactionInput = {
      ...baseInput,
      items: [{
        catalog_item_id: catalogItem.id,
        quantity: 2,
        unit_price: 1000,
        discount_percentage: 0
      }]
    };

    const result = await createTransaction(input);

    // Basic field validation
    expect(result.customer_name).toEqual('John Doe');
    expect(result.customer_address).toEqual('123 Main St');
    expect(result.customer_phone).toEqual('081234567890');
    expect(result.customer_email).toEqual('john@example.com');
    expect(result.status).toEqual('draft');
    expect(result.notes).toEqual('Test transaction');
    expect(result.id).toBeDefined();
    expect(result.transaction_number).toMatch(/^TRX-\d+$/);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Tax calculations
    expect(result.subtotal).toEqual(2000); // 2 * 1000
    expect(result.ppn_enabled).toBe(true);
    expect(result.ppn_amount).toEqual(220); // 2000 * 0.11
    expect(result.regional_tax_enabled).toBe(false);
    expect(result.regional_tax_amount).toEqual(0);
    expect(result.pph22_enabled).toBe(false);
    expect(result.pph22_amount).toEqual(0);
    expect(result.pph23_enabled).toBe(false);
    expect(result.pph23_amount).toEqual(0);
    expect(result.stamp_duty_required).toBe(false);
    expect(result.stamp_duty_amount).toEqual(0);
    expect(result.total_amount).toEqual(2220); // 2000 + 220

    // Verify numeric types
    expect(typeof result.subtotal).toBe('number');
    expect(typeof result.ppn_amount).toBe('number');
    expect(typeof result.total_amount).toBe('number');
  });

  it('should create transaction with all taxes enabled', async () => {
    const catalogItem = await createTestCatalogItem();
    
    const input: CreateTransactionInput = {
      ...baseInput,
      ppn_enabled: true,
      regional_tax_enabled: true,
      pph22_enabled: true,
      pph23_enabled: true,
      items: [{
        catalog_item_id: catalogItem.id,
        quantity: 1,
        unit_price: 10000,
        discount_percentage: 0
      }]
    };

    const result = await createTransaction(input);

    expect(result.subtotal).toEqual(10000);
    expect(result.ppn_amount).toEqual(1100); // 10000 * 0.11
    expect(result.regional_tax_amount).toEqual(100); // 10000 * 0.01
    expect(result.pph22_amount).toEqual(20); // 10000 * 0.002
    expect(result.pph23_amount).toEqual(200); // 10000 * 0.02
    expect(result.stamp_duty_required).toBe(false);
    expect(result.stamp_duty_amount).toEqual(0);
    expect(result.total_amount).toEqual(10980); // 10000 + 1100 + 100 - 20 - 200
  });

  it('should require stamp duty for transactions >= 5,000,000', async () => {
    const catalogItem = await createTestCatalogItem();
    
    const input: CreateTransactionInput = {
      ...baseInput,
      ppn_enabled: false,
      items: [{
        catalog_item_id: catalogItem.id,
        quantity: 1,
        unit_price: 5000000,
        discount_percentage: 0
      }]
    };

    const result = await createTransaction(input);

    expect(result.subtotal).toEqual(5000000);
    expect(result.stamp_duty_required).toBe(true);
    expect(result.stamp_duty_amount).toEqual(10000);
    expect(result.total_amount).toEqual(5010000); // 5000000 + 10000
  });

  it('should handle discounted items correctly', async () => {
    const catalogItem = await createTestCatalogItem();
    
    const input: CreateTransactionInput = {
      ...baseInput,
      ppn_enabled: false,
      items: [{
        catalog_item_id: catalogItem.id,
        quantity: 2,
        unit_price: 1000,
        discount_percentage: 10
      }]
    };

    const result = await createTransaction(input);

    expect(result.subtotal).toEqual(1800); // 2 * 1000 * (1 - 0.10)
    expect(result.total_amount).toEqual(1800);
  });

  it('should save transaction and items to database', async () => {
    const catalogItem = await createTestCatalogItem();
    
    const input: CreateTransactionInput = {
      ...baseInput,
      items: [{
        catalog_item_id: catalogItem.id,
        quantity: 2,
        unit_price: 1000,
        discount_percentage: 5
      }]
    };

    const result = await createTransaction(input);

    // Verify transaction in database
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, result.id))
      .execute();

    expect(transactions).toHaveLength(1);
    expect(transactions[0].customer_name).toEqual('John Doe');
    expect(parseFloat(transactions[0].subtotal)).toEqual(1900); // 2 * 1000 * 0.95

    // Verify transaction items in database
    const transactionItems = await db.select()
      .from(transactionItemsTable)
      .where(eq(transactionItemsTable.transaction_id, result.id))
      .execute();

    expect(transactionItems).toHaveLength(1);
    expect(transactionItems[0].catalog_item_id).toEqual(catalogItem.id);
    expect(parseFloat(transactionItems[0].quantity)).toEqual(2);
    expect(parseFloat(transactionItems[0].unit_price)).toEqual(1000);
    expect(parseFloat(transactionItems[0].discount_percentage)).toEqual(5);
    expect(parseFloat(transactionItems[0].line_total)).toEqual(1900);
  });

  it('should handle multiple items in one transaction', async () => {
    const catalogItem1 = await createTestCatalogItem();
    const catalogItem2 = await db.insert(catalogItemsTable)
      .values({
        code: 'TEST-002',
        name: 'Test Item 2',
        type: 'service',
        unit_price: '2000.00',
        description: 'Second test item'
      })
      .returning()
      .execute();

    const input: CreateTransactionInput = {
      ...baseInput,
      ppn_enabled: false,
      items: [
        {
          catalog_item_id: catalogItem1.id,
          quantity: 1,
          unit_price: 1000,
          discount_percentage: 0
        },
        {
          catalog_item_id: catalogItem2[0].id,
          quantity: 2,
          unit_price: 2000,
          discount_percentage: 10
        }
      ]
    };

    const result = await createTransaction(input);

    expect(result.subtotal).toEqual(4600); // 1000 + (2 * 2000 * 0.9)
    expect(result.total_amount).toEqual(4600);

    // Verify both items were created
    const transactionItems = await db.select()
      .from(transactionItemsTable)
      .where(eq(transactionItemsTable.transaction_id, result.id))
      .execute();

    expect(transactionItems).toHaveLength(2);
  });

  it('should throw error for non-existent catalog item', async () => {
    const input: CreateTransactionInput = {
      ...baseInput,
      items: [{
        catalog_item_id: 999,
        quantity: 1,
        unit_price: 1000,
        discount_percentage: 0
      }]
    };

    expect(createTransaction(input)).rejects.toThrow(/catalog item.*not found/i);
  });

  it('should use defaults from Zod schema', async () => {
    const catalogItem = await createTestCatalogItem();
    
    // Minimal input without explicit defaults
    const input = {
      customer_name: 'Jane Doe',
      items: [{
        catalog_item_id: catalogItem.id,
        quantity: 1,
        unit_price: 1000,
        discount_percentage: 0
      }]
    } as CreateTransactionInput; // Type assertion since Zod applies defaults

    const result = await createTransaction(input);

    // Verify Zod defaults were applied
    expect(result.ppn_enabled).toBe(true);
    expect(result.regional_tax_enabled).toBe(false);
    expect(result.pph22_enabled).toBe(false);
    expect(result.pph23_enabled).toBe(false);
  });
});

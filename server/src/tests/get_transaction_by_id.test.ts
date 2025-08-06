
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { transactionsTable, catalogItemsTable, transactionItemsTable } from '../db/schema';
import { type CreateTransactionInput, type CreateCatalogItemInput } from '../schema';
import { getTransactionById } from '../handlers/get_transaction_by_id';

// Test data
const testCatalogItem: CreateCatalogItemInput = {
  code: 'ITEM001',
  name: 'Test Item',
  type: 'item',
  unit_price: 100.00,
  description: 'Test catalog item'
};

const testTransaction: CreateTransactionInput = {
  customer_name: 'Test Customer',
  customer_address: 'Test Address',
  customer_phone: '123456789',
  customer_email: 'test@example.com',
  ppn_enabled: true,
  regional_tax_enabled: false,
  pph22_enabled: false,
  pph23_enabled: false,
  notes: 'Test transaction',
  items: [{
    catalog_item_id: 1, // Will be updated after catalog item creation
    quantity: 2,
    unit_price: 100.00,
    discount_percentage: 10
  }]
};

describe('getTransactionById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null for non-existent transaction', async () => {
    const result = await getTransactionById(999);
    expect(result).toBeNull();
  });

  it('should fetch transaction by ID with correct numeric conversions', async () => {
    // Create catalog item first
    const catalogResult = await db.insert(catalogItemsTable)
      .values({
        code: testCatalogItem.code,
        name: testCatalogItem.name,
        type: testCatalogItem.type,
        unit_price: testCatalogItem.unit_price.toString(),
        description: testCatalogItem.description
      })
      .returning()
      .execute();

    const catalogItemId = catalogResult[0].id;

    // Create transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        transaction_number: 'TXN-001',
        customer_name: testTransaction.customer_name,
        customer_address: testTransaction.customer_address,
        customer_phone: testTransaction.customer_phone,
        customer_email: testTransaction.customer_email,
        subtotal: '200.00',
        ppn_enabled: testTransaction.ppn_enabled,
        ppn_amount: '22.00',
        regional_tax_enabled: testTransaction.regional_tax_enabled,
        regional_tax_amount: '0.00',
        pph22_enabled: testTransaction.pph22_enabled,
        pph22_amount: '0.00',
        pph23_enabled: testTransaction.pph23_enabled,
        pph23_amount: '0.00',
        stamp_duty_required: false,
        stamp_duty_amount: '0.00',
        total_amount: '222.00',
        notes: testTransaction.notes
      })
      .returning()
      .execute();

    const transactionId = transactionResult[0].id;

    // Create transaction item
    await db.insert(transactionItemsTable)
      .values({
        transaction_id: transactionId,
        catalog_item_id: catalogItemId,
        quantity: '2.000',
        unit_price: '100.00',
        discount_percentage: '10.00',
        line_total: '180.00'
      })
      .execute();

    // Test the handler
    const result = await getTransactionById(transactionId);

    expect(result).toBeDefined();
    expect(result?.id).toEqual(transactionId);
    expect(result?.customer_name).toEqual('Test Customer');
    expect(result?.customer_address).toEqual('Test Address');
    expect(result?.customer_phone).toEqual('123456789');
    expect(result?.customer_email).toEqual('test@example.com');
    expect(result?.status).toEqual('draft');
    
    // Verify numeric conversions
    expect(typeof result?.subtotal).toBe('number');
    expect(result?.subtotal).toEqual(200.00);
    expect(typeof result?.ppn_amount).toBe('number');
    expect(result?.ppn_amount).toEqual(22.00);
    expect(typeof result?.total_amount).toBe('number');
    expect(result?.total_amount).toEqual(222.00);
    
    // Verify tax fields
    expect(result?.ppn_enabled).toBe(true);
    expect(result?.regional_tax_enabled).toBe(false);
    expect(result?.pph22_enabled).toBe(false);
    expect(result?.pph23_enabled).toBe(false);
    expect(result?.stamp_duty_required).toBe(false);
    
    // Verify timestamps
    expect(result?.created_at).toBeInstanceOf(Date);
    expect(result?.updated_at).toBeInstanceOf(Date);
    expect(result?.transaction_date).toBeInstanceOf(Date);
    
    expect(result?.notes).toEqual('Test transaction');
  });

  it('should fetch transaction with minimal data', async () => {
    // Create catalog item first
    const catalogResult = await db.insert(catalogItemsTable)
      .values({
        code: 'MIN001',
        name: 'Minimal Item',
        type: 'service',
        unit_price: '50.00'
      })
      .returning()
      .execute();

    const catalogItemId = catalogResult[0].id;

    // Create minimal transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        transaction_number: 'MIN-001',
        customer_name: 'Minimal Customer',
        subtotal: '50.00',
        total_amount: '50.00'
      })
      .returning()
      .execute();

    const transactionId = transactionResult[0].id;

    const result = await getTransactionById(transactionId);

    expect(result).toBeDefined();
    expect(result?.id).toEqual(transactionId);
    expect(result?.customer_name).toEqual('Minimal Customer');
    expect(result?.customer_address).toBeNull();
    expect(result?.customer_phone).toBeNull();
    expect(result?.customer_email).toBeNull();
    expect(result?.notes).toBeNull();
    
    // Verify default numeric values
    expect(result?.subtotal).toEqual(50.00);
    expect(result?.ppn_amount).toEqual(0.00);
    expect(result?.total_amount).toEqual(50.00);
  });
});

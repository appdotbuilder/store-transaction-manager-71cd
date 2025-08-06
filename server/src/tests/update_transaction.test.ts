
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { transactionsTable, catalogItemsTable, transactionItemsTable } from '../db/schema';
import { type UpdateTransactionInput } from '../schema';
import { updateTransaction } from '../handlers/update_transaction';
import { eq } from 'drizzle-orm';

describe('updateTransaction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let transactionId: number;
  let catalogItemId: number;

  beforeEach(async () => {
    // Create a catalog item first
    const catalogResult = await db.insert(catalogItemsTable)
      .values({
        code: 'TEST-001',
        name: 'Test Item',
        type: 'item',
        unit_price: '100.00',
        description: 'Test item description'
      })
      .returning()
      .execute();
    
    catalogItemId = catalogResult[0].id;

    // Create a transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        transaction_number: 'TRX-001',
        customer_name: 'Test Customer',
        customer_address: '123 Test Street',
        customer_phone: '+1234567890',
        customer_email: 'test@example.com',
        status: 'draft',
        subtotal: '1000.00',
        ppn_enabled: true,
        ppn_amount: '110.00',
        regional_tax_enabled: false,
        regional_tax_amount: '0.00',
        pph22_enabled: false,
        pph22_amount: '0.00',
        pph23_enabled: false,
        pph23_amount: '0.00',
        stamp_duty_required: false,
        stamp_duty_amount: '0.00',
        total_amount: '1110.00',
        notes: 'Test transaction',
        transaction_date: new Date('2024-01-01')
      })
      .returning()
      .execute();

    transactionId = transactionResult[0].id;

    // Add transaction items for tax calculation
    await db.insert(transactionItemsTable)
      .values({
        transaction_id: transactionId,
        catalog_item_id: catalogItemId,
        quantity: '10.000',
        unit_price: '100.00',
        discount_percentage: '0.00',
        line_total: '1000.00'
      })
      .execute();
  });

  it('should update basic transaction fields', async () => {
    const input: UpdateTransactionInput = {
      id: transactionId,
      customer_name: 'Updated Customer',
      customer_address: '456 New Street',
      status: 'confirmed',
      notes: 'Updated notes'
    };

    const result = await updateTransaction(input);

    expect(result.id).toBe(transactionId);
    expect(result.customer_name).toBe('Updated Customer');
    expect(result.customer_address).toBe('456 New Street');
    expect(result.status).toBe('confirmed');
    expect(result.notes).toBe('Updated notes');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should recalculate taxes when tax settings are updated', async () => {
    const input: UpdateTransactionInput = {
      id: transactionId,
      ppn_enabled: false, // Disable PPN
      regional_tax_enabled: true, // Enable regional tax
      pph22_enabled: true // Enable PPh22
    };

    const result = await updateTransaction(input);

    expect(result.ppn_enabled).toBe(false);
    expect(result.ppn_amount).toBe(0); // Should be 0 when disabled
    expect(result.regional_tax_enabled).toBe(true);
    expect(result.regional_tax_amount).toBe(100); // 10% of 1000
    expect(result.pph22_enabled).toBe(true);
    expect(result.pph22_amount).toBe(22); // 2.2% of 1000

    // Total should be recalculated: 1000 + 100 - 22 = 1078
    expect(result.total_amount).toBe(1078);
  });

  it('should handle stamp duty requirement for large transactions', async () => {
    // Create a large transaction for stamp duty testing
    const largeTransactionResult = await db.insert(transactionsTable)
      .values({
        transaction_number: 'TRX-LARGE',
        customer_name: 'Large Customer',
        status: 'draft',
        subtotal: '3000000.00', // 3 million
        ppn_enabled: false,
        ppn_amount: '0.00',
        regional_tax_enabled: false,
        regional_tax_amount: '0.00',
        pph22_enabled: false,
        pph22_amount: '0.00',
        pph23_enabled: false,
        pph23_amount: '0.00',
        stamp_duty_required: false,
        stamp_duty_amount: '0.00',
        total_amount: '3000000.00',
        transaction_date: new Date()
      })
      .returning()
      .execute();

    const largeTransactionId = largeTransactionResult[0].id;

    // Add transaction items
    await db.insert(transactionItemsTable)
      .values({
        transaction_id: largeTransactionId,
        catalog_item_id: catalogItemId,
        quantity: '30000.000',
        unit_price: '100.00',
        discount_percentage: '0.00',
        line_total: '3000000.00'
      })
      .execute();

    // Update to enable PPN (this should trigger recalculation)
    const input: UpdateTransactionInput = {
      id: largeTransactionId,
      ppn_enabled: true
    };

    const result = await updateTransaction(input);

    // Should not have stamp duty (3M < 5M threshold)
    expect(result.stamp_duty_required).toBe(false);
    expect(result.stamp_duty_amount).toBe(0);

    // Now test with amount >= 5M by creating items that total 5M+
    await db.delete(transactionItemsTable)
      .where(eq(transactionItemsTable.transaction_id, largeTransactionId))
      .execute();

    await db.insert(transactionItemsTable)
      .values({
        transaction_id: largeTransactionId,
        catalog_item_id: catalogItemId,
        quantity: '60000.000',
        unit_price: '100.00',
        discount_percentage: '0.00',
        line_total: '6000000.00'
      })
      .execute();

    // Update again to trigger recalculation with new amount
    const input2: UpdateTransactionInput = {
      id: largeTransactionId,
      ppn_enabled: false // Just to trigger recalculation
    };

    const result2 = await updateTransaction(input2);

    // Should have stamp duty (6M >= 5M threshold)
    expect(result2.stamp_duty_required).toBe(true);
    expect(result2.stamp_duty_amount).toBe(10000);
  });

  it('should save updated transaction to database', async () => {
    const input: UpdateTransactionInput = {
      id: transactionId,
      customer_name: 'DB Test Customer',
      status: 'paid'
    };

    await updateTransaction(input);

    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transactionId))
      .execute();

    expect(transactions).toHaveLength(1);
    expect(transactions[0].customer_name).toBe('DB Test Customer');
    expect(transactions[0].status).toBe('paid');
    expect(transactions[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent transaction', async () => {
    const input: UpdateTransactionInput = {
      id: 99999,
      customer_name: 'Test'
    };

    expect(updateTransaction(input)).rejects.toThrow(/not found/i);
  });

  it('should preserve existing tax settings when not updated', async () => {
    const input: UpdateTransactionInput = {
      id: transactionId,
      customer_name: 'Partial Update',
      // Not updating any tax settings
    };

    const result = await updateTransaction(input);

    // Should preserve existing tax settings
    expect(result.ppn_enabled).toBe(true);
    expect(result.regional_tax_enabled).toBe(false);
    expect(result.pph22_enabled).toBe(false);
    expect(result.pph23_enabled).toBe(false);
    expect(result.customer_name).toBe('Partial Update');
  });
});

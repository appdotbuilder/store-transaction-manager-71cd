
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { transactionsTable, catalogItemsTable, transactionItemsTable } from '../db/schema';
import { deleteTransaction } from '../handlers/delete_transaction';
import { eq } from 'drizzle-orm';
import { type CreateTransactionInput } from '../schema';

describe('deleteTransaction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testCatalogItemId: number;

  beforeEach(async () => {
    // Create a catalog item for testing
    const catalogItem = await db.insert(catalogItemsTable)
      .values({
        code: 'TEST001',
        name: 'Test Item',
        type: 'item',
        unit_price: '100.00',
        description: 'Test item for transaction'
      })
      .returning()
      .execute();

    testCatalogItemId = catalogItem[0].id;
  });

  it('should delete a draft transaction', async () => {
    // Create a draft transaction
    const transaction = await db.insert(transactionsTable)
      .values({
        transaction_number: 'TXN-001',
        customer_name: 'Test Customer',
        status: 'draft',
        subtotal: '100.00',
        ppn_amount: '11.00',
        total_amount: '111.00',
        transaction_date: new Date()
      })
      .returning()
      .execute();

    const transactionId = transaction[0].id;

    const result = await deleteTransaction(transactionId);

    expect(result).toBe(true);

    // Verify transaction is deleted
    const deletedTransaction = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transactionId))
      .execute();

    expect(deletedTransaction).toHaveLength(0);
  });

  it('should delete transaction and cascade to transaction items', async () => {
    // Create a draft transaction with items
    const transaction = await db.insert(transactionsTable)
      .values({
        transaction_number: 'TXN-002',
        customer_name: 'Test Customer',
        status: 'draft',
        subtotal: '100.00',
        ppn_amount: '11.00',
        total_amount: '111.00',
        transaction_date: new Date()
      })
      .returning()
      .execute();

    const transactionId = transaction[0].id;

    // Create transaction items
    await db.insert(transactionItemsTable)
      .values([
        {
          transaction_id: transactionId,
          catalog_item_id: testCatalogItemId,
          quantity: '2.000',
          unit_price: '100.00',
          discount_percentage: '0.00',
          line_total: '200.00'
        },
        {
          transaction_id: transactionId,
          catalog_item_id: testCatalogItemId,
          quantity: '1.000',
          unit_price: '50.00',
          discount_percentage: '0.00',
          line_total: '50.00'
        }
      ])
      .execute();

    const result = await deleteTransaction(transactionId);

    expect(result).toBe(true);

    // Verify transaction is deleted
    const deletedTransaction = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transactionId))
      .execute();

    expect(deletedTransaction).toHaveLength(0);

    // Verify transaction items are also deleted (cascade)
    const deletedItems = await db.select()
      .from(transactionItemsTable)
      .where(eq(transactionItemsTable.transaction_id, transactionId))
      .execute();

    expect(deletedItems).toHaveLength(0);
  });

  it('should not delete confirmed transactions', async () => {
    // Create a confirmed transaction
    const transaction = await db.insert(transactionsTable)
      .values({
        transaction_number: 'TXN-003',
        customer_name: 'Test Customer',
        status: 'confirmed',
        subtotal: '100.00',
        ppn_amount: '11.00',
        total_amount: '111.00',
        transaction_date: new Date()
      })
      .returning()
      .execute();

    const transactionId = transaction[0].id;

    await expect(deleteTransaction(transactionId))
      .rejects.toThrow(/only draft transactions can be deleted/i);

    // Verify transaction still exists
    const stillExists = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transactionId))
      .execute();

    expect(stillExists).toHaveLength(1);
  });

  it('should not delete paid transactions', async () => {
    // Create a paid transaction
    const transaction = await db.insert(transactionsTable)
      .values({
        transaction_number: 'TXN-004',
        customer_name: 'Test Customer',
        status: 'paid',
        subtotal: '100.00',
        ppn_amount: '11.00',
        total_amount: '111.00',
        transaction_date: new Date()
      })
      .returning()
      .execute();

    const transactionId = transaction[0].id;

    await expect(deleteTransaction(transactionId))
      .rejects.toThrow(/only draft transactions can be deleted/i);

    // Verify transaction still exists
    const stillExists = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transactionId))
      .execute();

    expect(stillExists).toHaveLength(1);
  });

  it('should throw error for non-existent transaction', async () => {
    const nonExistentId = 99999;

    await expect(deleteTransaction(nonExistentId))
      .rejects.toThrow(/transaction not found/i);
  });

  it('should return false when no rows affected', async () => {
    // Create a transaction then delete it manually first
    const transaction = await db.insert(transactionsTable)
      .values({
        transaction_number: 'TXN-005',
        customer_name: 'Test Customer',
        status: 'draft',
        subtotal: '100.00',
        ppn_amount: '11.00',
        total_amount: '111.00',
        transaction_date: new Date()
      })
      .returning()
      .execute();

    const transactionId = transaction[0].id;

    // Delete it manually first
    await db.delete(transactionsTable)
      .where(eq(transactionsTable.id, transactionId))
      .execute();

    // Now try to delete again - should throw error for not found
    await expect(deleteTransaction(transactionId))
      .rejects.toThrow(/transaction not found/i);
  });
});

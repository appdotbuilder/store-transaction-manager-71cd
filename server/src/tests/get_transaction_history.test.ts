
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { transactionsTable, catalogItemsTable } from '../db/schema';
import { type TransactionHistoryInput } from '../schema';
import { getTransactionHistory } from '../handlers/get_transaction_history';

// Helper function to create test catalog item
const createTestCatalogItem = async () => {
  const result = await db.insert(catalogItemsTable)
    .values({
      code: 'ITEM001',
      name: 'Test Item',
      type: 'item',
      unit_price: '100.00'
    })
    .returning()
    .execute();
  return result[0];
};

// Helper function to create test transaction
const createTestTransaction = async (overrides = {}) => {
  const result = await db.insert(transactionsTable)
    .values({
      transaction_number: `TRX-${Date.now()}`,
      customer_name: 'Test Customer',
      customer_address: '123 Test Street',
      customer_phone: '+6281234567890',
      customer_email: 'test@example.com',
      status: 'draft',
      subtotal: '1000.00',
      ppn_amount: '110.00',
      total_amount: '1110.00',
      transaction_date: new Date(),
      ...overrides
    })
    .returning()
    .execute();
  
  return result[0];
};

describe('getTransactionHistory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no transactions exist', async () => {
    const result = await getTransactionHistory();

    expect(result).toEqual([]);
  });

  it('should return all transactions with default pagination when no input provided', async () => {
    // Create test catalog item first
    await createTestCatalogItem();
    
    // Create test transactions
    await createTestTransaction({ customer_name: 'Customer 1' });
    await createTestTransaction({ customer_name: 'Customer 2' });

    const result = await getTransactionHistory();

    expect(result).toHaveLength(2);
    expect(result[0].customer_name).toBeDefined();
    expect(result[1].customer_name).toBeDefined();
    
    // Verify numeric fields are converted to numbers
    expect(typeof result[0].subtotal).toBe('number');
    expect(typeof result[0].total_amount).toBe('number');
    expect(typeof result[0].ppn_amount).toBe('number');
  });

  it('should filter transactions by status', async () => {
    await createTestCatalogItem();
    
    await createTestTransaction({ status: 'draft', customer_name: 'Draft Customer' });
    await createTestTransaction({ status: 'confirmed', customer_name: 'Confirmed Customer' });
    await createTestTransaction({ status: 'paid', customer_name: 'Paid Customer' });

    const filters: TransactionHistoryInput = {
      status: 'confirmed',
      limit: 20,
      offset: 0
    };

    const result = await getTransactionHistory(filters);

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('confirmed');
    expect(result[0].customer_name).toBe('Confirmed Customer');
  });

  it('should filter transactions by customer name (case insensitive)', async () => {
    await createTestCatalogItem();
    
    await createTestTransaction({ customer_name: 'John Doe Company' });
    await createTestTransaction({ customer_name: 'Jane Smith Inc' });
    await createTestTransaction({ customer_name: 'ABC Company Ltd' });

    const filters: TransactionHistoryInput = {
      customer_name: 'company',
      limit: 20,
      offset: 0
    };

    const result = await getTransactionHistory(filters);

    expect(result).toHaveLength(2);
    expect(result.some(t => t.customer_name.includes('Company'))).toBe(true);
    expect(result.some(t => t.customer_name.includes('ABC Company'))).toBe(true);
  });

  it('should filter transactions by date range', async () => {
    await createTestCatalogItem();
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const today = new Date();
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    await createTestTransaction({ 
      transaction_date: yesterday, 
      customer_name: 'Yesterday Customer' 
    });
    await createTestTransaction({ 
      transaction_date: today, 
      customer_name: 'Today Customer' 
    });
    await createTestTransaction({ 
      transaction_date: tomorrow, 
      customer_name: 'Tomorrow Customer' 
    });

    const filters: TransactionHistoryInput = {
      date_from: today,
      date_to: tomorrow,
      limit: 20,
      offset: 0
    };

    const result = await getTransactionHistory(filters);

    expect(result).toHaveLength(2);
    expect(result.some(t => t.customer_name === 'Today Customer')).toBe(true);
    expect(result.some(t => t.customer_name === 'Tomorrow Customer')).toBe(true);
    expect(result.every(t => t.customer_name !== 'Yesterday Customer')).toBe(true);
  });

  it('should apply pagination correctly', async () => {
    await createTestCatalogItem();
    
    // Create multiple transactions
    for (let i = 1; i <= 5; i++) {
      await createTestTransaction({ customer_name: `Customer ${i}` });
    }

    const firstPage: TransactionHistoryInput = {
      limit: 2,
      offset: 0
    };

    const secondPage: TransactionHistoryInput = {
      limit: 2,
      offset: 2
    };

    const firstResult = await getTransactionHistory(firstPage);
    const secondResult = await getTransactionHistory(secondPage);

    expect(firstResult).toHaveLength(2);
    expect(secondResult).toHaveLength(2);
    
    // Results should be different (due to ordering by date desc)
    const firstPageIds = firstResult.map(t => t.id);
    const secondPageIds = secondResult.map(t => t.id);
    
    expect(firstPageIds).not.toEqual(secondPageIds);
  });

  it('should combine multiple filters correctly', async () => {
    await createTestCatalogItem();
    
    const testDate = new Date();
    
    await createTestTransaction({ 
      status: 'confirmed', 
      customer_name: 'Matching Customer',
      transaction_date: testDate
    });
    await createTestTransaction({ 
      status: 'draft', 
      customer_name: 'Matching Customer',
      transaction_date: testDate
    });
    await createTestTransaction({ 
      status: 'confirmed', 
      customer_name: 'Different Customer',
      transaction_date: testDate
    });

    const filters: TransactionHistoryInput = {
      status: 'confirmed',
      customer_name: 'Matching',
      date_from: testDate,
      limit: 20,
      offset: 0
    };

    const result = await getTransactionHistory(filters);

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('confirmed');
    expect(result[0].customer_name).toBe('Matching Customer');
  });

  it('should return results ordered by transaction_date descending', async () => {
    await createTestCatalogItem();
    
    const date1 = new Date('2024-01-01');
    const date2 = new Date('2024-01-02');
    const date3 = new Date('2024-01-03');

    await createTestTransaction({ transaction_date: date2, customer_name: 'Second' });
    await createTestTransaction({ transaction_date: date1, customer_name: 'First' });
    await createTestTransaction({ transaction_date: date3, customer_name: 'Third' });

    const result = await getTransactionHistory();

    expect(result).toHaveLength(3);
    expect(result[0].customer_name).toBe('Third'); // Most recent first
    expect(result[1].customer_name).toBe('Second');
    expect(result[2].customer_name).toBe('First'); // Oldest last
  });
});

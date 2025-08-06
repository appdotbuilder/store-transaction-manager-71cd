
import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { type TransactionHistoryInput, type Transaction } from '../schema';
import { eq, gte, lte, and, desc, ilike, SQL } from 'drizzle-orm';

export async function getTransactionHistory(input?: TransactionHistoryInput): Promise<Transaction[]> {
  try {
    // Apply defaults if input is not provided
    const filters = input || { limit: 20, offset: 0 };
    
    // Build conditions array
    const conditions: SQL<unknown>[] = [];

    // Apply filters
    if (filters.status) {
      conditions.push(eq(transactionsTable.status, filters.status));
    }

    if (filters.customer_name) {
      conditions.push(ilike(transactionsTable.customer_name, `%${filters.customer_name}%`));
    }

    if (filters.date_from) {
      conditions.push(gte(transactionsTable.transaction_date, filters.date_from));
    }

    if (filters.date_to) {
      conditions.push(lte(transactionsTable.transaction_date, filters.date_to));
    }

    // Build the query
    const baseQuery = db.select().from(transactionsTable);
    
    const queryWithFilters = conditions.length > 0 
      ? baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions))
      : baseQuery;

    const results = await queryWithFilters
      .orderBy(desc(transactionsTable.transaction_date))
      .limit(filters.limit || 20)
      .offset(filters.offset || 0)
      .execute();

    // Convert numeric fields to numbers
    return results.map(transaction => ({
      ...transaction,
      subtotal: parseFloat(transaction.subtotal),
      ppn_amount: parseFloat(transaction.ppn_amount),
      regional_tax_amount: parseFloat(transaction.regional_tax_amount),
      pph22_amount: parseFloat(transaction.pph22_amount),
      pph23_amount: parseFloat(transaction.pph23_amount),
      stamp_duty_amount: parseFloat(transaction.stamp_duty_amount),
      total_amount: parseFloat(transaction.total_amount)
    }));
  } catch (error) {
    console.error('Failed to get transaction history:', error);
    throw error;
  }
}

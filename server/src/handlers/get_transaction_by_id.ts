
import { db } from '../db';
import { transactionsTable, transactionItemsTable, catalogItemsTable } from '../db/schema';
import { type Transaction } from '../schema';
import { eq } from 'drizzle-orm';

export async function getTransactionById(id: number): Promise<Transaction | null> {
  try {
    // Query transaction with its items and catalog details
    const results = await db.select()
      .from(transactionsTable)
      .leftJoin(transactionItemsTable, eq(transactionsTable.id, transactionItemsTable.transaction_id))
      .leftJoin(catalogItemsTable, eq(transactionItemsTable.catalog_item_id, catalogItemsTable.id))
      .where(eq(transactionsTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    // Extract transaction data and convert numeric fields
    const transactionData = results[0].transactions;
    const transaction: Transaction = {
      ...transactionData,
      subtotal: parseFloat(transactionData.subtotal),
      ppn_amount: parseFloat(transactionData.ppn_amount),
      regional_tax_amount: parseFloat(transactionData.regional_tax_amount),
      pph22_amount: parseFloat(transactionData.pph22_amount),
      pph23_amount: parseFloat(transactionData.pph23_amount),
      stamp_duty_amount: parseFloat(transactionData.stamp_duty_amount),
      total_amount: parseFloat(transactionData.total_amount),
    };

    return transaction;
  } catch (error) {
    console.error('Get transaction by ID failed:', error);
    throw error;
  }
}

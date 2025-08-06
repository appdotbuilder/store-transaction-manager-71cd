
import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function deleteTransaction(id: number): Promise<boolean> {
  try {
    // First, check if the transaction exists and is in draft status
    const existingTransaction = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, id))
      .execute();

    if (existingTransaction.length === 0) {
      throw new Error('Transaction not found');
    }

    const transaction = existingTransaction[0];
    if (transaction.status !== 'draft') {
      throw new Error('Only draft transactions can be deleted');
    }

    // Delete the transaction (cascade will handle related items)
    const result = await db.delete(transactionsTable)
      .where(eq(transactionsTable.id, id))
      .execute();

    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Transaction deletion failed:', error);
    throw error;
  }
}

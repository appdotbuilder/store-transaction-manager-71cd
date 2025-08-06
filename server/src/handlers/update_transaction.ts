
import { db } from '../db';
import { transactionsTable, transactionItemsTable, catalogItemsTable } from '../db/schema';
import { type UpdateTransactionInput, type Transaction } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateTransaction(input: UpdateTransactionInput): Promise<Transaction> {
  try {
    // First, check if transaction exists
    const existingTransactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, input.id))
      .execute();

    if (existingTransactions.length === 0) {
      throw new Error(`Transaction with id ${input.id} not found`);
    }

    const existingTransaction = existingTransactions[0];

    // If tax settings are being updated, we need to recalculate
    const shouldRecalculate = 
      input.ppn_enabled !== undefined ||
      input.regional_tax_enabled !== undefined ||
      input.pph22_enabled !== undefined ||
      input.pph23_enabled !== undefined;

    let updatedFields: any = {
      updated_at: new Date()
    };

    // Apply basic field updates
    if (input.customer_name !== undefined) updatedFields.customer_name = input.customer_name;
    if (input.customer_address !== undefined) updatedFields.customer_address = input.customer_address;
    if (input.customer_phone !== undefined) updatedFields.customer_phone = input.customer_phone;
    if (input.customer_email !== undefined) updatedFields.customer_email = input.customer_email;
    if (input.status !== undefined) updatedFields.status = input.status;
    if (input.notes !== undefined) updatedFields.notes = input.notes;
    if (input.transaction_date !== undefined) updatedFields.transaction_date = input.transaction_date;

    // Handle tax setting updates and recalculation
    if (shouldRecalculate) {
      // Get transaction items with catalog item details for recalculation
      const transactionItems = await db.select({
        quantity: transactionItemsTable.quantity,
        unit_price: transactionItemsTable.unit_price,
        discount_percentage: transactionItemsTable.discount_percentage,
        line_total: transactionItemsTable.line_total
      })
      .from(transactionItemsTable)
      .innerJoin(catalogItemsTable, eq(transactionItemsTable.catalog_item_id, catalogItemsTable.id))
      .where(eq(transactionItemsTable.transaction_id, input.id))
      .execute();

      // Calculate subtotal from existing line totals
      const subtotal = transactionItems.reduce((sum, item) => 
        sum + parseFloat(item.line_total), 0
      );

      // Apply tax settings (use input values or existing values)
      const ppnEnabled = input.ppn_enabled !== undefined ? input.ppn_enabled : existingTransaction.ppn_enabled;
      const regionalTaxEnabled = input.regional_tax_enabled !== undefined ? input.regional_tax_enabled : existingTransaction.regional_tax_enabled;
      const pph22Enabled = input.pph22_enabled !== undefined ? input.pph22_enabled : existingTransaction.pph22_enabled;
      const pph23Enabled = input.pph23_enabled !== undefined ? input.pph23_enabled : existingTransaction.pph23_enabled;

      // Calculate tax amounts
      const ppnAmount = ppnEnabled ? subtotal * 0.11 : 0; // 11% PPN
      const regionalTaxAmount = regionalTaxEnabled ? subtotal * 0.1 : 0; // 10% regional tax
      const pph22Amount = pph22Enabled ? subtotal * 0.022 : 0; // 2.2% PPh22
      const pph23Amount = pph23Enabled ? subtotal * 0.02 : 0; // 2% PPh23

      // Stamp duty requirement (>= 5,000,000 IDR)
      const stampDutyRequired = subtotal >= 5000000;
      const stampDutyAmount = stampDutyRequired ? 10000 : 0; // 10,000 IDR stamp duty

      // Calculate total
      const totalAmount = subtotal + ppnAmount + regionalTaxAmount - pph22Amount - pph23Amount + stampDutyAmount;

      // Update tax and calculation fields
      updatedFields = {
        ...updatedFields,
        subtotal: subtotal.toString(),
        ppn_enabled: ppnEnabled,
        ppn_amount: ppnAmount.toString(),
        regional_tax_enabled: regionalTaxEnabled,
        regional_tax_amount: regionalTaxAmount.toString(),
        pph22_enabled: pph22Enabled,
        pph22_amount: pph22Amount.toString(),
        pph23_enabled: pph23Enabled,
        pph23_amount: pph23Amount.toString(),
        stamp_duty_required: stampDutyRequired,
        stamp_duty_amount: stampDutyAmount.toString(),
        total_amount: totalAmount.toString()
      };
    }

    // Update the transaction
    const result = await db.update(transactionsTable)
      .set(updatedFields)
      .where(eq(transactionsTable.id, input.id))
      .returning()
      .execute();

    const updatedTransaction = result[0];

    // Convert numeric fields back to numbers
    return {
      ...updatedTransaction,
      subtotal: parseFloat(updatedTransaction.subtotal),
      ppn_amount: parseFloat(updatedTransaction.ppn_amount),
      regional_tax_amount: parseFloat(updatedTransaction.regional_tax_amount),
      pph22_amount: parseFloat(updatedTransaction.pph22_amount),
      pph23_amount: parseFloat(updatedTransaction.pph23_amount),
      stamp_duty_amount: parseFloat(updatedTransaction.stamp_duty_amount),
      total_amount: parseFloat(updatedTransaction.total_amount)
    };
  } catch (error) {
    console.error('Transaction update failed:', error);
    throw error;
  }
}

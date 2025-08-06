
import { db } from '../db';
import { transactionsTable, transactionItemsTable, catalogItemsTable } from '../db/schema';
import { type CreateTransactionInput, type Transaction } from '../schema';
import { eq } from 'drizzle-orm';

export const createTransaction = async (input: CreateTransactionInput): Promise<Transaction> => {
  try {
    // Generate unique transaction number
    const transactionNumber = `TRX-${Date.now()}`;
    
    // Validate catalog items exist and get their details
    const catalogItems = await db.select()
      .from(catalogItemsTable)
      .where(eq(catalogItemsTable.id, input.items[0].catalog_item_id))
      .execute();
    
    for (const item of input.items) {
      const catalogItem = await db.select()
        .from(catalogItemsTable)
        .where(eq(catalogItemsTable.id, item.catalog_item_id))
        .execute();
      
      if (catalogItem.length === 0) {
        throw new Error(`Catalog item with ID ${item.catalog_item_id} not found`);
      }
    }
    
    // Calculate subtotal from items
    let subtotal = 0;
    for (const item of input.items) {
      const lineTotal = item.quantity * item.unit_price * (1 - item.discount_percentage / 100);
      subtotal += lineTotal;
    }
    
    // Calculate taxes based on enabled flags
    const ppnAmount = input.ppn_enabled ? subtotal * 0.11 : 0; // 11% PPN
    const regionalTaxAmount = input.regional_tax_enabled ? subtotal * 0.01 : 0; // 1% regional tax
    const pph22Amount = input.pph22_enabled ? subtotal * 0.002 : 0; // 0.2% PPh 22
    const pph23Amount = input.pph23_enabled ? subtotal * 0.02 : 0; // 2% PPh 23
    
    // Determine stamp duty requirement (if total >= 5,000,000)
    const totalBeforeStampDuty = subtotal + ppnAmount + regionalTaxAmount - pph22Amount - pph23Amount;
    const stampDutyRequired = totalBeforeStampDuty >= 5000000;
    const stampDutyAmount = stampDutyRequired ? 10000 : 0; // 10,000 stamp duty
    
    // Calculate final total amount
    const totalAmount = totalBeforeStampDuty + stampDutyAmount;
    
    // Create transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        transaction_number: transactionNumber,
        customer_name: input.customer_name,
        customer_address: input.customer_address || null,
        customer_phone: input.customer_phone || null,
        customer_email: input.customer_email || null,
        status: 'draft',
        subtotal: subtotal.toString(),
        ppn_enabled: input.ppn_enabled,
        ppn_amount: ppnAmount.toString(),
        regional_tax_enabled: input.regional_tax_enabled,
        regional_tax_amount: regionalTaxAmount.toString(),
        pph22_enabled: input.pph22_enabled,
        pph22_amount: pph22Amount.toString(),
        pph23_enabled: input.pph23_enabled,
        pph23_amount: pph23Amount.toString(),
        stamp_duty_required: stampDutyRequired,
        stamp_duty_amount: stampDutyAmount.toString(),
        total_amount: totalAmount.toString(),
        notes: input.notes || null,
        transaction_date: input.transaction_date || new Date()
      })
      .returning()
      .execute();
    
    const transaction = transactionResult[0];
    
    // Create transaction items
    for (const item of input.items) {
      const lineTotal = item.quantity * item.unit_price * (1 - item.discount_percentage / 100);
      
      await db.insert(transactionItemsTable)
        .values({
          transaction_id: transaction.id,
          catalog_item_id: item.catalog_item_id,
          quantity: item.quantity.toString(),
          unit_price: item.unit_price.toString(),
          discount_percentage: item.discount_percentage.toString(),
          line_total: lineTotal.toString()
        })
        .execute();
    }
    
    // Convert numeric fields back to numbers before returning
    return {
      ...transaction,
      subtotal: parseFloat(transaction.subtotal),
      ppn_amount: parseFloat(transaction.ppn_amount),
      regional_tax_amount: parseFloat(transaction.regional_tax_amount),
      pph22_amount: parseFloat(transaction.pph22_amount),
      pph23_amount: parseFloat(transaction.pph23_amount),
      stamp_duty_amount: parseFloat(transaction.stamp_duty_amount),
      total_amount: parseFloat(transaction.total_amount)
    };
  } catch (error) {
    console.error('Transaction creation failed:', error);
    throw error;
  }
};

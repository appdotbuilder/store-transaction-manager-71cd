
import { db } from '../db';
import { documentsTable, transactionsTable, transactionItemsTable, catalogItemsTable, storeProfilesTable } from '../db/schema';
import { type GenerateDocumentInput, type Document } from '../schema';
import { eq } from 'drizzle-orm';

// Document number generators for different document types
const generateDocumentNumber = (documentType: string, id: number): string => {
  const currentYear = new Date().getFullYear();
  const paddedId = id.toString().padStart(4, '0');
  
  const prefixes = {
    'sales_note': 'SN',
    'payment_receipt': 'PR',
    'invoice': 'INV',
    'bast': 'BAST',
    'purchase_order': 'PO',
    'tax_invoice': 'TAX',
    'proforma_invoice': 'PI'
  };
  
  const prefix = prefixes[documentType as keyof typeof prefixes] || 'DOC';
  return `${prefix}-${currentYear}-${paddedId}`;
};

// HTML template generators for different document types
const generateHtmlContent = (
  documentType: string,
  transaction: any,
  items: any[],
  storeProfile: any,
  documentData: any
): string => {
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);

  const formatDate = (date: Date) => 
    date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

  const baseTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${documentData.document_type.toUpperCase()} - ${documentData.document_number}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .company-info { text-align: left; margin-bottom: 20px; }
        .document-info { text-align: right; margin-bottom: 20px; }
        .customer-info { margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .total-row { font-weight: bold; }
        .notes { margin-top: 20px; }
        .text-right { text-align: right; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${documentType.replace('_', ' ').toUpperCase()}</h1>
        <h2>${documentData.document_number}</h2>
    </div>

    <div class="company-info">
        <strong>${storeProfile.name}</strong><br>
        ${storeProfile.address}<br>
        Phone: ${storeProfile.phone}<br>
        Email: ${storeProfile.email}<br>
        NPWP: ${storeProfile.npwp}
    </div>

    <div class="document-info">
        <strong>Date:</strong> ${formatDate(documentData.document_date)}<br>
        <strong>Transaction:</strong> ${transaction.transaction_number}<br>
        ${documentData.recipient_name ? `<strong>Recipient:</strong> ${documentData.recipient_name}<br>` : ''}
    </div>

    <div class="customer-info">
        <strong>Customer:</strong> ${transaction.customer_name}<br>
        ${transaction.customer_address ? `${transaction.customer_address}<br>` : ''}
        ${transaction.customer_phone ? `Phone: ${transaction.customer_phone}<br>` : ''}
        ${transaction.customer_email ? `Email: ${transaction.customer_email}<br>` : ''}
    </div>

    <table>
        <thead>
            <tr>
                <th>Item</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Discount</th>
                <th class="text-right">Total</th>
            </tr>
        </thead>
        <tbody>
            ${items.map(item => `
                <tr>
                    <td>${item.catalog_items.name}<br><small>${item.catalog_items.code}</small></td>
                    <td>${parseFloat(item.transaction_items.quantity)}</td>
                    <td>${formatCurrency(parseFloat(item.transaction_items.unit_price))}</td>
                    <td>${parseFloat(item.transaction_items.discount_percentage)}%</td>
                    <td class="text-right">${formatCurrency(parseFloat(item.transaction_items.line_total))}</td>
                </tr>
            `).join('')}
        </tbody>
        <tfoot>
            <tr class="total-row">
                <td colspan="4"><strong>Subtotal</strong></td>
                <td class="text-right"><strong>${formatCurrency(parseFloat(transaction.subtotal))}</strong></td>
            </tr>
            ${transaction.ppn_enabled ? `
                <tr>
                    <td colspan="4">PPN (11%)</td>
                    <td class="text-right">${formatCurrency(parseFloat(transaction.ppn_amount))}</td>
                </tr>
            ` : ''}
            ${transaction.regional_tax_enabled ? `
                <tr>
                    <td colspan="4">Regional Tax</td>
                    <td class="text-right">${formatCurrency(parseFloat(transaction.regional_tax_amount))}</td>
                </tr>
            ` : ''}
            ${transaction.pph22_enabled ? `
                <tr>
                    <td colspan="4">PPh 22</td>
                    <td class="text-right">${formatCurrency(parseFloat(transaction.pph22_amount))}</td>
                </tr>
            ` : ''}
            ${transaction.pph23_enabled ? `
                <tr>
                    <td colspan="4">PPh 23</td>
                    <td class="text-right">${formatCurrency(parseFloat(transaction.pph23_amount))}</td>
                </tr>
            ` : ''}
            ${transaction.stamp_duty_required ? `
                <tr>
                    <td colspan="4">Stamp Duty</td>
                    <td class="text-right">${formatCurrency(parseFloat(transaction.stamp_duty_amount))}</td>
                </tr>
            ` : ''}
            <tr class="total-row">
                <td colspan="4"><strong>TOTAL AMOUNT</strong></td>
                <td class="text-right"><strong>${formatCurrency(parseFloat(transaction.total_amount))}</strong></td>
            </tr>
        </tfoot>
    </table>

    ${transaction.notes ? `
        <div class="notes">
            <strong>Notes:</strong><br>
            ${transaction.notes}
        </div>
    ` : ''}

    ${documentData.custom_notes ? `
        <div class="notes">
            <strong>Additional Notes:</strong><br>
            ${documentData.custom_notes}
        </div>
    ` : ''}

    <div style="margin-top: 40px;">
        <p>Generated on: ${formatDate(new Date())}</p>
    </div>
</body>
</html>`;

  return baseTemplate;
};

export const generateDocument = async (input: GenerateDocumentInput): Promise<Document> => {
  try {
    // Verify transaction exists and get transaction data
    const transactionResults = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, input.transaction_id))
      .execute();

    if (transactionResults.length === 0) {
      throw new Error(`Transaction with id ${input.transaction_id} not found`);
    }

    const transaction = transactionResults[0];

    // Get transaction items with catalog item details
    const itemResults = await db.select()
      .from(transactionItemsTable)
      .innerJoin(catalogItemsTable, eq(transactionItemsTable.catalog_item_id, catalogItemsTable.id))
      .where(eq(transactionItemsTable.transaction_id, input.transaction_id))
      .execute();

    if (itemResults.length === 0) {
      throw new Error(`No items found for transaction ${input.transaction_id}`);
    }

    // Get store profile (assume there's only one for simplicity)
    const storeResults = await db.select()
      .from(storeProfilesTable)
      .limit(1)
      .execute();

    if (storeResults.length === 0) {
      throw new Error('Store profile not found');
    }

    const storeProfile = storeResults[0];

    // Prepare document data
    const documentDate = input.document_date || new Date();
    
    // Insert document record first to get ID for document number generation
    const insertResult = await db.insert(documentsTable)
      .values({
        transaction_id: input.transaction_id,
        document_type: input.document_type,
        document_number: 'TEMP', // Temporary value, will be updated
        document_date: documentDate,
        recipient_name: input.recipient_name || null,
        custom_notes: input.custom_notes || null,
        html_content: '' // Temporary value, will be updated
      })
      .returning()
      .execute();

    const documentRecord = insertResult[0];
    
    // Generate proper document number using the document ID
    const documentNumber = generateDocumentNumber(input.document_type, documentRecord.id);
    
    // Generate HTML content
    const htmlContent = generateHtmlContent(
      input.document_type,
      transaction,
      itemResults,
      storeProfile,
      {
        ...documentRecord,
        document_number: documentNumber,
        document_date: documentDate
      }
    );

    // Update document with proper number and content
    const updateResult = await db.update(documentsTable)
      .set({
        document_number: documentNumber,
        html_content: htmlContent
      })
      .where(eq(documentsTable.id, documentRecord.id))
      .returning()
      .execute();

    const finalDocument = updateResult[0];

    // Return document with proper type conversions
    return {
      id: finalDocument.id,
      transaction_id: finalDocument.transaction_id,
      document_type: finalDocument.document_type,
      document_number: finalDocument.document_number,
      document_date: new Date(finalDocument.document_date),
      recipient_name: finalDocument.recipient_name,
      custom_notes: finalDocument.custom_notes,
      html_content: finalDocument.html_content,
      created_at: new Date(finalDocument.created_at)
    };

  } catch (error) {
    console.error('Document generation failed:', error);
    throw error;
  }
};

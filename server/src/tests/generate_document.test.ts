
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  documentsTable, 
  transactionsTable, 
  transactionItemsTable, 
  catalogItemsTable,
  storeProfilesTable 
} from '../db/schema';
import { type GenerateDocumentInput } from '../schema';
import { generateDocument } from '../handlers/generate_document';
import { eq } from 'drizzle-orm';

describe('generateDocument', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test data
  const createTestData = async () => {
    // Create store profile
    const storeResult = await db.insert(storeProfilesTable)
      .values({
        name: 'Test Store',
        address: 'Test Address',
        phone: '+6281234567890',
        email: 'store@test.com',
        npwp: '123456789'
      })
      .returning()
      .execute();

    // Create catalog item
    const catalogResult = await db.insert(catalogItemsTable)
      .values({
        code: 'ITEM001',
        name: 'Test Product',
        type: 'item',
        unit_price: '100.00',
        description: 'Test product description'
      })
      .returning()
      .execute();

    // Create transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        transaction_number: 'TRX-2024-0001',
        customer_name: 'John Doe',
        customer_address: 'Customer Address',
        customer_phone: '+6289876543210',
        customer_email: 'john@example.com',
        status: 'confirmed',
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
        notes: 'Test transaction notes'
      })
      .returning()
      .execute();

    // Create transaction item
    await db.insert(transactionItemsTable)
      .values({
        transaction_id: transactionResult[0].id,
        catalog_item_id: catalogResult[0].id,
        quantity: '10.000',
        unit_price: '100.00',
        discount_percentage: '0.00',
        line_total: '1000.00'
      })
      .execute();

    return {
      store: storeResult[0],
      catalogItem: catalogResult[0],
      transaction: transactionResult[0]
    };
  };

  it('should generate a sales note document', async () => {
    const testData = await createTestData();
    
    const input: GenerateDocumentInput = {
      transaction_id: testData.transaction.id,
      document_type: 'sales_note',
      document_date: new Date('2024-01-15'),
      recipient_name: 'Jane Smith',
      custom_notes: 'Custom document notes'
    };

    const result = await generateDocument(input);

    // Validate document fields
    expect(result.transaction_id).toEqual(testData.transaction.id);
    expect(result.document_type).toEqual('sales_note');
    expect(result.document_number).toMatch(/^SN-\d{4}-\d{4}$/);
    expect(result.document_date).toEqual(new Date('2024-01-15'));
    expect(result.recipient_name).toEqual('Jane Smith');
    expect(result.custom_notes).toEqual('Custom document notes');
    expect(result.html_content).toContain('SALES NOTE');
    expect(result.html_content).toContain('Test Store');
    expect(result.html_content).toContain('John Doe');
    expect(result.html_content).toContain('Test Product');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should generate different document types with proper numbering', async () => {
    const testData = await createTestData();
    
    const invoiceInput: GenerateDocumentInput = {
      transaction_id: testData.transaction.id,
      document_type: 'invoice'
    };

    const receiptInput: GenerateDocumentInput = {
      transaction_id: testData.transaction.id,
      document_type: 'payment_receipt'
    };

    const invoice = await generateDocument(invoiceInput);
    const receipt = await generateDocument(receiptInput);

    expect(invoice.document_number).toMatch(/^INV-\d{4}-\d{4}$/);
    expect(receipt.document_number).toMatch(/^PR-\d{4}-\d{4}$/);
    expect(invoice.html_content).toContain('INVOICE');
    expect(receipt.html_content).toContain('PAYMENT RECEIPT');
  });

  it('should save document to database', async () => {
    const testData = await createTestData();
    
    const input: GenerateDocumentInput = {
      transaction_id: testData.transaction.id,
      document_type: 'tax_invoice'
    };

    const result = await generateDocument(input);

    // Verify document was saved
    const documents = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, result.id))
      .execute();

    expect(documents).toHaveLength(1);
    expect(documents[0].transaction_id).toEqual(testData.transaction.id);
    expect(documents[0].document_type).toEqual('tax_invoice');
    expect(documents[0].html_content).toContain('TAX INVOICE');
  });

  it('should use current date when document_date not provided', async () => {
    const testData = await createTestData();
    
    const input: GenerateDocumentInput = {
      transaction_id: testData.transaction.id,
      document_type: 'bast'
    };

    const result = await generateDocument(input);
    const now = new Date();
    
    expect(result.document_date.getDate()).toEqual(now.getDate());
    expect(result.document_date.getMonth()).toEqual(now.getMonth());
    expect(result.document_date.getFullYear()).toEqual(now.getFullYear());
  });

  it('should include tax information in HTML content', async () => {
    const testData = await createTestData();
    
    const input: GenerateDocumentInput = {
      transaction_id: testData.transaction.id,
      document_type: 'invoice'
    };

    const result = await generateDocument(input);

    // Check for tax information presence (not exact formatting due to currency locale variations)
    expect(result.html_content).toContain('PPN (11%)');
    expect(result.html_content).toContain('1.000,00'); // Check for amount without currency symbol
    expect(result.html_content).toContain('110,00'); // PPN amount
    expect(result.html_content).toContain('1.110,00'); // Total amount
    expect(result.html_content).toContain('Subtotal');
    expect(result.html_content).toContain('TOTAL AMOUNT');
  });

  it('should handle transaction without optional customer fields', async () => {
    const testData = await createTestData();
    
    // Update transaction to remove optional fields
    await db.update(transactionsTable)
      .set({
        customer_address: null,
        customer_phone: null,
        customer_email: null,
        notes: null
      })
      .where(eq(transactionsTable.id, testData.transaction.id))
      .execute();

    const input: GenerateDocumentInput = {
      transaction_id: testData.transaction.id,
      document_type: 'proforma_invoice'
    };

    const result = await generateDocument(input);

    expect(result.html_content).toContain('John Doe');
    expect(result.html_content).not.toContain('Customer Address');
    expect(result.id).toBeDefined();
  });

  it('should throw error for non-existent transaction', async () => {
    const input: GenerateDocumentInput = {
      transaction_id: 99999,
      document_type: 'invoice'
    };

    await expect(generateDocument(input)).rejects.toThrow(/Transaction with id 99999 not found/);
  });

  it('should throw error when transaction has no items', async () => {
    // Create only transaction without items
    const transactionResult = await db.insert(transactionsTable)
      .values({
        transaction_number: 'TRX-EMPTY',
        customer_name: 'Empty Transaction',
        status: 'draft',
        subtotal: '0.00',
        ppn_amount: '0.00',
        regional_tax_amount: '0.00',
        pph22_amount: '0.00',
        pph23_amount: '0.00',
        stamp_duty_amount: '0.00',
        total_amount: '0.00'
      })
      .returning()
      .execute();

    const input: GenerateDocumentInput = {
      transaction_id: transactionResult[0].id,
      document_type: 'sales_note'
    };

    await expect(generateDocument(input)).rejects.toThrow(/No items found for transaction/);
  });

  it('should throw error when store profile not found', async () => {
    // Create transaction and items but no store profile
    const catalogResult = await db.insert(catalogItemsTable)
      .values({
        code: 'TEST001',
        name: 'Test Item',
        type: 'item',
        unit_price: '50.00'
      })
      .returning()
      .execute();

    const transactionResult = await db.insert(transactionsTable)
      .values({
        transaction_number: 'TRX-NO-STORE',
        customer_name: 'Test Customer',
        status: 'confirmed',
        subtotal: '50.00',
        ppn_amount: '0.00',
        regional_tax_amount: '0.00',
        pph22_amount: '0.00',
        pph23_amount: '0.00',
        stamp_duty_amount: '0.00',
        total_amount: '50.00'
      })
      .returning()
      .execute();

    await db.insert(transactionItemsTable)
      .values({
        transaction_id: transactionResult[0].id,
        catalog_item_id: catalogResult[0].id,
        quantity: '1.000',
        unit_price: '50.00',
        discount_percentage: '0.00',
        line_total: '50.00'
      })
      .execute();

    const input: GenerateDocumentInput = {
      transaction_id: transactionResult[0].id,
      document_type: 'invoice'
    };

    await expect(generateDocument(input)).rejects.toThrow(/Store profile not found/);
  });
});

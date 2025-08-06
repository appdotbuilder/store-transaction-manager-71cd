
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { storeProfilesTable, catalogItemsTable, transactionsTable, documentsTable } from '../db/schema';
import { getDocumentsByTransaction } from '../handlers/get_documents_by_transaction';

describe('getDocumentsByTransaction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return documents for a transaction', async () => {
    // Create store profile
    const [store] = await db.insert(storeProfilesTable)
      .values({
        name: 'Test Store',
        address: 'Test Address',
        phone: '123456789',
        email: 'test@test.com',
        npwp: '123456789'
      })
      .returning()
      .execute();

    // Create catalog item
    const [catalogItem] = await db.insert(catalogItemsTable)
      .values({
        code: 'TEST001',
        name: 'Test Item',
        type: 'item',
        unit_price: '10.00',
        description: 'Test item'
      })
      .returning()
      .execute();

    // Create transaction
    const [transaction] = await db.insert(transactionsTable)
      .values({
        transaction_number: 'TXN001',
        customer_name: 'Test Customer',
        customer_address: 'Customer Address',
        customer_phone: '987654321',
        customer_email: 'customer@test.com',
        status: 'confirmed',
        subtotal: '100.00',
        ppn_enabled: true,
        ppn_amount: '11.00',
        regional_tax_enabled: false,
        regional_tax_amount: '0.00',
        pph22_enabled: false,
        pph22_amount: '0.00',
        pph23_enabled: false,
        pph23_amount: '0.00',
        stamp_duty_required: false,
        stamp_duty_amount: '0.00',
        total_amount: '111.00',
        notes: 'Test transaction',
        transaction_date: new Date()
      })
      .returning()
      .execute();

    // Create test documents
    const testDate = new Date();
    await db.insert(documentsTable)
      .values([
        {
          transaction_id: transaction.id,
          document_type: 'sales_note',
          document_number: 'SN001',
          document_date: testDate,
          recipient_name: 'Test Recipient',
          custom_notes: 'Sales note',
          html_content: '<html><body>Sales Note</body></html>'
        },
        {
          transaction_id: transaction.id,
          document_type: 'invoice',
          document_number: 'INV001',
          document_date: testDate,
          recipient_name: 'Test Recipient',
          custom_notes: 'Invoice',
          html_content: '<html><body>Invoice</body></html>'
        }
      ])
      .execute();

    const result = await getDocumentsByTransaction(transaction.id);

    expect(result).toHaveLength(2);
    expect(result[0].transaction_id).toEqual(transaction.id);
    expect(result[0].document_type).toEqual('sales_note');
    expect(result[0].document_number).toEqual('SN001');
    expect(result[0].recipient_name).toEqual('Test Recipient');
    expect(result[0].html_content).toEqual('<html><body>Sales Note</body></html>');
    expect(result[0].created_at).toBeInstanceOf(Date);

    expect(result[1].transaction_id).toEqual(transaction.id);
    expect(result[1].document_type).toEqual('invoice');
    expect(result[1].document_number).toEqual('INV001');
    expect(result[1].html_content).toEqual('<html><body>Invoice</body></html>');
  });

  it('should return empty array when no documents exist for transaction', async () => {
    // Create store profile
    await db.insert(storeProfilesTable)
      .values({
        name: 'Test Store',
        address: 'Test Address',
        phone: '123456789',
        email: 'test@test.com',
        npwp: '123456789'
      })
      .execute();

    // Create catalog item
    await db.insert(catalogItemsTable)
      .values({
        code: 'TEST001',
        name: 'Test Item',
        type: 'item',
        unit_price: '10.00'
      })
      .execute();

    // Create transaction without any documents
    const [transaction] = await db.insert(transactionsTable)
      .values({
        transaction_number: 'TXN002',
        customer_name: 'Test Customer',
        status: 'draft',
        subtotal: '50.00',
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
        total_amount: '50.00'
      })
      .returning()
      .execute();

    const result = await getDocumentsByTransaction(transaction.id);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array for non-existent transaction', async () => {
    const result = await getDocumentsByTransaction(999);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return documents with correct field types', async () => {
    // Create store profile
    await db.insert(storeProfilesTable)
      .values({
        name: 'Test Store',
        address: 'Test Address',
        phone: '123456789',
        email: 'test@test.com',
        npwp: '123456789'
      })
      .execute();

    // Create catalog item
    await db.insert(catalogItemsTable)
      .values({
        code: 'TEST001',
        name: 'Test Item',
        type: 'item',
        unit_price: '10.00'
      })
      .execute();

    // Create transaction
    const [transaction] = await db.insert(transactionsTable)
      .values({
        transaction_number: 'TXN003',
        customer_name: 'Test Customer',
        status: 'confirmed',
        subtotal: '100.00',
        ppn_enabled: true,
        ppn_amount: '11.00',
        regional_tax_enabled: false,
        regional_tax_amount: '0.00',
        pph22_enabled: false,
        pph22_amount: '0.00',
        pph23_enabled: false,
        pph23_amount: '0.00',
        stamp_duty_required: false,
        stamp_duty_amount: '0.00',
        total_amount: '111.00'
      })
      .returning()
      .execute();

    // Create document
    await db.insert(documentsTable)
      .values({
        transaction_id: transaction.id,
        document_type: 'tax_invoice',
        document_number: 'TAX001',
        document_date: new Date(),
        recipient_name: null,
        custom_notes: null,
        html_content: '<html><body>Tax Invoice</body></html>'
      })
      .execute();

    const result = await getDocumentsByTransaction(transaction.id);

    expect(result).toHaveLength(1);
    expect(typeof result[0].id).toBe('number');
    expect(typeof result[0].transaction_id).toBe('number');
    expect(typeof result[0].document_type).toBe('string');
    expect(typeof result[0].document_number).toBe('string');
    expect(result[0].document_date).toBeInstanceOf(Date);
    expect(result[0].recipient_name).toBeNull();
    expect(result[0].custom_notes).toBeNull();
    expect(typeof result[0].html_content).toBe('string');
    expect(result[0].created_at).toBeInstanceOf(Date);
  });
});

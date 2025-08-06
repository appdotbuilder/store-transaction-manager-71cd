
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { catalogItemsTable, transactionsTable, documentsTable } from '../db/schema';
import { getDocumentById } from '../handlers/get_document_by_id';

describe('getDocumentById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return document when it exists', async () => {
    // Create prerequisite data
    const catalogItem = await db.insert(catalogItemsTable)
      .values({
        code: 'TEST001',
        name: 'Test Item',
        type: 'item',
        unit_price: '100.00',
        description: 'Test item description'
      })
      .returning()
      .execute();

    const transaction = await db.insert(transactionsTable)
      .values({
        transaction_number: 'TXN-001',
        customer_name: 'Test Customer',
        customer_address: 'Test Address',
        customer_phone: '123456789',
        customer_email: 'test@example.com',
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

    // Create document
    const document = await db.insert(documentsTable)
      .values({
        transaction_id: transaction[0].id,
        document_type: 'invoice',
        document_number: 'INV-001',
        document_date: new Date(),
        recipient_name: 'Test Recipient',
        custom_notes: 'Test custom notes',
        html_content: '<html><body>Test HTML Content</body></html>'
      })
      .returning()
      .execute();

    const result = await getDocumentById(document[0].id);

    // Validate result
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(document[0].id);
    expect(result!.transaction_id).toEqual(transaction[0].id);
    expect(result!.document_type).toEqual('invoice');
    expect(result!.document_number).toEqual('INV-001');
    expect(result!.document_date).toBeInstanceOf(Date);
    expect(result!.recipient_name).toEqual('Test Recipient');
    expect(result!.custom_notes).toEqual('Test custom notes');
    expect(result!.html_content).toEqual('<html><body>Test HTML Content</body></html>');
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should return null when document does not exist', async () => {
    const result = await getDocumentById(999);

    expect(result).toBeNull();
  });

  it('should handle document with null optional fields', async () => {
    // Create prerequisite data
    const catalogItem = await db.insert(catalogItemsTable)
      .values({
        code: 'TEST002',
        name: 'Test Item 2',
        type: 'service',
        unit_price: '200.00'
      })
      .returning()
      .execute();

    const transaction = await db.insert(transactionsTable)
      .values({
        transaction_number: 'TXN-002',
        customer_name: 'Test Customer 2',
        status: 'draft',
        subtotal: '200.00',
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
        total_amount: '200.00',
        transaction_date: new Date()
      })
      .returning()
      .execute();

    // Create document with null optional fields
    const document = await db.insert(documentsTable)
      .values({
        transaction_id: transaction[0].id,
        document_type: 'sales_note',
        document_number: 'SN-001',
        document_date: new Date(),
        recipient_name: null,
        custom_notes: null,
        html_content: '<html><body>Minimal HTML Content</body></html>'
      })
      .returning()
      .execute();

    const result = await getDocumentById(document[0].id);

    // Validate result with null fields
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(document[0].id);
    expect(result!.transaction_id).toEqual(transaction[0].id);
    expect(result!.document_type).toEqual('sales_note');
    expect(result!.document_number).toEqual('SN-001');
    expect(result!.recipient_name).toBeNull();
    expect(result!.custom_notes).toBeNull();
    expect(result!.html_content).toEqual('<html><body>Minimal HTML Content</body></html>');
    expect(result!.created_at).toBeInstanceOf(Date);
  });
});

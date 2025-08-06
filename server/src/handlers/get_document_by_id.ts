
import { db } from '../db';
import { documentsTable } from '../db/schema';
import { type Document } from '../schema';
import { eq } from 'drizzle-orm';

export const getDocumentById = async (id: number): Promise<Document | null> => {
  try {
    const results = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const document = results[0];
    return {
      ...document,
      id: document.id,
      transaction_id: document.transaction_id,
      document_type: document.document_type,
      document_number: document.document_number,
      document_date: document.document_date,
      recipient_name: document.recipient_name,
      custom_notes: document.custom_notes,
      html_content: document.html_content,
      created_at: document.created_at
    };
  } catch (error) {
    console.error('Get document by ID failed:', error);
    throw error;
  }
};

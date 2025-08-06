
import { db } from '../db';
import { catalogItemsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function deleteCatalogItem(id: number): Promise<boolean> {
  try {
    const result = await db.delete(catalogItemsTable)
      .where(eq(catalogItemsTable.id, id))
      .execute();

    // Check if any rows were affected (deleted)
    return result.rowCount !== null && result.rowCount > 0;
  } catch (error) {
    console.error('Catalog item deletion failed:', error);
    throw error;
  }
}

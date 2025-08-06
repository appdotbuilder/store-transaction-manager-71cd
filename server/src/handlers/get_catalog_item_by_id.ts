
import { db } from '../db';
import { catalogItemsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type CatalogItem } from '../schema';

export const getCatalogItemById = async (id: number): Promise<CatalogItem | null> => {
  try {
    const results = await db.select()
      .from(catalogItemsTable)
      .where(eq(catalogItemsTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const catalogItem = results[0];
    return {
      ...catalogItem,
      unit_price: parseFloat(catalogItem.unit_price) // Convert numeric to number
    };
  } catch (error) {
    console.error('Fetching catalog item failed:', error);
    throw error;
  }
};

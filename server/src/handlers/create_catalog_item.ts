
import { db } from '../db';
import { catalogItemsTable } from '../db/schema';
import { type CreateCatalogItemInput, type CatalogItem } from '../schema';

export const createCatalogItem = async (input: CreateCatalogItemInput): Promise<CatalogItem> => {
  try {
    // Insert catalog item record
    const result = await db.insert(catalogItemsTable)
      .values({
        code: input.code,
        name: input.name,
        type: input.type,
        unit_price: input.unit_price.toString(), // Convert number to string for numeric column
        description: input.description || null
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const catalogItem = result[0];
    return {
      ...catalogItem,
      unit_price: parseFloat(catalogItem.unit_price) // Convert string back to number
    };
  } catch (error) {
    console.error('Catalog item creation failed:', error);
    throw error;
  }
};

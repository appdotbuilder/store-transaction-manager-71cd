
import { db } from '../db';
import { catalogItemsTable } from '../db/schema';
import { type UpdateCatalogItemInput, type CatalogItem } from '../schema';
import { eq } from 'drizzle-orm';

export const updateCatalogItem = async (input: UpdateCatalogItemInput): Promise<CatalogItem> => {
  try {
    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.code !== undefined) {
      updateData.code = input.code;
    }
    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.type !== undefined) {
      updateData.type = input.type;
    }
    if (input.unit_price !== undefined) {
      updateData.unit_price = input.unit_price.toString(); // Convert number to string for numeric column
    }
    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    // Update catalog item record
    const result = await db.update(catalogItemsTable)
      .set(updateData)
      .where(eq(catalogItemsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Catalog item with id ${input.id} not found`);
    }

    // Convert numeric fields back to numbers before returning
    const catalogItem = result[0];
    return {
      ...catalogItem,
      unit_price: parseFloat(catalogItem.unit_price) // Convert string back to number
    };
  } catch (error) {
    console.error('Catalog item update failed:', error);
    throw error;
  }
};

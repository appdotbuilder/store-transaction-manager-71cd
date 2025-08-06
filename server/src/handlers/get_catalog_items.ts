
import { db } from '../db';
import { catalogItemsTable } from '../db/schema';
import { type CatalogItem, type CatalogSearchInput } from '../schema';
import { eq, ilike, or, and, desc, type SQL } from 'drizzle-orm';

export const getCatalogItems = async (input?: CatalogSearchInput): Promise<CatalogItem[]> => {
  try {
    // Apply defaults if input is not provided
    const filters = input || { limit: 20, offset: 0 };
    const { query, type, limit = 20, offset = 0 } = filters;

    // Build conditions array
    const conditions: SQL<unknown>[] = [];

    // Add search query condition (search in code, name, and description)
    if (query) {
      const searchPattern = `%${query}%`;
      conditions.push(
        or(
          ilike(catalogItemsTable.code, searchPattern),
          ilike(catalogItemsTable.name, searchPattern),
          ilike(catalogItemsTable.description, searchPattern)
        )!
      );
    }

    // Add type filter condition
    if (type) {
      conditions.push(eq(catalogItemsTable.type, type));
    }

    // Build the final query based on whether we have conditions or not
    const results = conditions.length > 0 
      ? await db.select()
          .from(catalogItemsTable)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .orderBy(desc(catalogItemsTable.created_at))
          .limit(limit)
          .offset(offset)
          .execute()
      : await db.select()
          .from(catalogItemsTable)
          .orderBy(desc(catalogItemsTable.created_at))
          .limit(limit)
          .offset(offset)
          .execute();

    // Convert numeric fields back to numbers
    return results.map(item => ({
      ...item,
      unit_price: parseFloat(item.unit_price)
    }));
  } catch (error) {
    console.error('Get catalog items failed:', error);
    throw error;
  }
};

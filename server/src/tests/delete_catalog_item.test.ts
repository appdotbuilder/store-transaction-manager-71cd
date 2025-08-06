
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { catalogItemsTable } from '../db/schema';
import { deleteCatalogItem } from '../handlers/delete_catalog_item';
import { eq } from 'drizzle-orm';

describe('deleteCatalogItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing catalog item', async () => {
    // Create a test catalog item first
    const insertResult = await db.insert(catalogItemsTable)
      .values({
        code: 'TEST001',
        name: 'Test Item',
        type: 'item',
        unit_price: '99.99',
        description: 'A test item'
      })
      .returning()
      .execute();

    const createdItem = insertResult[0];

    // Delete the catalog item
    const result = await deleteCatalogItem(createdItem.id);

    expect(result).toBe(true);

    // Verify item was deleted from database
    const items = await db.select()
      .from(catalogItemsTable)
      .where(eq(catalogItemsTable.id, createdItem.id))
      .execute();

    expect(items).toHaveLength(0);
  });

  it('should return false when deleting non-existent catalog item', async () => {
    const nonExistentId = 99999;

    const result = await deleteCatalogItem(nonExistentId);

    expect(result).toBe(false);
  });

  it('should not affect other catalog items when deleting one', async () => {
    // Create multiple test catalog items
    const items = await db.insert(catalogItemsTable)
      .values([
        {
          code: 'KEEP001',
          name: 'Keep Item 1',
          type: 'item',
          unit_price: '10.00',
          description: 'Item to keep'
        },
        {
          code: 'DELETE001',
          name: 'Delete Item',
          type: 'service',
          unit_price: '20.00',
          description: 'Item to delete'
        },
        {
          code: 'KEEP002',
          name: 'Keep Item 2',
          type: 'item',
          unit_price: '30.00',
          description: 'Another item to keep'
        }
      ])
      .returning()
      .execute();

    const itemToDelete = items[1]; // Delete the middle item

    // Delete one item
    const result = await deleteCatalogItem(itemToDelete.id);

    expect(result).toBe(true);

    // Verify only the target item was deleted
    const remainingItems = await db.select()
      .from(catalogItemsTable)
      .execute();

    expect(remainingItems).toHaveLength(2);
    
    // Verify the correct items remain
    const remainingCodes = remainingItems.map(item => item.code).sort();
    expect(remainingCodes).toEqual(['KEEP001', 'KEEP002']);
  });

  it('should handle deletion of items with different types', async () => {
    // Create items of different types
    const items = await db.insert(catalogItemsTable)
      .values([
        {
          code: 'ITEM001',
          name: 'Physical Item',
          type: 'item',
          unit_price: '15.50'
        },
        {
          code: 'SERVICE001',
          name: 'Service Item',
          type: 'service',
          unit_price: '100.00'
        }
      ])
      .returning()
      .execute();

    // Delete the service item
    const serviceItem = items.find(item => item.type === 'service');
    const result = await deleteCatalogItem(serviceItem!.id);

    expect(result).toBe(true);

    // Verify only the item remains
    const remainingItems = await db.select()
      .from(catalogItemsTable)
      .execute();

    expect(remainingItems).toHaveLength(1);
    expect(remainingItems[0].type).toBe('item');
    expect(remainingItems[0].code).toBe('ITEM001');
  });

  it('should handle deletion of item with null description', async () => {
    // Create item with null description
    const insertResult = await db.insert(catalogItemsTable)
      .values({
        code: 'NULL_DESC',
        name: 'Item with null description',
        type: 'item',
        unit_price: '25.00',
        description: null
      })
      .returning()
      .execute();

    const createdItem = insertResult[0];

    // Delete the item
    const result = await deleteCatalogItem(createdItem.id);

    expect(result).toBe(true);

    // Verify deletion
    const items = await db.select()
      .from(catalogItemsTable)
      .where(eq(catalogItemsTable.id, createdItem.id))
      .execute();

    expect(items).toHaveLength(0);
  });
});

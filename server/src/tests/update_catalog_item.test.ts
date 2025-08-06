
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { catalogItemsTable } from '../db/schema';
import { type CreateCatalogItemInput, type UpdateCatalogItemInput } from '../schema';
import { updateCatalogItem } from '../handlers/update_catalog_item';
import { eq } from 'drizzle-orm';

// Create initial catalog item for testing
const createTestItem = async (): Promise<number> => {
  const testInput: CreateCatalogItemInput = {
    code: 'TEST001',
    name: 'Test Item',
    type: 'item',
    unit_price: 100.00,
    description: 'Test description'
  };

  const result = await db.insert(catalogItemsTable)
    .values({
      code: testInput.code,
      name: testInput.name,
      type: testInput.type,
      unit_price: testInput.unit_price.toString(),
      description: testInput.description
    })
    .returning()
    .execute();

  return result[0].id;
};

describe('updateCatalogItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update all fields of a catalog item', async () => {
    const itemId = await createTestItem();

    const updateInput: UpdateCatalogItemInput = {
      id: itemId,
      code: 'UPDATED001',
      name: 'Updated Item',
      type: 'service',
      unit_price: 150.75,
      description: 'Updated description'
    };

    const result = await updateCatalogItem(updateInput);

    // Basic field validation
    expect(result.id).toEqual(itemId);
    expect(result.code).toEqual('UPDATED001');
    expect(result.name).toEqual('Updated Item');
    expect(result.type).toEqual('service');
    expect(result.unit_price).toEqual(150.75);
    expect(typeof result.unit_price).toBe('number');
    expect(result.description).toEqual('Updated description');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update only specified fields', async () => {
    const itemId = await createTestItem();

    const updateInput: UpdateCatalogItemInput = {
      id: itemId,
      name: 'Partially Updated Item',
      unit_price: 75.50
    };

    const result = await updateCatalogItem(updateInput);

    // Updated fields
    expect(result.name).toEqual('Partially Updated Item');
    expect(result.unit_price).toEqual(75.50);
    expect(typeof result.unit_price).toBe('number');

    // Unchanged fields should remain the same
    expect(result.code).toEqual('TEST001');
    expect(result.type).toEqual('item');
    expect(result.description).toEqual('Test description');
  });

  it('should save updated item to database', async () => {
    const itemId = await createTestItem();

    const updateInput: UpdateCatalogItemInput = {
      id: itemId,
      code: 'SAVED001',
      unit_price: 200.25
    };

    await updateCatalogItem(updateInput);

    // Verify changes are saved in database
    const items = await db.select()
      .from(catalogItemsTable)
      .where(eq(catalogItemsTable.id, itemId))
      .execute();

    expect(items).toHaveLength(1);
    expect(items[0].code).toEqual('SAVED001');
    expect(parseFloat(items[0].unit_price)).toEqual(200.25);
    expect(items[0].name).toEqual('Test Item'); // Unchanged field
  });

  it('should update updated_at timestamp', async () => {
    const itemId = await createTestItem();

    // Get original updated_at
    const originalItems = await db.select()
      .from(catalogItemsTable)
      .where(eq(catalogItemsTable.id, itemId))
      .execute();
    
    const originalUpdatedAt = originalItems[0].updated_at;

    // Small delay to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateCatalogItemInput = {
      id: itemId,
      name: 'Timestamp Test'
    };

    const result = await updateCatalogItem(updateInput);

    expect(result.updated_at > originalUpdatedAt).toBe(true);
  });

  it('should handle null description update', async () => {
    const itemId = await createTestItem();

    const updateInput: UpdateCatalogItemInput = {
      id: itemId,
      description: null
    };

    const result = await updateCatalogItem(updateInput);

    expect(result.description).toBeNull();

    // Verify in database
    const items = await db.select()
      .from(catalogItemsTable)
      .where(eq(catalogItemsTable.id, itemId))
      .execute();

    expect(items[0].description).toBeNull();
  });

  it('should throw error for non-existent item', async () => {
    const updateInput: UpdateCatalogItemInput = {
      id: 99999,
      name: 'Non-existent Item'
    };

    await expect(updateCatalogItem(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should handle unique constraint violation', async () => {
    const itemId1 = await createTestItem();
    
    // Create second item
    await db.insert(catalogItemsTable)
      .values({
        code: 'UNIQUE001',
        name: 'Another Item',
        type: 'service',
        unit_price: '50.00',
        description: 'Another description'
      })
      .execute();

    const updateInput: UpdateCatalogItemInput = {
      id: itemId1,
      code: 'UNIQUE001' // Try to use existing code
    };

    await expect(updateCatalogItem(updateInput)).rejects.toThrow();
  });
});

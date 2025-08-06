
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { catalogItemsTable } from '../db/schema';
import { type CreateCatalogItemInput, type CatalogSearchInput } from '../schema';
import { getCatalogItems } from '../handlers/get_catalog_items';

// Helper function to create test catalog items
const createTestItem = async (overrides: Partial<CreateCatalogItemInput> = {}) => {
  const defaultItem: CreateCatalogItemInput = {
    code: `ITEM-${Date.now()}`,
    name: 'Test Item',
    type: 'item',
    unit_price: 100.00,
    description: 'Test description'
  };

  const item = { ...defaultItem, ...overrides };
  
  const result = await db.insert(catalogItemsTable)
    .values({
      code: item.code,
      name: item.name,
      type: item.type,
      unit_price: item.unit_price.toString(),
      description: item.description
    })
    .returning()
    .execute();

  return result[0];
};

describe('getCatalogItems', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all items when no input provided', async () => {
    // Create test items
    await createTestItem({ name: 'Item 1', unit_price: 50.00 });
    await createTestItem({ name: 'Item 2', unit_price: 75.50 });

    const result = await getCatalogItems();

    expect(result).toHaveLength(2);
    expect(result[0].name).toEqual('Item 2'); // Most recent first due to ordering
    expect(result[1].name).toEqual('Item 1');
    expect(typeof result[0].unit_price).toEqual('number');
    expect(result[1].unit_price).toEqual(50.00);
  });

  it('should apply default pagination when input has defaults', async () => {
    // Create more items than default limit
    for (let i = 0; i < 25; i++) {
      await createTestItem({ name: `Item ${i}`, code: `ITEM-${i}` });
    }

    const result = await getCatalogItems({
      limit: 20,
      offset: 0
    });

    expect(result).toHaveLength(20); // Default limit
    expect(result[0].name).toEqual('Item 24'); // Most recent first
  });

  it('should search by query in code, name, and description', async () => {
    await createTestItem({ code: 'SPECIAL-001', name: 'Regular Item', description: 'Normal description' });
    await createTestItem({ code: 'ITEM-002', name: 'Special Product', description: 'Normal description' });
    await createTestItem({ code: 'ITEM-003', name: 'Regular Item', description: 'Special feature included' });
    await createTestItem({ code: 'ITEM-004', name: 'Unrelated Product', description: 'Nothing here' });

    const searchInput: CatalogSearchInput = {
      query: 'special',
      limit: 20,
      offset: 0
    };

    const result = await getCatalogItems(searchInput);

    expect(result).toHaveLength(3);
    // Should find items with 'special' in code, name, or description
    const codes = result.map(item => item.code);
    expect(codes).toContain('SPECIAL-001');
    expect(codes).toContain('ITEM-002');
    expect(codes).toContain('ITEM-003');
    expect(codes).not.toContain('ITEM-004');
  });

  it('should filter by item type', async () => {
    await createTestItem({ name: 'Physical Item', type: 'item' });
    await createTestItem({ name: 'Consulting Service', type: 'service' });
    await createTestItem({ name: 'Another Item', type: 'item' });

    const serviceFilter: CatalogSearchInput = {
      type: 'service',
      limit: 20,
      offset: 0
    };

    const serviceResult = await getCatalogItems(serviceFilter);
    expect(serviceResult).toHaveLength(1);
    expect(serviceResult[0].name).toEqual('Consulting Service');
    expect(serviceResult[0].type).toEqual('service');

    const itemFilter: CatalogSearchInput = {
      type: 'item',
      limit: 20,
      offset: 0
    };

    const itemResult = await getCatalogItems(itemFilter);
    expect(itemResult).toHaveLength(2);
    itemResult.forEach(item => {
      expect(item.type).toEqual('item');
    });
  });

  it('should apply pagination correctly', async () => {
    // Create test items
    for (let i = 0; i < 15; i++) {
      await createTestItem({ name: `Item ${i}`, code: `ITEM-${String(i).padStart(3, '0')}` });
    }

    const firstPageInput: CatalogSearchInput = {
      limit: 5,
      offset: 0
    };

    const firstPage = await getCatalogItems(firstPageInput);
    expect(firstPage).toHaveLength(5);

    const secondPageInput: CatalogSearchInput = {
      limit: 5,
      offset: 5
    };

    const secondPage = await getCatalogItems(secondPageInput);
    expect(secondPage).toHaveLength(5);

    // Verify no overlap between pages
    const firstPageCodes = firstPage.map(item => item.code);
    const secondPageCodes = secondPage.map(item => item.code);
    const intersection = firstPageCodes.filter(code => secondPageCodes.includes(code));
    expect(intersection).toHaveLength(0);
  });

  it('should combine query search and type filter', async () => {
    await createTestItem({ name: 'Premium Service', type: 'service', code: 'SERV-001' });
    await createTestItem({ name: 'Premium Item', type: 'item', code: 'ITEM-001' });
    await createTestItem({ name: 'Basic Service', type: 'service', code: 'SERV-002' });

    const combinedFilter: CatalogSearchInput = {
      query: 'premium',
      type: 'service',
      limit: 20,
      offset: 0
    };

    const result = await getCatalogItems(combinedFilter);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Premium Service');
    expect(result[0].type).toEqual('service');
    expect(result[0].code).toEqual('SERV-001');
  });

  it('should return empty array when no items match filters', async () => {
    await createTestItem({ name: 'Test Item', type: 'item' });

    const noMatchFilter: CatalogSearchInput = {
      query: 'nonexistent',
      type: 'service',
      limit: 20,
      offset: 0
    };

    const result = await getCatalogItems(noMatchFilter);
    expect(result).toHaveLength(0);
  });

  it('should handle null description in search', async () => {
    await createTestItem({ name: 'Item with null field', description: null });
    await createTestItem({ name: 'Regular Item', description: 'Has unique content' });

    const searchInput: CatalogSearchInput = {
      query: 'unique',
      limit: 20,
      offset: 0
    };

    const result = await getCatalogItems(searchInput);

    // Should find only the item with 'unique' in its description field
    // The item with null description should not match
    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Regular Item');
    expect(result[0].description).toEqual('Has unique content');
  });

  it('should convert numeric fields correctly', async () => {
    await createTestItem({ 
      name: 'Price Test Item', 
      unit_price: 123.45 
    });

    const result = await getCatalogItems();

    expect(result).toHaveLength(1);
    expect(typeof result[0].unit_price).toEqual('number');
    expect(result[0].unit_price).toEqual(123.45);
  });
});

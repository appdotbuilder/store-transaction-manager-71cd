
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { catalogItemsTable } from '../db/schema';
import { type CreateCatalogItemInput } from '../schema';
import { getCatalogItemById } from '../handlers/get_catalog_item_by_id';

const testInput: CreateCatalogItemInput = {
  code: 'TEST001',
  name: 'Test Item',
  type: 'item',
  unit_price: 25.50,
  description: 'A test catalog item'
};

const testService: CreateCatalogItemInput = {
  code: 'SERV001',
  name: 'Test Service',
  type: 'service',
  unit_price: 100.00,
  description: null
};

describe('getCatalogItemById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return catalog item by id', async () => {
    // Create test catalog item
    const insertResult = await db.insert(catalogItemsTable)
      .values({
        code: testInput.code,
        name: testInput.name,
        type: testInput.type,
        unit_price: testInput.unit_price.toString(),
        description: testInput.description
      })
      .returning()
      .execute();

    const createdItem = insertResult[0];
    const result = await getCatalogItemById(createdItem.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdItem.id);
    expect(result!.code).toEqual('TEST001');
    expect(result!.name).toEqual('Test Item');
    expect(result!.type).toEqual('item');
    expect(result!.unit_price).toEqual(25.50);
    expect(typeof result!.unit_price).toBe('number');
    expect(result!.description).toEqual('A test catalog item');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return service type catalog item correctly', async () => {
    // Create test service
    const insertResult = await db.insert(catalogItemsTable)
      .values({
        code: testService.code,
        name: testService.name,
        type: testService.type,
        unit_price: testService.unit_price.toString(),
        description: testService.description
      })
      .returning()
      .execute();

    const createdService = insertResult[0];
    const result = await getCatalogItemById(createdService.id);

    expect(result).not.toBeNull();
    expect(result!.type).toEqual('service');
    expect(result!.unit_price).toEqual(100.00);
    expect(result!.description).toBeNull();
  });

  it('should return null for non-existent id', async () => {
    const result = await getCatalogItemById(999999);
    expect(result).toBeNull();
  });

  it('should convert numeric unit_price to number', async () => {
    // Create catalog item with specific price
    const insertResult = await db.insert(catalogItemsTable)
      .values({
        code: 'PRICE001',
        name: 'Price Test Item',
        type: 'item',
        unit_price: '123.45',
        description: 'Testing price conversion'
      })
      .returning()
      .execute();

    const result = await getCatalogItemById(insertResult[0].id);

    expect(result).not.toBeNull();
    expect(typeof result!.unit_price).toBe('number');
    expect(result!.unit_price).toEqual(123.45);
  });
});

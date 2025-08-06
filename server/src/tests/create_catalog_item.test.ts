
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { catalogItemsTable } from '../db/schema';
import { type CreateCatalogItemInput } from '../schema';
import { createCatalogItem } from '../handlers/create_catalog_item';
import { eq } from 'drizzle-orm';

// Test inputs for different item types
const testItemInput: CreateCatalogItemInput = {
  code: 'ITEM001',
  name: 'Test Item',
  type: 'item',
  unit_price: 25000.50,
  description: 'A test item for unit testing'
};

const testServiceInput: CreateCatalogItemInput = {
  code: 'SRV001',
  name: 'Test Service',
  type: 'service',
  unit_price: 150000,
  description: 'A test service'
};

const testInputWithoutDescription: CreateCatalogItemInput = {
  code: 'ITEM002',
  name: 'Item Without Description',
  type: 'item',
  unit_price: 10000
};

describe('createCatalogItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an item catalog entry', async () => {
    const result = await createCatalogItem(testItemInput);

    // Basic field validation
    expect(result.code).toEqual('ITEM001');
    expect(result.name).toEqual('Test Item');
    expect(result.type).toEqual('item');
    expect(result.unit_price).toEqual(25000.50);
    expect(typeof result.unit_price).toBe('number');
    expect(result.description).toEqual('A test item for unit testing');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a service catalog entry', async () => {
    const result = await createCatalogItem(testServiceInput);

    // Basic field validation
    expect(result.code).toEqual('SRV001');
    expect(result.name).toEqual('Test Service');
    expect(result.type).toEqual('service');
    expect(result.unit_price).toEqual(150000);
    expect(typeof result.unit_price).toBe('number');
    expect(result.description).toEqual('A test service');
  });

  it('should handle null description correctly', async () => {
    const result = await createCatalogItem(testInputWithoutDescription);

    expect(result.code).toEqual('ITEM002');
    expect(result.description).toBeNull();
  });

  it('should save catalog item to database', async () => {
    const result = await createCatalogItem(testItemInput);

    // Query using proper drizzle syntax
    const catalogItems = await db.select()
      .from(catalogItemsTable)
      .where(eq(catalogItemsTable.id, result.id))
      .execute();

    expect(catalogItems).toHaveLength(1);
    expect(catalogItems[0].code).toEqual('ITEM001');
    expect(catalogItems[0].name).toEqual('Test Item');
    expect(catalogItems[0].type).toEqual('item');
    expect(parseFloat(catalogItems[0].unit_price)).toEqual(25000.50);
    expect(catalogItems[0].description).toEqual('A test item for unit testing');
    expect(catalogItems[0].created_at).toBeInstanceOf(Date);
    expect(catalogItems[0].updated_at).toBeInstanceOf(Date);
  });

  it('should enforce unique code constraint', async () => {
    // Create first item
    await createCatalogItem(testItemInput);

    // Try to create another item with the same code
    const duplicateInput: CreateCatalogItemInput = {
      code: 'ITEM001', // Same code as testItemInput
      name: 'Different Item',
      type: 'service',
      unit_price: 5000
    };

    await expect(createCatalogItem(duplicateInput)).rejects.toThrow(/duplicate key value violates unique constraint/i);
  });

  it('should handle decimal precision correctly', async () => {
    const preciseInput: CreateCatalogItemInput = {
      code: 'PRECISE001',
      name: 'Precise Item',
      type: 'item',
      unit_price: 123.45
    };

    const result = await createCatalogItem(preciseInput);

    expect(result.unit_price).toEqual(123.45);
    expect(typeof result.unit_price).toBe('number');

    // Verify in database
    const saved = await db.select()
      .from(catalogItemsTable)
      .where(eq(catalogItemsTable.id, result.id))
      .execute();

    expect(parseFloat(saved[0].unit_price)).toEqual(123.45);
  });
});

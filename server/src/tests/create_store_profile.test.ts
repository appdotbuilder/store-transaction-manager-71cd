
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { storeProfilesTable } from '../db/schema';
import { type CreateStoreProfileInput } from '../schema';
import { createStoreProfile } from '../handlers/create_store_profile';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateStoreProfileInput = {
  name: 'Test Store',
  address: '123 Test Street, Test City',
  phone: '081234567890',
  email: 'test@example.com',
  npwp: '12.345.678.9-012.000'
};

describe('createStoreProfile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a store profile', async () => {
    const result = await createStoreProfile(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Store');
    expect(result.address).toEqual('123 Test Street, Test City');
    expect(result.phone).toEqual('081234567890');
    expect(result.email).toEqual('test@example.com');
    expect(result.npwp).toEqual('12.345.678.9-012.000');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save store profile to database', async () => {
    const result = await createStoreProfile(testInput);

    // Query using proper drizzle syntax
    const storeProfiles = await db.select()
      .from(storeProfilesTable)
      .where(eq(storeProfilesTable.id, result.id))
      .execute();

    expect(storeProfiles).toHaveLength(1);
    expect(storeProfiles[0].name).toEqual('Test Store');
    expect(storeProfiles[0].address).toEqual(testInput.address);
    expect(storeProfiles[0].phone).toEqual(testInput.phone);
    expect(storeProfiles[0].email).toEqual(testInput.email);
    expect(storeProfiles[0].npwp).toEqual(testInput.npwp);
    expect(storeProfiles[0].created_at).toBeInstanceOf(Date);
    expect(storeProfiles[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create multiple store profiles with unique data', async () => {
    const firstProfile = await createStoreProfile(testInput);

    const secondInput: CreateStoreProfileInput = {
      name: 'Second Store',
      address: '456 Another Street',
      phone: '089876543210',
      email: 'second@example.com',
      npwp: '98.765.432.1-098.000'
    };

    const secondProfile = await createStoreProfile(secondInput);

    expect(firstProfile.id).not.toEqual(secondProfile.id);
    expect(firstProfile.name).toEqual('Test Store');
    expect(secondProfile.name).toEqual('Second Store');

    // Verify both profiles exist in database
    const allProfiles = await db.select()
      .from(storeProfilesTable)
      .execute();

    expect(allProfiles).toHaveLength(2);
  });

  it('should handle email validation through schema', async () => {
    const invalidEmailInput: CreateStoreProfileInput = {
      ...testInput,
      email: 'invalid-email'
    };

    // This test assumes the validation happens at the schema level
    // The handler itself doesn't validate - it trusts the input is already validated
    const result = await createStoreProfile(invalidEmailInput);
    expect(result.email).toEqual('invalid-email');
  });
});

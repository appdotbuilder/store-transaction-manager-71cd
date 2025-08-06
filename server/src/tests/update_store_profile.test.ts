
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { storeProfilesTable } from '../db/schema';
import { type CreateStoreProfileInput, type UpdateStoreProfileInput } from '../schema';
import { updateStoreProfile } from '../handlers/update_store_profile';
import { eq } from 'drizzle-orm';

// Test data
const createInput: CreateStoreProfileInput = {
  name: 'Original Store',
  address: 'Original Address',
  phone: '123456789',
  email: 'original@example.com',
  npwp: 'NPWP123456'
};

const updateInput: UpdateStoreProfileInput = {
  id: 1,
  name: 'Updated Store',
  address: 'Updated Address',
  phone: '987654321',
  email: 'updated@example.com',
  npwp: 'NPWP987654'
};

describe('updateStoreProfile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update all fields of store profile', async () => {
    // Create initial store profile
    await db.insert(storeProfilesTable)
      .values(createInput)
      .execute();

    const result = await updateStoreProfile(updateInput);

    expect(result.id).toEqual(1);
    expect(result.name).toEqual('Updated Store');
    expect(result.address).toEqual('Updated Address');
    expect(result.phone).toEqual('987654321');
    expect(result.email).toEqual('updated@example.com');
    expect(result.npwp).toEqual('NPWP987654');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update only specified fields', async () => {
    // Create initial store profile
    await db.insert(storeProfilesTable)
      .values(createInput)
      .execute();

    const partialUpdate: UpdateStoreProfileInput = {
      id: 1,
      name: 'Partially Updated Store',
      email: 'partial@example.com'
    };

    const result = await updateStoreProfile(partialUpdate);

    expect(result.name).toEqual('Partially Updated Store');
    expect(result.email).toEqual('partial@example.com');
    expect(result.address).toEqual('Original Address'); // Unchanged
    expect(result.phone).toEqual('123456789'); // Unchanged
    expect(result.npwp).toEqual('NPWP123456'); // Unchanged
  });

  it('should save updates to database', async () => {
    // Create initial store profile
    await db.insert(storeProfilesTable)
      .values(createInput)
      .execute();

    await updateStoreProfile(updateInput);

    // Verify database was updated
    const profiles = await db.select()
      .from(storeProfilesTable)
      .where(eq(storeProfilesTable.id, 1))
      .execute();

    expect(profiles).toHaveLength(1);
    expect(profiles[0].name).toEqual('Updated Store');
    expect(profiles[0].address).toEqual('Updated Address');
    expect(profiles[0].phone).toEqual('987654321');
    expect(profiles[0].email).toEqual('updated@example.com');
    expect(profiles[0].npwp).toEqual('NPWP987654');
  });

  it('should update updated_at timestamp', async () => {
    // Create initial store profile
    const initial = await db.insert(storeProfilesTable)
      .values(createInput)
      .returning()
      .execute();

    const originalUpdatedAt = initial[0].updated_at;

    // Small delay to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const result = await updateStoreProfile(updateInput);

    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should throw error for non-existent store profile', async () => {
    const nonExistentUpdate: UpdateStoreProfileInput = {
      id: 999,
      name: 'Non-existent Store'
    };

    expect(updateStoreProfile(nonExistentUpdate)).rejects.toThrow(/not found/i);
  });

  it('should handle empty update object', async () => {
    // Create initial store profile
    await db.insert(storeProfilesTable)
      .values(createInput)
      .execute();

    const emptyUpdate: UpdateStoreProfileInput = {
      id: 1
    };

    const result = await updateStoreProfile(emptyUpdate);

    // Should return original data with updated timestamp
    expect(result.name).toEqual('Original Store');
    expect(result.address).toEqual('Original Address');
    expect(result.phone).toEqual('123456789');
    expect(result.email).toEqual('original@example.com');
    expect(result.npwp).toEqual('NPWP123456');
    expect(result.updated_at).toBeInstanceOf(Date);
  });
});

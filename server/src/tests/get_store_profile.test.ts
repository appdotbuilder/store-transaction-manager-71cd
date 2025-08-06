
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { storeProfilesTable } from '../db/schema';
import { type CreateStoreProfileInput } from '../schema';
import { getStoreProfile } from '../handlers/get_store_profile';

// Test store profile data
const testStoreProfile: CreateStoreProfileInput = {
  name: 'Test Store',
  address: '123 Test Street, Test City',
  phone: '+62-21-12345678',
  email: 'test@store.com',
  npwp: '12.345.678.9-012.345'
};

describe('getStoreProfile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null when no store profile exists', async () => {
    const result = await getStoreProfile();
    expect(result).toBeNull();
  });

  it('should return store profile when one exists', async () => {
    // Create a store profile first
    await db.insert(storeProfilesTable)
      .values(testStoreProfile)
      .execute();

    const result = await getStoreProfile();

    expect(result).not.toBeNull();
    expect(result!.name).toEqual('Test Store');
    expect(result!.address).toEqual(testStoreProfile.address);
    expect(result!.phone).toEqual(testStoreProfile.phone);
    expect(result!.email).toEqual(testStoreProfile.email);
    expect(result!.npwp).toEqual(testStoreProfile.npwp);
    expect(result!.id).toBeDefined();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return first store profile when multiple exist', async () => {
    // Create multiple store profiles
    const firstStore = { ...testStoreProfile, name: 'First Store', email: 'first@store.com' };
    const secondStore = { ...testStoreProfile, name: 'Second Store', email: 'second@store.com' };

    await db.insert(storeProfilesTable)
      .values([firstStore, secondStore])
      .execute();

    const result = await getStoreProfile();

    expect(result).not.toBeNull();
    expect(result!.name).toEqual('First Store');
    expect(result!.email).toEqual('first@store.com');
  });

  it('should have correct field types', async () => {
    await db.insert(storeProfilesTable)
      .values(testStoreProfile)
      .execute();

    const result = await getStoreProfile();

    expect(result).not.toBeNull();
    expect(typeof result!.id).toBe('number');
    expect(typeof result!.name).toBe('string');
    expect(typeof result!.address).toBe('string');
    expect(typeof result!.phone).toBe('string');
    expect(typeof result!.email).toBe('string');
    expect(typeof result!.npwp).toBe('string');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });
});

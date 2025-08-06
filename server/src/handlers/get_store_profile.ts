
import { db } from '../db';
import { storeProfilesTable } from '../db/schema';
import { type StoreProfile } from '../schema';

export const getStoreProfile = async (): Promise<StoreProfile | null> => {
  try {
    // Get the first (and assumed only) store profile
    const result = await db.select()
      .from(storeProfilesTable)
      .limit(1)
      .execute();

    if (result.length === 0) {
      return null;
    }

    const profile = result[0];
    return {
      ...profile,
      // No numeric conversions needed - all fields are text/integer/timestamp
    };
  } catch (error) {
    console.error('Store profile retrieval failed:', error);
    throw error;
  }
};

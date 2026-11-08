import { IDataRepositories } from './types';
import { createMockRepositories } from './mockRepository';
import { createSupabaseRepositories } from './supabaseRepository';
import { getSupabaseClient, isSupabaseConfigured } from '../supabaseClient';

let activeRepositories: IDataRepositories | null = null;

export const getDataRepositories = (): IDataRepositories => {
  if (activeRepositories) {
    return activeRepositories;
  }

  const supabaseClient = getSupabaseClient();
  if (isSupabaseConfigured && supabaseClient) {
    activeRepositories = createSupabaseRepositories(supabaseClient);
  } else {
    activeRepositories = createMockRepositories();
  }

  return activeRepositories;
};

export * from './types';
export * from './mockRepository';
export * from './supabaseRepository';
export * from './userAccessRepository';

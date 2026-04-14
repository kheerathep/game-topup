import { supabase } from './supabase';
import type { Game } from '../types';
import type { CatalogFilterValue } from '../utils/marketplaceFilters';

export async function getGames(platform?: CatalogFilterValue): Promise<Game[]> {
  if (!supabase) return [];
  let q = supabase.from('games').select('*').eq('is_active', true).order('sort_order', { ascending: true });
  if (platform && platform !== 'all') {
    q = q.eq('platform', platform);
  }
  const { data, error } = await q;
  if (error) {
    console.error('games fetch:', error);
    return [];
  }
  return (data ?? []) as Game[];
}

export async function getGameBySlug(slug: string): Promise<Game | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();
  if (error) {
    console.error('game by slug:', error);
    return null;
  }
  return data as Game | null;
}

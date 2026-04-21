import { supabase } from './supabase';
import type { Game } from '../types';
import type { CatalogFilterValue } from '../utils/marketplaceFilters';

export type GamesListResult = { games: Game[]; error: string | null };

export async function getGames(platform?: CatalogFilterValue): Promise<GamesListResult> {
  if (!supabase) return { games: [], error: null };
  try {
    let q = supabase.from('games').select('*').eq('is_active', true).order('sort_order', { ascending: true });
    if (platform && platform !== 'all') {
      q = q.eq('platform', platform);
    }
    const { data, error } = await q;
    if (error) {
      console.error('games fetch:', error);
      return { games: [], error: error.message || 'Failed to load games' };
    }
    return { games: (data ?? []) as Game[], error: null };
  } catch (e) {
    console.error('games fetch unexpected error:', e);
    return {
      games: [],
      error: e instanceof Error ? e.message : 'Failed to load games',
    };
  }
}

export async function getGameBySlug(slug: string): Promise<Game | null> {
  if (!supabase) return null;
  try {
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
  } catch (e) {
    console.error('game by slug unexpected error:', e);
    return null;
  }
}

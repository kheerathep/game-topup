import type { Game } from '../types';

/** คำอธิบายเกมตามภาษา — รองรับ description_en / description_th และ legacy description */
export function gameLocalizedDescription(game: Game, language: 'en' | 'th'): string | null {
  const en = game.description_en?.trim();
  const th = game.description_th?.trim();
  const legacy = game.description?.trim();
  if (language === 'th') {
    return th || legacy || en || null;
  }
  return en || legacy || th || null;
}

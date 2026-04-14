import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getHomeHero, FALLBACK_HOME_HERO, type HomeHeroRow } from '../services/home';

export interface HomeHeroCopy {
  eyebrow: string;
  headline: string;
  subheadline: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  imageUrl: string;
}

function rowToCopy(row: HomeHeroRow, th: boolean): HomeHeroCopy {
  return {
    eyebrow: th ? row.eyebrow_th : row.eyebrow_en,
    headline: th ? row.headline_th : row.headline_en,
    subheadline: th ? row.subheadline_th : row.subheadline_en,
    primaryLabel: th ? row.primary_label_th : row.primary_label_en,
    primaryHref: row.primary_href,
    secondaryLabel: th ? row.secondary_label_th : row.secondary_label_en,
    secondaryHref: row.secondary_href,
    imageUrl: row.image_url,
  };
}

export function useHomePage() {
  const { language } = useLanguage();
  const th = language === 'th';
  const [heroRow, setHeroRow] = useState<HomeHeroRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const hero = await getHomeHero();
        if (cancelled) return;
        setHeroRow(hero);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hero = useMemo(() => rowToCopy(heroRow ?? FALLBACK_HOME_HERO, th), [heroRow, th]);

  return { hero, loading };
}

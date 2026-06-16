'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import { getDetailByBirth } from '@/lib/api';
import { NatalChart } from '@/components/charts/NatalChart';
import Link from 'next/link';
import styles from '../destiny.module.css';

/* ============================================================
   Types — aligned with backend manual/detail/western response.
   Backend shape (relevant parts):
     data: {
       planets: PlanetEntry[],
       aspects: AspectEntry[],
       ascendant: { sign, sign_en, degree?, ... },
       houses: ...,
       patterns: ...,
       interpretations: {
         planets: PlanetInterpretation[],
         aspects: AspectInterpretation[],
         ascendant: { interpretation, keywords },
         midheaven?: { interpretation },
         chart_pattern?, dominant_element?, summary?
       }
     }
   ============================================================ */

interface PlanetEntry {
  name: string;
  name_en?: string;
  sign: string;
  sign_en?: string;
  degree?: number;        // used by NatalChart wheel only, never shown as text
  house?: number;
  house_label?: string;
  retrograde?: boolean;
}

interface AspectEntry {
  planet1: string;
  planet2: string;
  aspect: string;
  orb: number;
}

interface PlanetInterpretation {
  name: string;
  name_en?: string;
  sign?: string;
  house?: number;
  ruler_sign?: string;
  interpretation: string;
  keywords?: string[];
  in_sign_detail?: string;
  in_house_detail?: string;
}

interface AspectInterpretation {
  planet1: string;
  planet2: string;
  aspect: string;
  interpretation: string;
  keywords?: string[];
  key?: string;
}

interface AscendantInterpretation {
  sign?: string;
  sign_en?: string;
  interpretation: string;
  keywords?: string[];
}

interface MergedPlanet {
  entry: PlanetEntry;
  interp?: PlanetInterpretation;
}

interface MergedAspect {
  entry: AspectEntry;
  interp?: AspectInterpretation;
}

interface AscendantData {
  sign?: string;
  sign_en?: string;
  interp?: AscendantInterpretation;
}

interface WesternViewModel {
  planets: MergedPlanet[];
  aspects: MergedAspect[];
  ascendant: AscendantData;
  midheaven_interpretation?: string;
  chart_pattern?: string;
  dominant_element?: string;
  summary?: string;
  calculation_method?: string;
}

/* ============================================================
   Helpers
   ============================================================ */

const CN_SIGN_TO_EN: Record<string, string> = {
  '牡羊座': 'aries', '金牛座': 'taurus', '雙子座': 'gemini', '巨蟹座': 'cancer',
  '獅子座': 'leo', '處女座': 'virgo', '天秤座': 'libra', '天蠍座': 'scorpio',
  '射手座': 'sagittarius', '摩羯座': 'capricorn', '水瓶座': 'aquarius', '雙魚座': 'pisces',
};

function signToEn(sign?: string, fallback?: string): string | undefined {
  if (fallback) return fallback.toLowerCase();
  if (!sign) return undefined;
  return CN_SIGN_TO_EN[sign] ?? sign.toLowerCase();
}

function planetThemeSign(planet: MergedPlanet): string | undefined {
  const ruler = planet.interp?.ruler_sign?.toLowerCase();
  if (ruler) return ruler;
  return signToEn(planet.entry.sign, planet.entry.sign_en);
}

/** Split a `\n\n`-separated body into the intro paragraph + the rest. */
function splitBody(body?: string): { intro: string; rest: string[] } {
  if (!body) return { intro: '', rest: [] };
  const paras = body.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  return { intro: paras[0] ?? '', rest: paras.slice(1) };
}

/* ============================================================
   Visual hierarchy
   --------------------------------------------------------------
   - Card surface (always visible): icon + title + meta + keywords + intro
   - Expand button (toggle): rest of body_text + secondary in_sign / in_house
   - Drawer is gone — everything important reads at-a-glance.
   ============================================================ */

type ExpandableCardProps = {
  /** Inline chip / icon — string or React node */
  icon?: React.ReactNode;
  /** Headline, e.g. 「太陽 巨蟹」 */
  title: React.ReactNode;
  /** Right-aligned meta, e.g. 「6.2° · 8 宮」 */
  meta?: React.ReactNode;
  /** Theme color string (CSS color) — drives accent + border */
  accent?: string;
  keywords?: string[];
  intro?: string;
  rest?: string[];
  /** Optional extra blocks always visible at the bottom (e.g. retrograde note) */
  footer?: React.ReactNode;
};

function ExpandableCard({ icon, title, meta, accent, keywords, intro, rest, footer }: ExpandableCardProps) {
  const [open, setOpen] = useState(false);
  const accentColor = accent ?? 'rgba(255,255,255,0.7)';
  const hasMore = (rest && rest.length > 0);
  return (
    <article
      style={{
        padding: '1rem 1.1rem',
        background: 'rgba(255,255,255,0.04)',
        borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.07)',
        borderLeft: `3px solid ${accentColor}`,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', flexWrap: 'wrap' }}>
        {icon && <span style={{ fontSize: '1.25rem', color: accentColor }}>{icon}</span>}
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, flex: 1, minWidth: 0 }}>
          {title}
        </h3>
        {meta && (
          <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap' }}>
            {meta}
          </span>
        )}
      </header>

      {keywords && keywords.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
          {keywords.map((kw, i) => (
            <span
              key={i}
              style={{
                fontSize: '0.72rem',
                padding: '0.15rem 0.55rem',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.06)',
                color: accentColor,
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {kw}
            </span>
          ))}
        </div>
      )}

      {intro && (
        <p style={{ margin: 0, lineHeight: 1.75, color: 'rgba(255,255,255,0.85)', fontSize: '0.92rem' }}>
          {intro}
        </p>
      )}

      {open && rest && rest.map((para, i) => (
        <p key={i} style={{ margin: 0, lineHeight: 1.75, color: 'rgba(255,255,255,0.75)', fontSize: '0.9rem' }}>
          {para}
        </p>
      ))}

      {footer && <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)' }}>{footer}</div>}

      {hasMore && (
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          style={{
            alignSelf: 'flex-start',
            marginTop: '0.1rem',
            padding: '0.3rem 0.7rem',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 999,
            color: accentColor,
            fontSize: '0.75rem',
            cursor: 'pointer',
          }}
          aria-expanded={open}
        >
          {open ? '收起' : `展開閱讀（${rest!.length + 1} 段）`}
        </button>
      )}
    </article>
  );
}

/** Color-per-sign accent for placement headers / borders. */
const SIGN_ACCENT: Record<string, string> = {
  aries: '#ff5a3c',
  taurus: '#c9a55a',
  gemini: '#ffd75a',
  cancer: '#c8d8f0',
  leo: '#f0b450',
  virgo: '#8ac08a',
  libra: '#f0c8d4',
  scorpio: '#c84878',
  sagittarius: '#f08c40',
  capricorn: '#b8b8c8',
  aquarius: '#5ad8ff',
  pisces: '#b8d8c8',
};

const PLANET_GLYPH: Record<string, string> = {
  '太陽': '☉', '月亮': '☽', '水星': '☿', '金星': '♀', '火星': '♂',
  '木星': '♃', '土星': '♄', '天王星': '♅', '海王星': '♆', '冥王星': '♇',
};

const ASPECT_COLOR: Record<string, string> = {
  '合相': '#f59e0b',
  '對分相': '#ef4444',
  '三分相': '#10b981',
  '四分相': '#a78bfa',
  '六分相': '#22d3ee',
};

/* ============================================================
   Page
   ============================================================ */

export default function WesternPage() {
  const { user, birthInfo, hasBirthInfo, loading: authLoading } = useAuth();
  const router = useRouter();
  const [vm, setVm] = useState<WesternViewModel | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'planets' | 'aspects'>('overview');

  const tabs: Array<{ id: 'overview' | 'planets' | 'aspects'; label: string }> = [
    { id: 'overview', label: '總覽' },
    { id: 'planets', label: '行星' },
    { id: 'aspects', label: '相位' },
  ];

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const fetchWesternData = useCallback(async () => {
    if (!birthInfo?.birth_date) return;
    setDataLoading(true);
    setError(null);
    try {
      const result = await getDetailByBirth('western', birthInfo);
      const d = result.data as Record<string, unknown>;
      const interp = (d.interpretations ?? {}) as Record<string, unknown>;

      const rawPlanets = (d.planets ?? []) as PlanetEntry[];
      const rawAspects = (d.aspects ?? []) as AspectEntry[];
      const ascRaw = (d.ascendant ?? {}) as { sign?: string; sign_en?: string };

      const aiPlanets = (interp.planets ?? []) as PlanetInterpretation[];
      const planetInterpByName = new Map<string, PlanetInterpretation>();
      for (const ap of aiPlanets) {
        if (ap.name) planetInterpByName.set(ap.name, ap);
      }
      const planets: MergedPlanet[] = rawPlanets.map(p => ({
        entry: p,
        interp: planetInterpByName.get(p.name),
      }));

      const aiAspects = (interp.aspects ?? []) as AspectInterpretation[];
      const aspectInterpByKey = new Map<string, AspectInterpretation>();
      for (const aa of aiAspects) {
        const k = aa.key ?? `${aa.planet1}-${aa.aspect}-${aa.planet2}`;
        aspectInterpByKey.set(k, aa);
      }
      const aspects: MergedAspect[] = rawAspects.map(a => ({
        entry: a,
        interp: aspectInterpByKey.get(`${a.planet1}-${a.aspect}-${a.planet2}`),
      }));

      const ascInt = (interp.ascendant ?? undefined) as AscendantInterpretation | undefined;
      const mcInt = (interp.midheaven ?? {}) as { interpretation?: string };

      setVm({
        planets,
        aspects,
        ascendant: {
          sign: ascRaw.sign,
          sign_en: ascRaw.sign_en,
          interp: ascInt,
        },
        midheaven_interpretation: mcInt.interpretation,
        chart_pattern: interp.chart_pattern as string | undefined,
        dominant_element: interp.dominant_element as string | undefined,
        summary: interp.summary as string | undefined,
        calculation_method: d.calculation_method as string | undefined,
      });
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setDataLoading(false);
    }
  }, [birthInfo]);

  useEffect(() => {
    if (hasBirthInfo && !vm && !dataLoading && !error) {
      fetchWesternData();
    }
  }, [hasBirthInfo, vm, dataLoading, error, fetchWesternData]);

  /* ----- Card builders ----- */

  const planetCard = (p: MergedPlanet, key: React.Key) => {
    const { entry, interp } = p;
    const themeKey = planetThemeSign(p);
    const accent = (themeKey && SIGN_ACCENT[themeKey]) ?? '#94a3b8';
    const { intro, rest } = splitBody(interp?.interpretation);
    const extraDetails: string[] = [];
    if (interp?.in_sign_detail) extraDetails.push(interp.in_sign_detail);
    if (interp?.in_house_detail) extraDetails.push(interp.in_house_detail);

    const meta = (
      <>
        {entry.sign}
        {entry.house_label ? <> · {entry.house_label}</> : entry.house ? <> · 第 {entry.house} 宮</> : null}
      </>
    );

    const footer = entry.retrograde
      ? <span style={{ color: '#f87171' }}>℞ 逆行 — 適合回顧與整合，不宜起新題</span>
      : undefined;

    return (
      <ExpandableCard
        key={key}
        icon={PLANET_GLYPH[entry.name] ?? '★'}
        title={entry.name}
        meta={meta}
        accent={accent}
        keywords={interp?.keywords}
        intro={intro}
        rest={[...rest, ...extraDetails]}
        footer={footer}
      />
    );
  };

  const aspectCard = (a: MergedAspect, key: React.Key) => {
    const { entry, interp } = a;
    const accent = ASPECT_COLOR[entry.aspect] ?? '#a78bfa';
    const { intro, rest } = splitBody(interp?.interpretation);
    const title = (
      <>
        {entry.planet1} <span style={{ color: accent, margin: '0 0.35rem' }}>{entry.aspect}</span> {entry.planet2}
      </>
    );
    return (
      <ExpandableCard
        key={key}
        title={title}
        accent={accent}
        keywords={interp?.keywords}
        intro={intro}
        rest={rest}
      />
    );
  };

  const ascendantCard = () => {
    if (!vm?.ascendant.sign) return null;
    const interp = vm.ascendant.interp;
    const themeKey = signToEn(vm.ascendant.sign, vm.ascendant.sign_en);
    const accent = (themeKey && SIGN_ACCENT[themeKey]) ?? '#ec4899';
    const { intro, rest } = splitBody(interp?.interpretation);
    return (
      <ExpandableCard
        icon="ASC"
        title={`上升 ${vm.ascendant.sign}`}
        accent={accent}
        keywords={interp?.keywords}
        intro={intro}
        rest={rest}
      />
    );
  };

  /* ----- Render ----- */

  if (authLoading) return <div className={styles.loading}>載入中...</div>;
  if (!user) return null;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/dashboard" style={{ color: 'inherit', textDecoration: 'none' }}>
          ← 返回
        </Link>
        <h1 style={{ marginTop: '1rem' }}>西洋星盤</h1>
        {vm?.calculation_method && (
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.25rem' }}>
            計算方式: {vm.calculation_method}
          </p>
        )}
      </header>

      {/* Tabs */}
      <nav style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '2rem',
        overflowX: 'auto',
        paddingBottom: '0.5rem',
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              background: activeTab === tab.id
                ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                : 'rgba(255,255,255,0.05)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* States */}
      {!hasBirthInfo ? (
        <div className={styles.setupBanner}>
          <p>尚未設定出生資料</p>
          <Link href="/dashboard/settings" className={styles.setupBtn}>
            設定出生資料
          </Link>
        </div>
      ) : dataLoading ? (
        <div className={styles.loading}><p>正在計算星盤...</p></div>
      ) : error ? (
        <div className={styles.setupBanner}>
          <p>{error}</p>
          <button onClick={fetchWesternData} className={styles.setupBtn}>重試</button>
        </div>
      ) : vm ? (
        <>
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Natal chart wheel — visual reference; click does nothing now (all content is inline below). */}
              {vm.planets.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <NatalChart
                    planets={vm.planets.map(p => ({
                      name: p.entry.name,
                      sign: p.entry.sign,
                      degree: p.entry.degree ?? 0,
                      house: p.entry.house ?? 1,
                      retrograde: p.entry.retrograde,
                    }))}
                    ascendant={vm.ascendant.sign ? { sign: vm.ascendant.sign } : undefined}
                  />
                </div>
              )}

              {/* Three luminaries inline */}
              {(() => {
                const sun = vm.planets.find(p => p.entry.name === '太陽' || p.entry.name_en === 'sun');
                const moon = vm.planets.find(p => p.entry.name === '月亮' || p.entry.name_en === 'moon');
                return (
                  <>
                    {sun && planetCard(sun, 'sun-card')}
                    {moon && planetCard(moon, 'moon-card')}
                    {ascendantCard()}
                  </>
                );
              })()}

              {/* Midheaven inline if available */}
              {vm.midheaven_interpretation && (
                <ExpandableCard
                  icon="MC"
                  title="天頂 (Midheaven)"
                  accent="#f59e0b"
                  intro={splitBody(vm.midheaven_interpretation).intro}
                  rest={splitBody(vm.midheaven_interpretation).rest}
                />
              )}

              {(vm.chart_pattern || vm.dominant_element) && (
                <div style={{
                  padding: '1rem',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: 12,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '1rem',
                }}>
                  {vm.chart_pattern && (
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>星盤圖形</div>
                      <p style={{ lineHeight: 1.5, fontSize: '0.9rem', margin: 0 }}>{vm.chart_pattern}</p>
                    </div>
                  )}
                  {vm.dominant_element && (
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>主導元素</div>
                      <p style={{ lineHeight: 1.5, fontSize: '0.9rem', margin: 0 }}>{vm.dominant_element}</p>
                    </div>
                  )}
                </div>
              )}

              {vm.summary && (
                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.04)', borderRadius: 12 }}>
                  <h3 style={{ marginBottom: '0.5rem', marginTop: 0 }}>整體總結</h3>
                  <p style={{ lineHeight: 1.7, color: 'rgba(255,255,255,0.85)', margin: 0 }}>{vm.summary}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'planets' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {vm.planets.map((p, i) => planetCard(p, i))}
            </div>
          )}

          {activeTab === 'aspects' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {vm.aspects.length > 0
                ? vm.aspects.map((a, i) => aspectCard(a, i))
                : <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: '2rem' }}>沒有偵測到主要相位</p>
              }
            </div>
          )}

          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <button
              onClick={fetchWesternData}
              disabled={dataLoading}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '0.5rem',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              {dataLoading ? '計算中...' : '重新計算'}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import { getDetailByBirth } from '@/lib/api';
import { NatalChart } from '@/components/charts/NatalChart';
import Link from 'next/link';
import styles from '../destiny.module.css';

/* ============================================================
   Types — aligned with backend manual/detail/western response.
   ============================================================ */

interface PlanetEntry {
  name: string;
  name_en?: string;
  sign: string;
  sign_en?: string;
  degree?: number;        // wheel positioning only — never shown as text
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

interface HouseInterpretation {
  house: number;
  house_label: string;
  sign?: string;
  sign_en?: string;
  interpretation: string;
  keywords?: string[];
  planets?: Array<{ name?: string; name_en?: string; sign?: string }>;
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
  houses: HouseInterpretation[];
  aspects: MergedAspect[];
  ascendant: AscendantData;
  midheaven_interpretation?: string;
  chart_pattern?: string;
  dominant_element?: string;
  summary?: string;
  calculation_method?: string;
}

/* ============================================================
   Constants — visual maps
   ============================================================ */

const CN_SIGN_TO_EN: Record<string, string> = {
  '牡羊座': 'aries', '金牛座': 'taurus', '雙子座': 'gemini', '巨蟹座': 'cancer',
  '獅子座': 'leo', '處女座': 'virgo', '天秤座': 'libra', '天蠍座': 'scorpio',
  '射手座': 'sagittarius', '摩羯座': 'capricorn', '水瓶座': 'aquarius', '雙魚座': 'pisces',
};

const SIGN_ACCENT: Record<string, string> = {
  aries: '#ff5a3c', taurus: '#c9a55a', gemini: '#ffd75a', cancer: '#c8d8f0',
  leo: '#f0b450', virgo: '#8ac08a', libra: '#f0c8d4', scorpio: '#c84878',
  sagittarius: '#f08c40', capricorn: '#b8b8c8', aquarius: '#5ad8ff', pisces: '#b8d8c8',
};

const PLANET_GLYPH: Record<string, string> = {
  '太陽': '☉', '月亮': '☽', '水星': '☿', '金星': '♀', '火星': '♂',
  '木星': '♃', '土星': '♄', '天王星': '♅', '海王星': '♆', '冥王星': '♇',
};

const ASPECT_COLOR: Record<string, string> = {
  '合相': '#f59e0b', '對分相': '#ef4444', '三分相': '#10b981',
  '四分相': '#a78bfa', '六分相': '#22d3ee',
};

const ASPECT_GLYPH: Record<string, string> = {
  '合相': '☌', '對分相': '☍', '三分相': '△', '四分相': '□', '六分相': '✶',
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

/* ============================================================
   Small UI atoms
   ============================================================ */

function Chip({
  active, accent, label, sublabel, onClick,
}: {
  active: boolean;
  accent: string;
  label: React.ReactNode;
  sublabel?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: '0 0 auto',
        padding: '0.5rem 0.85rem',
        borderRadius: 12,
        background: active ? `${accent}22` : 'rgba(255,255,255,0.04)',
        border: active ? `1px solid ${accent}` : '1px solid rgba(255,255,255,0.08)',
        color: active ? accent : 'rgba(255,255,255,0.85)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.15rem',
        cursor: 'pointer',
        minWidth: 64,
        transition: 'background 120ms ease, border 120ms ease',
      }}
      aria-pressed={active}
    >
      <span style={{ fontSize: '1rem', fontWeight: 600, lineHeight: 1.2 }}>{label}</span>
      {sublabel && (
        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)' }}>{sublabel}</span>
      )}
    </button>
  );
}

function DetailPanel({
  accent, title, meta, keywords, body, secondary, footer,
}: {
  accent: string;
  title: React.ReactNode;
  meta?: React.ReactNode;
  keywords?: string[];
  body: string;
  secondary?: Array<{ label: string; text: string }>;
  footer?: React.ReactNode;
}) {
  const paras = body.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  return (
    <article
      style={{
        padding: '1.15rem 1.2rem',
        background: 'rgba(255,255,255,0.04)',
        borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.08)',
        borderLeft: `3px solid ${accent}`,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, flex: 1, minWidth: 0 }}>
          {title}
        </h3>
        {meta && (
          <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>{meta}</span>
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
                color: accent,
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {kw}
            </span>
          ))}
        </div>
      )}

      {paras.map((p, i) => (
        <p
          key={i}
          style={{
            margin: 0,
            lineHeight: 1.78,
            color: i === 0 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.75)',
            fontSize: i === 0 ? '0.95rem' : '0.9rem',
          }}
        >
          {p}
        </p>
      ))}

      {secondary?.map(({ label, text }, i) => (
        <details
          key={i}
          style={{
            marginTop: '0.25rem',
            padding: '0.5rem 0.75rem',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <summary style={{ cursor: 'pointer', fontSize: '0.82rem', color: accent }}>
            {label}
          </summary>
          <p style={{ margin: '0.5rem 0 0', lineHeight: 1.7, color: 'rgba(255,255,255,0.75)', fontSize: '0.88rem' }}>
            {text}
          </p>
        </details>
      ))}

      {footer && <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.55)' }}>{footer}</div>}
    </article>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: '2rem 1rem',
        textAlign: 'center',
        color: 'rgba(255,255,255,0.5)',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 14,
        border: '1px dashed rgba(255,255,255,0.08)',
      }}
    >
      {message}
    </div>
  );
}

/* ============================================================
   Page
   ============================================================ */

type TabId = 'planets' | 'houses' | 'aspects';

export default function WesternPage() {
  const { user, birthInfo, hasBirthInfo, loading: authLoading } = useAuth();
  const router = useRouter();
  const [vm, setVm] = useState<WesternViewModel | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('planets');
  const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null);
  const [selectedHouse, setSelectedHouse] = useState<number | null>(null);
  const [selectedAspectKey, setSelectedAspectKey] = useState<string | null>(null);

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: 'planets', label: '行星' },
    { id: 'houses', label: '宮位' },
    { id: 'aspects', label: '相位' },
  ];

  useEffect(() => {
    if (!authLoading && !user) router.push('/');
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
      for (const ap of aiPlanets) if (ap.name) planetInterpByName.set(ap.name, ap);
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

      const houses = (interp.houses ?? []) as HouseInterpretation[];

      const ascInt = (interp.ascendant ?? undefined) as AscendantInterpretation | undefined;
      const mcInt = (interp.midheaven ?? {}) as { interpretation?: string };

      setVm({
        planets,
        houses,
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
    if (hasBirthInfo && !vm && !dataLoading && !error) fetchWesternData();
  }, [hasBirthInfo, vm, dataLoading, error, fetchWesternData]);

  /* ----- Per-tab filtered lists (drop empty interpretations) ----- */

  const planetItems = useMemo(() => {
    if (!vm) return [];
    return vm.planets.filter(p => (p.interp?.interpretation ?? '').trim().length > 0);
  }, [vm]);

  const houseItems = useMemo(() => {
    if (!vm) return [];
    return vm.houses.filter(h => (h.interpretation ?? '').trim().length > 0);
  }, [vm]);

  const aspectItems = useMemo(() => {
    if (!vm) return [];
    return vm.aspects.filter(a => (a.interp?.interpretation ?? '').trim().length > 0);
  }, [vm]);

  /* ----- Default-select first chip whenever data or tab changes ----- */

  useEffect(() => {
    if (activeTab === 'planets' && planetItems.length > 0 && !planetItems.find(p => p.entry.name === selectedPlanet)) {
      setSelectedPlanet(planetItems[0].entry.name);
    }
    if (activeTab === 'houses' && houseItems.length > 0 && !houseItems.find(h => h.house === selectedHouse)) {
      setSelectedHouse(houseItems[0].house);
    }
    if (activeTab === 'aspects' && aspectItems.length > 0) {
      const keyFor = (a: MergedAspect) => `${a.entry.planet1}-${a.entry.aspect}-${a.entry.planet2}`;
      if (!aspectItems.find(a => keyFor(a) === selectedAspectKey)) {
        setSelectedAspectKey(keyFor(aspectItems[0]));
      }
    }
  }, [activeTab, planetItems, houseItems, aspectItems, selectedPlanet, selectedHouse, selectedAspectKey]);

  /* ----- Render ----- */

  if (authLoading) return <div className={styles.loading}>載入中...</div>;
  if (!user) return null;

  const renderPlanetDetail = () => {
    const p = planetItems.find(pl => pl.entry.name === selectedPlanet) ?? planetItems[0];
    if (!p) return <EmptyPanel message="尚無行星詳解資料" />;
    const themeKey = planetThemeSign(p);
    const accent = (themeKey && SIGN_ACCENT[themeKey]) ?? '#94a3b8';
    const meta = (
      <>
        {p.entry.sign}
        {p.entry.house_label ? <> · {p.entry.house_label}</> : null}
      </>
    );
    const secondary: Array<{ label: string; text: string }> = [];
    if (p.interp?.in_sign_detail) secondary.push({ label: '深入星座面向', text: p.interp.in_sign_detail });
    if (p.interp?.in_house_detail) secondary.push({ label: '深入宮位面向', text: p.interp.in_house_detail });
    const footer = p.entry.retrograde
      ? <span style={{ color: '#f87171' }}>℞ 逆行 — 適合回顧與整合，不宜起新題</span>
      : undefined;
    return (
      <DetailPanel
        accent={accent}
        title={<><span style={{ color: accent, marginRight: '0.4rem' }}>{PLANET_GLYPH[p.entry.name] ?? '★'}</span>{p.entry.name}</>}
        meta={meta}
        keywords={p.interp?.keywords}
        body={p.interp?.interpretation ?? ''}
        secondary={secondary}
        footer={footer}
      />
    );
  };

  const renderHouseDetail = () => {
    const h = houseItems.find(x => x.house === selectedHouse) ?? houseItems[0];
    if (!h) return <EmptyPanel message="尚無宮位詳解資料 — 需要精確出生時間才能定宮" />;
    const accent = (h.sign_en && SIGN_ACCENT[h.sign_en]) ?? (signToEn(h.sign) && SIGN_ACCENT[signToEn(h.sign)!]) ?? '#94a3b8';
    const planetsHere = h.planets ?? [];
    const meta = h.sign ? <>宮頭 {h.sign}</> : null;
    const footer = planetsHere.length > 0 ? (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', alignItems: 'center' }}>
        <span style={{ color: 'rgba(255,255,255,0.5)' }}>宮內行星：</span>
        {planetsHere.map((pl, i) => (
          <span
            key={i}
            style={{
              padding: '0.15rem 0.5rem',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.06)',
              fontSize: '0.78rem',
            }}
          >
            {PLANET_GLYPH[pl.name ?? ''] ?? ''} {pl.name}
            {pl.sign ? <span style={{ color: 'rgba(255,255,255,0.55)' }}> · {pl.sign}</span> : null}
          </span>
        ))}
      </div>
    ) : (
      <span style={{ color: 'rgba(255,255,255,0.5)' }}>此宮無主要行星進駐</span>
    );
    return (
      <DetailPanel
        accent={accent}
        title={h.house_label}
        meta={meta}
        keywords={h.keywords}
        body={h.interpretation}
        footer={footer}
      />
    );
  };

  const renderAspectDetail = () => {
    const keyFor = (a: MergedAspect) => `${a.entry.planet1}-${a.entry.aspect}-${a.entry.planet2}`;
    const a = aspectItems.find(x => keyFor(x) === selectedAspectKey) ?? aspectItems[0];
    if (!a) return <EmptyPanel message="尚無相位詳解資料" />;
    const accent = ASPECT_COLOR[a.entry.aspect] ?? '#a78bfa';
    const title = (
      <>
        {a.entry.planet1}
        <span style={{ color: accent, margin: '0 0.5rem' }}>{a.entry.aspect}</span>
        {a.entry.planet2}
      </>
    );
    return (
      <DetailPanel
        accent={accent}
        title={title}
        keywords={a.interp?.keywords}
        body={a.interp?.interpretation ?? ''}
      />
    );
  };

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

      {/* States */}
      {!hasBirthInfo ? (
        <div className={styles.setupBanner}>
          <p>尚未設定出生資料</p>
          <Link href="/dashboard/settings" className={styles.setupBtn}>設定出生資料</Link>
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
          {/* === Chart summary section (orientational, above tabs) === */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.75rem' }}>
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

            {/* Three-axis quick reference: 太陽 / 月亮 / 上升 */}
            {(() => {
              const sun = vm.planets.find(p => p.entry.name === '太陽');
              const moon = vm.planets.find(p => p.entry.name === '月亮');
              const cells: Array<{ label: string; primary?: string; sub?: string; accent: string }> = [];
              if (sun) {
                const t = planetThemeSign(sun);
                cells.push({
                  label: '太陽',
                  primary: sun.entry.sign,
                  sub: sun.entry.house_label,
                  accent: (t && SIGN_ACCENT[t]) ?? '#f0b450',
                });
              }
              if (moon) {
                const t = planetThemeSign(moon);
                cells.push({
                  label: '月亮',
                  primary: moon.entry.sign,
                  sub: moon.entry.house_label,
                  accent: (t && SIGN_ACCENT[t]) ?? '#c8d8f0',
                });
              }
              if (vm.ascendant.sign && vm.ascendant.sign !== '需要精確出生時間') {
                const t = signToEn(vm.ascendant.sign, vm.ascendant.sign_en);
                cells.push({
                  label: '上升',
                  primary: vm.ascendant.sign,
                  accent: (t && SIGN_ACCENT[t]) ?? '#ec4899',
                });
              }
              if (cells.length === 0) return null;
              return (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${cells.length}, 1fr)`,
                    gap: '0.6rem',
                  }}
                >
                  {cells.map((c, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '0.85rem 0.75rem',
                        background: 'rgba(255,255,255,0.04)',
                        borderRadius: 12,
                        borderTop: `2px solid ${c.accent}`,
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)' }}>{c.label}</div>
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: c.accent, marginTop: '0.25rem' }}>
                        {c.primary}
                      </div>
                      {c.sub && (
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.15rem' }}>
                          {c.sub}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Chart pattern / dominant element / summary, if backend supplies */}
            {(vm.chart_pattern || vm.dominant_element || vm.summary) && (
              <div
                style={{
                  padding: '1rem 1.1rem',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                {(vm.chart_pattern || vm.dominant_element) && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: '1rem',
                    }}
                  >
                    {vm.chart_pattern && (
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.2rem' }}>
                          星盤圖形
                        </div>
                        <p style={{ lineHeight: 1.6, fontSize: '0.9rem', margin: 0 }}>{vm.chart_pattern}</p>
                      </div>
                    )}
                    {vm.dominant_element && (
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.2rem' }}>
                          主導元素
                        </div>
                        <p style={{ lineHeight: 1.6, fontSize: '0.9rem', margin: 0 }}>{vm.dominant_element}</p>
                      </div>
                    )}
                  </div>
                )}
                {vm.summary && (
                  <p style={{ lineHeight: 1.7, color: 'rgba(255,255,255,0.85)', margin: 0, fontSize: '0.92rem' }}>
                    {vm.summary}
                  </p>
                )}
              </div>
            )}
          </section>

          {/* === Tabs === */}
          <nav
            style={{
              display: 'flex',
              gap: '0.5rem',
              marginBottom: '1rem',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '0.65rem 1.1rem',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: active ? '2px solid #f59e0b' : '2px solid transparent',
                    color: active ? '#f59e0b' : 'rgba(255,255,255,0.6)',
                    fontSize: '0.95rem',
                    fontWeight: active ? 600 : 400,
                    cursor: 'pointer',
                    marginBottom: '-1px',
                  }}
                  aria-pressed={active}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* === Tab body: horizontal chip row + detail panel === */}
          {activeTab === 'planets' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  overflowX: 'auto',
                  paddingBottom: '0.4rem',
                  scrollbarWidth: 'thin',
                }}
              >
                {planetItems.map((p) => {
                  const t = planetThemeSign(p);
                  const accent = (t && SIGN_ACCENT[t]) ?? '#94a3b8';
                  return (
                    <Chip
                      key={p.entry.name}
                      active={selectedPlanet === p.entry.name}
                      accent={accent}
                      label={<><span style={{ marginRight: '0.3rem' }}>{PLANET_GLYPH[p.entry.name] ?? '★'}</span>{p.entry.name}</>}
                      sublabel={p.entry.sign}
                      onClick={() => setSelectedPlanet(p.entry.name)}
                    />
                  );
                })}
              </div>
              {planetItems.length > 0 ? renderPlanetDetail() : <EmptyPanel message="尚無行星詳解資料" />}
            </div>
          )}

          {activeTab === 'houses' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  overflowX: 'auto',
                  paddingBottom: '0.4rem',
                  scrollbarWidth: 'thin',
                }}
              >
                {houseItems.map((h) => {
                  const accent =
                    (h.sign_en && SIGN_ACCENT[h.sign_en]) ??
                    (signToEn(h.sign) && SIGN_ACCENT[signToEn(h.sign)!]) ??
                    '#94a3b8';
                  return (
                    <Chip
                      key={h.house}
                      active={selectedHouse === h.house}
                      accent={accent}
                      label={`第${h.house}宮`}
                      sublabel={h.sign}
                      onClick={() => setSelectedHouse(h.house)}
                    />
                  );
                })}
              </div>
              {houseItems.length > 0
                ? renderHouseDetail()
                : <EmptyPanel message="尚無宮位資料 — 需要精確出生時間才能定宮" />}
            </div>
          )}

          {activeTab === 'aspects' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  overflowX: 'auto',
                  paddingBottom: '0.4rem',
                  scrollbarWidth: 'thin',
                }}
              >
                {aspectItems.map((a) => {
                  const k = `${a.entry.planet1}-${a.entry.aspect}-${a.entry.planet2}`;
                  const accent = ASPECT_COLOR[a.entry.aspect] ?? '#a78bfa';
                  return (
                    <Chip
                      key={k}
                      active={selectedAspectKey === k}
                      accent={accent}
                      label={
                        <>
                          {PLANET_GLYPH[a.entry.planet1] ?? a.entry.planet1}
                          <span style={{ margin: '0 0.25rem', color: accent }}>
                            {ASPECT_GLYPH[a.entry.aspect] ?? ''}
                          </span>
                          {PLANET_GLYPH[a.entry.planet2] ?? a.entry.planet2}
                        </>
                      }
                      sublabel={a.entry.aspect}
                      onClick={() => setSelectedAspectKey(k)}
                    />
                  );
                })}
              </div>
              {aspectItems.length > 0 ? renderAspectDetail() : <EmptyPanel message="尚無相位詳解資料" />}
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

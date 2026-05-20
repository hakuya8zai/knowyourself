'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import { getDetailByBirth } from '@/lib/api';
import { NatalChart } from '@/components/charts/NatalChart';
import { ChartDetailDrawer, type ChartDetail } from '@/components/ChartDetailDrawer';
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
  degree: number;
  house?: number;
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
  ruler_sign?: string;          // English lowercase (aries, taurus, ...) — drives theme
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
  degree?: number;
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

/**
 * Decide which sign drives the drawer theme for a planet placement.
 * Backend supplies `ruler_sign`; fallback to the planet's own sign so we
 * never end up theme-less.
 */
function planetThemeSign(planet: MergedPlanet): string | undefined {
  const ruler = planet.interp?.ruler_sign?.toLowerCase();
  if (ruler) return ruler;
  return signToEn(planet.entry.sign, planet.entry.sign_en);
}

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
  const [selectedDetail, setSelectedDetail] = useState<ChartDetail | null>(null);

  const tabs: Array<{ id: 'overview' | 'planets' | 'aspects'; label: string }> = [
    { id: 'overview', label: '總覽' },
    { id: 'planets', label: '行星' },
    { id: 'aspects', label: '相位' },
  ];

  // Redirect if not logged in
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
      const ascRaw = (d.ascendant ?? {}) as { sign?: string; sign_en?: string; degree?: number };

      // Match interpretation -> structured entry by planet name (Chinese name)
      const aiPlanets = (interp.planets ?? []) as PlanetInterpretation[];
      const planetInterpByName = new Map<string, PlanetInterpretation>();
      for (const ap of aiPlanets) {
        if (ap.name) planetInterpByName.set(ap.name, ap);
      }
      const planets: MergedPlanet[] = rawPlanets.map(p => ({
        entry: p,
        interp: planetInterpByName.get(p.name),
      }));

      // Match aspect interpretations by key `${p1}-${aspect}-${p2}` (matches AI output)
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
          degree: ascRaw.degree,
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

  /* ----- Drawer openers ----- */

  const openPlanetDetail = useCallback((p: MergedPlanet) => {
    const { entry, interp } = p;
    const houseLabel = entry.house ? `第 ${entry.house} 宮` : '';
    const degreeLabel = typeof entry.degree === 'number' ? `${entry.degree.toFixed(1)}°` : '';
    const subtitle = [degreeLabel, houseLabel].filter(Boolean).join(' · ');

    // Combine in_sign_detail + in_house_detail into the description block.
    const detailParts: string[] = [];
    if (interp?.in_sign_detail) detailParts.push(interp.in_sign_detail);
    if (interp?.in_house_detail) detailParts.push(interp.in_house_detail);

    setSelectedDetail({
      type: 'planet',
      id: entry.name_en ?? entry.name,
      title: `${entry.name} in ${entry.sign}`,
      subtitle: subtitle || undefined,
      keywords: interp?.keywords,
      description: detailParts.join('\n\n') || interp?.interpretation || '',
      interpretation: detailParts.length > 0 ? interp?.interpretation : undefined,
      advice: entry.retrograde ? '逆行期間適合回顧與整合，而非開始全新主題。' : undefined,
      sign: planetThemeSign(p),
    });
  }, []);

  const openSignDetail = useCallback((signName: string) => {
    // For sign clicks on the wheel: if it matches the asc sign, show asc interp;
    // otherwise just open a minimal drawer themed by that sign.
    const enKey = signToEn(signName);
    if (vm?.ascendant.interp && vm.ascendant.sign && signName === vm.ascendant.sign) {
      setSelectedDetail({
        type: 'sign',
        id: enKey ?? signName,
        title: `上升 ${vm.ascendant.sign}`,
        subtitle: typeof vm.ascendant.degree === 'number' ? `${vm.ascendant.degree.toFixed(1)}°` : undefined,
        keywords: vm.ascendant.interp.keywords,
        description: vm.ascendant.interp.interpretation,
        sign: enKey,
      });
      return;
    }
    setSelectedDetail({
      type: 'sign',
      id: enKey ?? signName,
      title: signName,
      description: '',
      sign: enKey,
    });
  }, [vm]);

  const openAspectDetail = useCallback((a: MergedAspect) => {
    const { entry, interp } = a;
    setSelectedDetail({
      type: 'aspect',
      id: `${entry.planet1}-${entry.aspect}-${entry.planet2}`,
      title: `${entry.planet1} ${entry.aspect} ${entry.planet2}`,
      subtitle: typeof entry.orb === 'number' ? `orb ${entry.orb.toFixed(1)}°` : undefined,
      keywords: interp?.keywords,
      description: interp?.interpretation ?? '',
    });
  }, []);

  /* ----- Render ----- */

  if (authLoading) {
    return <div className={styles.loading}>載入中...</div>;
  }
  if (!user) {
    return null;
  }

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
        <div className={styles.loading}>
          <p>正在計算星盤...</p>
        </div>
      ) : error ? (
        <div className={styles.setupBanner}>
          <p>{error}</p>
          <button onClick={fetchWesternData} className={styles.setupBtn}>重試</button>
        </div>
      ) : vm ? (
        <>
          {activeTab === 'overview' && (
            <>
              {/* Interactive natal chart wheel */}
              {vm.planets.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  <NatalChart
                    planets={vm.planets.map(p => ({
                      name: p.entry.name,
                      sign: p.entry.sign,
                      degree: p.entry.degree,
                      house: p.entry.house ?? 1,
                      retrograde: p.entry.retrograde,
                    }))}
                    ascendant={vm.ascendant.sign ? { sign: vm.ascendant.sign } : undefined}
                    onPlanetClick={(clicked) => {
                      const match = vm.planets.find(p => p.entry.name === clicked.name);
                      if (match) openPlanetDetail(match);
                    }}
                    onSignClick={openSignDetail}
                  />
                </div>
              )}

              {/* Three luminary cards (Sun / Moon / Asc) — clickable */}
              <div className={styles.grid}>
                {(() => {
                  const sun = vm.planets.find(p => p.entry.name === '太陽' || p.entry.name_en === 'sun');
                  const moon = vm.planets.find(p => p.entry.name === '月亮' || p.entry.name_en === 'moon');
                  return (
                    <>
                      {sun && (
                        <button
                          type="button"
                          onClick={() => openPlanetDetail(sun)}
                          className={styles.card}
                          style={{ '--accent-color': '#f59e0b', cursor: 'pointer', font: 'inherit', textAlign: 'center', color: 'inherit' } as React.CSSProperties}
                        >
                          <div className={styles.cardIcon}>☉</div>
                          <h2>太陽 {sun.entry.sign}</h2>
                          {sun.entry.degree !== undefined && <p>{sun.entry.degree.toFixed(1)}°</p>}
                        </button>
                      )}
                      {moon && (
                        <button
                          type="button"
                          onClick={() => openPlanetDetail(moon)}
                          className={styles.card}
                          style={{ '--accent-color': '#94a3b8', cursor: 'pointer', font: 'inherit', textAlign: 'center', color: 'inherit' } as React.CSSProperties}
                        >
                          <div className={styles.cardIcon}>☽</div>
                          <h2>月亮 {moon.entry.sign}</h2>
                          {moon.entry.degree !== undefined && <p>{moon.entry.degree.toFixed(1)}°</p>}
                        </button>
                      )}
                      {vm.ascendant.sign && (
                        <button
                          type="button"
                          onClick={() => vm.ascendant.sign && openSignDetail(vm.ascendant.sign)}
                          className={styles.card}
                          style={{ '--accent-color': '#ec4899', cursor: 'pointer', font: 'inherit', textAlign: 'center', color: 'inherit' } as React.CSSProperties}
                        >
                          <div className={styles.cardIcon}>ASC</div>
                          <h2>上升 {vm.ascendant.sign}</h2>
                          {vm.ascendant.degree !== undefined && <p>{vm.ascendant.degree.toFixed(1)}°</p>}
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Ascendant / Midheaven inline summaries */}
              {(vm.ascendant.interp?.interpretation || vm.midheaven_interpretation) && (
                <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {vm.ascendant.interp?.interpretation && (
                    <div style={{ padding: '1rem', background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.2)', borderRadius: '12px' }}>
                      <h4 style={{ marginBottom: '0.5rem', color: '#ec4899' }}>上升 ({vm.ascendant.sign})</h4>
                      <p style={{ lineHeight: 1.7, color: 'rgba(255,255,255,0.85)' }}>{vm.ascendant.interp.interpretation}</p>
                    </div>
                  )}
                  {vm.midheaven_interpretation && (
                    <div style={{ padding: '1rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px' }}>
                      <h4 style={{ marginBottom: '0.5rem', color: '#f59e0b' }}>天頂 (MC)</h4>
                      <p style={{ lineHeight: 1.7, color: 'rgba(255,255,255,0.85)' }}>{vm.midheaven_interpretation}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Chart pattern / dominant element */}
              {(vm.chart_pattern || vm.dominant_element) && (
                <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  {vm.chart_pattern && (
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>星盤圖形</div>
                      <p style={{ lineHeight: 1.5, fontSize: '0.9rem' }}>{vm.chart_pattern}</p>
                    </div>
                  )}
                  {vm.dominant_element && (
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>主導元素</div>
                      <p style={{ lineHeight: 1.5, fontSize: '0.9rem' }}>{vm.dominant_element}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Summary */}
              {vm.summary && (
                <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.04)', borderRadius: '12px' }}>
                  <h3 style={{ marginBottom: '0.5rem' }}>整體總結</h3>
                  <p style={{ lineHeight: 1.7, color: 'rgba(255,255,255,0.85)' }}>{vm.summary}</p>
                </div>
              )}

              {/* Note: 六段 readings (personality/career/...) removed —
                  long narrative readings now flow via per-placement drawer text. */}
            </>
          )}

          {activeTab === 'planets' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {vm.planets.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => openPlanetDetail(p)}
                  style={{
                    padding: '0.75rem 1rem',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: 'inherit',
                    font: 'inherit',
                    textAlign: 'left',
                    cursor: 'pointer',
                    width: '100%',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 600 }}>
                      {p.entry.name} {p.entry.retrograde && <span style={{ color: '#f87171' }}>℞</span>}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
                      {p.entry.sign} {typeof p.entry.degree === 'number' ? `${p.entry.degree.toFixed(1)}°` : ''} {p.entry.house ? `· ${p.entry.house} 宮` : ''}
                    </span>
                  </div>
                  {p.interp?.keywords && p.interp.keywords.length > 0 && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)' }}>
                      {p.interp.keywords.join(' · ')}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {activeTab === 'aspects' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {vm.aspects.map((a, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => openAspectDetail(a)}
                  style={{
                    padding: '0.75rem 1rem',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: 'inherit',
                    font: 'inherit',
                    textAlign: 'left',
                    cursor: 'pointer',
                    width: '100%',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span>
                      <span style={{ fontWeight: 500 }}>{a.entry.planet1}</span>
                      <span style={{ margin: '0 0.5rem', color: '#a78bfa' }}>{a.entry.aspect}</span>
                      <span style={{ fontWeight: 500 }}>{a.entry.planet2}</span>
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                      orb {typeof a.entry.orb === 'number' ? a.entry.orb.toFixed(1) : '?'}°
                    </span>
                  </div>
                </button>
              ))}
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

      {/* Slide-up drawer for placement details. Themed by sign via data-sign. */}
      <ChartDetailDrawer
        detail={selectedDetail}
        onClose={() => setSelectedDetail(null)}
      />
    </div>
  );
}

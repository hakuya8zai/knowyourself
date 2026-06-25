'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import { getDetailByBirth } from '@/lib/api';
import Link from 'next/link';
import styles from '../destiny.module.css';

/* ============================================================
   Types — aligned with backend manual/detail/ziwei response.
   data.interpretations = { stars, palaces, sihua, patterns }
   (book-grounded DB; see _ziwei_interpretations.py)
   ============================================================ */

interface StarInterp {
  name: string;
  pinyin: string;
  type?: string;
  interpretation: string;
  keywords?: string[];
}

interface PalaceStarInterp {
  name: string;
  pinyin: string;
  interpretation: string;
  keywords?: string[];
}

interface PalaceInterp {
  name: string;
  pinyin: string;
  branch?: string;
  interpretation: string;
  keywords?: string[];
  stars: PalaceStarInterp[];
  minor_stars?: string[];
  sihua_in_palace?: string[];
}

interface SihuaInterp {
  star: string;
  star_pinyin: string;
  hua: string;
  hua_pinyin: string;
  interpretation: string;
  keywords?: string[];
}

interface PatternInterp {
  id: string;
  name: string;
  category?: string;
  polarity?: 'auspicious' | 'caution';
  interpretation: string;
  keywords?: string[];
}

interface ChartBasics {
  lunar_date?: string;
  year_pillar?: string;
  wu_xing_ju?: string;
  ming_gong_branch?: string;
  shen_gong_branch?: string;
  soul_star?: string;
  body_star?: string;
}

interface ZiweiViewModel {
  basics: ChartBasics;
  stars: StarInterp[];
  palaces: PalaceInterp[];
  sihua: SihuaInterp[];
  patterns: PatternInterp[];
  calculation_method?: string;
}

/* ============================================================
   Constants — visual maps
   ============================================================ */

// 五行 element color per main star — gives each star chip a consistent hue.
const STAR_ELEMENT_COLOR: Record<string, string> = {
  紫微: '#c9a55a', 天府: '#c9a55a', 天梁: '#c9a55a',          // 土
  天機: '#8ac08a', 貪狼: '#8ac08a',                            // 木
  太陽: '#f08c40', 廉貞: '#f08c40',                            // 火
  武曲: '#b8b8c8', 七殺: '#b8b8c8',                            // 金
  天同: '#5ad8ff', 太陰: '#7db8ff', 巨門: '#5ad8ff',
  天相: '#5ad8ff', 破軍: '#5ad8ff',                            // 水
};

const SIHUA_COLOR: Record<string, string> = {
  化祿: '#10b981', // 祿 — 財、順遂
  化權: '#f59e0b', // 權 — 力量、地位
  化科: '#22d3ee', // 科 — 名聲、貴人
  化忌: '#ef4444', // 忌 — 阻礙、課題
};

// Fallback only: pattern names that read as cautionary, used when the
// backend doesn't supply an explicit `polarity` (older cached responses).
const CAUTION_HINT = /破|凶|勞|孤|刑|災|飄|泊|是非|感情|辛苦|貧/;

// Prefer the backend's controlled `polarity` signal; fall back to the
// name heuristic for responses cached before polarity was added.
function patternIsCaution(p: PatternInterp): boolean {
  if (p.polarity) return p.polarity === 'caution';
  return CAUTION_HINT.test(p.category ?? p.name);
}

function starColor(name?: string): string {
  return (name && STAR_ELEMENT_COLOR[name]) ?? '#94a3b8';
}

/* ============================================================
   UI atoms (parallel to western/page.tsx)
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
      <span style={{ fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.2, whiteSpace: 'nowrap' }}>{label}</span>
      {sublabel && (
        <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap' }}>{sublabel}</span>
      )}
    </button>
  );
}

function Keywords({ items, accent }: { items?: string[]; accent: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
      {items.map((kw, i) => (
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
  );
}

function Paragraphs({ body, dim = false }: { body: string; dim?: boolean }) {
  const paras = body.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  return (
    <>
      {paras.map((p, i) => (
        <p
          key={i}
          style={{
            margin: 0,
            lineHeight: 1.78,
            color: dim ? 'rgba(255,255,255,0.75)' : (i === 0 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.78)'),
            fontSize: dim ? '0.88rem' : (i === 0 ? '0.95rem' : '0.9rem'),
          }}
        >
          {p}
        </p>
      ))}
    </>
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

type TabId = 'stars' | 'palaces' | 'sihua' | 'patterns';

export default function ZiweiPage() {
  const { user, birthInfo, hasBirthInfo, loading: authLoading } = useAuth();
  const router = useRouter();
  const [vm, setVm] = useState<ZiweiViewModel | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('stars');
  const [selStar, setSelStar] = useState<string | null>(null);
  const [selPalace, setSelPalace] = useState<string | null>(null);
  const [selSihua, setSelSihua] = useState<string | null>(null);
  const [selPattern, setSelPattern] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/');
  }, [user, authLoading, router]);

  const fetchData = useCallback(async () => {
    if (!birthInfo?.birth_date) return;
    setDataLoading(true);
    setError(null);
    // Reset chip selections so a fresh chart deterministically defaults to
    // its first chip per tab, rather than holding a now-invalid id from the
    // previous chart until the default-select effect re-validates.
    setSelStar(null);
    setSelPalace(null);
    setSelSihua(null);
    setSelPattern(null);
    try {
      const result = await getDetailByBirth('ziwei', birthInfo);
      const d = result.data as Record<string, unknown>;
      const chart = (d.chart ?? {}) as Record<string, unknown>;
      const interp = (d.interpretations ?? {}) as Record<string, unknown>;

      const mg = (chart.ming_gong ?? {}) as { branch?: string };
      const sg = (chart.shen_gong ?? {}) as { branch?: string };

      setVm({
        basics: {
          lunar_date: chart.lunar_date as string | undefined,
          year_pillar: chart.year_pillar as string | undefined,
          wu_xing_ju: chart.wu_xing_ju as string | undefined,
          ming_gong_branch: mg.branch,
          shen_gong_branch: sg.branch,
          soul_star: chart.soul_star as string | undefined,
          body_star: chart.body_star as string | undefined,
        },
        stars: (interp.stars ?? []) as StarInterp[],
        palaces: (interp.palaces ?? []) as PalaceInterp[],
        sihua: (interp.sihua ?? []) as SihuaInterp[],
        patterns: (interp.patterns ?? []) as PatternInterp[],
        calculation_method: chart.calculation_method as string | undefined,
      });
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setDataLoading(false);
    }
  }, [birthInfo]);

  useEffect(() => {
    if (hasBirthInfo && birthInfo?.gender && !vm && !dataLoading && !error) fetchData();
  }, [hasBirthInfo, birthInfo, vm, dataLoading, error, fetchData]);

  /* ----- Filtered lists (drop empty interpretations) ----- */

  const starItems = useMemo(
    () => (vm?.stars ?? []).filter(s => (s.interpretation ?? '').trim().length > 0),
    [vm],
  );
  // Palaces: keep if the palace meta OR any of its stars has content.
  const palaceItems = useMemo(
    () => (vm?.palaces ?? []).filter(
      p => (p.interpretation ?? '').trim().length > 0
        || (p.stars ?? []).some(s => (s.interpretation ?? '').trim().length > 0),
    ),
    [vm],
  );
  const sihuaItems = useMemo(
    () => (vm?.sihua ?? []).filter(s => (s.interpretation ?? '').trim().length > 0),
    [vm],
  );
  const patternItems = useMemo(
    () => (vm?.patterns ?? []).filter(p => (p.interpretation ?? '').trim().length > 0),
    [vm],
  );

  // Tabs only appear when they have content.
  const tabs = useMemo(() => {
    const t: Array<{ id: TabId; label: string }> = [];
    if (starItems.length) t.push({ id: 'stars', label: '主星' });
    if (palaceItems.length) t.push({ id: 'palaces', label: '宮位' });
    if (sihuaItems.length) t.push({ id: 'sihua', label: '四化' });
    if (patternItems.length) t.push({ id: 'patterns', label: '格局' });
    return t;
  }, [starItems, palaceItems, sihuaItems, patternItems]);

  // Keep activeTab valid + default-select first chip per tab.
  useEffect(() => {
    if (tabs.length && !tabs.find(t => t.id === activeTab)) setActiveTab(tabs[0].id);
  }, [tabs, activeTab]);

  useEffect(() => {
    if (activeTab === 'stars' && starItems.length && !starItems.find(s => s.pinyin === selStar)) {
      setSelStar(starItems[0].pinyin);
    }
    if (activeTab === 'palaces' && palaceItems.length && !palaceItems.find(p => p.pinyin === selPalace)) {
      setSelPalace(palaceItems[0].pinyin);
    }
    if (activeTab === 'sihua' && sihuaItems.length) {
      const k = (s: SihuaInterp) => `${s.star_pinyin}_${s.hua_pinyin}`;
      if (!sihuaItems.find(s => k(s) === selSihua)) setSelSihua(k(sihuaItems[0]));
    }
    if (activeTab === 'patterns' && patternItems.length && !patternItems.find(p => p.id === selPattern)) {
      setSelPattern(patternItems[0].id);
    }
  }, [activeTab, starItems, palaceItems, sihuaItems, patternItems, selStar, selPalace, selSihua, selPattern]);

  /* ----- Render ----- */

  if (authLoading) return <div className={styles.loading}>載入中...</div>;
  if (!user) return null;

  const renderStarDetail = () => {
    const s = starItems.find(x => x.pinyin === selStar) ?? starItems[0];
    if (!s) return <EmptyPanel message="尚無主星詳解" />;
    const accent = starColor(s.name);
    return (
      <article style={panelStyle(accent)}>
        <h3 style={titleStyle}>
          <span style={{ color: accent }}>{s.name}</span>
          {s.type && <span style={metaStyle}>{s.type}</span>}
        </h3>
        <Keywords items={s.keywords} accent={accent} />
        <Paragraphs body={s.interpretation} />
      </article>
    );
  };

  const renderPalaceDetail = () => {
    const p = palaceItems.find(x => x.pinyin === selPalace) ?? palaceItems[0];
    if (!p) return <EmptyPanel message="尚無宮位詳解" />;
    const accent = '#c084fc'; // palaces share one accent; stars-in-palace keep their own
    const starsWithText = (p.stars ?? []).filter(st => (st.interpretation ?? '').trim().length > 0);
    return (
      <article style={panelStyle(accent)}>
        <h3 style={titleStyle}>
          {p.name}
          {p.branch && <span style={metaStyle}>{p.branch}宮</span>}
        </h3>
        {/* sihua-in-palace badges */}
        {p.sihua_in_palace && p.sihua_in_palace.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
            {p.sihua_in_palace.map((h, i) => (
              <span
                key={i}
                style={{
                  fontSize: '0.74rem', padding: '0.15rem 0.55rem', borderRadius: 999,
                  background: `${SIHUA_COLOR[h] ?? '#888'}22`,
                  color: SIHUA_COLOR[h] ?? '#ccc',
                  border: `1px solid ${SIHUA_COLOR[h] ?? '#888'}55`,
                }}
              >
                {h}
              </span>
            ))}
          </div>
        )}
        <Keywords items={p.keywords} accent={accent} />
        {p.interpretation?.trim() && <Paragraphs body={p.interpretation} />}

        {/* Per-star placement readings within this palace */}
        {starsWithText.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '0.25rem' }}>
            {starsWithText.map((st) => {
              const sc = starColor(st.name);
              return (
                <div
                  key={st.pinyin}
                  style={{
                    padding: '0.75rem 0.9rem',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 10,
                    borderLeft: `3px solid ${sc}`,
                    display: 'flex', flexDirection: 'column', gap: '0.5rem',
                  }}
                >
                  <div style={{ fontWeight: 600, color: sc }}>{st.name}<span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 400, marginLeft: '0.4rem', fontSize: '0.8rem' }}>入{p.name}</span></div>
                  <Keywords items={st.keywords} accent={sc} />
                  <Paragraphs body={st.interpretation} dim />
                </div>
              );
            })}
          </div>
        )}

        {(p.minor_stars && p.minor_stars.length > 0) && (
          <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>
            輔星：{p.minor_stars.join('、')}
          </div>
        )}
      </article>
    );
  };

  const renderSihuaDetail = () => {
    const k = (s: SihuaInterp) => `${s.star_pinyin}_${s.hua_pinyin}`;
    const s = sihuaItems.find(x => k(x) === selSihua) ?? sihuaItems[0];
    if (!s) return <EmptyPanel message="尚無四化詳解" />;
    const accent = SIHUA_COLOR[s.hua] ?? '#c084fc';
    return (
      <article style={panelStyle(accent)}>
        <h3 style={titleStyle}>
          {s.star}
          <span style={{ color: accent, marginLeft: '0.4rem' }}>{s.hua}</span>
        </h3>
        <Keywords items={s.keywords} accent={accent} />
        <Paragraphs body={s.interpretation} />
      </article>
    );
  };

  const renderPatternDetail = () => {
    const p = patternItems.find(x => x.id === selPattern) ?? patternItems[0];
    if (!p) return <EmptyPanel message="尚無格局詳解" />;
    const accent = patternIsCaution(p) ? '#f87171' : '#f5b942';
    return (
      <article style={panelStyle(accent)}>
        <h3 style={titleStyle}><span style={{ color: accent }}>{p.name}</span></h3>
        <Keywords items={p.keywords} accent={accent} />
        <Paragraphs body={p.interpretation} />
      </article>
    );
  };

  const needGender = hasBirthInfo && !birthInfo?.gender;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/dashboard" style={{ color: 'inherit', textDecoration: 'none' }}>
          ← 返回
        </Link>
        <h1 style={{ marginTop: '1rem' }}>紫微斗數</h1>
        {vm?.calculation_method && (
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.25rem' }}>
            計算方式: {vm.calculation_method}
          </p>
        )}
      </header>

      {!hasBirthInfo ? (
        <div className={styles.setupBanner}>
          <p>尚未設定出生資料</p>
          <Link href="/dashboard/settings" className={styles.setupBtn}>設定出生資料</Link>
        </div>
      ) : needGender ? (
        <div className={styles.setupBanner}>
          <p>紫微斗數需要性別資訊</p>
          <Link href="/dashboard/settings" className={styles.setupBtn}>補充性別</Link>
        </div>
      ) : dataLoading ? (
        <div className={styles.loading}>正在排盤...</div>
      ) : error ? (
        <div className={styles.setupBanner}>
          <p>{error}</p>
          <button onClick={fetchData} className={styles.setupBtn}>重試</button>
        </div>
      ) : vm ? (
        <>
          {/* === Chart basics (orientational header) === */}
          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))',
              gap: '0.6rem',
              marginBottom: '1.5rem',
            }}
          >
            {[
              { label: '農曆', value: vm.basics.lunar_date },
              { label: '命宮', value: vm.basics.ming_gong_branch ? `${vm.basics.ming_gong_branch}宮` : undefined },
              { label: '身宮', value: vm.basics.shen_gong_branch ? `${vm.basics.shen_gong_branch}宮` : undefined },
              { label: '五行局', value: vm.basics.wu_xing_ju },
              { label: '命主', value: vm.basics.soul_star },
              { label: '身主', value: vm.basics.body_star },
            ].filter(c => c.value).map((c, i) => (
              <div
                key={i}
                style={{
                  padding: '0.7rem 0.6rem',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: 12,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>{c.label}</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 600, marginTop: '0.2rem' }}>{c.value}</div>
              </div>
            ))}
          </section>

          {/* === Tabs === */}
          <nav style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
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
                    borderBottom: active ? '2px solid #c084fc' : '2px solid transparent',
                    color: active ? '#c084fc' : 'rgba(255,255,255,0.6)',
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

          {/* === Tab body === */}
          {tabs.length === 0 && (
            <EmptyPanel message="尚無詳解資料 — 命盤已排出，但詳細解析尚在準備中，請稍後重新排盤。" />
          )}

          {activeTab === 'stars' && starItems.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={chipRowStyle}>
                {starItems.map((s) => (
                  <Chip
                    key={s.pinyin}
                    active={selStar === s.pinyin}
                    accent={starColor(s.name)}
                    label={s.name}
                    onClick={() => setSelStar(s.pinyin)}
                  />
                ))}
              </div>
              {renderStarDetail()}
            </div>
          )}

          {activeTab === 'palaces' && palaceItems.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={chipRowStyle}>
                {palaceItems.map((p) => (
                  <Chip
                    key={p.pinyin}
                    active={selPalace === p.pinyin}
                    accent="#c084fc"
                    label={p.name}
                    sublabel={p.stars && p.stars.length ? p.stars.map(st => st.name).join('·') : (p.branch ? `${p.branch}宮` : undefined)}
                    onClick={() => setSelPalace(p.pinyin)}
                  />
                ))}
              </div>
              {renderPalaceDetail()}
            </div>
          )}

          {activeTab === 'sihua' && sihuaItems.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={chipRowStyle}>
                {sihuaItems.map((s) => {
                  const key = `${s.star_pinyin}_${s.hua_pinyin}`;
                  const accent = SIHUA_COLOR[s.hua] ?? '#c084fc';
                  return (
                    <Chip
                      key={key}
                      active={selSihua === key}
                      accent={accent}
                      label={s.star}
                      sublabel={s.hua}
                      onClick={() => setSelSihua(key)}
                    />
                  );
                })}
              </div>
              {renderSihuaDetail()}
            </div>
          )}

          {activeTab === 'patterns' && patternItems.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={chipRowStyle}>
                {patternItems.map((p) => {
                  const accent = patternIsCaution(p) ? '#f87171' : '#f5b942';
                  return (
                    <Chip
                      key={p.id}
                      active={selPattern === p.id}
                      accent={accent}
                      label={p.name}
                      onClick={() => setSelPattern(p.id)}
                    />
                  );
                })}
              </div>
              {renderPatternDetail()}
            </div>
          )}

          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <button
              onClick={fetchData}
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
              {dataLoading ? '計算中...' : '重新排盤'}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

/* ----- shared inline styles ----- */
const chipRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  overflowX: 'auto',
  paddingBottom: '0.4rem',
  scrollbarWidth: 'thin',
};

function panelStyle(accent: string): React.CSSProperties {
  return {
    padding: '1.15rem 1.2rem',
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.08)',
    borderLeft: `3px solid ${accent}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  };
}

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '1.1rem',
  fontWeight: 600,
  display: 'flex',
  alignItems: 'baseline',
  gap: '0.5rem',
  flexWrap: 'wrap',
};

const metaStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: 'rgba(255,255,255,0.6)',
  fontWeight: 400,
};

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getManualDetail, type DetailSystem, type DetailResponse } from '@/lib/api';
import { useAuth } from './AuthContext';
import { LoginModal } from './LoginModal';
// Token now in httpOnly cookie - no need to pass explicitly
import { NatalChart } from './charts/NatalChart';
import { BodyGraph } from './charts/BodyGraph';
import { ChartDetailDrawer, type ChartDetail } from './ChartDetailDrawer';
import styles from './DetailPage.module.css';

// Map Chinese zodiac sign -> English lowercase key, used both for theme
// tinting (`data-sign`) and as a fallback identifier for the drawer.
const CN_SIGN_TO_EN: Record<string, string> = {
  '牡羊座': 'aries', '金牛座': 'taurus', '雙子座': 'gemini', '巨蟹座': 'cancer',
  '獅子座': 'leo', '處女座': 'virgo', '天秤座': 'libra', '天蠍座': 'scorpio',
  '射手座': 'sagittarius', '摩羯座': 'capricorn', '水瓶座': 'aquarius', '雙魚座': 'pisces',
};

interface Props {
  manualId: string;
}

// 命理四系統 (需要出生資料)
const DESTINY_SYSTEMS: { key: DetailSystem; label: string; icon: string }[] = [
  { key: 'western', label: '西洋占星', icon: '☉' },
  { key: 'bazi', label: '八字命理', icon: '八' },
  { key: 'ziwei', label: '紫微斗數', icon: '紫' },
  { key: 'human_design', label: '人類圖', icon: '◈' },
];

// 即時占卜 (獨立功能，不需要出生資料)
const INSTANT_DIVINATION = [
  { key: 'tarot', label: '塔羅牌', icon: '🃏', href: '/dashboard/divination/tarot' },
  { key: 'meihua', label: '梅花易數', icon: '☯', href: '/dashboard/divination/meihua' },
];

const PSYCHOLOGY_TESTS = [
  { key: 'bigfive', label: 'Big Five 人格', icon: '5', href: '/dashboard/psychology/bigfive' },
  { key: 'mbti', label: 'MBTI 16型', icon: 'M', href: '/dashboard/psychology/mbti' },
  { key: 'enneagram', label: '九型人格', icon: '9', href: '/dashboard/psychology/enneagram' },
  { key: 'attachment', label: '依附類型', icon: '♡', href: '/dashboard/psychology/attachment' },
];

const AI_CONSULT = [
  { key: 'chat', label: '開始對話', icon: '💬', href: '/chat' },
];

const LOADING_HINTS: Record<string, string> = {
  western: '推算行星位置與相位...',
  bazi: '排列四柱八字與十神...',
  ziwei: '安星佈局十二宮...',
  human_design: '計算能量中心與通道...',
};

export function DetailPage({ manualId }: Props) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState<DetailSystem>('western');
  const [results, setResults] = useState<Record<string, { data?: DetailResponse; loading: boolean; error?: string }>>({});
  const [needLogin, setNeedLogin] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Load data for selected system
  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated) {
      setNeedLogin(true);
      return;
    }

    // If already have data for this system, skip
    if (results[selectedSystem]?.data || results[selectedSystem]?.loading) return;

    // Start loading this system
    setResults(prev => ({ ...prev, [selectedSystem]: { loading: true } }));

    // Uses httpOnly cookie for auth
    getManualDetail(manualId, selectedSystem)
      .then(data => {
        setResults(prev => ({ ...prev, [selectedSystem]: { data, loading: false } }));
      })
      .catch(err => {
        if (err.message === 'NEED_LOGIN') {
          setNeedLogin(true);
        }
        setResults(prev => ({ ...prev, [selectedSystem]: { loading: false, error: err.message } }));
      });
  }, [manualId, selectedSystem, isAuthenticated, authLoading, results]);

  const handleLoginSuccess = () => {
    setNeedLogin(false);
    window.location.reload();
  };

  const handleSystemChange = (key: DetailSystem) => {
    setSelectedSystem(key);
    setSidebarOpen(false); // Close mobile sidebar on selection
  };

  // Show login prompt if not authenticated
  if (needLogin && !isAuthenticated) {
    return (
      <div className={styles.page}>
        <div className={styles.meshBg}><div className={styles.orbPurple} /></div>
        
        <header className={styles.header}>
          <Link href={`/manual/${manualId}`} className={styles.back}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 15l-5-5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            返回說明書
          </Link>
        </header>

        <main className={styles.main}>
          <div className={styles.loginPrompt}>
            <h2>登入解鎖完整解讀</h2>
            <p>詳細的五大系統命盤分析需要登入後才能查看</p>
            <button 
              className="btn btn-primary" 
              onClick={() => setShowLogin(true)}
            >
              登入 / 註冊
            </button>
          </div>
        </main>

        <LoginModal 
          isOpen={showLogin} 
          onClose={() => setShowLogin(false)} 
          onSuccess={handleLoginSuccess}
        />
      </div>
    );
  }

  const currentState = results[selectedSystem];
  const currentSystemInfo = DESTINY_SYSTEMS.find(s => s.key === selectedSystem);

  return (
    <div className={styles.page}>
      <div className={styles.meshBg}><div className={styles.orbPurple} /></div>

      {/* Mobile header with menu button */}
      <header className={styles.header}>
        <Link href={`/manual/${manualId}`} className={styles.back}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 15l-5-5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          返回說明書
        </Link>
        <button 
          className={styles.menuBtn}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </header>

      <div className={styles.layout}>
        {/* Sidebar */}
        <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
          <div className={styles.sidebarHeader}>
            <h2>詳細解讀</h2>
            <p>完整分析與測驗</p>
          </div>
          <nav className={styles.sidebarNav}>
            {/* 命理系統 */}
            <div className={styles.navSection}>
              <h3 className={styles.navSectionTitle}>命理系統</h3>
              {DESTINY_SYSTEMS.map(({ key, label, icon }) => {
                const state = results[key];
                const isActive = key === selectedSystem;
                const hasData = state?.data;
                const isLoading = state?.loading;
                const hasError = state?.error;
                
                return (
                  <button
                    key={key}
                    className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                    onClick={() => handleSystemChange(key)}
                  >
                    <span className={styles.navIcon}>{icon}</span>
                    <span className={styles.navLabel}>{label}</span>
                    <span className={styles.navStatus}>
                      {isLoading && <span className={styles.statusDot} />}
                      {hasData && <span className={styles.statusCheck}>✓</span>}
                      {hasError && <span className={styles.statusError}>!</span>}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 即時占卜 */}
            <div className={styles.navSection}>
              <h3 className={styles.navSectionTitle}>即時占卜</h3>
              {INSTANT_DIVINATION.map(({ key, label, icon, href }) => (
                <Link
                  key={key}
                  href={href}
                  className={styles.navItem}
                >
                  <span className={styles.navIcon}>{icon}</span>
                  <span className={styles.navLabel}>{label}</span>
                  <span className={styles.navArrow}>→</span>
                </Link>
              ))}
            </div>

            {/* 心理測驗 */}
            <div className={styles.navSection}>
              <h3 className={styles.navSectionTitle}>心理測驗</h3>
              {PSYCHOLOGY_TESTS.map(({ key, label, icon, href }) => (
                <Link
                  key={key}
                  href={href}
                  className={styles.navItem}
                >
                  <span className={styles.navIcon}>{icon}</span>
                  <span className={styles.navLabel}>{label}</span>
                  <span className={styles.navArrow}>→</span>
                </Link>
              ))}
            </div>

            {/* AI 諮詢 */}
            <div className={styles.navSection}>
              <h3 className={styles.navSectionTitle}>AI 諮詢</h3>
              {AI_CONSULT.map(({ key, label, icon, href }) => (
                <Link
                  key={key}
                  href={href}
                  className={styles.navItem}
                >
                  <span className={styles.navIcon}>{icon}</span>
                  <span className={styles.navLabel}>{label}</span>
                  <span className={styles.navArrow}>→</span>
                </Link>
              ))}
            </div>
          </nav>
          <div className={styles.sidebarFooter}>
            <p className={styles.footerNote}>
              命理為 AI 推估結果，心理測驗基於科學量表
            </p>
          </div>
        </aside>

        {/* Backdrop for mobile */}
        {sidebarOpen && (
          <div className={styles.backdrop} onClick={() => setSidebarOpen(false)} />
        )}

        {/* Main content */}
        <main className={styles.content}>
          {/* Current system card */}
          {!currentState || currentState.loading ? (
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>{currentSystemInfo?.label}</h2>
              <div className={styles.cardLoading}>
                <div className={styles.loadingHeader}>
                  <div className={styles.loadingDot} />
                  <span>{LOADING_HINTS[selectedSystem] || '正在解讀...'}</span>
                </div>
                <div>
                  <div className={`${styles.skeleton} ${styles.skeletonPill}`} />
                  <div className={`${styles.skeleton} ${styles.skeletonPill}`} />
                  <div className={`${styles.skeleton} ${styles.skeletonPill}`} />
                </div>
                <div>
                  <div className={`${styles.skeleton} ${styles.skeletonLine}`} />
                  <div className={`${styles.skeleton} ${styles.skeletonLine}`} />
                  <div className={`${styles.skeleton} ${styles.skeletonLine}`} />
                  <div className={`${styles.skeleton} ${styles.skeletonLine}`} />
                </div>
              </div>
            </section>
          ) : currentState.error ? (
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>{currentSystemInfo?.label}</h2>
              <p className={styles.cardError}>載入失敗：{currentState.error}</p>
              <button 
                className="btn btn-ghost"
                onClick={() => {
                  setResults(prev => {
                    const next = { ...prev };
                    delete next[selectedSystem];
                    return next;
                  });
                }}
              >
                重試
              </button>
            </section>
          ) : (
            <section className={`${styles.card} ${styles.cardReady}`}>
              <h2 className={styles.cardTitle}>{currentSystemInfo?.label}</h2>
              {selectedSystem === 'western' && <WesternRender data={currentState.data?.data as Record<string, unknown>} />}
              {selectedSystem === 'bazi' && <BaziRender data={currentState.data?.data as Record<string, unknown>} />}
              {selectedSystem === 'ziwei' && <ZiweiRender data={currentState.data?.data as Record<string, unknown>} />}
              {selectedSystem === 'human_design' && <HumanDesignRender data={currentState.data?.data as Record<string, unknown>} />}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

/* ========== RENDER HELPERS ========== */

// Western Astrology Render Component (with interactive chart)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function WesternRender({ data }: { data: any }) {
  const asc = data.ascendant;
  const mc = data.midheaven;
  const interpretations = data.interpretations || {};

  // Backend now returns `interpretations.planets: PlanetInterpretation[]`
  // with full text + keywords + ruler_sign per placement. Match by Chinese name.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aiPlanets: any[] = Array.isArray(interpretations.planets) ? interpretations.planets : [];
  const planetInterpByName = new Map<string, Record<string, unknown>>();
  for (const ap of aiPlanets) {
    if (ap && typeof ap.name === 'string') planetInterpByName.set(ap.name, ap);
  }

  // Merge structured placement + interpretation onto each planet entry.
  const planets = (data.planets || []).map((p: Record<string, unknown>) => {
    const interp = planetInterpByName.get(p.name as string);
    return {
      ...p,
      interpretation: (interp?.interpretation as string) || (p.interpretation as string) || '',
      keywords: (interp?.keywords as string[] | undefined) ?? [],
      ruler_sign: (interp?.ruler_sign as string | undefined),
      in_sign_detail: (interp?.in_sign_detail as string | undefined),
      in_house_detail: (interp?.in_house_detail as string | undefined),
      category: (interp?.category as string | undefined),
    };
  });

  const aspects = data.aspects || [];
  // Inline aspect interpretations from interpretations.aspects[] (matched by key).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aiAspects: any[] = Array.isArray(interpretations.aspects) ? interpretations.aspects : [];
  const aspectInterpByKey = new Map<string, Record<string, unknown>>();
  for (const aa of aiAspects) {
    if (!aa) continue;
    const k = (aa.key as string) || `${aa.planet1}-${aa.aspect}-${aa.planet2}`;
    aspectInterpByKey.set(k, aa);
  }
  const aspectsMerged = aspects.map((a: Record<string, unknown>) => {
    const k = `${a.planet1}-${a.type || a.aspect}-${a.planet2}`;
    const interp = aspectInterpByKey.get(k);
    return {
      ...a,
      interpretation: (interp?.interpretation as string) || (a.interpretation as string) || '',
    };
  });

  return (
    <WesternRenderInner
      asc={asc}
      ascInterp={interpretations.ascendant}
      mc={mc}
      planets={planets}
      aspects={aspectsMerged}
      stelliums={data.stelliums}
      chartPattern={data.chart_pattern || data.patterns?.map((p: { name?: string; name_cn?: string }) => p.name || p.name_cn).filter(Boolean).join('、')}
      dominantElement={data.dominant_element}
      summary={interpretations.general_overview || interpretations.summary || data.summary}
    />
  );
}

// Inner component to use hooks properly
function WesternRenderInner({ asc, ascInterp, mc, planets, aspects, stelliums, chartPattern, dominantElement, summary }: {
  asc: { sign: string; degree?: string } | undefined;
  ascInterp?: { interpretation?: string; keywords?: string[] };
  mc: { sign: string; degree?: string } | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  planets: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  aspects: any[];
  stelliums?: string;
  chartPattern?: string;
  dominantElement?: string;
  summary?: string;
}) {
  const [selectedDetail, setSelectedDetail] = useState<ChartDetail | null>(null);

  // Handle planet click - show detail drawer.
  // All text now comes from backend (interpretations.planets[]) — no hardcoded fallback.
  const handlePlanetClick = useCallback((planet: { name: string; sign: string; degree: string | number; house: number; retrograde?: boolean; interpretation?: string }) => {
    // Find the merged planet entry (carries interpretation/keywords/ruler_sign from API).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const merged = planets.find((p: any) => p.name === planet.name) ?? planet;
    const detailParts: string[] = [];
    if (merged.in_sign_detail) detailParts.push(merged.in_sign_detail as string);
    if (merged.in_house_detail) detailParts.push(merged.in_house_detail as string);

    // Theme sign: prefer backend's ruler_sign, fall back to placement sign.
    const themeSign = (merged.ruler_sign as string | undefined)?.toLowerCase()
      ?? CN_SIGN_TO_EN[planet.sign];

    setSelectedDetail({
      type: 'planet',
      id: (planet.name || '').toLowerCase(),
      title: `${planet.name} in ${planet.sign}`,
      subtitle: `第${planet.house}宮 · ${planet.degree}${planet.retrograde ? ' (逆行)' : ''}`,
      category: (merged.category as string | undefined) ?? '行星',
      keywords: (merged.keywords as string[] | undefined) ?? [],
      description: detailParts.join('\n\n') || (merged.interpretation as string | undefined) || '',
      interpretation: detailParts.length > 0 ? (merged.interpretation as string | undefined) : undefined,
      advice: planet.retrograde ? '逆行期間適合回顧和反思相關主題，而非開始新事物。' : undefined,
      sign: themeSign,
    });
  }, [planets]);

  // Handle sign click - show detail drawer. If clicked sign is the Asc,
  // show ascendant interpretation (from API); otherwise open a minimal
  // themed drawer (theme via data-sign on overlay).
  const handleSignClick = useCallback((signName: string) => {
    const signKey = CN_SIGN_TO_EN[signName] ?? signName.toLowerCase();
    if (ascInterp?.interpretation && asc?.sign === signName) {
      setSelectedDetail({
        type: 'sign',
        id: signKey,
        title: `上升 ${signName}`,
        subtitle: asc.degree,
        keywords: ascInterp.keywords ?? [],
        description: ascInterp.interpretation,
        sign: signKey,
      });
      return;
    }
    setSelectedDetail({
      type: 'sign',
      id: signKey,
      title: signName,
      description: '',
      sign: signKey,
    });
  }, [asc, ascInterp]);

  return (
    <div className={styles.systemContent}>
      {/* Detail Drawer */}
      <ChartDetailDrawer 
        detail={selectedDetail} 
        onClose={() => setSelectedDetail(null)} 
      />

      {/* Natal Chart SVG - Interactive */}
      {planets.length > 0 && (
        <div className={styles.chartContainer}>
          <NatalChart 
            planets={planets} 
            ascendant={asc}
            onPlanetClick={handlePlanetClick}
            onSignClick={handleSignClick}
          />
        </div>
      )}

      {/* Ascendant + MC */}
      <div className={styles.subSection}>
        <h3>基本軸點</h3>
        <div className={styles.rowPair}>
          {asc && <DataPill label="上升星座" value={`${asc.sign} ${asc.degree || ''}`} />}
          {mc && <DataPill label="天頂 MC" value={`${mc.sign} ${mc.degree || ''}`} />}
        </div>
      </div>

      {/* Planets */}
      <div className={styles.subSection}>
        <h3>行星位置</h3>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr><th>行星</th><th>星座</th><th>度數</th><th>宮位</th><th>逆行</th></tr>
            </thead>
            <tbody>
              {planets.map((p: Record<string, unknown>, i: number) => (
                <tr key={i}>
                  <td className={styles.tdBold}>{p.name as string}</td>
                  <td>{p.sign as string}</td>
                  <td>{p.degree as string}</td>
                  <td>第 {p.house as number} 宮</td>
                  <td>{p.retrograde ? 'R' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {planets.map((p: Record<string, unknown>, i: number) => (
          p.interpretation ? <p key={i} className={styles.interpLine}><strong>{p.name as string}</strong>：{p.interpretation as string}</p> : null
        ))}
      </div>

      {/* Aspects */}
      <div className={styles.subSection}>
        <h3>主要相位</h3>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr><th>行星 1</th><th>相位</th><th>行星 2</th><th>容許度</th></tr>
            </thead>
            <tbody>
              {aspects.map((a: Record<string, unknown>, i: number) => (
                <tr key={i}>
                  <td>{a.planet1 as string}</td>
                  <td className={styles.tdBold}>{a.type as string}</td>
                  <td>{a.planet2 as string}</td>
                  <td>{a.orb as string}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {aspects.map((a: Record<string, unknown>, i: number) => (
          a.interpretation ? <p key={i} className={styles.interpLine}><strong>{a.planet1 as string} {a.type as string} {a.planet2 as string}</strong>：{a.interpretation as string}</p> : null
        ))}
      </div>

      {stelliums && <Para label="群星聚集" text={stelliums} />}
      {chartPattern && <Para label="星盤格局" text={chartPattern} />}
      {dominantElement && <Para label="主導元素" text={dominantElement} />}
      {summary && <Para label="總結" text={summary} />}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BaziRender({ data }: { data: any }) {
  const pillars = data.pillars || {};
  const dm = data.day_master || {};
  const fe = data.five_elements || {};
  const tg = data.ten_gods || [];
  const ug = data.useful_god || {};
  const uf = data.unfavorable || {};
  const dy = data.da_yun || [];

  return (
    <div className={styles.systemContent}>
      {/* Four Pillars */}
      <div className={styles.subSection}>
        <h3>四柱八字</h3>
        <div className={styles.pillarsGrid}>
          {['year', 'month', 'day', 'hour'].map(key => {
            const p = pillars[key];
            if (!p) return null;
            const labels: Record<string, string> = { year: '年柱', month: '月柱', day: '日柱', hour: '時柱' };
            return (
              <div key={key} className={styles.pillarCard}>
                <span className={styles.pillarLabel}>{labels[key]}</span>
                <span className={styles.pillarStemBranch}>{p.stem}{p.branch}</span>
                <span className={styles.pillarHidden}>藏干：{(p.hidden_stems || []).join('、')}</span>
                {p.nayin && <span className={styles.pillarNayin}>納音：{p.nayin}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Day Master */}
      <div className={styles.subSection}>
        <h3>日主分析</h3>
        <div className={styles.rowPair}>
          <DataPill label="日主" value={dm.element || ''} />
          <DataPill label="強弱" value={dm.strength || ''} />
        </div>
        {dm.analysis && <p className={styles.analysis}>{dm.analysis}</p>}
      </div>

      {/* Five Elements */}
      <div className={styles.subSection}>
        <h3>五行分布</h3>
        <div className={styles.elementsRow}>
          {['木', '火', '土', '金', '水'].map(el => (
            <div key={el} className={styles.elementItem}>
              <span className={styles.elementName}>{el}</span>
              <span className={styles.elementCount}>{fe[el] ?? 0}</span>
            </div>
          ))}
        </div>
        {fe.analysis && <p className={styles.analysis}>{fe.analysis}</p>}
      </div>

      {/* Ten Gods */}
      {tg.length > 0 && (
        <div className={styles.subSection}>
          <h3>十神</h3>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>十神</th><th>位置</th><th>柱位</th></tr></thead>
              <tbody>
                {tg.map((g: Record<string, unknown>, i: number) => (
                  <tr key={i}>
                    <td className={styles.tdBold}>{g.god as string}</td>
                    <td>{g.stem_or_branch as string}</td>
                    <td>{g.pillar as string}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {tg.map((g: Record<string, unknown>, i: number) => (
            g.interpretation ? <p key={i} className={styles.interpLine}><strong>{g.god as string}</strong>：{g.interpretation as string}</p> : null
          ))}
        </div>
      )}

      {/* Useful God */}
      {ug.god && (
        <div className={styles.subSection}>
          <h3>用神與忌神</h3>
          <div className={styles.rowPair}>
            <DataPill label="用神" value={`${ug.god}（${ug.element || ''}）`} />
            {uf.element && <DataPill label="忌神" value={uf.element} />}
          </div>
          {ug.reasoning && <p className={styles.analysis}>{ug.reasoning}</p>}
          {uf.reasoning && <p className={styles.analysis}>{uf.reasoning}</p>}
        </div>
      )}

      {/* Da Yun */}
      {dy.length > 0 && (
        <div className={styles.subSection}>
          <h3>大運</h3>
          {dy.map((d: Record<string, unknown>, i: number) => (
            <div key={i} className={styles.daYunRow}>
              <span className={styles.daYunAge}>{d.age_range as string}</span>
              <span className={styles.daYunSB}>{d.stem_branch as string}</span>
              <span className={styles.daYunInterp}>{d.interpretation as string}</span>
            </div>
          ))}
        </div>
      )}

      {data.summary && <Para label="總結" text={data.summary} />}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ZiweiRender({ data }: { data: any }) {
  const info = data.ming_pan_info || {};
  const palaces = data.palaces || [];

  return (
    <div className={styles.systemContent}>
      <div className={styles.subSection}>
        <h3>命盤基本資訊</h3>
        {data.lunar_date && <DataPill label="農曆" value={data.lunar_date} />}
        <div className={styles.rowPair}>
          {info.yin_yang && <DataPill label="陰陽" value={info.yin_yang} />}
          {info.wu_xing_ju && <DataPill label="五行局" value={info.wu_xing_ju} />}
          {info.ming_zhu && <DataPill label="命主" value={info.ming_zhu} />}
          {info.shen_zhu && <DataPill label="身主" value={info.shen_zhu} />}
        </div>
      </div>

      {/* Palaces */}
      <div className={styles.subSection}>
        <h3>十二宮</h3>
        {palaces.map((p: Record<string, unknown>, i: number) => (
          <div key={i} className={styles.palaceBlock}>
            <div className={styles.palaceHeader}>
              <span className={styles.palaceName}>{p.name as string}</span>
              <span className={styles.palaceBranch}>{p.branch as string}</span>
            </div>
            <div className={styles.palaceStars}>
              {((p.major_stars as string[]) || []).length > 0 && (
                <span className={styles.majorStars}>主星：{(p.major_stars as string[]).join('、')}</span>
              )}
              {((p.minor_stars as string[]) || []).length > 0 && (
                <span className={styles.minorStars}>輔星：{(p.minor_stars as string[]).join('、')}</span>
              )}
              {((p.si_hua as string[]) || []).length > 0 && (
                <span className={styles.siHua}>四化：{(p.si_hua as string[]).join('、')}</span>
              )}
            </div>
            {p.interpretation ? <p className={styles.palaceInterp}>{String(p.interpretation)}</p> : null}
          </div>
        ))}
      </div>

      {data.key_patterns && <Para label="關鍵格局" text={data.key_patterns} />}
      {data.summary && <Para label="總結" text={data.summary} />}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function HumanDesignRender({ data }: { data: any }) {
  const type = data.type || {};
  const strategy = data.strategy || {};
  const authority = data.authority || {};
  const profile = data.profile || {};
  const centers = data.centers || [];
  const channels = data.channels || [];
  const gates = data.key_gates || [];

  return (
    <div className={styles.systemContent}>
      {/* Body Graph SVG */}
      {centers.length > 0 && (
        <div className={styles.chartContainer}>
          <BodyGraph centers={centers} channels={channels} />
        </div>
      )}

      {/* Core */}
      <div className={styles.subSection}>
        <h3>核心資訊</h3>
        <div className={styles.rowPair}>
          <DataPill label="類型" value={type.name || ''} />
          <DataPill label="策略" value={strategy.name || ''} />
          <DataPill label="內在權威" value={authority.name || ''} />
          <DataPill label="人生角色" value={profile.numbers || ''} />
        </div>
        {data.definition && <DataPill label="定義" value={data.definition} />}
        <div className={styles.rowPair}>
          {data.not_self_theme && <DataPill label="非自己主題" value={data.not_self_theme} />}
          {data.signature && <DataPill label="標記" value={data.signature} />}
        </div>
        {data.incarnation_cross && <p className={styles.analysis}>人生十字：{data.incarnation_cross}</p>}
        {type.description && <p className={styles.analysis}>{type.description}</p>}
        {strategy.description && <p className={styles.analysis}>{strategy.description}</p>}
        {authority.description && <p className={styles.analysis}>{authority.description}</p>}
        {profile.description && <p className={styles.analysis}>{profile.description}</p>}
      </div>

      {/* Centers */}
      {centers.length > 0 && (
        <div className={styles.subSection}>
          <h3>九大能量中心</h3>
          <div className={styles.centersGrid}>
            {centers.map((c: Record<string, unknown>, i: number) => (
              <div key={i} className={`${styles.centerItem} ${c.defined ? styles.centerDefined : styles.centerOpen}`}>
                <span className={styles.centerName}>{c.name as string}</span>
                <span className={styles.centerStatus}>{c.defined ? '有定義' : '開放'}</span>
                {c.interpretation ? <p className={styles.centerInterp}>{String(c.interpretation)}</p> : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Channels */}
      {channels.length > 0 && (
        <div className={styles.subSection}>
          <h3>通道</h3>
          {channels.map((ch: Record<string, unknown>, i: number) => (
            <div key={i} className={styles.channelRow}>
              <div className={styles.channelHeader}>
                <span className={styles.channelGates}>{ch.gate1 as number}-{ch.gate2 as number}</span>
                <span className={styles.channelName}>{ch.name as string}</span>
                <span className={styles.channelType}>{ch.type as string}</span>
              </div>
              {ch.interpretation ? <p className={styles.channelInterp}>{String(ch.interpretation)}</p> : null}
            </div>
          ))}
        </div>
      )}

      {/* Gates */}
      {gates.length > 0 && (
        <div className={styles.subSection}>
          <h3>重要閘門</h3>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>閘門</th><th>名稱</th><th>爻</th><th>中心</th><th>懸掛</th></tr></thead>
              <tbody>
                {gates.map((g: Record<string, unknown>, i: number) => (
                  <tr key={i}>
                    <td className={styles.tdBold}>{g.number as number}</td>
                    <td>{g.name as string}</td>
                    <td>{g.line as number}</td>
                    <td>{g.center as string}</td>
                    <td>{g.hanging ? '是' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {gates.map((g: Record<string, unknown>, i: number) => (
            g.interpretation ? <p key={i} className={styles.interpLine}><strong>閘門 {g.number as number}</strong>：{g.interpretation as string}</p> : null
          ))}
        </div>
      )}

      {data.summary && <Para label="總結" text={data.summary} />}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MeihuaRender({ data }: { data: any }) {
  const deriv = data.derivation || {};
  const upper = data.upper_trigram || {};
  const lower = data.lower_trigram || {};
  const hex = data.hexagram || {};
  const cl = data.changing_line || {};
  const changed = data.changed_hexagram || {};
  const ty = data.ti_yong || {};
  const hu = data['互卦'] || data.hu_gua || {};

  return (
    <div className={styles.systemContent}>
      {/* Derivation */}
      <div className={styles.subSection}>
        <h3>起卦過程</h3>
        {deriv.method && <p className={styles.analysis}>{deriv.method}</p>}
      </div>

      {/* Trigrams */}
      <div className={styles.subSection}>
        <h3>卦象</h3>
        <div className={styles.rowPair}>
          <DataPill label="上卦" value={`${upper.name || ''} (${upper.element || ''})`} />
          <DataPill label="下卦" value={`${lower.name || ''} (${lower.element || ''})`} />
        </div>
        {hex.name && <DataPill label="本卦" value={`${hex.name}（第${hex.number || '?'}卦）`} />}
        {hex.gua_ci && <p className={styles.quoteBlock}>{hex.gua_ci}</p>}
        {hex.interpretation && <p className={styles.analysis}>{hex.interpretation}</p>}
      </div>

      {/* Changing line */}
      <div className={styles.subSection}>
        <h3>動爻（第 {cl.position || '?'} 爻）</h3>
        {cl.yao_ci && <p className={styles.quoteBlock}>{cl.yao_ci}</p>}
        {cl.interpretation && <p className={styles.analysis}>{cl.interpretation}</p>}
      </div>

      {/* Changed hexagram */}
      <div className={styles.subSection}>
        <h3>變卦</h3>
        {changed.name && <DataPill label="變卦" value={`${changed.name}（第${changed.number || '?'}卦）`} />}
        {changed.interpretation && <p className={styles.analysis}>{changed.interpretation}</p>}
      </div>

      {/* Ti-Yong */}
      <div className={styles.subSection}>
        <h3>體用分析</h3>
        <div className={styles.rowPair}>
          {ty.ti && <DataPill label="體卦" value={`${ty.ti} (${ty.ti_element || ''})`} />}
          {ty.yong && <DataPill label="用卦" value={`${ty.yong} (${ty.yong_element || ''})`} />}
          {ty.relationship && <DataPill label="體用關係" value={ty.relationship} />}
        </div>
        {ty.analysis && <p className={styles.analysis}>{ty.analysis}</p>}
      </div>

      {/* Hu gua */}
      {hu.name && (
        <div className={styles.subSection}>
          <h3>互卦</h3>
          <DataPill label="互卦" value={hu.name} />
          {hu.interpretation && <p className={styles.analysis}>{hu.interpretation}</p>}
        </div>
      )}

      {data.overall_reading && <Para label="綜合解讀" text={data.overall_reading} />}
      {data.life_advice && <Para label="建議" text={data.life_advice} />}
    </div>
  );
}

/* ========== SHARED COMPONENTS ========== */

function DataPill({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.dataPill}>
      <span className={styles.pillLabel}>{label}</span>
      <span className={styles.pillValue}>{value}</span>
    </div>
  );
}

function Para({ label, text }: { label: string; text: string }) {
  return (
    <div className={styles.paraBlock}>
      <h3>{label}</h3>
      <p>{text}</p>
    </div>
  );
}

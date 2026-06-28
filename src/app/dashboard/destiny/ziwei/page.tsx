'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import { getDetailByBirth } from '@/lib/api';
import Link from 'next/link';
import styles from '../destiny.module.css';

/* ============================================================
   Types — backend manual/detail/ziwei → data.interpretations
   { stars, palaces, sihua, patterns } (book-grounded DB)
   ============================================================ */

interface PalaceStarInterp {
  name: string;
  pinyin: string;
  brightness?: string;  // 廟/旺/得地/利/平/不/陷
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
  wu_xing_ju?: string;
  ming_gong_branch?: string;
  shen_gong_branch?: string;
  soul_star?: string;
  body_star?: string;
}

interface ZiweiViewModel {
  basics: ChartBasics;
  palaces: PalaceInterp[];
  sihua: SihuaInterp[];
  patterns: PatternInterp[];
  calculation_method?: string;
}

/* ============================================================
   Constants
   ============================================================ */

// Narrative order — lead with 命宮 (本命個性), then the life areas a
// reader most wants answered, framed from their perspective.
const LIFE_TOPICS: Array<{ pinyin: string; label: string; sub: string; lead: string }> = [
  { pinyin: 'ming', label: '本命・性格本質', sub: '你天生是個什麼樣的人', lead: '你的命宮' },
  { pinyin: 'fuqi', label: '感情・婚姻', sub: '你的感情態度與另一半', lead: '你的夫妻宮' },
  { pinyin: 'guanlu', label: '事業・志向', sub: '適合的舞台與發展', lead: '你的事業宮' },
  { pinyin: 'caibo', label: '財富・理財', sub: '你賺錢與理財的方式', lead: '你的財帛宮' },
  { pinyin: 'qianyi', label: '外出・際遇', sub: '出外運與外在環境', lead: '你的遷移宮' },
  { pinyin: 'tianzhai', label: '家庭・置產', sub: '家庭氛圍與不動產', lead: '你的田宅宮' },
  { pinyin: 'fude', label: '心靈・福分', sub: '精神生活與享受', lead: '你的福德宮' },
  { pinyin: 'jiaoyou', label: '朋友・人脈', sub: '朋友、同事與部屬', lead: '你的交友宮' },
  { pinyin: 'zinv', label: '子女・傳承', sub: '子女緣與創造力', lead: '你的子女宮' },
  { pinyin: 'xiongdi', label: '手足・夥伴', sub: '兄弟姊妹與合作', lead: '你的兄弟宮' },
  { pinyin: 'jiee', label: '健康・體質', sub: '先天體質與保健', lead: '你的疾厄宮' },
  { pinyin: 'fumu', label: '父母・長輩', sub: '與父母、上司的緣分', lead: '你的父母宮' },
];

// 對宮 (opposite palace) — used to explain 空宮 (借對宮) cases.
const OPPOSITE: Record<string, string> = {
  ming: '遷移宮', qianyi: '命宮', xiongdi: '交友宮', jiaoyou: '兄弟宮',
  fuqi: '事業宮', guanlu: '夫妻宮', zinv: '田宅宮', tianzhai: '子女宮',
  caibo: '福德宮', fude: '財帛宮', jiee: '父母宮', fumu: '疾厄宮',
};

const STAR_ELEMENT_COLOR: Record<string, string> = {
  紫微: '#c9a55a', 天府: '#c9a55a', 天梁: '#c9a55a',
  天機: '#8ac08a', 貪狼: '#8ac08a',
  太陽: '#f08c40', 廉貞: '#f08c40',
  武曲: '#b8b8c8', 七殺: '#b8b8c8',
  天同: '#5ad8ff', 太陰: '#7db8ff', 巨門: '#5ad8ff', 天相: '#5ad8ff', 破軍: '#5ad8ff',
};

const SIHUA_COLOR: Record<string, string> = {
  化祿: '#10b981', 化權: '#f59e0b', 化科: '#22d3ee', 化忌: '#ef4444',
};

function starColor(name?: string): string {
  return (name && STAR_ELEMENT_COLOR[name]) ?? '#94a3b8';
}

// 廟旺利陷 → how to frame the star's strength to the reader.
const BRIGHTNESS_INFO: Record<string, { tone: 'bright' | 'mid' | 'weak'; note: string }> = {
  廟: { tone: 'bright', note: '力量發揮到極致，這顆星的優點最能展現' },
  旺: { tone: 'bright', note: '能量旺盛，發揮順暢' },
  得地: { tone: 'bright', note: '落得其位，能穩定發揮' },
  利: { tone: 'mid', note: '尚稱有利，發揮中等偏上' },
  平: { tone: 'mid', note: '力量平平，吉凶皆不極端' },
  不: { tone: 'weak', note: '不得其地，力量較受限' },
  陷: { tone: 'weak', note: '力量微弱，星性的缺點易顯，需後天努力補強' },
};
const BRIGHTNESS_COLOR: Record<'bright' | 'mid' | 'weak', string> = {
  bright: '#10b981', mid: '#9aa4b2', weak: '#f0913e',
};

function BrightnessTag({ level }: { level?: string }) {
  if (!level) return null;
  const info = BRIGHTNESS_INFO[level];
  const color = info ? BRIGHTNESS_COLOR[info.tone] : '#9aa4b2';
  return (
    <span
      title={info?.note}
      style={{
        fontSize: '0.72rem', padding: '0.05rem 0.4rem', borderRadius: 6,
        background: `${color}22`, color, border: `1px solid ${color}55`, fontWeight: 600,
      }}
    >
      {level}
    </span>
  );
}

/* ============================================================
   Small renderers
   ============================================================ */

function Paragraphs({ body, dim = false }: { body: string; dim?: boolean }) {
  const paras = body.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  return (
    <>
      {paras.map((p, i) => (
        <p
          key={i}
          style={{
            margin: 0,
            lineHeight: 1.8,
            color: dim ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.86)',
            fontSize: dim ? '0.88rem' : '0.94rem',
          }}
        >
          {p}
        </p>
      ))}
    </>
  );
}

function KeywordRow({ items, accent }: { items?: string[]; accent: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
      {items.slice(0, 8).map((kw, i) => (
        <span
          key={i}
          style={{
            fontSize: '0.72rem', padding: '0.15rem 0.55rem', borderRadius: 999,
            background: 'rgba(255,255,255,0.06)', color: accent,
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {kw}
        </span>
      ))}
    </div>
  );
}

function SihuaBadges({ items }: { items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
      {items.map((h, i) => (
        <span
          key={i}
          style={{
            fontSize: '0.72rem', padding: '0.1rem 0.5rem', borderRadius: 999,
            background: `${SIHUA_COLOR[h] ?? '#888'}22`, color: SIHUA_COLOR[h] ?? '#ccc',
            border: `1px solid ${SIHUA_COLOR[h] ?? '#888'}55`,
          }}
        >
          {h}
        </span>
      ))}
    </div>
  );
}

/* ============================================================
   Page
   ============================================================ */

export default function ZiweiPage() {
  const { user, birthInfo, hasBirthInfo, loading: authLoading } = useAuth();
  const router = useRouter();
  const [vm, setVm] = useState<ZiweiViewModel | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/');
  }, [user, authLoading, router]);

  const fetchData = useCallback(async () => {
    if (!birthInfo?.birth_date) return;
    setDataLoading(true);
    setError(null);
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
          wu_xing_ju: chart.wu_xing_ju as string | undefined,
          ming_gong_branch: mg.branch,
          shen_gong_branch: sg.branch,
          soul_star: chart.soul_star as string | undefined,
          body_star: chart.body_star as string | undefined,
        },
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

  const palaceByPinyin = useMemo(() => {
    const m = new Map<string, PalaceInterp>();
    for (const p of vm?.palaces ?? []) m.set(p.pinyin, p);
    return m;
  }, [vm]);

  // Sections that actually have something to say (palace exists with meta or star readings).
  const sections = useMemo(() => {
    return LIFE_TOPICS
      .map(t => ({ topic: t, palace: palaceByPinyin.get(t.pinyin) }))
      .filter(s => s.palace && (
        (s.palace.interpretation ?? '').trim()
        || (s.palace.stars ?? []).some(st => (st.interpretation ?? '').trim())
      ));
  }, [palaceByPinyin]);

  const sihuaItems = useMemo(
    () => (vm?.sihua ?? []).filter(s => (s.interpretation ?? '').trim().length > 0),
    [vm],
  );
  const patternItems = useMemo(
    () => (vm?.patterns ?? []).filter(p => (p.interpretation ?? '').trim().length > 0),
    [vm],
  );

  if (authLoading) return <div className={styles.loading}>載入中...</div>;
  if (!user) return null;

  const needGender = hasBirthInfo && !birthInfo?.gender;

  /* ----- one narrative life-area section ----- */
  const renderSection = (
    topic: typeof LIFE_TOPICS[number],
    palace: PalaceInterp,
    isLead: boolean,
  ) => {
    const mains = (palace.stars ?? []);
    const starNames = mains.map(s => s.name);
    const accent = isLead
      ? starColor(starNames[0])
      : (starNames[0] ? starColor(starNames[0]) : '#9aa4b2');

    // "你的命宮主星是 天機（獨座）" / "為空宮，借對宮(遷移宮)論"
    let leadLine: React.ReactNode;
    if (starNames.length === 0) {
      const opp = OPPOSITE[topic.pinyin];
      leadLine = <>{topic.lead}<strong>無主星（空宮）</strong>，性格與際遇主要借對宮（{opp}）的星曜呈現。</>;
    } else {
      const suffix = starNames.length === 1 ? '（獨座）' : ' 同宮';
      const starLabel = mains
        .map(s => (s.brightness ? `${s.name}・${s.brightness}` : s.name))
        .join('、');
      leadLine = (
        <>
          {topic.lead}主星是{' '}
          <strong style={{ color: accent }}>{starLabel}</strong>{suffix}。
        </>
      );
    }

    const starsWithText = mains.filter(s => (s.interpretation ?? '').trim().length > 0);
    const allKeywords = Array.from(new Set([
      ...(palace.keywords ?? []),
      ...mains.flatMap(s => s.keywords ?? []),
    ]));

    return (
      <section
        key={topic.pinyin}
        id={`sec-${topic.pinyin}`}
        style={{
          scrollMarginTop: '4rem',
          padding: isLead ? '1.4rem 1.3rem' : '1.2rem 1.2rem',
          background: isLead ? 'rgba(192,132,252,0.07)' : 'rgba(255,255,255,0.035)',
          borderRadius: 16,
          border: isLead ? '1px solid rgba(192,132,252,0.25)' : '1px solid rgba(255,255,255,0.07)',
          borderLeft: `3px solid ${accent}`,
          display: 'flex', flexDirection: 'column', gap: '0.8rem',
        }}
      >
        <header style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: isLead ? '1.3rem' : '1.1rem', fontWeight: 700 }}>
              {topic.label}
            </h2>
            <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>
              {palace.name}{palace.branch ? `・${palace.branch}` : ''}
            </span>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{topic.sub}</span>
        </header>

        <p style={{ margin: 0, fontSize: '0.98rem', lineHeight: 1.7, color: 'rgba(255,255,255,0.92)' }}>
          {leadLine}
        </p>

        <SihuaBadges items={palace.sihua_in_palace} />
        <KeywordRow items={allKeywords} accent={accent} />

        {/* Per-star placement readings — the personal core */}
        {starsWithText.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {starsWithText.map(st => {
              const sc = starColor(st.name);
              return (
                <div
                  key={st.pinyin}
                  style={{
                    padding: '0.75rem 0.9rem', background: 'rgba(255,255,255,0.03)',
                    borderRadius: 10, borderLeft: `3px solid ${sc}`,
                    display: 'flex', flexDirection: 'column', gap: '0.45rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, color: sc, fontSize: '0.92rem' }}>
                      {st.name}入{palace.name}
                    </span>
                    <BrightnessTag level={st.brightness} />
                  </div>
                  {st.brightness && BRIGHTNESS_INFO[st.brightness] && (
                    <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)' }}>
                      廟旺・{st.brightness}：{BRIGHTNESS_INFO[st.brightness].note}
                    </div>
                  )}
                  <Paragraphs body={st.interpretation} dim />
                </div>
              );
            })}
          </div>
        )}

        {/* Palace meta — "what this life area is about" (context, secondary) */}
        {(palace.interpretation ?? '').trim() && (
          <details style={{ marginTop: '0.1rem' }}>
            <summary style={{ cursor: 'pointer', fontSize: '0.82rem', color: 'rgba(255,255,255,0.55)' }}>
              認識{palace.name}：這個宮位代表什麼
            </summary>
            <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Paragraphs body={palace.interpretation} dim />
            </div>
          </details>
        )}

        {palace.minor_stars && palace.minor_stars.length > 0 && (
          <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.45)' }}>
            輔星：{palace.minor_stars.join('、')}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/dashboard" style={{ color: 'inherit', textDecoration: 'none' }}>← 返回</Link>
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
          {/* Chart basics */}
          <section
            style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(92px, 1fr))',
              gap: '0.6rem', marginBottom: '1.25rem',
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
              <div key={i} style={{ padding: '0.65rem 0.55rem', background: 'rgba(255,255,255,0.04)', borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>{c.label}</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '0.18rem' }}>{c.value}</div>
              </div>
            ))}
          </section>

          {sections.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.03)', borderRadius: 14, border: '1px dashed rgba(255,255,255,0.08)' }}>
              命盤已排出，但詳細解析尚在準備中，請稍後重新排盤。
            </div>
          ) : (
            <>
              {/* Quick jump nav (sticky) */}
              <nav
                style={{
                  position: 'sticky', top: 0, zIndex: 5,
                  display: 'flex', gap: '0.4rem', overflowX: 'auto',
                  padding: '0.6rem 0', marginBottom: '0.75rem',
                  background: 'linear-gradient(rgba(15,15,25,0.95), rgba(15,15,25,0.75))',
                  scrollbarWidth: 'thin',
                }}
              >
                {sections.map(({ topic }) => (
                  <a
                    key={topic.pinyin}
                    href={`#sec-${topic.pinyin}`}
                    style={{
                      flex: '0 0 auto', padding: '0.35rem 0.7rem', borderRadius: 999,
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.8)', fontSize: '0.78rem',
                      textDecoration: 'none', whiteSpace: 'nowrap',
                    }}
                  >
                    {topic.label.split('・')[0]}
                  </a>
                ))}
              </nav>

              {/* Narrative life-area sections */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {sections.map(({ topic, palace }) => renderSection(topic, palace!, topic.pinyin === 'ming'))}
              </div>

              {/* 四化 — 天賦與課題 */}
              {sihuaItems.length > 0 && (
                <section id="sec-sihua" style={{ scrollMarginTop: '4rem', marginTop: '1.5rem' }}>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.3rem' }}>四化・天賦與課題</h2>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: 0, marginBottom: '0.85rem' }}>
                    出生年份在你的命盤上點亮的能量（祿權科）與功課（忌）
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {sihuaItems.map(s => {
                      const accent = SIHUA_COLOR[s.hua] ?? '#c084fc';
                      return (
                        <div key={`${s.star_pinyin}_${s.hua_pinyin}`} style={{ padding: '0.9rem 1rem', background: 'rgba(255,255,255,0.035)', borderRadius: 12, borderLeft: `3px solid ${accent}`, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ fontWeight: 600 }}>
                            你的 {s.star}<span style={{ color: accent, marginLeft: '0.3rem' }}>{s.hua}</span>
                          </div>
                          <KeywordRow items={s.keywords} accent={accent} />
                          <Paragraphs body={s.interpretation} dim />
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* 格局 — 特殊格局 */}
              {patternItems.length > 0 && (
                <section id="sec-pattern" style={{ scrollMarginTop: '4rem', marginTop: '1.5rem' }}>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.85rem' }}>你的特殊格局</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {patternItems.map(p => {
                      const caution = p.polarity ? p.polarity === 'caution' : false;
                      const accent = caution ? '#f87171' : '#f5b942';
                      return (
                        <div key={p.id} style={{ padding: '0.9rem 1rem', background: 'rgba(255,255,255,0.035)', borderRadius: 12, borderLeft: `3px solid ${accent}`, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ fontWeight: 600, color: accent }}>{p.name}</div>
                          <KeywordRow items={p.keywords} accent={accent} />
                          <Paragraphs body={p.interpretation} dim />
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </>
          )}

          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <button
              onClick={fetchData}
              disabled={dataLoading}
              style={{ padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '0.5rem', color: 'white', cursor: 'pointer' }}
            >
              {dataLoading ? '計算中...' : '重新排盤'}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

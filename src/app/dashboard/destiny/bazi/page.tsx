'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import { getDetailByBirth, sendChatMessage } from '@/lib/api';
import Link from 'next/link';
import styles from '../destiny.module.css';

interface Pillar {
  stem: string;
  branch: string;
  hidden_stems: string[];
  nayin: string;
}

interface TenGod {
  god: string;          // e.g. 偏財
  stem_or_branch: string;
  pillar: string;       // 年柱 / 月柱 / 日柱 / 時柱
  position: string;     // 天干 / 地支X藏干
}

interface DaYun {
  index: number;
  age_range: string;
  start_age: number;
  end_age: number;
  stem_branch: string;
  stem: string;
  branch: string;
}

interface BaziData {
  pillars: {
    year: Pillar;
    month: Pillar;
    day: Pillar;
    hour: Pillar;
  };
  day_master: string;
  day_master_strength: string;
  useful_god: string;
  useful_god_reasoning: string;
  unfavorable_elements: string[];
  five_elements: Record<string, number>;
  ten_gods: TenGod[];
  da_yun: DaYun[];
  lunar_date?: string;
  solar_date?: string;
  birth_hour?: string;
  calculation_method?: string;
  shen_sha?: Record<string, string[]>; // pillar key -> list of names
  twelve_stages?: Record<string, string>; // pillar key -> stage name
  tai_yuan?: string;
  ming_gong?: string;
  shen_gong?: string;
}

// Phase 1.5 fallback: ask the chat LLM for six interpretation sections from
// the same shape the BE will eventually return on /manual/detail/bazi.
// Cache by birth_info so the same chart never re-bills Vertex AI.
interface BaziInterpretations {
  personality: string;
  career_wealth: string;
  fame_office: string;
  marriage: string;
  ancestry: string;
  family_children: string;
}

const INTERPRETATION_SECTIONS: Array<{ key: keyof BaziInterpretations; label: string }> = [
  { key: 'personality',     label: '性格分析' },
  { key: 'career_wealth',   label: '職業財運' },
  { key: 'fame_office',     label: '功名官運' },
  { key: 'marriage',        label: '姻緣婚姻' },
  { key: 'ancestry',        label: '祖業' },
  { key: 'family_children', label: '家庭子女' },
];

function buildInterpretPrompt(data: BaziData, gender?: string): string {
  const pillars = data.pillars;
  const fmtPillar = (label: string, p: Pillar) =>
    `- ${label}: ${p.stem}${p.branch}（藏干 ${p.hidden_stems?.join('、') || '—'}，納音 ${p.nayin || '—'}）`;
  const elements = Object.entries(data.five_elements ?? {})
    .map(([e, n]) => `${e}${n}`)
    .join('、');

  return `你是一位精通子平八字的命理師。請根據以下命盤，提供六段詳細解讀。用繁體中文，每段 4-6 句，重點要具體實用，避免空泛套話。

【命盤】
${fmtPillar('年柱', pillars.year)}
${fmtPillar('月柱', pillars.month)}
${fmtPillar('日柱', pillars.day)}
${fmtPillar('時柱', pillars.hour)}
- 日主：${data.day_master}（${data.day_master_strength}）
- 用神：${data.useful_god}${data.useful_god_reasoning ? `（${data.useful_god_reasoning}）` : ''}
- 五行分佈：${elements}
${gender ? `- 性別：${gender === 'male' ? '男' : '女'}` : ''}

嚴格輸出 JSON（不要 markdown 包裹）：
{
  "personality": "性格特質、優缺點、行為模式",
  "career_wealth": "適合的職業方向、財運走勢、聚財或破財傾向",
  "fame_office": "功名仕途、是否利於官途或學術名聲",
  "marriage": "婚姻緣分、配偶特質、感情模式",
  "ancestry": "祖業承接、家族影響、是否得祖蔭",
  "family_children": "兄弟姊妹、子女緣、家庭氛圍"
}`;
}

function parseInterpretJson(text: string): BaziInterpretations | null {
  let s = text.trim();
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  }
  // Some models add stray text around JSON; pull the outermost {}
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    s = s.slice(first, last + 1);
  }
  try {
    const obj = JSON.parse(s);
    if (typeof obj !== 'object' || obj === null) return null;
    const get = (k: keyof BaziInterpretations): string => {
      const v = (obj as Record<string, unknown>)[k];
      return typeof v === 'string' ? v : '';
    };
    return {
      personality: get('personality'),
      career_wealth: get('career_wealth'),
      fame_office: get('fame_office'),
      marriage: get('marriage'),
      ancestry: get('ancestry'),
      family_children: get('family_children'),
    };
  } catch {
    return null;
  }
}

function interpretCacheKey(birth: { birth_date: string; birth_time?: string; gender?: string }): string {
  return `kys_bazi_interp_v1_${birth.birth_date}_${birth.birth_time ?? ''}_${birth.gender ?? ''}`;
}

export default function BaziPage() {
  const { user, birthInfo, hasBirthInfo, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<BaziData | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interp, setInterp] = useState<BaziInterpretations | null>(null);
  const [interpLoading, setInterpLoading] = useState(false);
  const [interpError, setInterpError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const fetchData = useCallback(async () => {
    if (!birthInfo?.birth_date) return;
    setDataLoading(true);
    setError(null);
    try {
      const result = await getDetailByBirth('bazi', birthInfo);
      const d = result.data as Record<string, unknown>;
      const dm = (d.day_master ?? {}) as { stem?: string; element?: string; strength?: string };
      const ug = (d.useful_god ?? {}) as { element?: string; reasoning?: string };
      const unfav = (d.unfavorable ?? {}) as { elements?: string[] };
      setData({
        pillars: (d.pillars ?? {}) as BaziData['pillars'],
        day_master: `${dm.stem ?? ''}${dm.element ?? ''}`,
        day_master_strength: dm.strength ?? '',
        useful_god: ug.element ?? '',
        useful_god_reasoning: ug.reasoning ?? '',
        unfavorable_elements: unfav.elements ?? [],
        five_elements: (d.five_elements ?? {}) as Record<string, number>,
        ten_gods: (d.ten_gods ?? []) as TenGod[],
        da_yun: (d.da_yun ?? []) as DaYun[],
        lunar_date: d.lunar_date as string | undefined,
        solar_date: d.solar_date as string | undefined,
        birth_hour: d.birth_hour as string | undefined,
        calculation_method: d.calculation_method as string | undefined,
        shen_sha: d.shen_sha as Record<string, string[]> | undefined,
        twelve_stages: d.twelve_stages as Record<string, string> | undefined,
        tai_yuan: d.tai_yuan as string | undefined,
        ming_gong: d.ming_gong as string | undefined,
        shen_gong: d.shen_gong as string | undefined,
      });
      // BE may already include a six-section reading; if so, surface it
      // immediately and let the user re-generate via chat if they want.
      const readings = d.readings as Record<string, unknown> | undefined;
      if (readings && typeof readings === 'object') {
        const get = (k: keyof BaziInterpretations): string => {
          const v = readings[k];
          return typeof v === 'string' ? v : '';
        };
        const fromBE: BaziInterpretations = {
          personality: get('personality'),
          career_wealth: get('career_wealth'),
          fame_office: get('fame_office'),
          marriage: get('marriage'),
          ancestry: get('ancestry'),
          family_children: get('family_children'),
        };
        // Only adopt BE readings if they actually contain content
        if (Object.values(fromBE).some(v => v.trim().length > 0)) {
          setInterp(fromBE);
        }
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setDataLoading(false);
    }
  }, [birthInfo]);

  useEffect(() => {
    if (hasBirthInfo && !data && !dataLoading && !error) {
      fetchData();
    }
  }, [hasBirthInfo, data, dataLoading, error, fetchData]);

  // After the chart is loaded, hydrate interpretations from localStorage if we
  // already have them for this birth_info; otherwise wait for the user to ask.
  useEffect(() => {
    if (!data || !birthInfo?.birth_date) return;
    const key = interpretCacheKey({
      birth_date: birthInfo.birth_date,
      birth_time: birthInfo.birth_time,
      gender: birthInfo.gender,
    });
    const cached = localStorage.getItem(key);
    if (!cached) return;
    try {
      setInterp(JSON.parse(cached) as BaziInterpretations);
    } catch {
      localStorage.removeItem(key);
    }
  }, [data, birthInfo]);

  const requestInterpretation = useCallback(async () => {
    if (!data || !birthInfo?.birth_date) return;
    setInterpLoading(true);
    setInterpError(null);
    try {
      const prompt = buildInterpretPrompt(data, birthInfo.gender);
      const res = await sendChatMessage({ message: prompt });
      const parsed = parseInterpretJson(res.message.content);
      if (!parsed) throw new Error('AI 回應格式無法解析，請重試');
      setInterp(parsed);
      const key = interpretCacheKey({
        birth_date: birthInfo.birth_date,
        birth_time: birthInfo.birth_time,
        gender: birthInfo.gender,
      });
      localStorage.setItem(key, JSON.stringify(parsed));
    } catch (err) {
      setInterpError(err instanceof Error ? err.message : '解讀失敗');
    } finally {
      setInterpLoading(false);
    }
  }, [data, birthInfo]);

  if (authLoading) {
    return <div className={styles.loading}>載入中...</div>;
  }

  if (!user) return null;

  const pillarNames = ['年柱', '月柱', '日柱', '時柱'];
  const pillarKeys = ['year', 'month', 'day', 'hour'] as const;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/dashboard" style={{ color: 'inherit', textDecoration: 'none' }}>
          ← 返回
        </Link>
        <h1 style={{ marginTop: '1rem' }}>八字命盤</h1>
        {data?.calculation_method && (
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
            計算方式: {data.calculation_method}
          </p>
        )}
      </header>

      {!hasBirthInfo ? (
        <div className={styles.setupBanner}>
          <p>尚未設定出生資料</p>
          <Link href="/dashboard/settings" className={styles.setupBtn}>設定出生資料</Link>
        </div>
      ) : dataLoading ? (
        <div className={styles.loading}>正在排盤...</div>
      ) : error ? (
        <div className={styles.setupBanner}>
          <p>{error}</p>
          <button onClick={fetchData} className={styles.setupBtn}>重試</button>
        </div>
      ) : data ? (
        <>
          {/* 命盤詳細表 */}
          {(() => {
            // Group ten gods by pillar so each column can show its main star.
            const pillarLabel: Record<typeof pillarKeys[number], string> = {
              year: '年柱', month: '月柱', day: '日柱', hour: '時柱',
            };
            const stemGodByPillar: Record<string, string> = {};
            const hiddenGodsByPillar: Record<string, Array<{ stem: string; god: string }>> = {};
            for (const tg of data.ten_gods ?? []) {
              const colKey = (Object.entries(pillarLabel).find(([, v]) => v === tg.pillar)?.[0]) as
                | typeof pillarKeys[number]
                | undefined;
              if (!colKey) continue;
              if (tg.position === '天干') {
                stemGodByPillar[colKey] = tg.god;
              } else {
                if (!hiddenGodsByPillar[colKey]) hiddenGodsByPillar[colKey] = [];
                hiddenGodsByPillar[colKey].push({ stem: tg.stem_or_branch, god: tg.god });
              }
            }

            const rows: Array<{ label: string; render: (key: typeof pillarKeys[number]) => React.ReactNode; show: boolean }> = [
              { label: '主星', render: k => stemGodByPillar[k] ?? '—', show: Object.keys(stemGodByPillar).length > 0 },
              { label: '天干', render: k => <span style={{ fontSize: '1.25rem', fontWeight: 600 }}>{data.pillars[k].stem}</span>, show: true },
              { label: '地支', render: k => <span style={{ fontSize: '1.25rem', fontWeight: 600 }}>{data.pillars[k].branch}</span>, show: true },
              { label: '藏干', render: k => {
                const hidden = data.pillars[k].hidden_stems ?? [];
                const gods = hiddenGodsByPillar[k] ?? [];
                const godBy = Object.fromEntries(gods.map(g => [g.stem, g.god]));
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', fontSize: '0.85rem' }}>
                    {hidden.length === 0 ? '—' : hidden.map(s => (
                      <span key={s}>{s}{godBy[s] ? ` (${godBy[s]})` : ''}</span>
                    ))}
                  </div>
                );
              }, show: true },
              { label: '十二長生', render: k => data.twelve_stages?.[k] ?? '—', show: !!data.twelve_stages },
              { label: '神煞', render: k => {
                const ss = data.shen_sha?.[k] ?? [];
                return ss.length === 0 ? '—' : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', fontSize: '0.8rem' }}>
                    {ss.map(s => <span key={s}>{s}</span>)}
                  </div>
                );
              }, show: !!data.shen_sha },
              { label: '納音', render: k => data.pillars[k].nayin, show: true },
            ];

            return (
              <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '0.5rem', textAlign: 'left', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}></th>
                      {pillarKeys.map((k, i) => (
                        <th key={k} style={{ padding: '0.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
                          {pillarNames[i]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.filter(r => r.show).map(r => (
                      <tr key={r.label} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <td style={{ padding: '0.6rem 0.5rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>
                          {r.label}
                        </td>
                        {pillarKeys.map(k => (
                          <td key={k} style={{ padding: '0.6rem 0.5rem', textAlign: 'center', verticalAlign: 'middle' }}>
                            {r.render(k)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}

          {/* 命格資訊（胎元 / 命宮 / 身宮）*/}
          {(data.tai_yuan || data.ming_gong || data.shen_gong || data.lunar_date) && (
            <div style={{ marginTop: '0.5rem', padding: '1rem', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem' }}>
              {data.lunar_date && (
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>農曆</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>{data.lunar_date}</div>
                </div>
              )}
              {data.tai_yuan && (
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>胎元</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>{data.tai_yuan}</div>
                </div>
              )}
              {data.ming_gong && (
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>命宮</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>{data.ming_gong}</div>
                </div>
              )}
              {data.shen_gong && (
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>身宮</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>{data.shen_gong}</div>
                </div>
              )}
            </div>
          )}

          {/* 日主分析 */}
          <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
            <h3 style={{ marginBottom: '1rem' }}>命主分析</h3>
            <div className={styles.grid}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>日主</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{data.day_master}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>身強/身弱</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{data.day_master_strength}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>用神</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f59e0b' }}>{data.useful_god}</div>
              </div>
            </div>
            {data.useful_god_reasoning && (
              <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>
                {data.useful_god_reasoning}
              </p>
            )}
          </div>

          {/* 五行分佈 */}
          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>五行分佈</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {Object.entries(data.five_elements).map(([element, count]) => (
                <div key={element} style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '8px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '1.25rem' }}>{element}</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{count}</div>
                </div>
              ))}
            </div>
            {data.unfavorable_elements.length > 0 && (
              <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                忌神：{data.unfavorable_elements.join('、')}
              </p>
            )}
          </div>

          {/* 大運時間軸 */}
          {data.da_yun.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>大運</h3>
              <div style={{ overflowX: 'auto' }}>
                <div style={{ display: 'flex', gap: '0.5rem', minWidth: 'min-content' }}>
                  {data.da_yun.map(c => (
                    <div key={c.index} style={{
                      flex: '0 0 auto',
                      minWidth: '90px',
                      padding: '0.75rem',
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '10px',
                      textAlign: 'center',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>
                        {c.start_age}–{c.end_age} 歲
                      </div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 600, marginTop: '0.25rem' }}>
                        {c.stem_branch}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 詳細解讀（六段，可摺疊）*/}
          <div style={{ marginTop: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>詳細解讀</h3>
              {interp && !interpLoading && (
                <button
                  onClick={requestInterpretation}
                  className={styles.setupBtn}
                  style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}
                >
                  重新生成
                </button>
              )}
            </div>

            {!interp && !interpLoading && !interpError && (
              <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', textAlign: 'center' }}>
                <p style={{ marginBottom: '1rem', color: 'rgba(255,255,255,0.7)' }}>
                  AI 會根據上面的命盤，產出性格、事業、姻緣等六段個人化解讀。
                </p>
                <button onClick={requestInterpretation} className={styles.setupBtn}>
                  生成詳細解讀
                </button>
              </div>
            )}

            {interpLoading && (
              <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
                AI 解讀中（約 10 秒）⋯
              </div>
            )}

            {interpError && (
              <div style={{ padding: '1rem', background: 'rgba(248,113,113,0.1)', borderRadius: '12px', color: '#fca5a5' }}>
                <p style={{ marginBottom: '0.5rem' }}>{interpError}</p>
                <button onClick={requestInterpretation} className={styles.setupBtn} style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>
                  重試
                </button>
              </div>
            )}

            {interp && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {INTERPRETATION_SECTIONS.map(({ key, label }) => {
                  const text = interp[key];
                  if (!text) return null;
                  return (
                    <details
                      key={key}
                      open
                      style={{
                        padding: '0.75rem 1rem',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <summary style={{ cursor: 'pointer', fontWeight: 600, listStyle: 'none' }}>
                        {label}
                      </summary>
                      <p style={{ marginTop: '0.75rem', lineHeight: 1.7, color: 'rgba(255,255,255,0.85)' }}>
                        {text}
                      </p>
                    </details>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <button onClick={fetchData} disabled={dataLoading} className={styles.setupBtn} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
              {dataLoading ? '計算中...' : '重新排盤'}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

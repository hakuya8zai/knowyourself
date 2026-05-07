'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import { getDetailByBirth } from '@/lib/api';
import Link from 'next/link';
import styles from '../destiny.module.css';

interface Palace {
  name: string;
  branch: string;
  major_stars: string[];
  minor_stars: string[];
  sihua: string[];
  interpretation?: string;  // From AI; matched by palace name
}

interface MingPanInfo {
  yin_yang?: string;
  wu_xing_ju?: string;
  ming_zhu?: string;
  shen_zhu?: string;
}

interface ZiweiData {
  lunar_date: string;
  year_pillar: string;
  wu_xing_ju: string;
  ming_gong_branch: string;
  shen_gong_branch: string;
  palaces: Palace[];
  ming_pan_info?: MingPanInfo;
  key_patterns?: string;
  summary?: string;
  calculation_method?: string;
}

export default function ZiweiPage() {
  const { user, birthInfo, hasBirthInfo, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<ZiweiData | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const result = await getDetailByBirth('ziwei', birthInfo);
      const d = result.data as Record<string, unknown>;
      const chart = (d.chart ?? d) as Record<string, unknown>;
      const interp = (d.interpretations ?? {}) as Record<string, unknown>;

      // Match AI palace interpretations to chart palaces by name so each palace
      // card can show its 4-6 sentence reading.
      const aiPalaces = (interp.palaces ?? []) as Array<{ name?: string; interpretation?: string }>;
      const interpByName = new Map<string, string>();
      for (const p of aiPalaces) {
        if (p.name && p.interpretation) interpByName.set(p.name, p.interpretation);
      }
      const chartPalaces = (chart.palaces ?? []) as Palace[];
      const mergedPalaces: Palace[] = chartPalaces.map(p => ({
        ...p,
        interpretation: interpByName.get(p.name),
      }));

      // BE returns ming_gong/shen_gong as objects {palace, branch, branch_index}
      const mg = (chart.ming_gong ?? {}) as { branch?: string };
      const sg = (chart.shen_gong ?? {}) as { branch?: string };
      setData({
        lunar_date: (chart.lunar_date ?? interp.lunar_date ?? '') as string,
        year_pillar: (chart.year_pillar ?? '') as string,
        wu_xing_ju: (chart.wu_xing_ju ?? '') as string,
        ming_gong_branch: mg.branch ?? ((chart.ming_gong_branch ?? '') as string),
        shen_gong_branch: sg.branch ?? ((chart.shen_gong_branch ?? '') as string),
        palaces: mergedPalaces,
        ming_pan_info: interp.ming_pan_info as MingPanInfo | undefined,
        key_patterns: interp.key_patterns as string | undefined,
        summary: interp.summary as string | undefined,
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
    if (hasBirthInfo && !data && !dataLoading && !error) {
      fetchData();
    }
  }, [hasBirthInfo, data, dataLoading, error, fetchData]);

  if (authLoading) {
    return <div className={styles.loading}>載入中...</div>;
  }

  if (!user) return null;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/dashboard" style={{ color: 'inherit', textDecoration: 'none' }}>
          ← 返回
        </Link>
        <h1 style={{ marginTop: '1rem' }}>紫微斗數</h1>
        {data?.calculation_method && (
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
            計算方式: {data.calculation_method}
          </p>
        )}
      </header>

      {!hasBirthInfo ? (
        <div className={styles.setupBanner}>
          <p>尚未設定出生資料</p>
          <Link href="/dashboard/settings" className={styles.setupBtn}>
            設定出生資料
          </Link>
        </div>
      ) : !birthInfo?.gender ? (
        <div className={styles.setupBanner}>
          <p>紫微斗數需要性別資訊</p>
          <Link href="/dashboard/settings" className={styles.setupBtn}>
            補充性別
          </Link>
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
          {/* 基本資訊 */}
          <div className={styles.grid}>
            <div className={styles.card}>
              <div className={styles.cardIcon}>📅</div>
              <h2>農曆</h2>
              <p>{data.lunar_date}</p>
            </div>
            <div className={styles.card}>
              <div className={styles.cardIcon}>🏛️</div>
              <h2>命宮</h2>
              <p>{data.ming_gong_branch}宮</p>
            </div>
            <div className={styles.card}>
              <div className={styles.cardIcon}>👤</div>
              <h2>身宮</h2>
              <p>{data.shen_gong_branch}宮</p>
            </div>
            <div className={styles.card}>
              <div className={styles.cardIcon}>⭐</div>
              <h2>五行局</h2>
              <p>{data.wu_xing_ju}</p>
            </div>
          </div>

          {/* 命主 / 身主 / 陰陽 (from AI) */}
          {data.ming_pan_info && (data.ming_pan_info.ming_zhu || data.ming_pan_info.shen_zhu || data.ming_pan_info.yin_yang) && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem' }}>
              {data.ming_pan_info.yin_yang && (
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>陰陽</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>{data.ming_pan_info.yin_yang}</div>
                </div>
              )}
              {data.ming_pan_info.ming_zhu && (
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>命主</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>{data.ming_pan_info.ming_zhu}</div>
                </div>
              )}
              {data.ming_pan_info.shen_zhu && (
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>身主</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>{data.ming_pan_info.shen_zhu}</div>
                </div>
              )}
            </div>
          )}

          {/* 十二宮（含 AI 解讀，可摺疊）*/}
          <h2 style={{ marginTop: '2rem', marginBottom: '1rem' }}>十二宮位</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {data.palaces.map((palace, i) => (
              <details
                key={i}
                open={!!palace.interpretation && i < 4}
                style={{
                  padding: '0.75rem 1rem',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <summary style={{ cursor: palace.interpretation ? 'pointer' : 'default', listStyle: 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
                      <span style={{ fontWeight: 600 }}>{palace.name}</span>
                      <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{palace.branch}宮</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'baseline' }}>
                      {palace.major_stars.length > 0 && (
                        <span><span style={{ color: '#f59e0b' }}>主</span> {palace.major_stars.join('、')}</span>
                      )}
                      {palace.sihua.length > 0 && (
                        <span style={{ color: '#ec4899' }}>{palace.sihua.join(' ')}</span>
                      )}
                    </div>
                  </div>
                  {palace.minor_stars.length > 0 && (
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', marginTop: '0.35rem' }}>
                      輔星: {palace.minor_stars.join('、')}
                    </div>
                  )}
                </summary>
                {palace.interpretation && (
                  <p style={{ marginTop: '0.75rem', lineHeight: 1.7, color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem' }}>
                    {palace.interpretation}
                  </p>
                )}
              </details>
            ))}
          </div>

          {/* 關鍵格局 */}
          {data.key_patterns && (
            <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px' }}>
              <h3 style={{ marginBottom: '0.5rem', color: '#f59e0b' }}>關鍵格局</h3>
              <p style={{ lineHeight: 1.7, color: 'rgba(255,255,255,0.85)' }}>{data.key_patterns}</p>
            </div>
          )}

          {/* 整體總結 */}
          {data.summary && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.04)', borderRadius: '12px' }}>
              <h3 style={{ marginBottom: '0.5rem' }}>整體總結</h3>
              <p style={{ lineHeight: 1.7, color: 'rgba(255,255,255,0.85)' }}>{data.summary}</p>
            </div>
          )}

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

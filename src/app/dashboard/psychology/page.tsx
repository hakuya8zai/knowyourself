'use client';

import Link from 'next/link';
import styles from '../dashboard.module.css';

export default function PsychologyPage() {
  // 心理測驗不需要登入

  const tests = [
    {
      id: 'bigfive',
      name: 'Big Five 人格測驗',
      desc: '心理學界最廣泛使用的人格模型，測量五大面向及30個子面向。基於 IPIP-NEO 公開題庫。',
      questions: 60,
      time: '10-15 分鐘',
      color: '#3b82f6',
      evidence: '證據較成熟的人格特質模型',
      status: 'available',
    },
    {
      id: 'mbti',
      name: 'MBTI 16型人格',
      desc: '榮格理論基礎的性格類型指標，分析你的認知功能偏好：外向/內向、實感/直覺、思考/情感、判斷/知覺。',
      questions: 70,
      time: '15-20 分鐘',
      color: '#10b981',
      evidence: '類型偏好工具，不適合作為能力或診斷依據',
      status: 'available',
    },
    {
      id: 'enneagram',
      name: '九型人格',
      desc: '深入探索你的核心動機、恐懼與渴望。發現你的主要類型和翼型。',
      questions: 36,
      time: '8-12 分鐘',
      color: '#f59e0b',
      evidence: '自我反思框架，實證支持較有限',
      status: 'available',
    },
    {
      id: 'attachment',
      name: '依附風格',
      desc: '基於 ECR-R 量表，了解你在親密關係中的模式：安全型、焦慮型、迴避型或恐懼型。',
      questions: 20,
      time: '5 分鐘',
      color: '#ec4899',
      evidence: '依附傾向的自我評估，不是臨床診斷',
      status: 'available',
    },
  ];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/dashboard" style={{ color: 'inherit', textDecoration: 'none' }}>
          ← 返回
        </Link>
        <h1 style={{ marginTop: '1rem' }}>心理測試</h1>
        <p>不同理論與證據層級的自我探索工具；結果不是臨床診斷</p>
      </header>

      <div className={styles.grid}>
        {tests.map((test) => (
          <div
            key={test.id}
            className={styles.card}
            style={{ 
              '--accent-color': test.color,
              opacity: test.status === 'coming' ? 0.6 : 1,
            } as React.CSSProperties}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '0.5rem',
            }}>
              <h2 style={{ fontSize: '1.1rem' }}>{test.name}</h2>
              {test.status === 'coming' && (
                <span style={{
                  fontSize: '0.7rem',
                  background: 'rgba(255,255,255,0.1)',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.25rem',
                }}>
                  即將推出
                </span>
              )}
            </div>
            <p style={{ 
              color: '#888', 
              fontSize: '0.9rem', 
              marginBottom: '1rem',
              lineHeight: 1.5,
            }}>
              {test.desc}
            </p>
            <div style={{
              display: 'flex',
              gap: '1rem',
              fontSize: '0.8rem',
              color: '#666',
              marginBottom: '1rem',
            }}>
              <span>{test.questions} 題</span>
              <span>{test.time}</span>
            </div>
            <p style={{
              color: '#999',
              fontSize: '0.76rem',
              lineHeight: 1.45,
              marginBottom: '1rem',
            }}>
              證據說明：{test.evidence}
            </p>
            {test.status === 'available' ? (
              <Link
                href={`/dashboard/psychology/${test.id}`}
                style={{
                  display: 'block',
                  padding: '0.75rem',
                  background: `linear-gradient(135deg, ${test.color}, ${test.color}dd)`,
                  borderRadius: '0.5rem',
                  color: 'white',
                  textAlign: 'center',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                開始測驗
              </Link>
            ) : (
              <div style={{
                padding: '0.75rem',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '0.5rem',
                textAlign: 'center',
                color: '#666',
              }}>
                即將推出
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

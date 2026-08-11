'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';
import { listSavedManuals } from '@/lib/api';
import styles from './HomePage.module.css';

const CHAPTERS = [
  { title: '你的核心本質', desc: '你最真實的樣子，連你自己都未必看清' },
  { title: '隱藏的天賦', desc: '你身上那些被忽略的光芒' },
  { title: '感情中的你', desc: '你怎麼愛人，又需要怎樣被愛' },
  { title: '職業天賦', desc: '你天生適合做什麼' },
  { title: '成長的方向', desc: '如果你願意，下一步可以往哪走' },
  { title: '此刻的你', desc: '你現在的主旋律，以及下一步的方向' },
];

export function HomePage() {
  const [loaded, setLoaded] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const { user, isAuthenticated, hasBirthInfo, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Logged in + already has birth info → send them to their saved manual (or /consult to make one).
  // Don't ask returning users to re-enter birth info just to view the report they already have.
  useEffect(() => {
    if (loading || !isAuthenticated || !hasBirthInfo || !user || redirecting) return;

    setRedirecting(true);
    (async () => {
      try {
        const { manuals } = await listSavedManuals(user.id);
        if (manuals.length > 0) {
          router.replace(`/manual/${manuals[0].id}`);
          return;
        }
      } catch (err) {
        console.error('Failed to list saved manuals:', err);
      }
      // No saved manual yet — go to consult so they can generate one (form will pre-fill from context).
      router.replace('/consult');
    })();
  }, [loading, isAuthenticated, hasBirthInfo, user, redirecting, router]);

  // Render nothing during the redirect to avoid a flash of the marketing copy
  if (redirecting || (!loading && isAuthenticated && hasBirthInfo)) {
    return null;
  }

  return (
    <div className={styles.page}>
      {/* Soft background */}
      <div className={styles.meshBg}>
        <div className={styles.orbPurple} />
        <div className={styles.orbRose} />
      </div>

      <main className={`${styles.hero} ${loaded ? styles.visible : ''}`}>
        {/* Title */}
        <h1 className={styles.title}>你的使用說明書</h1>

        <div className={styles.bookVoice}>
          <p className={styles.subtitle}>
            從出生那一刻起，你就是獨一無二的。
          </p>
          <p className={styles.subtitleSecond}>
            這份說明書，把那份獨特寫成看得見的文字。
          </p>
        </div>

        {/* Chapters preview */}
        <div className={styles.chapters}>
          <p className={styles.chaptersIntro}>你會讀到</p>
          <div className={styles.chaptersList}>
            {CHAPTERS.map((item, i) => (
              <div
                key={item.title}
                className={styles.chapterItem}
                style={{ animationDelay: `${0.4 + i * 0.08}s` }}
              >
                <span className={styles.chapterDot}>·</span>
                <div className={styles.chapterText}>
                  <span className={styles.chapterTitle}>{item.title}</span>
                  <span className={styles.chapterSep}> — </span>
                  <span className={styles.chapterDesc}>{item.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <Link href="/consult" className={styles.cta}>
          開始認識自己
        </Link>

        {/* Trust line - different text based on auth state */}
        <p className={styles.trust}>
          {isAuthenticated 
            ? '免費 · 登入後可儲存說明書'
            : '免費 · 無需註冊即可體驗'
          }
        </p>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <span>僅供自我探索參考，不構成專業建議</span>
        <span> · </span>
        <Link href="/privacy">隱私</Link>
        <span> · </span>
        <Link href="/terms">條款</Link>
      </footer>
    </div>
  );
}

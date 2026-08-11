'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import Link from 'next/link';
import styles from './layout.module.css';

const NAV_SECTIONS = [
  {
    title: '命理系統',
    items: [
      { href: '/dashboard/destiny/western', icon: '☉', label: '西洋星盤' },
      { href: '/dashboard/destiny/ziwei', icon: '紫', label: '紫微斗數' },
      { href: '/dashboard/destiny/bazi', icon: '八', label: '八字命理' },
      { href: '/dashboard/destiny/humandesign', icon: '◈', label: '人類圖' },
    ],
  },
  {
    title: '即時占卜',
    items: [
      { href: '/dashboard/divination/tarot', icon: '🎴', label: '塔羅牌' },
      { href: '/dashboard/divination/meihua', icon: '☯', label: '梅花易數' },
    ],
  },
  {
    title: '心理測驗',
    items: [
      { href: '/dashboard/psychology/bigfive', icon: '5', label: 'Big Five 人格' },
      { href: '/dashboard/psychology/mbti', icon: 'M', label: 'MBTI 16型' },
      { href: '/dashboard/psychology/enneagram', icon: '9', label: '九型人格' },
      { href: '/dashboard/psychology/attachment', icon: '♡', label: '依附類型' },
    ],
  },
  {
    title: 'AI 諮詢',
    items: [
      { href: '/dashboard/consult', icon: '💬', label: '開始對話' },
    ],
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} />
        <p>載入中...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <Link href="/" className={styles.logo}>
            你的使用說明書
          </Link>
        </div>
        
        <nav className={styles.nav}>
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className={styles.navSection}>
              <h3 className={styles.navTitle}>{section.title}</h3>
              <ul className={styles.navList}>
                {section.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`${styles.navItem} ${
                        pathname === item.href ? styles.navItemActive : ''
                      }`}
                    >
                      <span className={styles.navIcon}>{item.icon}</span>
                      <span className={styles.navLabel}>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <Link href="/" className={styles.backHome}>
            ← 回首頁
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}

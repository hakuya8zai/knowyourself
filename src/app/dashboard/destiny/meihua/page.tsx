import Link from 'next/link';
import styles from '../destiny.module.css';

export default function MeihuaPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>梅花易數</h1>
        <p>卦象與體用分析</p>
      </header>

      <div className={styles.emptyState}>
        <span className={styles.emptyIcon}>☯</span>
        <h2>梅花易數採即時起卦</h2>
        <p>它不依賴出生資料。提出你此刻最想釐清的問題，再開始起卦。</p>
        <Link href="/dashboard/divination/meihua" className={styles.ctaButton}>
          前往起卦
        </Link>
      </div>
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import styles from '../legal.module.css';

export const metadata: Metadata = {
  title: '服務條款｜你的使用說明書',
};

export default function TermsPage() {
  return (
    <main className={styles.page}>
      <article className={styles.article}>
        <h1>服務條款</h1>
        <p className={styles.updated}>最後更新：2026 年 7 月 31 日</p>

        <section>
          <h2>服務定位</h2>
          <p>本服務提供自我探索內容。命理、占卜、MBTI 與九型人格不等同臨床或科學診斷；Big Five 與依附量表也僅能作為自我反思參考。</p>
        </section>

        <section>
          <h2>不是專業建議</h2>
          <p>內容與 AI 回覆不構成醫療、心理治療、法律、財務或其他專業建議。重要決策請向合格專業人士諮詢。</p>
        </section>

        <section>
          <h2>使用者責任</h2>
          <p>請勿利用服務傷害他人、探查他人私人資料、繞過存取控制，或提交你無權處理的個人資料。</p>
        </section>

        <section>
          <h2>帳號與內容</h2>
          <p>你需保護自己的登入帳號及分享連結。你可以刪除帳號；公開分享內容則會在分享連結停用後停止存取。</p>
        </section>

        <Link href="/" className={styles.back}>← 返回首頁</Link>
      </article>
    </main>
  );
}


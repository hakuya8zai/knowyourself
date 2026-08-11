import type { Metadata } from 'next';
import Link from 'next/link';
import styles from '../legal.module.css';

export const metadata: Metadata = {
  title: '隱私政策｜你的使用說明書',
};

export default function PrivacyPage() {
  return (
    <main className={styles.page}>
      <article className={styles.article}>
        <h1>隱私政策</h1>
        <p className={styles.updated}>最後更新：2026 年 7 月 31 日</p>

        <section>
          <h2>我們處理哪些資料</h2>
          <p>產生分析時會處理你提供的出生日期、時間、地點、座標、時區與性別。登入後，我們也會保存 Google 帳號提供的名稱、Email 與頭像。</p>
        </section>

        <section>
          <h2>資料用途與保存</h2>
          <ul>
            <li>出生資料用於計算命盤與產生個人化內容。</li>
            <li>未登入的分析可能以不可逆輸入雜湊快取最多 30 天，以降低重複運算；不會以生日或地點作為可讀取的物件名稱。</li>
            <li>剛產生的報告會以不可猜測連結暫存最多 24 小時，讓登入跳轉與多個服務實例之間仍可完成儲存；成功存入帳號後會立即移除這份暫存。</li>
            <li>登入後儲存的出生資料與說明書會保留到你刪除說明書或帳號為止。</li>
            <li>AI 顧問會將你選擇的摘要與對話內容傳送給我們使用的雲端 AI 供應商以產生回覆。</li>
          </ul>
        </section>

        <section>
          <h2>分享與公開範圍</h2>
          <p>說明書預設為私人。只有你主動建立分享連結後，持有該連結的人才能查看去除原始出生資料後的內容；你可以停用分享連結。</p>
        </section>

        <section>
          <h2>你的控制權</h2>
          <p>你可以在個人設定更新出生資料、刪除個別說明書、停用分享，或永久刪除帳號與所有已儲存說明書。</p>
        </section>

        <section>
          <h2>安全與聯絡</h2>
          <p>登入憑證使用 httpOnly Cookie，API 會再次驗證身份與資料所有權。如有隱私問題，請透過 SelfKit 官方聯絡管道提出。</p>
        </section>

        <Link href="/" className={styles.back}>← 返回首頁</Link>
      </article>
    </main>
  );
}

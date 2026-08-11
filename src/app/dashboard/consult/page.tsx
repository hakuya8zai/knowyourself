'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import { listSavedManuals } from '@/lib/api';
import styles from '../layout.module.css';

/**
 * Keep one AI consultation experience. If a saved manual exists, pass its real
 * summary to /chat; otherwise open the generic advisor without pretending that
 * unpersisted test data has been loaded.
 */
export default function ConsultRedirectPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || !user) return;
    listSavedManuals(user.id)
      .then(({ manuals }) => {
        const target = manuals[0]?.id
          ? `/chat?manual=${encodeURIComponent(manuals[0].id)}`
          : '/chat';
        router.replace(target);
      })
      .catch(() => router.replace('/chat'));
  }, [loading, router, user]);

  return (
    <div className={styles.loadingContainer} role="status" aria-live="polite">
      <div className={styles.loadingSpinner} />
      <p>正在載入 AI 顧問...</p>
    </div>
  );
}

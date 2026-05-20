'use client';

/**
 * ChartDetailDrawer - Slide-up drawer for chart element details
 * Shows explanations when user clicks on planets, signs, gates, etc.
 */

import { useEffect, useRef } from 'react';
import styles from './ChartDetailDrawer.module.css';

export type DetailType = 'planet' | 'sign' | 'house' | 'aspect' | 'gate' | 'channel' | 'center' | 'palace' | 'star';

export interface ChartDetail {
  type: DetailType;
  id: string;           // e.g., 'sun', 'gate-1', 'ming-gong'
  title: string;        // e.g., '太陽 in 巨蟹座'
  subtitle?: string;    // e.g., '第四宮 · 15°32\''
  category?: string;    // e.g., '個人行星', '情感型閘門'
  keywords?: string[];  // e.g., ['自我表達', '生命力', '創造力']
  description: string;  // Main explanation text
  interpretation?: string;  // Personal interpretation based on position
  advice?: string;      // Practical advice
  /**
   * Zodiac sign key (English lowercase, e.g. 'aries', 'taurus') for
   * applying the matching theme via `[data-sign="..."]` CSS variables.
   * For planets, this is typically the planet's ruler_sign.
   */
  sign?: string;
}

interface Props {
  detail: ChartDetail | null;
  onClose: () => void;
}

export function ChartDetailDrawer({ detail, onClose }: Props) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (detail) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [detail, onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (detail) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [detail, onClose]);

  if (!detail) return null;

  const typeLabels: Record<DetailType, string> = {
    planet: '行星',
    sign: '星座',
    house: '宮位',
    aspect: '相位',
    gate: '閘門',
    channel: '通道',
    center: '能量中心',
    palace: '宮位',
    star: '星曜',
  };

  return (
    <div className={styles.overlay} data-sign={detail.sign}>
      <div ref={drawerRef} className={styles.drawer} data-sign={detail.sign}>
        {/* Handle bar */}
        <div className={styles.handleBar}>
          <div className={styles.handle} />
        </div>

        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <span className={styles.typeTag}>{typeLabels[detail.type]}</span>
            <h2 className={styles.title}>{detail.title}</h2>
            {detail.subtitle && (
              <p className={styles.subtitle}>{detail.subtitle}</p>
            )}
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="關閉">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </header>

        {/* Content */}
        <div className={styles.content}>
          {/* Keywords */}
          {detail.keywords && detail.keywords.length > 0 && (
            <div className={styles.keywords}>
              {detail.keywords.map((kw, i) => (
                <span key={i} className={styles.keyword}>{kw}</span>
              ))}
            </div>
          )}

          {/* Category */}
          {detail.category && (
            <p className={styles.category}>{detail.category}</p>
          )}

          {/* Description */}
          <div className={styles.section}>
            <h3>基本含義</h3>
            <p>{detail.description}</p>
          </div>

          {/* Interpretation */}
          {detail.interpretation && (
            <div className={styles.section}>
              <h3>在你的命盤中</h3>
              <p>{detail.interpretation}</p>
            </div>
          )}

          {/* Advice */}
          {detail.advice && (
            <div className={styles.section}>
              <h3>實踐建議</h3>
              <p>{detail.advice}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

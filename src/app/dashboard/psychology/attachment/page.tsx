'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from '../../dashboard.module.css';
import {
  questions,
  calculateAttachmentResults,
  getStyleDescription,
  dimensionInfo,
  type AttachmentResult,
} from '@/lib/tests/attachment';

export default function AttachmentPage() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<AttachmentResult | null>(null);

  const handleAnswer = (value: number) => {
    const newAnswers = { ...answers, [questions[currentQuestion].id]: value };
    setAnswers(newAnswers);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      const result = calculateAttachmentResults(newAnswers);
      setResults(result);
      setShowResults(true);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  if (showResults && results) {
    const styleInfo = getStyleDescription(results.style);
    
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <Link href="/dashboard/psychology" style={{ color: 'inherit', textDecoration: 'none' }}>
            ← 返回
          </Link>
          <h1 style={{ marginTop: '1rem' }}>你的依附風格結果</h1>
          <p style={{ color: '#888', fontSize: '0.9rem' }}>
            基於 ECR-R 量表
          </p>
        </header>

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          {/* Main Result */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(236, 72, 153, 0.1))',
            border: '1px solid rgba(236, 72, 153, 0.3)',
            borderRadius: '1rem',
            padding: '2rem',
            marginBottom: '1.5rem',
            textAlign: 'center',
          }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#ec4899' }}>
              {styleInfo?.name}
            </h2>
            <p style={{ color: '#888', marginBottom: '1rem' }}>
              {styleInfo?.name_en}
            </p>
            <p style={{ color: '#ccc', lineHeight: 1.7 }}>
              {styleInfo?.description}
            </p>
          </div>

          {/* Quadrant Visualization */}
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '1rem',
            padding: '1.5rem',
            marginBottom: '1.5rem',
          }}>
            <h3 style={{ marginBottom: '1rem', textAlign: 'center' }}>依附風格象限圖</h3>
            <div style={{
              position: 'relative',
              width: '100%',
              maxWidth: '300px',
              height: '300px',
              margin: '0 auto',
              border: '1px solid rgba(255,255,255,0.2)',
            }}>
              {/* Axes */}
              <div style={{
                position: 'absolute',
                left: '50%',
                top: 0,
                bottom: 0,
                width: '1px',
                background: 'rgba(255,255,255,0.3)',
              }} />
              <div style={{
                position: 'absolute',
                top: '50%',
                left: 0,
                right: 0,
                height: '1px',
                background: 'rgba(255,255,255,0.3)',
              }} />
              
              {/* Labels */}
              <span style={{ position: 'absolute', top: '5px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.7rem', color: '#888' }}>
                高焦慮
              </span>
              <span style={{ position: 'absolute', bottom: '5px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.7rem', color: '#888' }}>
                低焦慮
              </span>
              <span style={{ position: 'absolute', left: '5px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: '#888' }}>
                低迴避
              </span>
              <span style={{ position: 'absolute', right: '5px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: '#888' }}>
                高迴避
              </span>
              
              {/* Quadrant Labels */}
              <span style={{ position: 'absolute', top: '25%', left: '25%', transform: 'translate(-50%, -50%)', fontSize: '0.8rem', color: '#666' }}>
                焦慮型
              </span>
              <span style={{ position: 'absolute', top: '25%', right: '25%', transform: 'translate(50%, -50%)', fontSize: '0.8rem', color: '#666' }}>
                恐懼型
              </span>
              <span style={{ position: 'absolute', bottom: '25%', left: '25%', transform: 'translate(-50%, 50%)', fontSize: '0.8rem', color: '#666' }}>
                安全型
              </span>
              <span style={{ position: 'absolute', bottom: '25%', right: '25%', transform: 'translate(50%, 50%)', fontSize: '0.8rem', color: '#666' }}>
                迴避型
              </span>
              
              {/* Your Position */}
              <div style={{
                position: 'absolute',
                left: `${50 + (results.avoidance.percentage - 50) * 0.9}%`,
                bottom: `${50 + (50 - results.anxiety.percentage) * 0.9}%`,
                width: '16px',
                height: '16px',
                background: '#ec4899',
                borderRadius: '50%',
                transform: 'translate(-50%, 50%)',
                boxShadow: '0 0 10px #ec4899',
              }} />
            </div>
          </div>

          {/* Dimension Scores */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}>
            {/* Anxiety */}
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '1rem',
              padding: '1.25rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <h4>{dimensionInfo.anxiety.name}</h4>
                <span style={{ color: '#ec4899' }}>{results.anxiety.percentage}%</span>
              </div>
              <div style={{
                height: '8px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '4px',
                overflow: 'hidden',
                marginBottom: '0.75rem',
              }}>
                <div style={{
                  height: '100%',
                  width: `${results.anxiety.percentage}%`,
                  background: '#ec4899',
                  borderRadius: '4px',
                }} />
              </div>
              <p style={{ fontSize: '0.8rem', color: '#888', lineHeight: 1.5 }}>
                {results.anxiety.level === 'low' 
                  ? dimensionInfo.anxiety.lowDescription 
                  : dimensionInfo.anxiety.highDescription}
              </p>
            </div>

            {/* Avoidance */}
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '1rem',
              padding: '1.25rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <h4>{dimensionInfo.avoidance.name}</h4>
                <span style={{ color: '#8b5cf6' }}>{results.avoidance.percentage}%</span>
              </div>
              <div style={{
                height: '8px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '4px',
                overflow: 'hidden',
                marginBottom: '0.75rem',
              }}>
                <div style={{
                  height: '100%',
                  width: `${results.avoidance.percentage}%`,
                  background: '#8b5cf6',
                  borderRadius: '4px',
                }} />
              </div>
              <p style={{ fontSize: '0.8rem', color: '#888', lineHeight: 1.5 }}>
                {results.avoidance.level === 'low' 
                  ? dimensionInfo.avoidance.lowDescription 
                  : dimensionInfo.avoidance.highDescription}
              </p>
            </div>
          </div>

          {/* Characteristics */}
          {styleInfo && (
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '1rem',
              padding: '1.5rem',
              marginBottom: '1.5rem',
            }}>
              <h3 style={{ marginBottom: '1rem' }}>你的特質</h3>
              <ul style={{ color: '#888', paddingLeft: '1.25rem', lineHeight: 1.8 }}>
                {styleInfo.characteristics.map((char, i) => (
                  <li key={i}>{char}</li>
                ))}
              </ul>
            </div>
          )}

          <Link
            href="/dashboard/psychology"
            style={{
              display: 'block',
              padding: '1rem',
              background: 'linear-gradient(135deg, #ec4899, #d946ef)',
              borderRadius: '0.5rem',
              color: 'white',
              textAlign: 'center',
              textDecoration: 'none',
              marginTop: '2rem',
            }}
          >
            完成
          </Link>
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/dashboard/psychology" style={{ color: 'inherit', textDecoration: 'none' }}>
          ← 返回
        </Link>
        <h1 style={{ marginTop: '1rem' }}>依附風格測驗</h1>
        <p style={{ color: '#888', fontSize: '0.9rem' }}>20 題</p>
      </header>

      {/* Progress bar */}
      <div style={{
        height: '4px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '2px',
        marginBottom: '2rem',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #ec4899, #d946ef)',
          transition: 'width 0.3s',
        }} />
      </div>

      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <p style={{ color: '#888', marginBottom: '1rem' }}>
          問題 {currentQuestion + 1} / {questions.length}
        </p>

        <h2 style={{ fontSize: '1.25rem', marginBottom: '2rem', lineHeight: 1.5 }}>
          {question.text}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            { value: 1, label: '非常不同意' },
            { value: 2, label: '不同意' },
            { value: 3, label: '中立' },
            { value: 4, label: '同意' },
            { value: 5, label: '非常同意' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => handleAnswer(option.value)}
              style={{
                padding: '1rem',
                background: answers[question.id] === option.value
                  ? 'linear-gradient(135deg, #ec4899, #d946ef)'
                  : 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '0.5rem',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {option.label}
            </button>
          ))}
        </div>

        {currentQuestion > 0 && (
          <button
            onClick={handlePrevious}
            style={{
              marginTop: '1.5rem',
              padding: '0.75rem 1.5rem',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '0.5rem',
              color: '#888',
              cursor: 'pointer',
            }}
          >
            ← 上一題
          </button>
        )}
      </div>
    </div>
  );
}

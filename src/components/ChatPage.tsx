'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  sendChatMessageStream,
  getManual,
  extractManualContext,
  ManualContext,
  UserManual,
} from '@/lib/api';
import { useAuth } from './AuthContext';
import { LoginModal } from './LoginModal';
import styles from './ChatPage.module.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: '你好！👋 我是你的 AI 顧問。可以和我聊聊你的困惑、選擇、或任何想探索的事。我會結合命理與心理學的視角，給你一些不一樣的洞察。',
};

const SUGGESTIONS = [
  '最近工作上有點迷茫...',
  '我的人際關係如何改善？',
  '我適合什麼樣的工作？',
  '幫我分析一下我的性格',
];

export function ChatPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const manualId = searchParams.get('manual');
  
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [manualContext, setManualContext] = useState<ManualContext | null>(null);
  const [manual, setManual] = useState<UserManual | null>(null);
  const [loadingManual, setLoadingManual] = useState(false);
  const [includeManualContext, setIncludeManualContext] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const requestControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => () => requestControllerRef.current?.abort(), []);

  // Load manual context if manualId provided
  useEffect(() => {
    async function loadManual() {
      if (!manualId) return;
      
      setLoadingManual(true);
      try {
        const m = await getManual(manualId);
        setManual(m);
        setManualContext(extractManualContext(m));
        
        // Update welcome message with personalized greeting
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: `你好！👋 我已經看過你的說明書了。${m.profile?.label ? `你是「${m.profile.label}」類型` : ''}，我們來聊聊吧！有什麼想探索的嗎？`,
        }]);
      } catch {
        // Silently fail - just use generic welcome
      } finally {
        setLoadingManual(false);
      }
    }
    loadManual();
  }, [manualId]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    if (!isAuthenticated) {
      setShowLogin(true);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
    };

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      isStreaming: true,
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setInput('');
    setIsLoading(true);
    const controller = new AbortController();
    requestControllerRef.current = controller;

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    try {
      // BE is stateless - send recent history so the model has context.
      const history = messages
        .filter(m => m.id !== WELCOME_MESSAGE.id && !m.isStreaming)
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }));

      await sendChatMessageStream(
        {
          message: text.trim(),
          history,
          manual_context: includeManualContext ? manualContext || undefined : undefined,
          manual_id: includeManualContext ? manualId || undefined : undefined,
        },
        // onChunk
        (chunk) => {
          setMessages(prev => {
            const lastIndex = prev.length - 1;
            return prev.map((message, index) => (
              index === lastIndex && message.role === 'assistant'
                ? { ...message, content: message.content + chunk }
                : message
            ));
          });
        },
        // onDone
        () => {
          setMessages(prev => {
            const lastIndex = prev.length - 1;
            return prev.map((message, index) => (
              index === lastIndex && message.role === 'assistant'
                ? { ...message, isStreaming: false }
                : message
            ));
          });
        },
        // onError
        (error) => {
          setMessages(prev => {
            const lastIndex = prev.length - 1;
            return prev.map((message, index) => (
              index === lastIndex && message.role === 'assistant'
                ? { ...message, content: error, isStreaming: false }
                : message
            ));
          });
        },
        controller.signal,
      );
    } catch (error) {
      setMessages(prev => {
        const lastIndex = prev.length - 1;
        return prev.map((message, index) => (
          index === lastIndex && message.role === 'assistant'
            ? {
                ...message,
                content: error instanceof DOMException && error.name === 'AbortError'
                  ? `${message.content}${message.content ? '\n\n' : ''}（已停止產生）`
                  : '抱歉，發生了一些問題。請稍後再試 🙏',
                isStreaming: false,
              }
            : message
        ));
      });
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
      }
      setIsLoading(false);
    }
  };

  const stopGenerating = () => {
    requestControllerRef.current?.abort();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <Link href="/" className={styles.back}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 15l-5-5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          返回
        </Link>
        <div className={styles.headerCenter}>
          <div className={styles.headerTitle}>AI 顧問</div>
          {manualContext && includeManualContext && (
            <div className={styles.headerSubtitle}>
              已加入說明書摘要
            </div>
          )}
        </div>
        <div className={styles.headerRight}>
          {manual && (
            <Link href={`/manual/${manualId}`} className={styles.manualLink}>
              查看說明書
            </Link>
          )}
        </div>
      </header>

      {/* Messages */}
      <main className={styles.main}>
        <div className={styles.messagesContainer}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`${styles.message} ${
                msg.role === 'user' ? styles.userMessage : styles.assistantMessage
              }`}
            >
              {msg.role === 'assistant' && (
                <div className={styles.avatar}>✨</div>
              )}
              <div className={styles.bubble}>
                {msg.content}
                {msg.isStreaming && <span className={styles.cursor}>▊</span>}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions - show only at start */}
        {messages.length === 1 && !isLoading && (
          <div className={styles.suggestions}>
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                className={styles.suggestionBtn}
                onClick={() => handleSuggestionClick(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Input */}
      <footer className={styles.footer}>
        {manualContext && (
          <label className={styles.contextConsent}>
            <input
              type="checkbox"
              checked={includeManualContext}
              onChange={(event) => setIncludeManualContext(event.target.checked)}
              disabled={isLoading}
            />
            將說明書摘要提供給 AI，以產生個人化回覆
          </label>
        )}
        <form onSubmit={handleSubmit} className={styles.inputForm}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="輸入訊息..."
            className={styles.input}
            rows={1}
            disabled={isLoading || loadingManual || authLoading}
          />
          {isLoading ? (
            <button
              type="button"
              className={styles.stopBtn}
              onClick={stopGenerating}
              aria-label="停止產生回覆"
            >
              <span aria-hidden="true" />
            </button>
          ) : (
            <button
              type="submit"
              className={styles.sendBtn}
              disabled={!input.trim() || loadingManual || authLoading}
              aria-label="傳送訊息"
            >
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </form>
        <p className={styles.disclaimer}>
          AI 回覆可能有誤，僅供自我探索，不構成醫療或專業建議。
          如有立即危險，請聯絡所在地緊急服務或身邊可信任的人。{' '}
          <Link href="/privacy">了解資料如何使用</Link>
        </p>
      </footer>
      <LoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onSuccess={() => window.location.reload()}
        message="登入後即可使用 AI 顧問；對話內容不會加入公開分享頁"
      />
    </div>
  );
}

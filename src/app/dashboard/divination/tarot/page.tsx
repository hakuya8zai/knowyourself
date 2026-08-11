'use client';

import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/components/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import styles from './tarot.module.css';

interface TarotCard {
  name: string;
  description: string;
  image: string;
}

interface DrawnCard {
  card: TarotCard;
  reversed: boolean;
  position: string;
}

// Image base URL from krates98/tarotcardapi
const IMAGE_BASE = 'https://raw.githubusercontent.com/krates98/tarotcardapi/main/images';

// 78 cards data (from krates98/tarotcardapi)
const TAROT_CARDS: TarotCard[] = [
  // Major Arcana (22)
  { name: "愚者 The Fool", description: "新開始、冒險、純真。代表無限可能與新旅程的開始。", image: "thefool.jpeg" },
  { name: "魔術師 The Magician", description: "創造力、意志力、技能。你擁有實現目標的一切工具。", image: "themagician.jpeg" },
  { name: "女祭司 The High Priestess", description: "直覺、神秘、內在智慧。信任你的直覺，答案就在心中。", image: "thehighpriestess.jpeg" },
  { name: "女皇 The Empress", description: "豐盛、母性、創造。滋養你的夢想，讓它們茁壯成長。", image: "theempress.jpeg" },
  { name: "皇帝 The Emperor", description: "權威、結構、領導。建立穩固的基礎，掌控你的領域。", image: "theemperor.jpeg" },
  { name: "教皇 The Hierophant", description: "傳統、信仰、指導。尋求智者的建議，遵循已知的道路。", image: "thehierophant.jpeg" },
  { name: "戀人 The Lovers", description: "愛情、選擇、和諧。面對重要抉擇，傾聽內心的聲音。", image: "TheLovers.jpg" },
  { name: "戰車 The Chariot", description: "勝利、決心、控制。專注目標，克服障礙，向前邁進。", image: "thechariot.jpeg" },
  { name: "力量 Strength", description: "勇氣、耐心、內在力量。以溫柔的力量駕馭挑戰。", image: "thestrength.jpeg" },
  { name: "隱士 The Hermit", description: "內省、智慧、獨處。退一步，在沉思中找到真相。", image: "thehermit.jpeg" },
  { name: "命運之輪 Wheel of Fortune", description: "機運、轉變、命運。變化即將來臨，擁抱生命的循環。", image: "wheeloffortune.jpeg" },
  { name: "正義 Justice", description: "公平、真相、因果。誠實面對自己，接受行動的後果。", image: "justice.jpeg" },
  { name: "倒吊人 The Hanged Man", description: "犧牲、放下、新視角。換個角度看問題，會有新發現。", image: "thehangedman.jpeg" },
  { name: "死神 Death", description: "結束、轉化、重生。舊的結束是新的開始。", image: "death.jpeg" },
  { name: "節制 Temperance", description: "平衡、耐心、調和。找到中庸之道，融合對立的力量。", image: "temperance.jpeg" },
  { name: "惡魔 The Devil", description: "束縛、慾望、陰影。認清什麼在限制你，勇敢打破枷鎖。", image: "thedevil.jpeg" },
  { name: "高塔 The Tower", description: "突變、崩塌、啟示。舊結構崩塌，為新事物騰出空間。", image: "thetower.jpeg" },
  { name: "星星 The Star", description: "希望、靈感、療癒。黑暗過後，光明必將到來。", image: "thestar.jpeg" },
  { name: "月亮 The Moon", description: "幻象、恐懼、潛意識。穿越迷霧，面對內心的恐懼。", image: "themoon.jpeg" },
  { name: "太陽 The Sun", description: "喜悅、成功、活力。光明照耀，享受生命的美好。", image: "thesun.jpeg" },
  { name: "審判 Judgement", description: "覺醒、重生、召喚。聆聽內心的召喚，迎接蛻變。", image: "judgement.jpeg" },
  { name: "世界 The World", description: "完成、圓滿、整合。一個週期結束，成就已達成。", image: "theworld.jpeg" },
  // Minor Arcana - Wands (14)
  { name: "權杖王牌", description: "新的靈感、創造力的種子、熱情的開始。", image: "aceofwands.jpeg" },
  { name: "權杖二", description: "規劃、做決定、展望未來。", image: "twoofwands.jpeg" },
  { name: "權杖三", description: "擴展、遠見、海外機會。", image: "threeofwands.jpeg" },
  { name: "權杖四", description: "慶祝、和諧、家庭幸福。", image: "fourofwands.jpeg" },
  { name: "權杖五", description: "衝突、競爭、意見分歧。", image: "fiveofwands.jpeg" },
  { name: "權杖六", description: "勝利、認可、公眾讚譽。", image: "sixofwands.jpeg" },
  { name: "權杖七", description: "防禦、堅持立場、勇氣。", image: "sevenofwands.jpeg" },
  { name: "權杖八", description: "迅速行動、進展、旅行。", image: "eightofwands.jpeg" },
  { name: "權杖九", description: "堅韌、堅持、最後的挑戰。", image: "nineofwands.jpeg" },
  { name: "權杖十", description: "負擔、責任、壓力過大。", image: "tenofwands.jpeg" },
  { name: "權杖侍從", description: "熱情、探索、新消息。", image: "pageofwands.jpeg" },
  { name: "權杖騎士", description: "冒險、衝動、大膽行動。", image: "knightofwands.jpeg" },
  { name: "權杖皇后", description: "自信、獨立、熱情洋溢。", image: "queenofwands.jpeg" },
  { name: "權杖國王", description: "領導力、遠見、創業精神。", image: "kingofwands.jpeg" },
  // Minor Arcana - Cups (14)
  { name: "聖杯王牌", description: "新的感情、直覺、情感的開始。", image: "aceofcups.jpeg" },
  { name: "聖杯二", description: "夥伴關係、愛情、連結。", image: "twoofcups.jpeg" },
  { name: "聖杯三", description: "慶祝、友誼、社交聚會。", image: "threeofcups.jpeg" },
  { name: "聖杯四", description: "冥想、重新評估、退縮。", image: "fourofcups.jpeg" },
  { name: "聖杯五", description: "失落、遺憾、悲傷。", image: "fiveofcups.jpeg" },
  { name: "聖杯六", description: "懷舊、童年回憶、純真。", image: "sixofcups.jpeg" },
  { name: "聖杯七", description: "幻想、選擇、白日夢。", image: "sevenofcups.jpeg" },
  { name: "聖杯八", description: "離開、放棄、尋找更深層意義。", image: "eightofcups.jpeg" },
  { name: "聖杯九", description: "滿足、願望成真、感恩。", image: "nineofcups.jpeg" },
  { name: "聖杯十", description: "家庭幸福、情感圓滿、和諧。", image: "tenofcups.jpeg" },
  { name: "聖杯侍從", description: "創意、敏感、新的感情。", image: "pageofcups.jpeg" },
  { name: "聖杯騎士", description: "浪漫、魅力、追求者。", image: "knightofcups.jpeg" },
  { name: "聖杯皇后", description: "同理心、直覺、情感成熟。", image: "queenofcups.jpeg" },
  { name: "聖杯國王", description: "情感平衡、外交、慷慨。", image: "kingofcups.jpeg" },
  // Minor Arcana - Swords (14)
  { name: "寶劍王牌", description: "突破、新想法、清晰思維。", image: "aceofswords.jpeg" },
  { name: "寶劍二", description: "抉擇、僵局、權衡利弊。", image: "twoofswords.jpeg" },
  { name: "寶劍三", description: "心痛、悲傷、失落。", image: "threeofswords.jpeg" },
  { name: "寶劍四", description: "休息、恢復、冥想。", image: "fourofswords.jpeg" },
  { name: "寶劍五", description: "衝突、不和、勝之不武。", image: "fiveofswords.jpeg" },
  { name: "寶劍六", description: "過渡、離開、向前。", image: "sixofswords.jpeg" },
  { name: "寶劍七", description: "策略、欺騙、狡猾。", image: "sevenofswords.jpeg" },
  { name: "寶劍八", description: "限制、受困、無力。", image: "eightofswords.jpeg" },
  { name: "寶劍九", description: "焦慮、噩夢、擔憂。", image: "nineofswords.jpeg" },
  { name: "寶劍十", description: "結束、痛苦的終結、新開始。", image: "tenofswords.jpeg" },
  { name: "寶劍侍從", description: "好奇、機警、新觀點。", image: "pageofswords.jpeg" },
  { name: "寶劍騎士", description: "果斷、直接、野心。", image: "knightofswords.jpeg" },
  { name: "寶劍皇后", description: "獨立、理性、直言不諱。", image: "queenofswords.jpeg" },
  { name: "寶劍國王", description: "智慧、權威、清晰判斷。", image: "kingofswords.jpeg" },
  // Minor Arcana - Pentacles (14)
  { name: "錢幣王牌", description: "新機會、財務開始、物質基礎。", image: "aceofpentacles.jpeg" },
  { name: "錢幣二", description: "平衡、適應、多工處理。", image: "twoofpentacles.jpeg" },
  { name: "錢幣三", description: "團隊合作、學習、技能。", image: "threeofpentacles.jpeg" },
  { name: "錢幣四", description: "控制、安全感、守財。", image: "fourofpentacles.jpeg" },
  { name: "錢幣五", description: "困難、貧困、孤立。", image: "fiveofpentacles.jpeg" },
  { name: "錢幣六", description: "慷慨、施與受、平衡。", image: "sixofpentacles.jpeg" },
  { name: "錢幣七", description: "耐心、長期投資、評估。", image: "sevenofpentacles.jpeg" },
  { name: "錢幣八", description: "專注、技藝、努力。", image: "eightofpentacles.jpeg" },
  { name: "錢幣九", description: "獨立、富裕、自給自足。", image: "nineofpentacles.jpeg" },
  { name: "錢幣十", description: "家族財富、傳承、長期成功。", image: "tenofpentacles.jpeg" },
  { name: "錢幣侍從", description: "學習、新技能、機會。", image: "pageofpentacles.jpeg" },
  { name: "錢幣騎士", description: "勤奮、可靠、穩步前進。", image: "knightofpentacles.jpeg" },
  { name: "錢幣皇后", description: "實際、滋養、財務智慧。", image: "queenofpentacles.jpeg" },
  { name: "錢幣國王", description: "富有、商業頭腦、安全穩定。", image: "kingofpentacles.jpeg" },
];

interface AIReading {
  interpretation: string;
  advice: string;
}

export default function TarotPage() {
  const { user } = useAuth();
  const [question, setQuestion] = useState('');
  const [phase, setPhase] = useState<'input' | 'shuffling' | 'drawing' | 'result'>('input');
  const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([]);
  const [spreadType, setSpreadType] = useState<'single' | 'three'>('single');
  const [currentCardIndex, setCurrentCardIndex] = useState(-1);
  const [aiReading, setAiReading] = useState<AIReading | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const positions = useMemo(
    () => spreadType === 'single' ? ['指引'] : ['過去', '現在', '未來'],
    [spreadType],
  );

  const shuffleAndDraw = useCallback(async () => {
    if (!question.trim()) return;

    setPhase('shuffling');
    setDrawnCards([]);
    setCurrentCardIndex(-1);
    setAiReading(null);
    setAiError(null);

    // Shuffle animation
    await new Promise(resolve => setTimeout(resolve, 2000));

    setPhase('drawing');

    // Draw cards
    const cardCount = spreadType === 'single' ? 1 : 3;
    const shuffled = [...TAROT_CARDS].sort(() => Math.random() - 0.5);
    const drawn: DrawnCard[] = [];

    for (let i = 0; i < cardCount; i++) {
      setCurrentCardIndex(i);
      await new Promise(resolve => setTimeout(resolve, 1000));

      drawn.push({
        card: shuffled[i],
        reversed: Math.random() > 0.7, // 30% 逆位
        position: positions[i],
      });
      setDrawnCards([...drawn]);
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    setPhase('result');

    // Ask AI to interpret the spread now that the cards are revealed.
    setAiLoading(true);
    try {
      const { interpretTarot } = await import('@/lib/api');
      const reading = await interpretTarot(
        question.trim(),
        drawn.map(d => ({ name: d.card.name, position: d.position, reversed: d.reversed })),
      );
      setAiReading(reading);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI 解讀失敗');
    } finally {
      setAiLoading(false);
    }
  }, [question, spreadType, positions]);

  const resetReading = () => {
    setPhase('input');
    setDrawnCards([]);
    setQuestion('');
    setCurrentCardIndex(-1);
    setAiReading(null);
    setAiError(null);
  };

  if (!user) return null;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/dashboard" className={styles.backLink}>← 返回</Link>
        <h1>塔羅牌</h1>
        <p className={styles.subtitle}>78 張完整牌組・高品質圖像</p>
      </header>

      {phase === 'input' && (
        <div className={styles.inputSection}>
          <div className={styles.spreadSelector}>
            <button
              className={`${styles.spreadBtn} ${spreadType === 'single' ? styles.active : ''}`}
              onClick={() => setSpreadType('single')}
            >
              🎴 單牌指引
            </button>
            <button
              className={`${styles.spreadBtn} ${spreadType === 'three' ? styles.active : ''}`}
              onClick={() => setSpreadType('three')}
            >
              🎴🎴🎴 三牌陣
            </button>
          </div>

          <label className={styles.label}>你想問什麼？</label>
          <textarea
            className={styles.textarea}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="靜心冥想你的問題..."
            rows={3}
          />

          <button
            className={styles.drawButton}
            onClick={shuffleAndDraw}
            disabled={!question.trim()}
          >
            洗牌抽牌
          </button>
        </div>
      )}

      {phase === 'shuffling' && (
        <div className={styles.shufflePhase}>
          <div className={styles.cardDeck}>
            {[...Array(7)].map((_, i) => (
              <div
                key={i}
                className={styles.shuffleCard}
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
          <p className={styles.shuffleText}>洗牌中...</p>
        </div>
      )}

      {phase === 'drawing' && (
        <div className={styles.drawingPhase}>
          <div className={styles.drawingCards}>
            {positions.map((pos, i) => (
              <div key={pos} className={styles.cardSlot}>
                <div className={styles.positionLabel}>{pos}</div>
                <div className={`${styles.cardPlaceholder} ${i <= currentCardIndex ? styles.revealed : ''}`}>
                  {drawnCards[i] ? (
                    <Image
                      src={`${IMAGE_BASE}/${drawnCards[i].card.image}`}
                      alt={drawnCards[i].card.name}
                      width={120}
                      height={200}
                      className={`${styles.cardImg} ${drawnCards[i].reversed ? styles.reversed : ''}`}
                    />
                  ) : (
                    <div className={styles.cardBack}>🎴</div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className={styles.drawingText}>抽取第 {currentCardIndex + 2} 張牌...</p>
        </div>
      )}

      {phase === 'result' && (
        <div className={styles.resultSection}>
          <div className={styles.questionBox}>✦ {question}</div>

          <div className={styles.cardResults}>
            {drawnCards.map((dc, i) => (
              <div key={i} className={styles.cardResult}>
                <div className={styles.positionBadge}>{dc.position}</div>
                
                <div className={`${styles.resultCard} ${dc.reversed ? styles.reversed : ''}`}>
                  <Image
                    src={`${IMAGE_BASE}/${dc.card.image}`}
                    alt={dc.card.name}
                    width={180}
                    height={300}
                    className={styles.resultCardImg}
                  />
                  {dc.reversed && <div className={styles.reversedOverlay}>逆位</div>}
                </div>

                <div className={styles.cardInfo}>
                  <h3>{dc.card.name}</h3>
                  <p>{dc.reversed ? `⟲ ${dc.card.description}` : dc.card.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* AI overall reading of the spread against the question */}
          <div className={styles.interpretation}>
            <h3>AI 整體解讀</h3>
            {aiLoading && <p style={{ opacity: 0.7 }}>解讀中…</p>}
            {aiError && <p style={{ color: '#f87171' }}>{aiError}</p>}
            {aiReading && (
              <>
                <p>{aiReading.interpretation}</p>
                {aiReading.advice && (
                  <>
                    <h4 style={{ marginTop: '1rem' }}>建議</h4>
                    <p>{aiReading.advice}</p>
                  </>
                )}
              </>
            )}
          </div>

          <button className={styles.resetButton} onClick={resetReading}>
            重新抽牌
          </button>
        </div>
      )}
    </div>
  );
}

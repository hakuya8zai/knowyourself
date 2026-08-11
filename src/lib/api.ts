/**
 * API Client for knowyourself — v2
 */
import { z } from 'zod';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.selfkit.art/api/v1';

let refreshPromise: Promise<boolean> | null = null;
const REQUEST_TIMEOUT_MS = 30_000;

async function fetchWithTimeout(
  input: string,
  init: RequestInit = {},
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort(init.signal?.reason);
  if (init.signal?.aborted) {
    abortFromCaller();
  } else {
    init.signal?.addEventListener('abort', abortFromCaller, { once: true });
  }
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    init.signal?.removeEventListener('abort', abortFromCaller);
  }
}

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetchWithTimeout(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(response => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// Wraps fetch with auto-refresh on 401: tries /auth/refresh once, then retries the
// original request. Always sends httpOnly cookies. Use this for any authenticated
// or auth-eligible API call so a short access TTL stays invisible to users.
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const opts: RequestInit = { ...init, credentials: 'include' };
  const firstResponse = await fetchWithTimeout(input, opts);
  if (firstResponse.status !== 401) return firstResponse;

  if (!await refreshAccessToken()) return firstResponse;

  return fetchWithTimeout(input, opts);
}

export interface BirthInfo {
  birth_date: string;
  birth_time?: string;
  birth_place?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  gender?: string;  // BE accepts any string; strict literal would force casts at every call site
}

export interface GenerateManualRequest {
  birth_info: BirthInfo;
}

export interface SpectrumData {
  action: number;
  social: number;
  creativity: number;
  analysis: number;
  intuition: number;
  resilience: number;
}

export interface Section {
  id: string;
  heading: string;
  content: string;
  sub_points?: string[];
}

export interface LuckyGuide {
  color: string;
  number: number;
  direction: string;
  element: string;
  season: string;
}

export interface PlanetPosition {
  name: string;
  name_en?: string;
  sign: string;
  sign_en?: string;
  element?: string;
  degree?: number;
  retrograde?: boolean;
  house?: number;
}

export interface AspectData {
  planet1: string;
  planet2: string;
  aspect: string;
  orb: number;
}

export interface ChartPattern {
  name: string;           // Grand Trine
  name_cn: string;        // 大三角
  planets: string[];      // [太陽, 月亮, 木星]
  element?: string;       // 水象 (for Grand Trine)
  sign?: string;          // 巨蟹座 (for Stellium)
  apex?: string;          // 頂點行星 (for T-Square)
  interpretation?: string;
}

export interface WesternAstro {
  sun_sign: string;
  sun_element: string;
  moon_sign?: string;
  rising_sign?: string;
  sun_traits?: string;
  // Enhanced precision fields
  sun_degree?: number;
  moon_degree?: number;
  asc_degree?: number;
  planets?: PlanetPosition[];
  aspects?: AspectData[];
  patterns?: ChartPattern[];   // 格局：大三角、T三角等
  calculation_method?: 'ai_estimated' | 'kerykeion_swiss_ephemeris';
  has_birth_time?: boolean;
}

export interface ZiweiPattern {
  id?: string;
  name: string;           // 紫府同宮格
  category?: string;      // 富貴格
  interpretation?: string;
  matched_stars?: string[];
}

export interface ZiweiPalace {
  name: string;           // 命宮
  branch: string;         // 子
  major_stars: string[];  // [紫微, 天府]
  minor_stars?: string[];
  sihua?: string[];       // [化祿, 化權]
}

export interface ZiweiChart {
  lunar_date?: string;    // 農曆 1990年6月15日
  year_pillar?: string;   // 庚午
  wu_xing_ju?: string;    // 土五局
  ming_gong_branch?: string;
  shen_gong_branch?: string;
  palaces?: ZiweiPalace[];
  patterns?: ZiweiPattern[];
  calculation_method?: string;
}

export interface ChineseAstro {
  zodiac: string;
  element: string;
  bazi_day_master?: string;
  bazi_summary?: string;
  ziwei?: ZiweiChart;
}

export interface HumanDesignData {
  type?: string;
  strategy?: string;
  authority?: string;
  profile?: string;
}

export interface DeepData {
  // Legacy
  zodiac_name: string;
  zodiac_element: string;
  chinese_zodiac: string;
  chinese_element: string;
  // Expanded
  western?: WesternAstro;
  chinese?: ChineseAstro;
  human_design?: HumanDesignData;
}

export interface UserManual {
  id: string;
  birth_date?: string;
  generated_at: string;
  profile: {
    label: string;
    tagline: string;
  };
  spectrum: SpectrumData;
  sections: Section[];
  lucky: LuckyGuide;
  deep_data: DeepData;
}

const UserManualSchema: z.ZodType<UserManual> = z.object({
  id: z.string().min(1),
  birth_date: z.string().min(1).optional(),
  generated_at: z.string().min(1),
  profile: z.object({
    label: z.string(),
    tagline: z.string(),
  }),
  spectrum: z.object({
    action: z.number(),
    social: z.number(),
    creativity: z.number(),
    analysis: z.number(),
    intuition: z.number(),
    resilience: z.number(),
  }),
  sections: z.array(z.object({
    id: z.string(),
    heading: z.string(),
    content: z.string(),
    sub_points: z.array(z.string()).optional(),
  })),
  lucky: z.object({
    color: z.string(),
    number: z.number(),
    direction: z.string(),
    element: z.string(),
    season: z.string(),
  }),
  deep_data: z.object({
    zodiac_name: z.string(),
    zodiac_element: z.string(),
    chinese_zodiac: z.string(),
    chinese_element: z.string(),
    western: z.custom<WesternAstro>().optional(),
    chinese: z.custom<ChineseAstro>().optional(),
    human_design: z.custom<HumanDesignData>().optional(),
  }),
});

async function parseManualResponse(response: Response): Promise<UserManual> {
  return UserManualSchema.parse(await response.json());
}

/**
 * Generate User Manual
 */
export async function generateManual(request: GenerateManualRequest): Promise<UserManual> {
  const response = await authFetch(`${API_URL}/manual/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || '生成失敗');
  }

  return parseManualResponse(response);
}

/**
 * Get Manual by ID
 */
export async function getManual(manualId: string): Promise<UserManual> {
  const response = await authFetch(`${API_URL}/manual/${manualId}`);

  if (!response.ok) {
    throw new Error('找不到使用說明書');
  }

  return parseManualResponse(response);
}

export type DetailSystem = 'western' | 'ziwei' | 'bazi' | 'human_design' | 'meihua';

export interface DetailResponse {
  system: string;
  data: Record<string, unknown>;
}

const DetailResponseSchema: z.ZodType<DetailResponse> = z.object({
  system: z.string(),
  data: z.record(z.string(), z.unknown()),
});

/**
 * Get-or-create per-system detail from birth_info.
 * Idempotent: same birth_info + system always returns same data (GCS cached).
 * Use this from dashboard pages instead of regenerating the full manual.
 */
export async function getDetailByBirth(
  system: DetailSystem,
  birthInfo: BirthInfo,
): Promise<DetailResponse> {
  const response = await authFetch(`${API_URL}/manual/detail/${system}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ birth_info: birthInfo }),
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('NEED_LOGIN');
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || '載入失敗');
  }

  return DetailResponseSchema.parse(await response.json());
}

/**
 * Get detailed reading for a specific system (requires auth via httpOnly cookie)
 */
export async function getManualDetail(manualId: string, system: DetailSystem): Promise<DetailResponse> {
  const response = await authFetch(`${API_URL}/manual/${manualId}/detail/${system}`);

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('NEED_LOGIN');
    }
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || '載入失敗');
  }

  return DetailResponseSchema.parse(await response.json());
}

// ============================================================
// USER STORAGE
// ============================================================

/**
 * Save a manual to user's collection (uses httpOnly cookie for auth)
 */
export async function saveManual(manualId: string): Promise<{ success: boolean; doc_id: string }> {
  const response = await authFetch(`${API_URL}/manual/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ manual_id: manualId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || '儲存失敗');
  }

  return z.object({
    success: z.literal(true),
    doc_id: z.string(),
  }).parse(await response.json());
}

export interface SavedManualSummary {
  id: string;
  birth_date: string;
  profile: { label: string; tagline: string };
  saved_at: string;
  shared?: boolean;
}

const SavedManualListSchema = z.object({
  manuals: z.array(z.object({
    id: z.string(),
    birth_date: z.string(),
    profile: z.object({
      label: z.string(),
      tagline: z.string(),
    }),
    saved_at: z.string(),
    shared: z.boolean().optional(),
  })),
});

/**
 * List user's saved manuals
 */
export async function listSavedManuals(userId: string): Promise<{ manuals: SavedManualSummary[] }> {
  const response = await authFetch(`${API_URL}/manual/user/${userId}`);

  if (!response.ok) {
    throw new Error('載入失敗');
  }

  return SavedManualListSchema.parse(await response.json());
}

/**
 * Get a saved manual
 */
export async function getSavedManual(userId: string, manualId: string): Promise<UserManual> {
  const response = await authFetch(`${API_URL}/manual/user/${userId}/${manualId}`);

  if (!response.ok) {
    throw new Error('找不到已儲存的說明書');
  }

  return parseManualResponse(response);
}

/**
 * Delete a saved manual
 */
export async function deleteSavedManual(userId: string, manualId: string): Promise<{ success: boolean }> {
  const response = await authFetch(`${API_URL}/manual/user/${userId}/${manualId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('刪除失敗');
  }

  return z.object({ success: z.literal(true) }).parse(await response.json());
}

export async function createManualShare(
  userId: string,
  manualId: string,
): Promise<{ share_token: string }> {
  const response = await authFetch(`${API_URL}/manual/user/${userId}/${manualId}/share`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('建立分享連結失敗');
  return z.object({ share_token: z.string().min(20) }).parse(await response.json());
}

export async function revokeManualShare(
  userId: string,
  manualId: string,
): Promise<void> {
  const response = await authFetch(`${API_URL}/manual/user/${userId}/${manualId}/share`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('停用分享連結失敗');
}

export async function getSharedManual(shareToken: string): Promise<UserManual> {
  const response = await fetch(`${API_URL}/manual/shared/${shareToken}`);
  if (!response.ok) throw new Error('分享連結不存在或已停用');
  return parseManualResponse(response);
}

export async function deleteAccount(): Promise<void> {
  const response = await authFetch(`${API_URL}/auth/account`, { method: 'DELETE' });
  if (!response.ok) throw new Error('刪除帳號失敗');
}

// ============================================================
// CHAT API
// ============================================================

export interface ManualContext {
  label?: string;
  tagline?: string;
  zodiac?: string;
  chinese_zodiac?: string;
  sun_sign?: string;
  moon_sign?: string;
  rising_sign?: string;
  bazi_summary?: string;
  human_design_type?: string;
  human_design_strategy?: string;
  human_design_authority?: string;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  message: string;
  manual_id?: string;
  manual_context?: ManualContext;
  history?: ChatTurn[];  // Recent turns for context; BE is stateless.
  stream?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
}

export interface ChatResponse {
  message: ChatMessage;
}

/**
 * Send a chat message (non-streaming)
 */
// === DIVINATION ===

export interface TarotCardInterpretInput {
  name: string;
  position?: string;
  reversed?: boolean;
}

export interface TarotInterpretation {
  interpretation: string;
  advice: string;
}

export async function interpretTarot(
  question: string,
  cards: TarotCardInterpretInput[],
): Promise<TarotInterpretation> {
  const response = await authFetch(`${API_URL}/divination/tarot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, cards }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || '解讀失敗');
  }
  return response.json();
}

export interface MeihuaResult {
  derivation: Record<string, unknown>;
  primary_hexagram: { number: number; name: string; meaning: string; upper_trigram: Record<string, unknown>; lower_trigram: Record<string, unknown> };
  mutual_hexagram: { number: number; name: string; meaning?: string };
  transformed_hexagram: { number: number; name: string; meaning?: string };
  changing_line: { position: number; location: string; description: string };
  interpretation: string;
  advice: string;
}

export async function divineMeihua(question: string): Promise<MeihuaResult> {
  const response = await authFetch(`${API_URL}/divination/meihua`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || '起卦失敗');
  }
  return response.json();
}

export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  const response = await authFetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('對話失敗');
  }

  return z.object({
    message: z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
      sources: z.array(z.string()).optional(),
    }),
  }).parse(await response.json());
}

/**
 * Send a chat message with SSE streaming
 */
export async function sendChatMessageStream(
  request: ChatRequest,
  onChunk: (content: string) => void,
  onDone: () => void,
  onError: (error: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await authFetch(`${API_URL}/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    throw new Error('對話失敗');
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('無法讀取串流');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let finished = false;

  const processEvent = (eventBlock: string) => {
    const dataLines = eventBlock
      .split('\n')
      .filter(line => line.startsWith('data:'))
      .map(line => line.slice(5).replace(/^ /, ''));
    if (dataLines.length === 0) return;

    try {
      const data = JSON.parse(dataLines.join('\n'));
      if (data.type === 'chunk' && typeof data.content === 'string') {
        onChunk(data.content);
      } else if (data.type === 'done') {
        finished = true;
        onDone();
      } else if (data.type === 'error') {
        finished = true;
        onError(typeof data.content === 'string' ? data.content : '對話發生錯誤');
      }
    } catch {
      finished = true;
      onError('收到無法解析的串流資料');
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';
      events.forEach(processEvent);
    }

    buffer += decoder.decode().replace(/\r\n/g, '\n');
    if (buffer.trim()) processEvent(buffer);
    if (!finished) {
      finished = true;
      onDone();
    }
  } finally {
    reader.releaseLock();
    if (signal?.aborted && !finished) {
      try {
        await response.body?.cancel();
      } catch {
        // The stream may already be closed.
      }
    }
  }
}

/**
 * Extract ManualContext from UserManual
 */
export function extractManualContext(manual: UserManual): ManualContext {
  const ctx: ManualContext = {};
  
  if (manual.profile?.label) ctx.label = manual.profile.label;
  if (manual.profile?.tagline) ctx.tagline = manual.profile.tagline;
  
  if (manual.deep_data) {
    const dd = manual.deep_data;
    if (dd.zodiac_name) ctx.zodiac = dd.zodiac_name;
    if (dd.chinese_zodiac) ctx.chinese_zodiac = dd.chinese_zodiac;
    
    if (dd.western) {
      if (dd.western.sun_sign) ctx.sun_sign = dd.western.sun_sign;
      if (dd.western.moon_sign) ctx.moon_sign = dd.western.moon_sign;
      if (dd.western.rising_sign) ctx.rising_sign = dd.western.rising_sign;
    }
    
    if (dd.chinese?.bazi_summary) {
      ctx.bazi_summary = dd.chinese.bazi_summary;
    }
    
    if (dd.human_design) {
      if (dd.human_design.type) ctx.human_design_type = dd.human_design.type;
      if (dd.human_design.strategy) ctx.human_design_strategy = dd.human_design.strategy;
      if (dd.human_design.authority) ctx.human_design_authority = dd.human_design.authority;
    }
  }
  
  return ctx;
}

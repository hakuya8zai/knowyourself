import { afterEach, describe, expect, it, vi } from 'vitest';
import { authFetch, sendChatMessageStream } from './api';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('authFetch', () => {
  it('shares one refresh request across concurrent 401 responses', async () => {
    let refreshCalls = 0;
    let resourceCalls = 0;
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith('/auth/refresh')) {
        refreshCalls += 1;
        await Promise.resolve();
        return new Response('{}', { status: 200 });
      }
      resourceCalls += 1;
      return new Response('{}', { status: resourceCalls <= 2 ? 401 : 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const [first, second] = await Promise.all([
      authFetch('https://api.example.test/one'),
      authFetch('https://api.example.test/two'),
    ]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(refreshCalls).toBe(1);
  });
});

describe('sendChatMessageStream', () => {
  it('parses CRLF SSE chunks and treats EOF as completion', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(
          'data: {"type":"chunk","content":"你"}\r\n\r\n'
          + 'data: {"type":"chunk","content":"好"}\r\n\r\n',
        ));
        controller.close();
      },
    });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(stream, { status: 200 })));
    const chunks: string[] = [];
    const onDone = vi.fn();
    const onError = vi.fn();

    await sendChatMessageStream(
      { message: 'hello' },
      chunk => chunks.push(chunk),
      onDone,
      onError,
    );

    expect(chunks.join('')).toBe('你好');
    expect(onDone).toHaveBeenCalledOnce();
    expect(onError).not.toHaveBeenCalled();
  });

  it('reports malformed events without also marking them done', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: not-json\n\n'));
        controller.close();
      },
    });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(stream, { status: 200 })));
    const onDone = vi.fn();
    const onError = vi.fn();

    await sendChatMessageStream(
      { message: 'hello' },
      vi.fn(),
      onDone,
      onError,
    );

    expect(onError).toHaveBeenCalledOnce();
    expect(onDone).not.toHaveBeenCalled();
  });
});

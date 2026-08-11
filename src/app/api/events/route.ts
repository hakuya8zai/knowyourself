import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const EventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('web-vital'),
    name: z.enum(['CLS', 'FCP', 'INP', 'LCP', 'TTFB']),
    value: z.number().finite(),
    rating: z.enum(['good', 'needs-improvement', 'poor']).optional(),
    path: z.string().max(200),
  }),
  z.object({
    type: z.literal('client-error'),
    error_name: z.string().max(80),
    path: z.string().max(200),
  }),
]);

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  if (Number(request.headers.get('content-length') || 0) > 2_048) {
    return NextResponse.json({ error: 'too large' }, { status: 413 });
  }

  const parsed = EventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid event' }, { status: 400 });
  }

  const log = JSON.stringify({
    event: parsed.data,
    timestamp: new Date().toISOString(),
  });
  if (parsed.data.type === 'client-error') {
    console.error(log);
  } else {
    console.info(log);
  }
  return new NextResponse(null, { status: 204 });
}

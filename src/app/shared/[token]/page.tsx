import type { Metadata } from 'next';
import { ManualPage } from '@/components/ManualPage';

export const metadata: Metadata = {
  title: '分享的使用說明書',
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ token: string }>;
}

export default async function SharedManual({ params }: Props) {
  const { token } = await params;
  return <ManualPage shareToken={token} />;
}

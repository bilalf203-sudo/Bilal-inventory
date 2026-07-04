import type { PropsWithChildren } from 'react';
import { AppShell } from '@/components/layout/AppShell';

export default function AnalyticsLayout({ children }: PropsWithChildren) {
  return <AppShell>{children}</AppShell>;
}

import type { PropsWithChildren } from 'react';
import { AppShell } from '@/components/layout/AppShell';

export default function SettingsLayout({ children }: PropsWithChildren) {
  return <AppShell>{children}</AppShell>;
}

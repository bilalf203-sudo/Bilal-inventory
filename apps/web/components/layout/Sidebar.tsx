'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  LayoutDashboard,
  Settings as SettingsIcon,
  ShoppingBag,
  Users,
  FileText,
  X,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { PERMISSIONS } from '@bilal/shared';
import { useBrand, useUIStore } from '@/stores';
import { hasPermission } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { useMarketplaces, prefetchMarketplaceArticles } from '@/features/marketplaces/api';
import { BrandSwitcher } from './BrandSwitcher';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();
  const qc = useQueryClient();
  const { brandId, context } = useBrand();
  const mobileOpen = useUIStore((s) => s.mobileSidebarOpen);
  const setMobileOpen = useUIStore((s) => s.setMobileSidebarOpen);

  // Close the drawer whenever the route changes (e.g. after tapping a nav item).
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  // Shares the marketplaces cache with the prefetcher and the detail pages.
  const marketplacesQuery = useMarketplaces(
    false,
    !!brandId && hasPermission(context, PERMISSIONS.MARKETPLACE_READ),
  );

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setMobileOpen(false)}
        aria-hidden
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r bg-card transition-transform duration-200 ease-in-out lg:static lg:z-auto lg:translate-x-0 lg:transition-none',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center gap-1 border-b p-3">
          <div className="min-w-0 flex-1">
            <BrandSwitcher />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <NavItem
            href="/warehouse"
            icon={<LayoutDashboard className="h-4 w-4" />}
            label="Warehouse"
            active={pathname.startsWith('/warehouse')}
          />
          {hasPermission(context, PERMISSIONS.INVENTORY_READ) && (
            <NavItem
              href="/analytics"
              icon={<BarChart3 className="h-4 w-4" />}
              label="Analytics"
              active={pathname.startsWith('/analytics')}
            />
          )}

          <div className="mt-6">
            <div className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Marketplaces
            </div>
            {marketplacesQuery.data?.map((m) => (
              <NavItem
                key={m.id}
                href={`/marketplaces/${m.id}`}
                icon={
                  <span
                    className="h-3 w-3 shrink-0 rounded-sm"
                    style={{ backgroundColor: m.color }}
                    aria-hidden
                  />
                }
                label={m.name}
                active={pathname.startsWith(`/marketplaces/${m.id}`)}
                onPrefetch={() => void prefetchMarketplaceArticles(qc, m.id)}
              />
            ))}
            {marketplacesQuery.data?.length === 0 && (
              <div className="px-3 py-2 text-xs italic text-muted-foreground">
                No marketplaces yet
              </div>
            )}
          </div>

          {hasPermission(context, PERMISSIONS.SETTINGS_READ) && (
            <div className="mt-6">
              <div className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Settings
              </div>
              <NavItem
                href="/settings"
                icon={<SettingsIcon className="h-4 w-4" />}
                label="General"
                active={pathname === '/settings'}
              />
              {hasPermission(context, PERMISSIONS.BRAND_MEMBER_READ) && (
                <NavItem
                  href="/settings/members"
                  icon={<Users className="h-4 w-4" />}
                  label="Members"
                  active={pathname.startsWith('/settings/members')}
                />
              )}
              {hasPermission(context, PERMISSIONS.MARKETPLACE_CREATE) && (
                <NavItem
                  href="/settings/marketplaces"
                  icon={<ShoppingBag className="h-4 w-4" />}
                  label="Marketplaces"
                  active={pathname.startsWith('/settings/marketplaces')}
                />
              )}
              {hasPermission(context, PERMISSIONS.AUDIT_LOG_READ) && (
                <NavItem
                  href="/settings/audit"
                  icon={<FileText className="h-4 w-4" />}
                  label="Audit Log"
                  active={pathname.startsWith('/settings/audit')}
                />
              )}
            </div>
          )}
        </nav>
      </aside>
    </>
  );
}

function NavItem({
  href,
  icon,
  label,
  active,
  onPrefetch,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onPrefetch?: () => void;
}) {
  return (
    <Link
      href={href}
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
      onTouchStart={onPrefetch}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition',
        active
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
    </Link>
  );
}

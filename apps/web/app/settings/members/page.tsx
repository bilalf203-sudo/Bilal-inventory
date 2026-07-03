'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, UserPlus, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { PERMISSIONS, inviteBrandMemberSchema, type InviteBrandMemberInput } from '@bilal/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Can } from '@/components/common/Can';
import { EmptyState } from '@/components/common/EmptyState';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useBrandMembers,
  useInviteMember,
  useRemoveMember,
  useUpdateMemberRole,
} from '@/features/brands/api';
import { apiGet } from '@/lib/api-client';

interface Role {
  id: string;
  name: string;
  description: string | null;
}

export default function MembersPage() {
  const members = useBrandMembers();
  const roles = useQuery({
    queryKey: ['roles'],
    queryFn: () => apiGet<Role[]>('/roles'),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Members</h1>
          <p className="text-sm text-muted-foreground">Users with access to this brand.</p>
        </div>
        <Can permission={PERMISSIONS.BRAND_MEMBER_INVITE}>
          <InviteDialog roles={roles.data ?? []} />
        </Can>
      </div>

      {members.isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : members.data && members.data.length > 0 ? (
        <div className="space-y-2">
          {members.data.map((m) => (
            <MemberRow key={m.userId} member={m} roles={roles.data ?? []} />
          ))}
        </div>
      ) : (
        <EmptyState icon={Users} title="No members yet" />
      )}
    </div>
  );
}

function MemberRow({
  member,
  roles,
}: {
  member: {
    userId: string;
    user: { email: string; fullName: string | null };
    role: { id: string; name: string };
  };
  roles: Role[];
}) {
  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
        <div className="min-w-0 sm:flex-1">
          <div className="truncate font-semibold">{member.user.fullName ?? member.user.email}</div>
          <div className="truncate text-xs text-muted-foreground">{member.user.email}</div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Can
            permission={PERMISSIONS.BRAND_MEMBER_UPDATE_ROLE}
            fallback={<Badge variant="outline">{member.role.name}</Badge>}
          >
            <Select
              value={member.role.id}
              onValueChange={(roleId) => updateRole.mutate({ userId: member.userId, roleId })}
            >
              <SelectTrigger className="min-w-0 flex-1 sm:w-48 sm:flex-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Can>
          <Can permission={PERMISSIONS.BRAND_MEMBER_REMOVE}>
            <Button
              variant="destructive"
              size="sm"
              className="shrink-0"
              onClick={() => {
                if (confirm(`Remove ${member.user.email}?`)) removeMember.mutate(member.userId);
              }}
            >
              Remove
            </Button>
          </Can>
        </div>
      </CardContent>
    </Card>
  );
}

function InviteDialog({ roles }: { roles: Role[] }) {
  const [open, setOpen] = useState(false);
  const invite = useInviteMember();
  const form = useForm<InviteBrandMemberInput>({
    resolver: zodResolver(inviteBrandMemberSchema),
    defaultValues: { email: '', roleId: roles[0]?.id ?? '' },
  });

  const onSubmit = async (values: InviteBrandMemberInput) => {
    await invite.mutateAsync(values);
    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4" />
          Add member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add member to brand</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...form.register('email')} />
            <p className="text-xs text-muted-foreground">
              User must already exist (have signed in once).
            </p>
            {form.formState.errors.email && (
              <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={form.watch('roleId')} onValueChange={(v) => form.setValue('roleId', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Loader2, Users, User, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

type WorkspaceMember = { user_id: string; email: string; role: string; created_at: string; is_self: boolean }
type Workspace = { id: string; name: string; slug: string; role: string; created_at: string }

export default function TeamSettingsPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [membersCache, setMembersCache] = useState<Record<string, WorkspaceMember[]>>({})
  const [loadingMembersFor, setLoadingMembersFor] = useState<string | null>(null)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)
  const [changingRoleFor, setChangingRoleFor] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState<Record<string, string>>({})
  const [inviteRole, setInviteRole] = useState<Record<string, 'admin' | 'member'>>({})
  const [inviting, setInviting] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/workspaces')
      .then((r) => r.ok ? r.json() : [])
      .then(setWorkspaces)
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [])

  async function createWorkspace() {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to create')
      setWorkspaces((prev) => [...prev, { ...json, role: 'owner' }])
      setNewName('')
      toast.success('Workspace created')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create workspace')
    } finally {
      setCreating(false)
    }
  }

  async function loadMembers(workspaceId: string) {
    setLoadingMembersFor(workspaceId)
    const res = await fetch(`/api/workspaces/${workspaceId}/members`)
    if (res.ok) {
      const members = await res.json()
      setMembersCache((prev) => ({ ...prev, [workspaceId]: members }))
    }
    setLoadingMembersFor(null)
  }

  function toggleWorkspace(workspaceId: string) {
    if (expandedId === workspaceId) { setExpandedId(null); return }
    setExpandedId(workspaceId)
    if (!membersCache[workspaceId]) loadMembers(workspaceId)
  }

  async function sendInvite(workspaceId: string) {
    const email = inviteEmail[workspaceId]?.trim()
    if (!email) return
    setInviting(workspaceId)
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: inviteRole[workspaceId] ?? 'member' }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Invite sent')
      setInviteEmail((prev) => ({ ...prev, [workspaceId]: '' }))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send invite')
    } finally {
      setInviting(null)
    }
  }

  async function removeMember(workspaceId: string, userId: string) {
    setRemovingMemberId(userId)
    const res = await fetch(`/api/workspaces/${workspaceId}/members/${userId}`, { method: 'DELETE' })
    if (res.ok) {
      setMembersCache((prev) => ({ ...prev, [workspaceId]: (prev[workspaceId] ?? []).filter((m) => m.user_id !== userId) }))
      toast.success('Member removed')
    } else {
      toast.error('Failed to remove member')
    }
    setRemovingMemberId(null)
  }

  async function changeRole(workspaceId: string, userId: string, role: 'admin' | 'member') {
    setChangingRoleFor(userId)
    const res = await fetch(`/api/workspaces/${workspaceId}/members/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    if (res.ok) {
      setMembersCache((prev) => ({ ...prev, [workspaceId]: (prev[workspaceId] ?? []).map((m) => m.user_id === userId ? { ...m, role } : m) }))
      toast.success('Role updated')
    } else {
      toast.error('Failed to update role')
    }
    setChangingRoleFor(null)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team &amp; Workspaces
          </CardTitle>
          <CardDescription>Collaborate with teammates by creating shared workspaces</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              {workspaces.length > 0 && (
                <div className="space-y-2">
                  {workspaces.map((ws) => {
                    const isExpanded = expandedId === ws.id
                    const members = membersCache[ws.id] ?? []
                    const isOwnerOrAdmin = ws.role === 'owner' || ws.role === 'admin'
                    const isOwner = ws.role === 'owner'

                    return (
                      <div key={ws.id} className="border rounded-lg overflow-hidden">
                        <button
                          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/40 transition-colors text-left"
                          onClick={() => toggleWorkspace(ws.id)}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="text-xs font-semibold text-primary">{ws.name[0].toUpperCase()}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm leading-none">{ws.name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">/{ws.slug}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <Badge variant={isOwner ? 'default' : 'secondary'} className="text-xs capitalize">{ws.role}</Badge>
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t bg-muted/20 px-3 py-3 space-y-3">
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Members</p>
                              {loadingMembersFor === ws.id ? (
                                <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                                </div>
                              ) : members.length === 0 ? (
                                <p className="text-xs text-muted-foreground py-1">No members yet.</p>
                              ) : (
                                <div className="space-y-1">
                                  {members.map((m) => (
                                    <div key={m.user_id} className="flex items-center justify-between gap-2 py-1">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                                          <User className="h-3 w-3 text-muted-foreground" />
                                        </div>
                                        <span className="text-xs truncate">{m.email}</span>
                                        {m.is_self && <span className="text-xs text-muted-foreground">(you)</span>}
                                      </div>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        {isOwner && !m.is_self ? (
                                          <select
                                            value={m.role}
                                            disabled={changingRoleFor === m.user_id}
                                            onChange={(e) => changeRole(ws.id, m.user_id, e.target.value as 'admin' | 'member')}
                                            className="text-xs border rounded px-1.5 py-0.5 bg-background h-6 cursor-pointer disabled:opacity-50"
                                          >
                                            <option value="member">Member</option>
                                            <option value="admin">Admin</option>
                                          </select>
                                        ) : (
                                          <Badge variant="outline" className="text-xs capitalize h-5 px-1.5">{m.role}</Badge>
                                        )}
                                        {(isOwnerOrAdmin && !m.is_self) || m.is_self ? (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                            disabled={removingMemberId === m.user_id}
                                            onClick={() => removeMember(ws.id, m.user_id)}
                                            title={m.is_self ? 'Leave workspace' : 'Remove member'}
                                          >
                                            {removingMemberId === m.user_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                          </Button>
                                        ) : null}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {isOwnerOrAdmin && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Invite</p>
                                <div className="flex gap-2">
                                  <Input
                                    placeholder="Email address"
                                    type="email"
                                    value={inviteEmail[ws.id] ?? ''}
                                    onChange={(e) => setInviteEmail((prev) => ({ ...prev, [ws.id]: e.target.value }))}
                                    onKeyDown={(e) => e.key === 'Enter' && sendInvite(ws.id)}
                                    className="h-7 text-xs flex-1"
                                  />
                                  <select
                                    value={inviteRole[ws.id] ?? 'member'}
                                    onChange={(e) => setInviteRole((prev) => ({ ...prev, [ws.id]: e.target.value as 'admin' | 'member' }))}
                                    className="text-xs border rounded px-1.5 py-0.5 bg-background h-7 cursor-pointer"
                                  >
                                    <option value="member">Member</option>
                                    <option value="admin">Admin</option>
                                  </select>
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs px-2.5"
                                    onClick={() => sendInvite(ws.id)}
                                    disabled={inviting === ws.id || !inviteEmail[ws.id]?.trim()}
                                  >
                                    {inviting === ws.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Invite'}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              <div>
                {workspaces.length > 0 && <Separator className="mb-4" />}
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">New workspace</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Workspace name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && createWorkspace()}
                    className="h-8 text-sm"
                  />
                  <Button size="sm" onClick={createWorkspace} disabled={creating || !newName.trim()}>
                    {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                    Create
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

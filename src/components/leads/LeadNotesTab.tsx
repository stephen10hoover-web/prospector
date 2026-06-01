'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Plus, Pencil, Trash2, FileText, Save, X } from 'lucide-react'
import type { LeadNote } from '@/types'

interface LeadNotesTabProps {
  businessId: string
}

export function LeadNotesTab({ businessId }: LeadNotesTabProps) {
  const [notes, setNotes] = useState<LeadNote[]>([])
  const [loading, setLoading] = useState(true)
  const [newBody, setNewBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBody, setEditBody] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)

  useEffect(() => {
    fetchNotes()
  }, [businessId])

  async function fetchNotes() {
    setLoading(true)
    try {
      const res = await fetch(`/api/leads/${businessId}/notes`)
      if (!res.ok) throw new Error('Failed to load notes')
      const data = await res.json()
      setNotes(data)
    } catch {
      toast.error('Failed to load notes')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    if (!newBody.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/leads/${businessId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: newBody.trim() }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to save note')
      }
      const note = await res.json()
      setNotes((prev) => [note, ...prev])
      setNewBody('')
      setShowNew(false)
      toast.success('Note saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save note')
    } finally {
      setSaving(false)
    }
  }

  function startEdit(note: LeadNote) {
    setEditingId(note.id)
    setEditBody(note.body)
  }

  async function handleUpdate() {
    if (!editingId || !editBody.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/leads/${businessId}/notes/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: editBody.trim() }),
      })
      if (!res.ok) throw new Error('Failed to update note')
      const updated = await res.json()
      setNotes((prev) => prev.map((n) => (n.id === editingId ? updated : n)))
      setEditingId(null)
      toast.success('Note updated')
    } catch {
      toast.error('Failed to update note')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(noteId: string) {
    setDeletingId(noteId)
    try {
      const res = await fetch(`/api/leads/${businessId}/notes/${noteId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete note')
      setNotes((prev) => prev.filter((n) => n.id !== noteId))
      toast.success('Note deleted')
    } catch {
      toast.error('Failed to delete note')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Add note */}
      {showNew ? (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <Textarea
              placeholder="Write a note about this lead..."
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              className="min-h-[100px] resize-none"
              maxLength={10000}
              autoFocus
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleCreate} disabled={saving || !newBody.trim()}>
                {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                Save Note
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowNew(false); setNewBody('') }}>
                <X className="h-3.5 w-3.5 mr-1.5" />
                Cancel
              </Button>
              <span className="text-xs text-muted-foreground ml-auto">{newBody.length}/10000</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button size="sm" onClick={() => setShowNew(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Note
        </Button>
      )}

      {/* Notes list */}
      {notes.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <FileText className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium mb-1">No notes yet</p>
          <p className="text-xs text-muted-foreground">
            Add notes to track conversations, research, or anything else about this lead.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <Card key={note.id}>
              <CardContent className="pt-4">
                {editingId === note.id ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      className="min-h-[100px] resize-none"
                      maxLength={10000}
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={handleUpdate} disabled={saving || !editBody.trim()}>
                        {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="h-3.5 w-3.5 mr-1.5" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{note.body}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs text-muted-foreground">
                        {new Date(note.created_at).toLocaleString()}
                        {note.updated_at !== note.created_at && ' (edited)'}
                      </span>
                      <div className="flex items-center gap-1 ml-auto">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => startEdit(note)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(note.id)}
                          disabled={deletingId === note.id}
                        >
                          {deletingId === note.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

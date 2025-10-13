'use client'

import { useEffect, useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { X, Users, Plus, Upload, Database } from 'lucide-react'
import { useRouter } from 'next/navigation'
import ChatService from '@/services/chatService'
import api from '@/apiConfig.json'

export default function AdminCreateChatPage() {
  const chatService = useMemo(() => new ChatService(), [])
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [userQuery, setUserQuery] = useState('')
  const [userResults, setUserResults] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Knowledge Base state
  const [kbFiles, setKbFiles] = useState([])
  const [kbUploading, setKbUploading] = useState(false)

  // Debounced user search
  useEffect(() => {
    let stop = false
    const t = setTimeout(async () => {
      const term = (userQuery || '').trim()
      if (!term || term.length < 2) { setUserResults([]); return }
      try {
        const url = new URL(`${api.ApiConfig.main}/${api.ApiConfig.profile.search.url}`)
        url.searchParams.set('q', term)
        url.searchParams.set('limit', '20')
        const res = await fetch(url.toString(), { credentials: 'include' })
        const data = await res.json()
        if (!stop && data?.success) {
          const users = (data.users || []).map(u => ({ id: u.id, name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.userName || u.email || `User ${u.id}`, userName: u.userName, email: u.email }))
          setUserResults(users)
        } else if (!stop) {
          setUserResults([])
        }
      } catch (_) {
        if (!stop) setUserResults([])
      }
    }, 250)
    return () => { stop = true; clearTimeout(t) }
  }, [userQuery])

  const addUser = (u) => {
    if (!u || !u.id) return
    setSelectedUsers(prev => prev.some(x => x.id === u.id) ? prev : [...prev, u])
    setUserQuery('')
  }
  const removeUser = (id) => setSelectedUsers(prev => prev.filter(u => u.id !== id))

  const onCreate = async () => {
    setError(''); setSuccess('')
    const trimmedTitle = (title || '').trim()
    const ids = selectedUsers.map(u => u.id)
    if (!trimmedTitle) { setError('Title is required'); return }
    if (ids.length === 0) { setError('Please add at least one user'); return }
    try {
      setCreating(true)
      const resp = await chatService.adminCreateChat({ title: trimmedTitle, userIds: ids })
      if (resp?.success) {
        const chatId = resp.chatId || resp.id

        // Upload knowledge base files if any
        if (kbFiles.length > 0 && chatId) {
          setKbUploading(true)
          try {
            for (const file of kbFiles) {
              const formData = new FormData()
              formData.append('file', file)
              formData.append('chatId', chatId)
              formData.append('title', file.name)

              await fetch(`${api.ApiConfig.main}/bb-rag/api/rag/ingest`, {
                method: 'POST',
                body: formData,
                credentials: 'include'
              })
            }
            setSuccess('Chat and knowledge base created successfully')
          } catch (kbErr) {
            console.error('Error uploading KB documents:', kbErr)
            setSuccess('Chat created successfully, but some documents failed to upload')
          } finally {
            setKbUploading(false)
          }
        } else {
          setSuccess('Chat created successfully')
        }

        setTitle(''); setSelectedUsers([]); setUserQuery(''); setKbFiles([])
        setTimeout(() => router.push('/bb-admin/chats/search'), 600)
      } else {
        setError(resp?.error || 'Failed to create chat')
      }
    } catch (e) {
      setError(e?.message || 'Failed to create chat')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6 p-6 md:p-10">
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">Create Chat</h2>
        <p className="text-muted-foreground">Define a title and add users to the room.</p>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column - Chat Details */}
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Chat title" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Add Users</span>
              </div>
              <Input placeholder="Search users by name or email" value={userQuery} onChange={(e) => setUserQuery(e.target.value)} />

              {selectedUsers.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">Selected Users:</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map(u => (
                      <span key={`pill-${u.id}`} className="inline-flex items-center gap-1 rounded-md border bg-background shadow-xs h-7 px-2 text-xs">
                        {u.name}
                        <button
                          type="button"
                          className="ml-1 rounded border px-1 hover:bg-accent hover:text-accent-foreground"
                          title="Remove"
                          onClick={() => removeUser(u.id)}
                        >×</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {userQuery.trim() && (
                <div className="relative">
                  <div className="absolute left-0 right-0 top-0 border rounded bg-background shadow-lg max-h-48 overflow-y-auto z-10">
                    {userResults.filter(u => {
                      const already = selectedUsers.some(x => String(x.id) === String(u.id));
                      return !already;
                    }).map(u => (
                      <div
                        key={`user-${u.id}`}
                        className="flex items-center justify-between px-3 py-2 text-sm hover:bg-accent cursor-pointer border-b last:border-b-0"
                        onClick={() => addUser(u)}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{u.userName || u.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                        </div>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-md border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground h-7 px-2 text-sm ml-2"
                          title="Add user"
                          onClick={(e) => { e.stopPropagation(); addUser(u); }}
                        >+</button>
                      </div>
                    ))}
                    {userResults.filter(u => {
                      const already = selectedUsers.some(x => String(x.id) === String(u.id));
                      return !already;
                    }).length === 0 && (
                      <div className="text-sm text-muted-foreground text-center py-2">No users found</div>
                    )}
                  </div>
                  {/* Spacer to prevent content overlap */}
                  <div className="h-2"></div>
                </div>
              )}
            </div>

            {error ? (<div className="text-sm text-red-600">{error}</div>) : null}
            {success ? (<div className="text-sm text-green-600">{success}</div>) : null}

            <div className="flex items-center gap-3">
              <Button onClick={onCreate} disabled={creating || kbUploading}>
                {creating ? 'Creating…' : kbUploading ? 'Uploading Knowledge Base...' : 'Create'}
              </Button>
            </div>
          </div>

          {/* Vertical Divider */}
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-px bg-border"></div>

            {/* Right Column - Knowledge Base */}
            <div className="pl-6 space-y-3">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Knowledge Base (Optional)</span>
                <span className="text-[10px] text-muted-foreground">(.txt, .md, .html, .pdf, .docx, .csv)</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Upload documents to create a knowledge base for this chat. Supported formats: Plain text, Markdown, PDF, Word (.docx), HTML, CSV.
              </p>
              <Input
                type="file"
                multiple
                accept=".txt,.md,.markdown,.pdf,.docx,.html,.htm,.csv"
                onChange={(e) => setKbFiles(Array.from(e.target.files || []))}
                className="cursor-pointer"
              />
              {kbFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">{kbFiles.length} file(s) selected:</div>
                  <div className="flex flex-wrap gap-2">
                    {kbFiles.map((file, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 rounded-md border bg-background shadow-xs px-2 py-1 text-xs">
                        <Upload className="h-3 w-3" />
                        {file.name}
                        <button
                          type="button"
                          className="ml-1 hover:opacity-80"
                          onClick={() => setKbFiles(prev => prev.filter((_, i) => i !== idx))}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Separator />
    </div>
  )
}



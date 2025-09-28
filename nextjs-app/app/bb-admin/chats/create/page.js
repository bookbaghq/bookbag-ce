'use client'

import { useEffect, useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { X, Users, Plus } from 'lucide-react'
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
        setSuccess('Chat created successfully')
        setTitle(''); setSelectedUsers([]); setUserQuery('')
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

      <Card className="p-6 space-y-6 max-w-2xl">
        <div className="space-y-2">
          <label className="text-sm font-medium">Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Chat title" />
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Add Users</span>
          </div>
          <div className="relative">
            <Input placeholder="Search users" value={userQuery} onChange={(e) => setUserQuery(e.target.value)} />
            {(userResults.length > 0 && userQuery.trim().length >= 2) && (
              <div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow">
                <div className="max-h-64 overflow-auto py-1">
                  {userResults.map(u => {
                    const selected = selectedUsers.some(s => s.id === u.id)
                    return (
                      <button key={`dd-${u.id}`} onClick={() => addUser(u)} className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent ${selected ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={selected}>
                        <span className="truncate flex-1">{u.name}</span>
                        {selected ? <span className="text-xs">Selected</span> : <Plus className="h-3 w-3" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedUsers.map(u => (
              <span key={`pill-${u.id}`} className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                {u.name}
                <button className="ml-2 text-xs hover:opacity-80" onClick={() => removeUser(u.id)}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {error ? (<div className="text-sm text-red-600">{error}</div>) : null}
        {success ? (<div className="text-sm text-green-600">{success}</div>) : null}

        <div className="flex items-center gap-3">
          <Button onClick={onCreate} disabled={creating}>
            {creating ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </Card>

      <Separator />
    </div>
  )
}



'use client'

import { useEffect, useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { X, Search as SearchIcon, Users, Bot, Trash2 } from 'lucide-react'
import { ChatMessageItem } from '@/app/bb-client/_components/components/ChatMessageItem'
import ChatService from '@/services/chatService'
import api from '@/apiConfig.json'

export default function AdminChatsSearchPage() {
  const chatService = useMemo(() => new ChatService(), [])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUsers, setSelectedUsers] = useState([]) // array of { id, name }
  const [userQuery, setUserQuery] = useState('')
  const [userResults, setUserResults] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [loadingChats, setLoadingChats] = useState(false)
  const [chats, setChats] = useState([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerChat, setDrawerChat] = useState(null)
  const [error, setError] = useState('')
  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  // Global error dialog (normalized like backend errorService)
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [errorDialogMessage, setErrorDialogMessage] = useState('')

  // Debounced user fuzzy search via backend, no initial fetch
  useEffect(() => {
    let stop = false
    const t = setTimeout(async () => {
      const term = (userQuery || '').trim()
      if (!term || term.length < 2) { setUserResults([]); return }
      try {
        setLoadingUsers(true)
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
      } finally {
        if (!stop) setLoadingUsers(false)
      }
    }, 250)
    return () => { stop = true; clearTimeout(t) }
  }, [userQuery])

  // Search chats when filters change
  useEffect(() => {
    let stop = false
    const t = setTimeout(async () => {
      try {
        setLoadingChats(true)
        setError('')
        const userIds = selectedUsers.map(u => u.id)
        const data = await chatService.adminSearchChats({ q: searchTerm, userIds, limit: 50 })
        if (!stop && data?.success) {
          setChats(Array.isArray(data.results) ? data.results : [])
        } else if (!stop) {
          setChats([])
          if (data && data.error) setError(String(data.error))
        }
      } catch (e) {
        if (!stop) { setChats([]); setError(e?.message || 'Failed to search chats') }
      } finally {
        if (!stop) setLoadingChats(false)
      }
    }, 300)
    return () => { stop = true; clearTimeout(t) }
  }, [searchTerm, selectedUsers, chatService])

  const addUser = (u) => {
    if (!u || !u.id) return
    setSelectedUsers(prev => prev.some(x => x.id === u.id) ? prev : [...prev, u])
    setUserQuery('')
  }
  const removeUser = (id) => setSelectedUsers(prev => prev.filter(u => u.id !== id))

  const openChat = async (chatId) => {
    try {
      const data = await chatService.adminGetChatById(chatId)
      if (data?.success) {
        setDrawerChat(data.chat)
        setDrawerOpen(true)
      }
    } catch (_) {}
  }

  const confirmDelete = (chatId) => {
    setDeleteId(chatId)
  }

  // Normalize error similar to backend errorService.normalizeProviderError
  const normalizeError = (raw) => {
    try {
      if (typeof raw === 'string') {
        const obj = JSON.parse(raw)
        if (obj && obj.error) return obj.error.message || String(raw)
        return String(raw)
      }
      if (raw && typeof raw === 'object') {
        if (raw.error) return raw.error.message || JSON.stringify(raw.error)
        return raw.message || JSON.stringify(raw)
      }
      return 'An unknown error occurred'
    } catch (_) {
      return typeof raw === 'string' ? raw : (raw?.message || 'An unknown error occurred')
    }
  }

  const onDelete = async () => {
    if (!deleteId) return
    // Close the confirmation modal immediately, regardless of outcome
    const id = deleteId
    setDeleteId(null)
    try {
      setDeleting(true)
      // Prefer admin delete route when in admin UI
      const resp = await chatService.adminDeleteChat(id)
      if (resp?.success) {
        setChats(prev => prev.filter(c => c.id !== id))
      } else {
        const msg = normalizeError(resp)
        setErrorDialogMessage(msg || 'Failed to delete chat')
        setErrorDialogOpen(true)
      }
    } catch (e) {
      const msg = normalizeError(e)
      setErrorDialogMessage(msg || 'Failed to delete chat')
      setErrorDialogOpen(true)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6 p-6 md:p-10">
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">Chats</h2>
        <p className="text-muted-foreground">Search and inspect chats across users.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar: user filters */}
        <div className="lg:col-span-1">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filter by Users</span>
            </div>
            <div className="relative">
              <Input placeholder="Search users" value={userQuery} onChange={(e) => setUserQuery(e.target.value)} className="pl-3 pr-10" />
              {/* dropdown results */}
              {(userResults.length > 0 && userQuery.trim().length >= 2) && (
                <div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow">
                  <div className="max-h-64 overflow-auto py-1">
                    {userResults.map(u => {
                      const selected = selectedUsers.some(s => s.id === u.id)
                      return (
                        <button key={`dd-${u.id}`} onClick={() => addUser(u)} className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent ${selected ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={selected}>
                          <span className="truncate flex-1">{u.name}</span>
                          {selected ? <span className="text-xs">Selected</span> : null}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
            {/* Pills */}
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
            {loadingUsers ? (<div className="text-xs text-muted-foreground">Searching users…</div>) : null}
          </div>
        </div>

        {/* Main: search + list */}
        <div className="lg:col-span-3 space-y-4">
          <div className="relative max-w-xl">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search chats by name or first message" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4" />
          </div>
          <Separator />
          <div className="space-y-3">
            {loadingChats ? (
              <div className="text-sm text-muted-foreground">Searching…</div>
            ) : error ? (
              <div className="text-sm text-red-600">{error}</div>
            ) : chats.length ? (
              chats.map(chat => (
                <Card key={`chat-${chat.id}`} className="p-5 hover:bg-accent/30">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-base font-semibold">{chat.title}</div>
                      <div className="text-xs text-muted-foreground">
                        Owner: {chat.owner?.firstName || ''} {chat.owner?.lastName || ''} ({chat.owner?.userName || chat.owner?.email || chat.owner?.id})
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Messages: {chat.messageCount} • Created: {chat.created_at ? new Date(chat.created_at).toLocaleString() : ''} • Updated: {chat.updated_at ? new Date(chat.updated_at).toLocaleString() : ''}
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <Button variant="outline" onClick={() => openChat(chat.id)}>Open</Button>
                      <Button variant="destructive" size="icon" onClick={() => confirmDelete(chat.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">No chats found</div>
            )}
          </div>
        </div>
      </div>

      {/* Drawer for chat detail */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="sm:max-w-2xl p-0">
          {/* Drawer Header (embedded) */}
          <div className="px-6 pt-6 pb-3 border-b bg-background/95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                <h2 className="text-base font-semibold">{drawerChat?.title || 'Chat'}</h2>
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground space-y-1">
              <div>Owner: {drawerChat?.owner?.firstName || ''} {drawerChat?.owner?.lastName || ''} ({drawerChat?.owner?.userName || drawerChat?.owner?.email || drawerChat?.owner?.id})</div>
              <div>Messages: {Array.isArray(drawerChat?.messages) ? drawerChat.messages.length : 0} • Created: {drawerChat?.created_at ? new Date(drawerChat.created_at).toLocaleString() : ''} • Updated: {drawerChat?.updated_at ? new Date(drawerChat.updated_at).toLocaleString() : ''}</div>
            </div>
          </div>

          {/* Messages Area styled like chat */}
          <div className="flex-1 max-h-[calc(100vh-200px)] overflow-y-auto p-4">
            <div className="flex flex-col gap-2 max-w-4xl mx-auto w-full">
              {(drawerChat?.messages || []).map((m, idx) => (
                <ChatMessageItem 
                  key={`m-${m.id}`}
                  message={m}
                  isUser={(m.role || '').toLowerCase() === 'user'}
                  isStreamingCurrentMessage={false}
                  modelLimits={null}
                  streamingStats={null}
                  thinkingState={null}
                />
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation modal */}
      <Dialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete chat?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={onDelete} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Global error dialog */}
      <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-red-600">{errorDialogMessage}</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setErrorDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}



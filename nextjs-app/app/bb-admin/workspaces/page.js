'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import WorkspaceService from '@/services/workspaceService'
import api from '@/apiConfig.json'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Trash2, Upload, File, Database } from 'lucide-react'
import { toast } from 'sonner'

export default function WorkspacesPage(){
  const svc = useMemo(() => new WorkspaceService(), [])
  const [q, setQ] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [createUsers, setCreateUsers] = useState([])
  const [createUserSearch, setCreateUserSearch] = useState('')
  const [createSearchResults, setCreateSearchResults] = useState([])
  const [createSearchLoading, setCreateSearchLoading] = useState(false)
  const [createModels, setCreateModels] = useState([])
  const [createModelSearch, setCreateModelSearch] = useState('')
  const [createModelSearchResults, setCreateModelSearchResults] = useState([])
  const [createModelSearchLoading, setCreateModelSearchLoading] = useState(false)

  // Delete confirmation state
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Edit drawer state
  const [editOpen, setEditOpen] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editUsers, setEditUsers] = useState([])
  const [editModels, setEditModels] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [allModels, setAllModels] = useState([])
  const [userSearch, setUserSearch] = useState('')
  const [modelSearch, setModelSearch] = useState('')

  // Knowledge Base state
  const [kbDocuments, setKbDocuments] = useState([])
  const [kbStats, setKbStats] = useState({ documentCount: 0, chunkCount: 0 })
  const [kbUploading, setKbUploading] = useState(false)
  const [kbFiles, setKbFiles] = useState([])
  const [kbDeleteId, setKbDeleteId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { const res = await svc.list({ q }); if (res?.success && Array.isArray(res.workspaces)) setItems(res.workspaces) } catch(_) { setItems([]) } finally { setLoading(false) }
  }, [svc, q])

  // Initial and live reload handled by debounced effect below

  // Live search as you type (debounced)
  useEffect(() => {
    const handle = setTimeout(() => { load() }, 300)
    return () => clearTimeout(handle)
  }, [q, load])

  // Debounced user search for create dialog
  useEffect(() => {
    if (!createOpen) return
    const searchQuery = createUserSearch.trim()
    if (!searchQuery) {
      setCreateSearchResults([])
      return
    }

    setCreateSearchLoading(true)
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`${api.ApiConfig.main}/bb-user/api/profile/search?q=${encodeURIComponent(searchQuery)}`, { credentials: 'include' })
        const data = await res.json()
        if (data.success && Array.isArray(data.users)) {
          setCreateSearchResults(data.users)
        } else {
          setCreateSearchResults([])
        }
      } catch (_) {
        setCreateSearchResults([])
      } finally {
        setCreateSearchLoading(false)
      }
    }, 300)

    return () => {
      clearTimeout(handle)
      setCreateSearchLoading(false)
    }
  }, [createUserSearch, createOpen])

  // Debounced model search for create dialog
  useEffect(() => {
    if (!createOpen) return
    const searchQuery = createModelSearch.trim()
    if (!searchQuery) {
      setCreateModelSearchResults([])
      return
    }

    setCreateModelSearchLoading(true)
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`${api.ApiConfig.main}/bb-models/api/models`, { credentials: 'include' })
        const data = await res.json()
        if (data.success && Array.isArray(data.models)) {
          const filtered = data.models.filter(m => {
            const nm = String(m.name || '').toLowerCase()
            const fam = String(m.family || m.type || '').toLowerCase()
            return nm.includes(searchQuery.toLowerCase()) || fam.includes(searchQuery.toLowerCase())
          })
          setCreateModelSearchResults(filtered)
        } else {
          setCreateModelSearchResults([])
        }
      } catch (_) {
        setCreateModelSearchResults([])
      } finally {
        setCreateModelSearchLoading(false)
      }
    }, 300)

    return () => {
      clearTimeout(handle)
      setCreateModelSearchLoading(false)
    }
  }, [createModelSearch, createOpen])

  const openEdit = async (workspace) => {
    if (!workspace || !workspace.id) return
    setEditId(workspace.id)
    setEditOpen(true)
    setEditLoading(true)
    try {
      const [ws, us, ms] = await Promise.all([
        svc.get(workspace.id),
        fetch(`${api.ApiConfig.main}/bb-user/api/profile/all`, { credentials: 'include' }).then(r => r.json()).catch(() => ({})),
        fetch(`${api.ApiConfig.main}/bb-models/api/models`, { credentials: 'include' }).then(r => r.json()).catch(() => ({})),
      ])
      if (ws?.success && ws.workspace) {
        const w = ws.workspace
        setEditName(w.name || '')
        setEditDescription(w.description || '')
        setEditUsers(Array.isArray(w.users) ? w.users : [])
        setEditModels(Array.isArray(w.models) ? w.models : [])
      }
      if (us && Array.isArray(us.userList)) setAllUsers(us.userList)
      if (ms?.success && Array.isArray(ms.models)) setAllModels(ms.models)

      // Load knowledge base documents
      await loadKbDocuments(workspace.id)
    } finally {
      setEditLoading(false)
    }
  }

  const loadKbDocuments = async (workspaceId) => {
    if (!workspaceId) return
    try {
      const [docs, stats] = await Promise.all([
        fetch(`${api.ApiConfig.main}/bb-rag/api/rag/list?workspaceId=${workspaceId}`, { credentials: 'include' }).then(r => r.json()),
        fetch(`${api.ApiConfig.main}/bb-rag/api/rag/stats?workspaceId=${workspaceId}`, { credentials: 'include' }).then(r => r.json())
      ])
      if (docs?.success && Array.isArray(docs.documents)) setKbDocuments(docs.documents)
      if (stats?.success && stats.stats) setKbStats(stats.stats)
    } catch (err) {
      console.error('Error loading KB documents:', err)
    }
  }

  const handleKbUpload = async (event) => {
    event.preventDefault()
    if (!editId || kbFiles.length === 0) return

    setKbUploading(true)
    try {
      for (const file of kbFiles) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('workspaceId', editId)
        formData.append('title', file.name)

        await fetch(`${api.ApiConfig.main}/bb-rag/api/rag/ingest`, {
          method: 'POST',
          body: formData,
          credentials: 'include'
        })
      }

      setKbFiles([])
      await loadKbDocuments(editId)
    } catch (err) {
      console.error('Error uploading KB documents:', err)
    } finally {
      setKbUploading(false)
    }
  }

  const handleKbDelete = async (docId) => {
    if (!docId) return
    try {
      await fetch(`${api.ApiConfig.main}/bb-rag/api/rag/delete/${docId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      await loadKbDocuments(editId)
      setKbDeleteId(null)
    } catch (err) {
      console.error('Error deleting KB document:', err)
    }
  }

  const saveBasics = async () => {
    if (!editId) return
    setEditLoading(true)
    try {
      const result = await svc.update({ id: editId, name: editName, description: editDescription })
      if (result?.success) {
        toast.success('Workspace updated successfully')
        await load()
      } else {
        toast.error(result?.error || 'Failed to update workspace')
      }
    } catch (error) {
      console.error('Error updating workspace:', error)
      toast.error(error.message || 'An unexpected error occurred while updating the workspace')
    } finally {
      setEditLoading(false)
    }
  }

  const toggleUser = async (u) => {
    if (!u || !editId) return

    // Update local state first for immediate UI feedback
    const exists = editUsers.some(x => String(x.user_id || x.id) === String(u.id))
    const previousUsers = [...editUsers]
    const newUsers = exists
      ? editUsers.filter(x => String(x.user_id || x.id) !== String(u.id))
      : [...editUsers, { user_id: u.id, role: 'member', name: `${u.first_name || ''} ${u.last_name || ''}`.trim(), email: u.email }]

    setEditUsers(newUsers)

    // Immediately save to database
    try {
      const payload = newUsers.map(user => ({ user_id: user.user_id || user.id, role: user.role || 'member' }))
      const result = await svc.assignUsers(editId, payload)

      if (result?.success) {
        // Refresh from backend to ensure consistency
        const ws = await svc.get(editId)
        if (ws?.success && ws.workspace && Array.isArray(ws.workspace.users)) {
          setEditUsers(ws.workspace.users)
        }
        await load()
      } else {
        toast.error(result?.error || 'Failed to update workspace users')
        setEditUsers(previousUsers)
      }
    } catch (error) {
      console.error('Error updating workspace users:', error)
      toast.error(error.message || 'An unexpected error occurred while updating workspace users')
      // Revert on error
      setEditUsers(previousUsers)
    }
  }

  const toggleCreateUser = (u) => {
    if (!u) return
    setCreateUsers(prev => {
      const exists = prev.some(x => String(x.user_id || x.id) === String(u.id))
      if (exists) return prev.filter(x => String(x.user_id || x.id) !== String(u.id))
      // Handle both camelCase (from search endpoint) and snake_case (from all endpoint)
      const firstName = u.firstName || u.first_name || ''
      const lastName = u.lastName || u.last_name || ''
      return [...prev, { user_id: u.id, role: 'member', name: `${firstName} ${lastName}`.trim(), email: u.email }]
    })
    // Clear search input after adding user to hide dropdown
    setCreateUserSearch('')
  }

  const toggleCreateModel = (m) => {
    if (!m) return
    setCreateModels(prev => {
      const exists = prev.some(x => String(x.model_id || x.id) === String(m.id))
      if (exists) return prev.filter(x => String(x.model_id || x.id) !== String(m.id))
      return [...prev, { model_id: m.id, name: m.name }]
    })
    // Clear search input after adding model to hide dropdown
    setCreateModelSearch('')
  }

  const toggleModel = async (m) => {
    if (!m || !editId) return

    // Update local state first for immediate UI feedback
    const exists = editModels.some(x => String(x.model_id || x.id) === String(m.id))
    const newModels = exists
      ? editModels.filter(x => String(x.model_id || x.id) !== String(m.id))
      : [...editModels, { model_id: m.id, name: m.name }]

    setEditModels(newModels)

    // Immediately save to database
    try {
      const payload = newModels.map(model => ({ model_id: model.model_id || model.id }))
      await svc.assignModels(editId, payload)

      // Refresh from backend to ensure consistency
      const ws = await svc.get(editId)
      if (ws?.success && ws.workspace && Array.isArray(ws.workspace.models)) {
        setEditModels(ws.workspace.models)
      }
      await load()
    } catch (error) {
      // Revert on error
      setEditModels(editModels)
    }
  }

  const openDelete = (workspace) => {
    if (!workspace || !workspace.id) return
    setDeleteTarget(workspace)
    setDeleteOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleteTarget || !deleteTarget.id) return
    setDeleting(true)
    try {
      const result = await svc.remove(deleteTarget.id)
      console.log('Delete result:', result)

      if (result?.success) {
        toast.success(result?.message || 'Workspace deleted successfully')
        setDeleteOpen(false)
        setDeleteTarget(null)
        await load()
      } else {
        console.error('Delete failed:', result?.error || 'Unknown error')
        toast.error(result?.error || 'Failed to delete workspace')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error(error.message || 'An unexpected error occurred while deleting the workspace')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Input placeholder="Search workspaces" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button onClick={() => setCreateOpen(true)}>New Workspace</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(w => (
          <Card key={w.id} className="p-4">
            <div className="font-semibold">{w.name}</div>
            <div className="text-sm text-muted-foreground truncate">{w.description || ''}</div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => openEdit(w)} className="inline-flex items-center justify-center rounded-md border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground h-9 px-4 cursor-pointer">Edit</button>
              <button
                onClick={() => openDelete(w)}
                className="inline-flex items-center justify-center rounded-md border-0 bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 hover:text-white h-9 px-4 cursor-pointer"
                title="Delete workspace"
                aria-label="Delete workspace"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </Card>
        ))}
        {items.length === 0 && !loading && (
          <div className="text-sm text-muted-foreground">No workspaces</div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Workspace</DialogTitle>
            <DialogDescription>Create a new workspace.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />

            <Separator />

            <div className="space-y-3">
              <div className="text-sm font-medium">Assign Users (optional)</div>
              <Input
                placeholder="Search users by name or email"
                value={createUserSearch}
                onChange={(e) => setCreateUserSearch(e.target.value)}
              />

              {createUsers.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">Selected Users:</div>
                  <div className="flex flex-wrap gap-2">
                    {createUsers.map(sel => (
                      <span key={`create-sel-${sel.user_id || sel.id}`} className="inline-flex items-center gap-1 rounded-md border bg-background shadow-xs h-7 px-2 text-xs">
                        {(sel.name && sel.name.trim()) ? sel.name : (sel.email || String(sel.user_id || sel.id))}
                        <button
                          type="button"
                          className="ml-1 rounded border px-1 hover:bg-accent hover:text-accent-foreground"
                          title="Remove"
                          onClick={() => toggleCreateUser({ id: sel.user_id || sel.id })}
                        >×</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {createUserSearch.trim() && (
                <div className="relative">
                  <div className="absolute left-0 right-0 top-0 border rounded bg-background shadow-lg max-h-48 overflow-y-auto z-10">
                    {createSearchLoading && (
                      <div className="text-sm text-muted-foreground text-center py-2">Loading...</div>
                    )}
                    {!createSearchLoading && createSearchResults.filter(u => {
                      const already = createUsers.some(x => String(x.user_id || x.id) === String(u.id));
                      return !already;
                    }).map(u => {
                      // Handle both camelCase (from search endpoint) and snake_case (from all endpoint)
                      const userName = u.userName || u.user_name || ''
                      return (
                        <div
                          key={`create-u-find-${u.id}`}
                          className="flex items-center justify-between px-3 py-2 text-sm hover:bg-accent cursor-pointer border-b last:border-b-0"
                          onClick={() => toggleCreateUser(u)}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate">{userName || u.email}</div>
                            <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                          </div>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-md border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground h-7 px-2 text-sm ml-2"
                            title="Add user"
                            onClick={(e) => { e.stopPropagation(); toggleCreateUser(u); }}
                          >+</button>
                        </div>
                      )
                    })}
                    {!createSearchLoading && createSearchResults.filter(u => {
                      const already = createUsers.some(x => String(x.user_id || x.id) === String(u.id));
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

            <Separator />

            <div className="space-y-3">
              <div className="text-sm font-medium">Assign Models (optional)</div>
              <Input
                placeholder="Search models"
                value={createModelSearch}
                onChange={(e) => setCreateModelSearch(e.target.value)}
              />

              {createModels.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">Selected Models:</div>
                  <div className="flex flex-wrap gap-2">
                    {createModels.map(sel => (
                      <span key={`create-selm-${sel.model_id || sel.id}`} className="inline-flex items-center gap-1 rounded-md border bg-background shadow-xs h-7 px-2 text-xs">
                        {sel.name || String(sel.model_id || sel.id)}
                        <button
                          type="button"
                          className="ml-1 rounded border px-1 hover:bg-accent hover:text-accent-foreground"
                          title="Remove"
                          onClick={() => toggleCreateModel({ id: sel.model_id || sel.id })}
                        >×</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {createModelSearch.trim() && (
                <div className="relative">
                  <div className="absolute left-0 right-0 top-0 border rounded bg-background shadow-lg max-h-48 overflow-y-auto z-10">
                    {createModelSearchLoading && (
                      <div className="text-sm text-muted-foreground text-center py-2">Loading...</div>
                    )}
                    {!createModelSearchLoading && createModelSearchResults.filter(m => {
                      const already = createModels.some(x => String(x.model_id || x.id) === String(m.id));
                      return !already;
                    }).map(m => (
                      <div
                        key={`create-m-find-${m.id}`}
                        className="flex items-center justify-between px-3 py-2 text-sm hover:bg-accent cursor-pointer border-b last:border-b-0"
                        onClick={() => toggleCreateModel(m)}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{m.name}</div>
                          {!!m.family && <div className="text-xs text-muted-foreground truncate">{m.family}</div>}
                        </div>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-md border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground h-7 px-2 text-sm ml-2"
                          title="Add model"
                          onClick={(e) => { e.stopPropagation(); toggleCreateModel(m); }}
                        >+</button>
                      </div>
                    ))}
                    {!createModelSearchLoading && createModelSearchResults.filter(m => {
                      const already = createModels.some(x => String(x.model_id || x.id) === String(m.id));
                      return !already;
                    }).length === 0 && (
                      <div className="text-sm text-muted-foreground text-center py-2">No models found</div>
                    )}
                  </div>
                  {/* Spacer to prevent content overlap */}
                  <div className="h-2"></div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setCreateOpen(false);
              setName('');
              setDescription('');
              setCreateUsers([]);
              setCreateUserSearch('');
              setCreateModels([]);
              setCreateModelSearch('');
            }}>Cancel</Button>
            <Button disabled={!name || saving} onClick={async () => {
              setSaving(true)
              try {
                const payload = { name, description };
                const res = await svc.create(payload);
                if (res?.success && res.id) {
                  // Assign users if any were selected
                  if (createUsers.length > 0) {
                    const userPayload = createUsers.map(u => ({ user_id: u.user_id || u.id, role: u.role || 'member' }));
                    await svc.assignUsers(res.id, userPayload);
                  }
                  // Assign models if any were selected
                  if (createModels.length > 0) {
                    const modelPayload = createModels.map(m => ({ model_id: m.model_id || m.id }));
                    await svc.assignModels(res.id, modelPayload);
                  }
                  setCreateOpen(false);
                  setName('');
                  setDescription('');
                  setCreateUsers([]);
                  setCreateUserSearch('');
                  setCreateModels([]);
                  setCreateModelSearch('');
                  await load();
                }
              } catch(_){}
              finally { setSaving(false) }
            }}>{saving ? 'Creating…' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

    {/* Edit Workspace Drawer */}
    <Sheet open={editOpen} onOpenChange={setEditOpen}>
      <SheetContent side="right" className="w-[90vw] sm:w-[45vw] sm:max-w-none flex flex-col">
        <SheetHeader>
          <SheetTitle>Edit Workspace</SheetTitle>
          <SheetDescription>Update workspace details, members, and models.</SheetDescription>
        </SheetHeader>
        <div className="py-3 space-y-4 overflow-y-auto">
          {/* Top section: Basic Info and Knowledge Base side by side */}
          <div className="grid grid-cols-2 gap-6">
            {/* Left column - Basic Info */}
            <div className="space-y-3">
              <Input placeholder="Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
              <Input placeholder="Description" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
              <div className="flex justify-end"><Button onClick={saveBasics} disabled={editLoading}>{editLoading ? 'Saving…' : 'Save'}</Button></div>
            </div>

            {/* Vertical divider */}
            <div className="relative">
              <div className="absolute left-0 top-0 bottom-0 w-px bg-border"></div>

              {/* Right column - Knowledge Base */}
              <div className="pl-6 space-y-3">
                <div className="text-lg font-semibold flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Knowledge Base
                  <span className="text-[10px] text-muted-foreground font-normal">(.txt, .md, .html, .pdf, .docx, .csv)</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {kbStats.documentCount} documents, {kbStats.chunkCount} chunks
                </p>

                {/* Upload Section */}
                <form onSubmit={handleKbUpload} className="space-y-3">
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
                          <span key={idx} className="inline-flex items-center gap-1 rounded-md border bg-background shadow-xs h-7 px-2 text-xs">
                            {file.name}
                          </span>
                        ))}
                      </div>
                      <Button type="submit" disabled={kbUploading} size="sm">
                        {kbUploading ? 'Uploading...' : 'Upload Files'}
                      </Button>
                    </div>
                  )}
                </form>

                {/* Document List */}
                {kbDocuments.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Documents:</div>
                    {kbDocuments.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between border rounded px-2 py-1 text-sm">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{doc.title}</div>
                          <div className="text-xs text-muted-foreground truncate">{doc.filename}</div>
                        </div>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-md border bg-background shadow-xs hover:bg-destructive hover:text-white h-7 w-7 p-0 text-sm"
                          title="Delete document"
                          onClick={() => setKbDeleteId(doc.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />
          <div className="space-y-3">
            <div className="text-lg font-semibold">Users</div>
            <div className="flex items-center gap-2">
              <Input placeholder="Search users by name or email" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
            </div>
            {editUsers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {editUsers.map(sel => (
                  <span key={`sel-${sel.user_id || sel.id}`} className="inline-flex items-center gap-1 rounded-md border bg-background shadow-xs h-7 px-2 text-xs">
                    {(sel.name && sel.name.trim()) ? sel.name : (sel.email || String(sel.user_id || sel.id))}
                    <button
                      type="button"
                      className="ml-1 rounded border px-1 hover:bg-accent hover:text-accent-foreground"
                      title="Remove"
                      onClick={() => toggleUser({ id: sel.user_id || sel.id })}
                    >×</button>
                  </span>
                ))}
              </div>
            )}
            <div className="space-y-2">
              {allUsers.filter(u => {
                const q = (userSearch || '').toLowerCase().trim();
                if (!q) return false; // show results only when searching
                const un = String(u.user_name || '').toLowerCase();
                const em = String(u.email || '').toLowerCase();
                const fn = String(u.first_name || '').toLowerCase();
                const ln = String(u.last_name || '').toLowerCase();
                const matches = un.includes(q) || em.includes(q) || fn.includes(q) || ln.includes(q);
                const already = editUsers.some(x => String(x.user_id || x.id) === String(u.id));
                return matches && !already;
              }).map(u => (
                <div key={`u-find-${u.id}`} className="flex items-center justify-between border rounded px-2 py-1 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{u.user_name || u.email}</div>
                    <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-md border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground h-7 px-2 text-sm"
                    title="Add user"
                    onClick={() => toggleUser(u)}
                  >+</button>
                </div>
              ))}
            </div>
          </div>
          <Separator />
          <div className="space-y-3">
            <div className="text-lg font-semibold">Models</div>
            <div className="flex items-center gap-2">
              <Input placeholder="Search models" value={modelSearch} onChange={(e) => setModelSearch(e.target.value)} />
            </div>
            {editModels.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {editModels.map(sel => (
                  <span key={`selm-${sel.model_id || sel.id}`} className="inline-flex items-center gap-1 rounded-md border bg-background shadow-xs h-7 px-2 text-xs">
                    {sel.name || String(sel.model_id || sel.id)}
                    <button
                      type="button"
                      className="ml-1 rounded border px-1 hover:bg-accent hover:text-accent-foreground"
                      title="Remove"
                      onClick={() => toggleModel({ id: sel.model_id || sel.id })}
                    >×</button>
                  </span>
                ))}
              </div>
            )}
            <div className="space-y-2">
              {allModels.filter(m => {
                const q = (modelSearch || '').toLowerCase().trim();
                if (!q) return false; // show results only when searching
                const nm = String(m.name || '').toLowerCase();
                const fam = String(m.family || m.type || '').toLowerCase();
                const matches = nm.includes(q) || fam.includes(q);
                const already = editModels.some(x => String(x.model_id || x.id) === String(m.id));
                return matches && !already;
              }).map(m => (
                <div key={`m-find-${m.id}`} className="flex items-center justify-between border rounded px-2 py-1 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{m.name}</div>
                    {!!m.family && <div className="text-xs text-muted-foreground truncate">{m.family}</div>}
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-md border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground h-7 px-2 text-sm"
                    title="Add model"
                    onClick={() => toggleModel(m)}
                  >+</button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <SheetFooter />
      </SheetContent>
    </Sheet>

    {/* KB Delete Confirmation Dialog */}
    <Dialog open={!!kbDeleteId} onOpenChange={(open) => !open && setKbDeleteId(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Document</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this document? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setKbDeleteId(null)}>Cancel</Button>
          <Button variant="destructive" onClick={() => handleKbDelete(kbDeleteId)}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Delete Confirmation Modal */}
    <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Workspace</DialogTitle>
          <DialogDescription>
            {`Are you sure you want to delete "${deleteTarget?.name || ''}"? This action cannot be undone.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button>
          <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>{deleting ? 'Deleting…' : 'Yes, Delete'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}



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
import { Trash2 } from 'lucide-react'

export default function WorkspacesPage(){
  const svc = useMemo(() => new WorkspaceService(), [])
  const [q, setQ] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [profiles, setProfiles] = useState([])
  const [profileId, setProfileId] = useState('')

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
  const [editSystemPrompt, setEditSystemPrompt] = useState('')
  const [editPromptTemplate, setEditPromptTemplate] = useState('')
  const [editUsers, setEditUsers] = useState([])
  const [editModels, setEditModels] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [allModels, setAllModels] = useState([])
  const [userSearch, setUserSearch] = useState('')
  const [modelSearch, setModelSearch] = useState('')

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

  // Load profiles list for optional association
  useEffect(() => {
    let stop = false
    const loadProfiles = async () => {
      try {
        const res = await fetch(`${(process.env.NEXT_PUBLIC_BACKEND_URL || api.ApiConfig.main)}/bb-models/api/profiles/list`, { credentials: 'include' })
        const data = await res.json()
        if (!stop && data?.success && Array.isArray(data.profiles)) setProfiles(data.profiles)
      } catch (_) {}
    }
    loadProfiles()
    return () => { stop = true }
  }, [])

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
        setEditSystemPrompt(w.system_prompt || '')
        setEditPromptTemplate(w.prompt_template || '')
        setEditUsers(Array.isArray(w.users) ? w.users : [])
        setEditModels(Array.isArray(w.models) ? w.models : [])
      }
      if (us && Array.isArray(us.userList)) setAllUsers(us.userList)
      if (ms?.success && Array.isArray(ms.models)) setAllModels(ms.models)
    } finally {
      setEditLoading(false)
    }
  }

  const saveBasics = async () => {
    if (!editId) return
    setEditLoading(true)
    try { await svc.update({ id: editId, name: editName, description: editDescription, system_prompt: editSystemPrompt, prompt_template: editPromptTemplate }); await load() } finally { setEditLoading(false) }
  }

  const saveUsers = async () => {
    if (!editId) return
    const payload = editUsers.map(u => ({ user_id: u.user_id || u.id, role: u.role || 'member' }))
    await svc.assignUsers(editId, payload)
    // Refresh workspace users from backend to reflect persisted state
    try {
      const ws = await svc.get(editId)
      if (ws?.success && ws.workspace && Array.isArray(ws.workspace.users)) {
        setEditUsers(ws.workspace.users)
      }
      await load()
    } catch (_) {}
  }

  const saveModels = async () => {
    if (!editId) return
    const payload = editModels.map(m => ({ model_id: m.model_id || m.id }))
    await svc.assignModels(editId, payload)
    try {
      const ws = await svc.get(editId)
      if (ws?.success && ws.workspace && Array.isArray(ws.workspace.models)) {
        setEditModels(ws.workspace.models)
      }
      await load()
    } catch (_) {}
  }

  const toggleUser = (u) => {
    if (!u) return
    setEditUsers(prev => {
      const exists = prev.some(x => String(x.user_id || x.id) === String(u.id))
      if (exists) return prev.filter(x => String(x.user_id || x.id) !== String(u.id))
      return [...prev, { user_id: u.id, role: 'member', name: `${u.first_name || ''} ${u.last_name || ''}`.trim(), email: u.email }]
    })
  }

  const toggleModel = (m) => {
    if (!m) return
    setEditModels(prev => {
      const exists = prev.some(x => String(x.model_id || x.id) === String(m.id))
      if (exists) return prev.filter(x => String(x.model_id || x.id) !== String(m.id))
      return [...prev, { model_id: m.id, name: m.name }]
    })
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
      await svc.remove(deleteTarget.id)
      setDeleteOpen(false)
      setDeleteTarget(null)
      await load()
    } catch (_) {
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Workspace</DialogTitle>
            <DialogDescription>Create a new workspace.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
            <div>
              <label className="text-sm block mb-1">Profile (optional)</label>
              <select className="border rounded h-9 px-2 w-full" value={profileId} onChange={(e) => setProfileId(e.target.value)}>
                <option value="">Select profile…</option>
                {profiles.map(p => (
                  <option key={`p-${p.id}`} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button disabled={!name || saving} onClick={async () => {
              setSaving(true)
              try { const payload = { name, description };
                if (profileId) payload.profile_id = parseInt(profileId, 10);
                const res = await svc.create(payload); if (res?.success) { setCreateOpen(false); setName(''); setDescription(''); setProfileId(''); await load(); } }
              catch(_){}
              finally { setSaving(false) }
            }}>{saving ? 'Creating…' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

    {/* Edit Workspace Drawer */}
    <Sheet open={editOpen} onOpenChange={setEditOpen}>
      <SheetContent side="right" className="w-[420px] sm:w-[560px] flex flex-col">
        <SheetHeader>
          <SheetTitle>Edit Workspace</SheetTitle>
          <SheetDescription>Update workspace details, members, and models.</SheetDescription>
        </SheetHeader>
        <div className="py-3 space-y-4 overflow-y-auto">
          <div className="space-y-3">
            <Input placeholder="Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            <Input placeholder="Description" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            <div className="grid grid-cols-1 gap-4">
              <div>
                <div className="text-sm font-medium mb-2">System Prompt</div>
                <textarea className="w-full min-h-[120px] p-2 border rounded font-mono text-sm" value={editSystemPrompt} onChange={e => setEditSystemPrompt(e.target.value)} />
              </div>
              <div>
                <div className="text-sm font-medium mb-2">Prompt Template</div>
                <textarea className="w-full min-h-[120px] p-2 border rounded font-mono text-sm" value={editPromptTemplate} onChange={e => setEditPromptTemplate(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end"><Button onClick={saveBasics} disabled={editLoading}>{editLoading ? 'Saving…' : 'Save'}</Button></div>
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
            <div className="flex justify-end"><Button onClick={saveUsers}>Save Users</Button></div>
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
            <div className="flex justify-end"><Button onClick={saveModels}>Save Models</Button></div>
          </div>
        </div>
        <SheetFooter />
      </SheetContent>
    </Sheet>

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



'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import WorkspaceService from '@/services/workspaceService'
import api from '@/apiConfig.json'

export default function WorkspaceEditPage(){
  const params = useParams()
  const router = useRouter()
  const id = useMemo(() => { try { return parseInt(params?.id, 10) } catch(_) { return null } }, [params])
  const svc = useMemo(() => new WorkspaceService(), [])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [promptTemplate, setPromptTemplate] = useState('')
  const [users, setUsers] = useState([])
  const [models, setModels] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [allModels, setAllModels] = useState([])

  useEffect(() => {
    let stop = false
    const load = async () => {
      if (!id) { setLoading(false); return }
      try {
        setLoading(true)
        const BASE = api.ApiConfig.main
        const [ws, us, ms] = await Promise.all([
          svc.get(id),
          fetch(`${BASE}/bb-user/api/profile/all`, { credentials: 'include' }).then(r => r.json()).catch(() => ({})),
          fetch(`${BASE}/bb-models/api/models`, { credentials: 'include' }).then(r => r.json()).catch(() => ({})),
        ])
        if (!stop && ws?.success && ws.workspace) {
          const w = ws.workspace
          setName(w.name || '')
          setDescription(w.description || '')
          setSystemPrompt(w.system_prompt || '')
          setPromptTemplate(w.prompt_template || '')
          setUsers(Array.isArray(w.users) ? w.users : [])
          setModels(Array.isArray(w.models) ? w.models : [])
        }
        if (!stop && us && Array.isArray(us.userList)) setAllUsers(us.userList)
        if (!stop && ms?.success && Array.isArray(ms.models)) setAllModels(ms.models)
      } finally { if (!stop) setLoading(false) }
    }
    load()
    return () => { stop = true }
  }, [id, svc])

  if (!id) return (<div className="p-6">Invalid workspace id</div>)
  if (loading) return (<div className="p-6">Loading…</div>)

  const saveBasics = async () => {
    setSaving(true)
    try { await svc.update({ id, name, description, system_prompt: systemPrompt, prompt_template: promptTemplate }); } catch(_) {}
    finally { setSaving(false) }
  }

  const saveUsers = async () => {
    const payload = users.map(u => ({ user_id: u.user_id || u.id, role: u.role || 'member' }))
    await svc.assignUsers(id, payload)
  }

  const saveModels = async () => {
    const payload = models.map(m => ({ model_id: m.model_id || m.id }))
    await svc.assignModels(id, payload)
  }

  const toggleUser = (u) => {
    if (!u) return
    setUsers(prev => {
      const exists = prev.some(x => String(x.user_id || x.id) === String(u.id))
      if (exists) return prev.filter(x => String(x.user_id || x.id) !== String(u.id))
      return [...prev, { user_id: u.id, role: 'member', name: `${u.first_name || ''} ${u.last_name || ''}`.trim(), email: u.email }]
    })
  }

  const toggleModel = (m) => {
    if (!m) return
    setModels(prev => {
      const exists = prev.some(x => String(x.model_id || x.id) === String(m.id))
      if (exists) return prev.filter(x => String(x.model_id || x.id) !== String(m.id))
      return [...prev, { model_id: m.id, name: m.name }]
    })
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit Workspace</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/bb-admin/workspaces')}>Back</Button>
          <Button onClick={saveBasics} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </div>
      </div>
      <Card className="p-4 space-y-3">
        <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium mb-2">System Prompt</div>
            <textarea className="w-full min-h-[140px] p-2 border rounded font-mono text-sm" value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} />
          </div>
          <div>
            <div className="text-sm font-medium mb-2">Prompt Template</div>
            <textarea className="w-full min-h-[140px] p-2 border rounded font-mono text-sm" value={promptTemplate} onChange={e => setPromptTemplate(e.target.value)} />
          </div>
        </div>
      </Card>
      <Separator />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-4 space-y-3">
          <div className="text-lg font-semibold">Users</div>
          <div className="flex flex-wrap gap-2">
            {allUsers.map(u => {
              const active = users.some(x => String(x.user_id || x.id) === String(u.id))
              return (
                <button key={`u-${u.id}`} onClick={() => toggleUser(u)} className={`inline-flex items-center justify-center rounded-md border bg-background shadow-xs h-9 px-3 ${active ? 'bg-secondary' : ''}`}>{u.user_name || u.email}</button>
              )
            })}
          </div>
          <div className="flex justify-end"><Button onClick={saveUsers}>Save Users</Button></div>
        </Card>
        <Card className="p-4 space-y-3">
          <div className="text-lg font-semibold">Models</div>
          <div className="flex flex-wrap gap-2">
            {allModels.map(m => {
              const active = models.some(x => String(x.model_id || x.id) === String(m.id))
              return (
                <button key={`m-${m.id}`} onClick={() => toggleModel(m)} className={`inline-flex items-center justify-center rounded-md border bg-background shadow-xs h-9 px-3 ${active ? 'bg-secondary' : ''}`}>{m.name}</button>
              )
            })}
          </div>
          <div className="flex justify-end"><Button onClick={saveModels}>Save Models</Button></div>
        </Card>
      </div>
    </div>
  )
}



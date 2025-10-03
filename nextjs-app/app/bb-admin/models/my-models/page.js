'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Trash2, Info, Settings2, Wrench } from 'lucide-react'
import ModelSettings from './_components/model-settings'
import ModelRules from './_components/model-rules'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog'
import api from '@/apiConfig.json'
import getBackendBaseUrl from '@/lib/backendUrl'

export default function MyModelsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [models, setModels] = useState([])
  const [filteredModels, setFilteredModels] = useState([])
  const [modelToDelete, setModelToDelete] = useState(null)
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all') // all | published | unpublished
  const createSubmitRef = useRef(null)
  const [canSubmit, setCanSubmit] = useState(false)
  const registerCreateSubmit = useCallback((fn) => { createSubmitRef.current = fn; setCanSubmit(!!fn) }, [])
  const [creating, setCreating] = useState(false)
  const [connectOpen, setConnectOpen] = useState(false)
  // Global error dialog
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [errorDialogMessage, setErrorDialogMessage] = useState('')

  const normalizeError = (e) => {
    try {
      if (!e) return 'An unexpected error occurred.'
      if (typeof e === 'string') return e
      if (e && typeof e.message === 'string') return e.message
      return 'An unexpected error occurred.'
    } catch (_) { return 'An unexpected error occurred.' }
  }

  const handleModelUpdated = (updated) => {
    if (!updated || !updated.id) return
    setModels(prev => prev.map(m => m.id === updated.id ? {
      ...m,
      name: updated.name ?? m.name,
      description: updated.description ?? m.description,
      server_url: updated.server_url ?? m.server_url,
      profile_id: updated.profile_id ?? m.profile_id,
      updated_at: updated.updated_at ?? m.updated_at
    } : m))
  }

  // Load models on mount
  useEffect(() => {
    let stop = false
    const load = async () => {
      try {
        setLoading(true)
      const BASE = getBackendBaseUrl()
      const url = new URL(`${BASE}/bb-models/api/models`)
        const res = await fetch(url.toString(), { credentials: 'include' })
        const data = await res.json()
        if (!stop && data?.success && Array.isArray(data.models)) {
          const normalized = data.models
            .map(m => ({ ...m, id: (m?.id != null && !Number.isNaN(Number(m.id))) ? Number(m.id) : null }))
            .filter(m => m.id != null)
          setModels(normalized)
        } else if (!stop) {
          setModels([])
        }
      } catch (_) {
        if (!stop) setModels([])
      } finally {
        if (!stop) setLoading(false)
      }
    }
    load()
    return () => { stop = true }
  }, [])

  // Filter models based on search term and publication status
  useEffect(() => {
    let result = models

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      result = result.filter(
        model => 
          (model.name || '').toLowerCase().includes(searchLower) || 
          (model.description || '').toLowerCase().includes(searchLower)
      )
    }

    if (statusFilter === 'published') {
      result = result.filter(m => !!m.is_published)
    } else if (statusFilter === 'unpublished') {
      result = result.filter(m => !m.is_published)
    }

    setFilteredModels(result)
  }, [searchTerm, models, statusFilter])

  const handleDeleteModel = (model) => {
    setModelToDelete(model)
  }

  const confirmDelete = async () => {
    if (!modelToDelete) return
    try {
      const BASE = getBackendBaseUrl()
      const url = `${BASE}/bb-models/api/model/delete`
      const res = await fetch(url, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: modelToDelete.id }) })
      const data = await res.json()
      if (data?.success) {
        // Remove from UI list
        setModels(prev => prev.filter(m => m.id !== modelToDelete.id))
      }
    } catch (_) {
    } finally {
      setModelToDelete(null)
    }
  }

  const togglePublish = async (model) => {
    try {
      const BASE = getBackendBaseUrl()
      const url = `${BASE}/bb-models/api/models/publish`
      const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: model.id, is_published: !model.is_published })
      })
      const data = await res.json()
      if (data?.success) {
        setModels(prev => prev.map(m => m.id === model.id ? { ...m, is_published: !!data.is_published } : m))
      }
    } catch (_) {}
  }

  const formatDate = (value) => {
    if (value === null || value === undefined || value === '') return ''
    let ms = null
    if (typeof value === 'number') {
      ms = value < 1e12 ? value * 1000 : value
    } else if (typeof value === 'string') {
      const trimmed = value.trim()
      if (/^\d+$/.test(trimmed)) {
        const num = parseInt(trimmed, 10)
        ms = num < 1e12 ? num * 1000 : num
      } else {
        const parsed = Date.parse(trimmed)
        if (!Number.isNaN(parsed)) ms = parsed
      }
    }
    if (ms === null) return ''
    const date = new Date(ms)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return (<>
    <div className="space-y-6 p-6 md:p-10">
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">My Models</h2>
        <p className="text-muted-foreground">Manage your API-connected AI models.</p>
      </div>
      
      {/* Search and filters row */}
      <div className="w-full flex flex-wrap items-center justify-between gap-4">
        <div className="relative w-full md:w-auto md:min-w-[300px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Filter models" 
            className="pl-10 pr-4" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          
          <Dialog open={connectOpen} onOpenChange={setConnectOpen}>
            <DialogTrigger asChild>
              <Button
                variant="default"
                className="bg-chart-2 text-sidebar-primary-foreground hover:bg-chart-2/90 dark:bg-chart-2 dark:hover:bg-chart-2/80"
              >
                Connect Models
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>Connect To Server (vLLm, API)</DialogTitle>
                <DialogDescription>Enter details to register a vLLM-server or an API server.</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[75vh] pr-2">
                <VllmCreateForm
                  onCreated={(model) => { setModels(prev => [model, ...prev]); setConnectOpen(false); }}
                  registerSubmit={registerCreateSubmit}
                  onSavingChange={setCreating}
                />
              </ScrollArea>
              <DialogFooter className="sm:justify-end">
                <DialogClose asChild>
                  <Button type="button" variant="secondary">Close</Button>
                </DialogClose>
          <Button onClick={() => { if (createSubmitRef.current) createSubmitRef.current(); }} disabled={creating || !canSubmit}>{creating ? 'Creating…' : 'Create'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <Separator />
      
      {/* Main content with sidebar and models list */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar filter */}
        <div className="lg:w-1/5">
          <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1 lg:min-w-[200px]">
            {[
              { id: 'all', title: 'All' },
              { id: 'published', title: 'Published' },
              { id: 'unpublished', title: 'Unpublished' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setStatusFilter(item.id)}
                className={`inline-flex items-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${statusFilter === item.id ? 'bg-secondary text-secondary-foreground' : 'hover:bg-secondary/50'}`}
              >
                {item.title}
              </button>
            ))}
          </nav>
        </div>

        {/* Models List */}
        <div className="lg:w-4/5 space-y-4">
          {filteredModels.length > 0 ? (
            filteredModels.map((model, idx) => (
              <Card key={model?.id != null ? `m-${model.id}` : `m-${model?.file_location || model?.name || 'row'}-${idx}`} className={`p-6`}>
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                  <div className="space-y-3 flex-1">
                    <div>
                      
                        <h3 className="text-xl font-semibold flex items-center gap-2">
                          {model.name}
                          <span className={`text-xs px-2 py-0.5 rounded ${model.is_published ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
                            {model.is_published ? 'Published' : 'Unpublished'}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300`}>
                            {model.profile_name || ''}
                          </span>
                        </h3>
                      
                      <p className="text-muted-foreground">{model.description}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                       {!!(model.created_at && formatDate(model.created_at)) && (
                         <span>Created: {formatDate(model.created_at)}</span>
                       )}
                       {!!(model.updated_at && formatDate(model.updated_at)) && (
                         <span>Updated: {formatDate(model.updated_at)}</span>
                       )}
                     </div>
                  </div>
                  <div className="flex gap-2">
                    <ModelSettings model={model} />
                    <ModelRules model={model} />
                    <Button variant={model.is_published ? 'secondary' : 'default'} onClick={() => togglePublish(model)}>
                      {model.is_published ? 'Unpublish' : 'Publish'}
                    </Button>

                    <EditServerModelButton
                      model={model}
                      onUpdated={handleModelUpdated}
                      onError={(msg) => { setErrorDialogMessage(normalizeError(msg)); setErrorDialogOpen(true) }}
                    />

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="icon">
                          <Info className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>{model.name} Details</DialogTitle>
                          <DialogDescription>Information about your model.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <span className="font-medium">Model</span>
                            <span className="col-span-2">{model.name}</span>
                            
                            <span className="font-medium">Family</span>
                            <span className="col-span-2 capitalize">{model.family}</span>
                            
                            
                          </div>
                        </div>
                        <DialogFooter className="sm:justify-end">
                          <DialogClose asChild>
                            <Button type="button" variant="secondary">
                              Close
                            </Button>
                          </DialogClose>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    
                    <Button variant="outline" size="icon" onClick={() => handleDeleteModel(model)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-lg font-medium mb-2">{loading ? 'Loading models…' : 'No models'}</div>
              {!loading && (<p className="text-muted-foreground mb-6">No models yet.</p>)}
              <Link href="/bb-admin/models/library">
                <Button>
                  Browse Models
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={!!modelToDelete} onOpenChange={(open) => !open && setModelToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Model</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this model? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {modelToDelete && (
              <p>
                You are about to delete <span className="font-medium">{modelToDelete.name}</span>.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModelToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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
  </>)
}

function EditServerModelButton({ model, onUpdated, onError }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(model.name || '')
  const [description, setDescription] = useState(model.description || '')
  const [promptTemplate, setPromptTemplate] = useState(model.prompt_template || '')
  const [systemPrompt, setSystemPrompt] = useState(model.system_prompt || '')
  const [thinkingStart, setThinkingStart] = useState('')
  const [thinkingEnd, setThinkingEnd] = useState('')
  const [thinkingItems, setThinkingItems] = useState([])
  const [serverUrl, setServerUrl] = useState(model.server_url || (() => {
    return 'http://localhost:8000'
  })())
  const [profiles, setProfiles] = useState([])
  const [profileId, setProfileId] = useState(String(model.profile_id || ''))
  const [apiKey, setApiKey] = useState(model.api_key || '')
  const [contextSize, setContextSize] = useState(
    (() => {
      const v = Number(model.context_size)
      return Number.isFinite(v) && v > 0 ? String(v) : ''
    })()
  )
  const [autoTrimOn, setAutoTrimOn] = useState(!!model.auto_trim_on)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState({ serverUrl: '', profileId: '', contextSize: '' })
  const [templates, setTemplates] = useState(Array.isArray(model.promptTemplates) ? model.promptTemplates : [])

  useEffect(() => {
    let stop = false
    const loadProfiles = async () => {
      try { const BASE = getBackendBaseUrl(); const res = await fetch(`${BASE}/bb-models/api/profiles/list`, { credentials: 'include' }); const data = await res.json(); if (!stop && data?.success && Array.isArray(data.profiles)) setProfiles(data.profiles) } catch(_) {}
    }
    const loadThinkingStrings = async () => {
      try {
        const BASE = getBackendBaseUrl()
        const url = new URL(`${BASE}/bb-models/api/thinking-strings/list`)
        url.searchParams.set('model_id', String(model.id))
        const res = await fetch(url.toString(), { credentials: 'include' })
        const data = await res.json()
        if (!stop && data?.success && Array.isArray(data.items)) setThinkingItems(data.items)
      } catch(_) {}
    }
    const loadModel = async () => {
      try {
        const BASE = getBackendBaseUrl()
        const url = new URL(`${BASE}/bb-models/api/models/get`)
        url.searchParams.set('id', String(model.id))
        const res = await fetch(url.toString(), { credentials: 'include' })
        const data = await res.json()
        if (!stop && data?.success && data.model) {
          if (Array.isArray(data.model.promptTemplates)) setTemplates(data.model.promptTemplates)
          // refresh booleans in case mapping changed
          if (typeof data.model.auto_trim_on !== 'undefined') setAutoTrimOn(!!data.model.auto_trim_on)
          if (typeof data.model.context_size !== 'undefined') {
            const v = Number(data.model.context_size)
            setContextSize(Number.isFinite(v) && v > 0 ? String(v) : '')
          }
          if (typeof data.model.server_url === 'string') setServerUrl(data.model.server_url)
          if (typeof data.model.system_prompt === 'string') setSystemPrompt(data.model.system_prompt)
          if (typeof data.model.prompt_template === 'string') setPromptTemplate(data.model.prompt_template)
          if (typeof data.model.description === 'string') setDescription(data.model.description)
          if (typeof data.model.name === 'string') setName(data.model.name)
        }
      } catch(_) {}
    }
    loadProfiles();
    loadThinkingStrings();
    loadModel();
    return () => { stop = true }
  }, [model.id])

  const addThinkingString = async () => {
    if (!thinkingEnd || !thinkingEnd.trim()) return
    try {
      const payload = { model_id: model.id, start_word: thinkingStart || '', end_word: thinkingEnd.trim() }
      const BASE = getBackendBaseUrl()
      const res = await fetch(`${BASE}/bb-models/api/thinking-strings/add`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (data?.success && data.item) {
        setThinkingItems(prev => [...prev, data.item])
        setThinkingStart(''); setThinkingEnd('')
      }
    } catch(_) {}
  }

  const removeThinkingString = async (id) => {
    try {
      const BASE = getBackendBaseUrl()
      const res = await fetch(`${BASE}/bb-models/api/thinking-strings/delete`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      const data = await res.json()
      if (data?.success) setThinkingItems(prev => prev.filter(i => i.id !== id))
    } catch(_) {}
  }

  const submit = async () => {
    setSaving(true)
    setError('')
    const nextErrors = { serverUrl: '', profileId: '', contextSize: '' }
    if (!serverUrl || !serverUrl.trim()) nextErrors.serverUrl = 'Server URL is required'
    if (!profileId) nextErrors.profileId = 'Profile is required'
    const cs = parseInt(String(contextSize).trim(), 10)
    if (!Number.isFinite(cs) || cs <= 0) nextErrors.contextSize = 'Context size (tokens) is required and must be > 0'
    setErrors(nextErrors)
    if (nextErrors.serverUrl || nextErrors.profileId || nextErrors.contextSize) { setSaving(false); return }
    try {
      const payload = { id: model.id, name, description, server_url: serverUrl, api_key: apiKey, profile_id: profileId ? parseInt(profileId, 10) : undefined, auto_trim_on: !!autoTrimOn, context_size: cs, prompt_template: promptTemplate, system_prompt: systemPrompt }
      const BASE = getBackendBaseUrl()
      const res = await fetch(`${BASE}/bb-models/api/models/update`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!data?.success) throw new Error(data?.error || 'Failed to update model')
      if (onUpdated) onUpdated(data.model || { id: model.id, name, description, server_url: serverUrl, api_key: apiKey, profile_id: profileId ? parseInt(profileId, 10) : null, auto_trim_on: !!autoTrimOn, context_size: cs, system_prompt: systemPrompt })
      setOpen(false)
    } catch (e) {
      const msg = e?.message || 'Failed to update model'
      setError(msg)
      try { if (typeof onError === 'function') onError(msg) } catch (_) {}
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" title="Edit server model">
          <Wrench className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit Server Model</DialogTitle>
          <DialogDescription>Update connection details for this API-compatible model.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[75vh] pr-2">
          <div className="py-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="mb-1 block">Model Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My vLLM Model" />
              </div>
              <div className="space-y-2">
                <Label className="mb-1 block">Profile</Label>
                <select className="border rounded h-9 px-2 w-full" value={profileId} onChange={(e) => setProfileId(e.target.value)}>
                  <option value="">Select profile…</option>
                  {profiles.map(p => (<option key={`p-${p.id}`} value={p.id}>{p.name}</option>))}
                </select>
                {errors.profileId && <div className="text-xs text-red-600">{errors.profileId}</div>}
              </div>
              <div className="space-y-2">
                <Label className="mb-1 block">Description</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label className="mb-1 block">System Prompt</Label>
                <textarea
                  className="w-full min-h-[120px] p-2 border rounded font-mono text-sm"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Optional system prompt to prepend for this model"
                />
              </div>
              <div className="space-y-2">
                <Label className="mb-1 block">Server URL</Label>
                <Input value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} placeholder="http://host:port" />
                {errors.serverUrl && <div className="text-xs text-red-600">{errors.serverUrl}</div>}
              </div>
              <div className="space-y-2">
                <Label className="mb-1 block">API Key</Label>
                <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." />
              </div>
              <div className="space-y-2">
                <Label className="mb-1 block">Context Size (tokens)</Label>
                <Input
                  type="number"
                  value={contextSize}
                  onChange={(e) => setContextSize(e.target.value)}
                  placeholder="e.g. 8192"
                />
                {errors.contextSize && <div className="text-xs text-red-600">{errors.contextSize}</div>}
              </div>
              <div className="flex items-start gap-2">
                <Checkbox id="auto-trim-edit" checked={!!autoTrimOn} onCheckedChange={(v) => setAutoTrimOn(!!v)} />
                <div>
                  <Label htmlFor="auto-trim-edit" className="mb-1 block">Auto trim</Label>
                  <p className="text-xs text-muted-foreground">Automatically trims input context based on the profile&apos;s context size rule.</p>
                </div>
              </div>
              {error && <div className="text-sm text-red-600">{error}</div>}
            </div>
            <div className="space-y-2">
              <Label className="mb-1 block flex items-center gap-2">Prompt Template</Label>
              {templates.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {templates.map(t => (
                    <Button key={`tpl-${t.id}`} type="button" size="sm" variant="outline" onClick={() => setPromptTemplate(t.template)}>
                      {t.name}
                    </Button>
                  ))}
                </div>
              )}
              <textarea
                className="w-full min-h-[420px] p-2 border rounded font-mono text-sm"
                value={promptTemplate}
                onChange={(e) => setPromptTemplate(e.target.value)}
                placeholder='e.g. {{#system}}{"role":"system","content":"{{system}}"},{{/system}}\n{{#history}}\n{"role":"{{role}}","content":"{{content}}"},\n{{/history}}\n{"role":"user","content":"{{user}}"}'
              />
              <div className="space-y-2 mt-2">
                <Label className="mb-1 block">Thinking Start Words</Label>
                <div className="flex gap-2 w-full">
                  <Input className="w-1/2" value={thinkingStart} onChange={(e) => setThinkingStart(e.target.value)} placeholder="Start word (optional)" />
                  <Input className="w-1/2" value={thinkingEnd} onChange={(e) => setThinkingEnd(e.target.value)} placeholder="End word (required)" />
                  <Button onClick={addThinkingString} disabled={!thinkingEnd || !thinkingEnd.trim()}>+
                  </Button>
                </div>
                <div className="space-y-1">
                  {thinkingItems.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No thinking strings</div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {thinkingItems.map(item => (
                        <div key={item.id} className="flex items-center justify-between text-sm border rounded px-2 py-1 bg-background shadow-xs w-full">
                          <span className="truncate font-mono text-xs">{(item.start_word || '').trim().length > 0 ? `${item.start_word} → ${item.end_word}` : item.end_word}</span>
                          <button onClick={() => removeThinkingString(item.id)} title="Remove" className="inline-flex items-center justify-center rounded-md border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground size-9">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="sm:justify-end">
          <DialogClose asChild>
            <Button type="button" variant="secondary">Close</Button>
          </DialogClose>
                  <Button onClick={submit} disabled={saving || !name || !serverUrl || !!errors.serverUrl || !!errors.profileId}>{saving ? 'Updating…' : 'Update'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function VllmCreateForm({ onCreated, registerSubmit, onSavingChange }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [promptTemplate, setPromptTemplate] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [thinkingStart, setThinkingStart] = useState('')
  const [thinkingEnd, setThinkingEnd] = useState('')
  const [thinkingItems, setThinkingItems] = useState([])
  const [profileId, setProfileId] = useState('')
  const [profiles, setProfiles] = useState([])
  const [serverUrl, setServerUrl] = useState('http://localhost:8000')
  const [apiKey, setApiKey] = useState('')
  const [contextSize, setContextSize] = useState('')
  const [autoTrimOn, setAutoTrimOn] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState({ name: '', serverUrl: '', profileId: '', contextSize: '' })
  const [templates, setTemplates] = useState([])

  useEffect(() => {
    let stop = false
    const loadProfiles = async () => {
      try {
        const BASE = getBackendBaseUrl()
        const res = await fetch(`${BASE}/bb-models/api/profiles/list`, { credentials: 'include' })
        const data = await res.json()
        if (!stop && data?.success && Array.isArray(data.profiles)) setProfiles(data.profiles)
      } catch(_) {}
    }
    const loadTemplates = async () => {
      try {
        const BASE = getBackendBaseUrl()
        const url = new URL(`${BASE}/bb-models/api/prompt-templates/list`)
        const res = await fetch(url.toString(), { credentials: 'include' })
        const data = await res.json()
        if (!stop && data?.success) {
          const list = Array.isArray(data.promptTemplates) ? data.promptTemplates : (Array.isArray(data.templates) ? data.templates : (Array.isArray(data.items) ? data.items : []))
          const mapped = list.map(t => ({ id: t.id, name: t.name, template: t.template }))
          setTemplates(mapped)
        }
      } catch(_) {}
    }
    loadProfiles()
    loadTemplates()
    return () => { stop = true }
  }, [])

  const addThinkingString = () => {
    if (!thinkingEnd || !thinkingEnd.trim()) return
    const newItem = { id: Math.random(), start_word: thinkingStart || '', end_word: thinkingEnd.trim(), _local: true }
    setThinkingItems(prev => [...prev, newItem])
    setThinkingStart(''); setThinkingEnd('')
  }

  const removeThinkingString = (id) => {
    setThinkingItems(prev => prev.filter(i => i.id !== id))
  }

  const submit = useCallback(async () => {
    setSaving(true)
    try { if (onSavingChange) onSavingChange(true) } catch(_) {}
    setError('')
    const nextErrors = { name: '', serverUrl: '', profileId: '', contextSize: '' }
    if (!name || !name.trim()) nextErrors.name = 'Model name is required'
    if (!serverUrl || !serverUrl.trim()) nextErrors.serverUrl = 'Server URL is required'
    if (!profileId) nextErrors.profileId = 'Profile is required'
    const cs = parseInt(String(contextSize).trim(), 10)
    if (!Number.isFinite(cs) || cs <= 0) nextErrors.contextSize = 'Context size (tokens) is required and must be > 0'
    setErrors(nextErrors)
    if (nextErrors.name || nextErrors.serverUrl || nextErrors.profileId || nextErrors.contextSize) { setSaving(false); try { if (onSavingChange) onSavingChange(false) } catch(_) {}; return }
    try {
      const payload = { 
        name, 
        description, 
        profileId: parseInt(profileId, 10), 
        server_url: serverUrl, 
        api_key: apiKey, 
        auto_trim_on: !!autoTrimOn, 
        context_size: cs, 
        prompt_template: promptTemplate, 
        system_prompt: systemPrompt,
        thinking_strings: Array.isArray(thinkingItems) ? thinkingItems.filter(i => (i?.end_word || '').trim().length > 0).map(i => ({ start_word: i.start_word || '', end_word: i.end_word.trim() })) : []
      }
      const BASE = getBackendBaseUrl()
      const res = await fetch(`${BASE}/bb-models/api/models/create-vllm`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!data?.success) throw new Error(data?.error || 'Failed to create vLLM model')
      if (onCreated && data.model) onCreated(data.model)
      setName(''); setDescription(''); setPromptTemplate(''); setSystemPrompt(''); setThinkingItems([]); setThinkingStart(''); setThinkingEnd(''); setProfileId(''); setServerUrl('http://localhost:8000'); setApiKey(''); setAutoTrimOn(false); setContextSize('')
    } catch (e) {
      setError(e.message || 'Failed to create vLLM model')
    } finally {
      setSaving(false)
      try { if (onSavingChange) onSavingChange(false) } catch(_) {}
    }
  }, [name, description, profileId, serverUrl, apiKey, autoTrimOn, onCreated, onSavingChange, promptTemplate, systemPrompt, contextSize, thinkingItems])

  // Register submit function for footer trigger without updating parent during render
  useEffect(() => {
    if (typeof registerSubmit === 'function') {
      registerSubmit(submit)
      return () => { try { registerSubmit(null) } catch(_) {} }
    }
  }, [registerSubmit, submit])

  return (
    <div className="space-y-4 py-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="mb-1 block">Model Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My vLLM Model" />
            {errors.name && <div className="text-xs text-red-600">{errors.name}</div>}
          </div>
          <div className="space-y-2">
            <Label className="mb-1 block">Profile</Label>
            <select className="border rounded h-9 px-2 w-full" value={profileId} onChange={(e) => setProfileId(e.target.value)}>
              <option value="">Select profile…</option>
              {profiles.map(p => (<option key={`p-${p.id}`} value={p.id}>{p.name}</option>))}
            </select>
            {errors.profileId && <div className="text-xs text-red-600">{errors.profileId}</div>}
          </div>
          <div className="space-y-2">
            <Label className="mb-1 block">Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
          </div>
          <div className="space-y-2">
            <Label className="mb-1 block">System Prompt</Label>
            <textarea
              className="w-full min-h-[120px] p-2 border rounded font-mono text-sm"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Optional system prompt to prepend for this model"
            />
          </div>
          <div className="space-y-2">
            <Label className="mb-1 block">Server URL</Label>
            <Input value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} placeholder="http://host:port" />
            {errors.serverUrl && <div className="text-xs text-red-600">{errors.serverUrl}</div>}
          </div>
          <div className="space-y-2">
            <Label className="mb-1 block">API Key</Label>
            <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." />
          </div>
          <div className="space-y-2">
            <Label className="mb-1 block">Context Size (tokens)</Label>
            <Input type="number" value={contextSize} onChange={(e) => setContextSize(e.target.value)} placeholder="e.g. 8192" />
            {errors.contextSize && <div className="text-xs text-red-600">{errors.contextSize}</div>}
          </div>
          <div className="flex items-start gap-2">
            <Checkbox id="auto-trim-create" checked={!!autoTrimOn} onCheckedChange={(v) => setAutoTrimOn(!!v)} />
            <div>
              <Label htmlFor="auto-trim-create" className="mb-1 block">Auto trim</Label>
              <p className="text-xs text-muted-foreground">Automatically trims input context based on the profile&apos;s context size rule.</p>
            </div>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>
        <div className="space-y-2">
          <Label className="mb-1 block flex items-center gap-2">Prompt Template</Label>
          {templates.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {templates.map(t => (
                <Button key={`tpl-${t.id}`} type="button" size="sm" variant="outline" onClick={() => setPromptTemplate(t.template)}>
                  {t.name}
                </Button>
              ))}
            </div>
          )}
          <textarea
            className="w-full min-h-[420px] p-2 border rounded font-mono text-sm"
            value={promptTemplate}
            onChange={(e) => setPromptTemplate(e.target.value)}
            placeholder='e.g. {{#system}}{"role":"system","content":"{{system}}"},{{/system}}\n{{#history}}\n{"role":"{{role}}","content":"{{content}}"},\n{{/history}}\n{"role":"user","content":"{{user}}"}'
          />
          <div className="space-y-2 mt-2">
            <Label className="mb-1 block">Thinking Start Words</Label>
            <div className="flex gap-2 w-full">
              <Input className="w-1/2" value={thinkingStart} onChange={(e) => setThinkingStart(e.target.value)} placeholder="Start word (optional)" />
              <Input className="w-1/2" value={thinkingEnd} onChange={(e) => setThinkingEnd(e.target.value)} placeholder="End word (required)" />
              <Button onClick={addThinkingString} disabled={!thinkingEnd || !thinkingEnd.trim()}>+
              </Button>
            </div>
            <div className="space-y-1">
              {thinkingItems.length === 0 ? (
                <div className="text-xs text-muted-foreground">No thinking strings</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {thinkingItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between text-sm border rounded px-2 py-1 bg-background shadow-xs w-full">
                      <span className="truncate font-mono text-xs">{(item.start_word || '').trim().length > 0 ? `${item.start_word} → ${item.end_word}` : item.end_word}</span>
                      <button onClick={() => removeThinkingString(item.id)} title="Remove" className="inline-flex items-center justify-center rounded-md border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground size-9">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

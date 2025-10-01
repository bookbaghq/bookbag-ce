'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import api from '@/apiConfig.json'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function ModelLibraryPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [provider, setProvider] = useState('oa') // oa | grok
  const [oaResults, setOaResults] = useState([])
  const [grokResults, setGrokResults] = useState([])
  const [oaCategory, setOaCategory] = useState('all') // dynamic per provider
  const [installedOa, setInstalledOa] = useState(new Set())
  const [installedGrok, setInstalledGrok] = useState(new Set())
  const [formOpen, setFormOpen] = useState(false)
  const [formModel, setFormModel] = useState(null)
  const [providerError, setProviderError] = useState('')
  const createSubmitRef = useRef(null)
  const registerCreateSubmit = useCallback((fn) => { createSubmitRef.current = fn; setCanSubmit(!!fn) }, [])
  const [creating, setCreating] = useState(false)
  const [canSubmit, setCanSubmit] = useState(false)

  // Load models for selected provider
  useEffect(() => {
    let stop = false
    const load = async () => {
      try {
        setProviderError('')
        const path = provider === 'grok' ? '/bb-models/api/grok/models' : '/bb-models/api/oa/models'
        const url = new URL(`${(process.env.NEXT_PUBLIC_BACKEND_URL || api.ApiConfig.main)}${path}`)
        const res = await fetch(url.toString(), { credentials: 'include' })
        const data = await res.json()
        if (!stop) {
          if (data?.success && Array.isArray(data.results)) {
            const onlyChat = data.results.filter(x => x.type === 'chat')
            const mapped = onlyChat.map(m => ({ id: m.id, name: m.name, description: m.owned_by || '', family: provider === 'oa' ? ((m.id || '').includes('gpt') ? 'gpt' : 'openai') : 'grok', tags: [], pulls: '0', tagsCount: 0, updated: '' }))
            if (provider === 'grok') setGrokResults(mapped); else setOaResults(mapped)
            setProviderError('')
          } else {
            const err = String(data?.error || '')
            if (/api key is not configured/i.test(err)) {
              setProviderError("Please add API keys in the Settings to search LLM's")
            } else {
              setProviderError(err || 'Failed to load models')
            }
            if (provider === 'grok') setGrokResults([]); else setOaResults([])
          }
        }
      } catch (e) {
        if (!stop) {
          setProviderError('Failed to load models')
          if (provider === 'grok') setGrokResults([]); else setOaResults([])
        }
      }
    }
    load()
    return () => { stop = true }
  }, [provider])

  // Load installed models to persist Connected state (populated after successful install)
  useEffect(() => {
    let stop = false
    // Removed legacy local models fetch; installed sets will be updated on install
    return () => { stop = true }
  }, [])

  // Categories by provider
  const categories = provider === 'grok'
    ? [
        { id: 'all', title: 'All' },
        { id: 'grok4', title: 'Grok-4' },
        { id: 'grok3', title: 'Grok-3' },
        { id: 'grok2', title: 'Grok-2' },
        { id: 'grokcode', title: 'Grok-code' },
      ]
    : [
        { id: 'all', title: 'All' },
        { id: 'gpt5', title: 'GPT-5' },
        { id: 'gpt4', title: 'GPT-4' },
        { id: 'gpt3', title: 'GPT-3' },
        { id: 'mini', title: 'Mini' },
        { id: 'nano', title: 'Nano' },
      ]

  // Reset category when provider changes
  useEffect(() => { setOaCategory('all') }, [provider])

  // Client-side fuzzy filtering for models (title only)
  const filteredModels = useMemo(() => {
    const category = (oaCategory || 'all').toLowerCase()
    const catMatchers = provider === 'grok'
      ? {
          grok4: ['grok-4', 'grok4'],
          grok3: ['grok-3', 'grok3'],
          grok2: ['grok-2', 'grok2'],
          grokcode: ['grok-code', 'grokcode']
        }
      : {
          gpt5: ['gpt-5', 'gpt5'],
          gpt4: ['gpt-4', 'gpt4', 'gpt-4o', 'gpt-4.1', 'gpt-4o-mini'],
          gpt3: ['gpt-3', 'gpt3'],
          mini: ['mini'],
          nano: ['nano']
        }
    const matchesCategory = (name) => {
      if (category === 'all') return true
      const keys = catMatchers[category] || []
      const lower = (name || '').toLowerCase()
      return keys.some(k => lower.includes(k))
    }
    const score = (name) => {
      const term = (searchTerm || '').toLowerCase().trim()
      const lower = (name || '').toLowerCase()
      let s = 0
      if (term) {
        const idx = lower.indexOf(term)
        if (idx >= 0) s += (1000 - idx)
      }
      if (category !== 'all') {
        const keys = catMatchers[category] || []
        for (const k of keys) {
          const idx = lower.indexOf(k)
          if (idx >= 0) { s += (500 - idx); break }
        }
      }
      return s
    }

    const list = provider === 'grok' ? (grokResults || []) : (oaResults || [])
    const term = (searchTerm || '').toLowerCase().trim()
    return list
      .filter(m => matchesCategory(m.name))
      .map(m => ({ m, s: score(m.name) }))
      .filter(x => (term ? x.s > 0 : true))
      .sort((a, b) => b.s - a.s)
      .map(x => x.m)
  }, [provider, grokResults, oaResults, oaCategory, searchTerm])

  return (
    <div className="space-y-6 p-6 md:p-10">
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">Models Library</h2>
        <p className="text-muted-foreground">
          Browse and connect API models for your projects.
        </p>
      </div>
      
      {/* Search + Provider */}
      <div className="w-full flex flex-col space-y-4">
        <div className="relative w-full max-w-lg">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search models" 
            className="pl-10 pr-4" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={provider} onValueChange={(v) => { setProvider(v); setProviderError(''); setOaCategory('all') }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="oa">OpenAI</SelectItem>
              <SelectItem value="grok">Grok</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <Separator />
      
      {/* Main content with sidebar and models list */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <div className="lg:w-1/5">
          <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1 lg:min-w-[200px]">
            {categories.map(item => (
              <button
                key={item.id}
                onClick={() => setOaCategory(item.id)}
                className={`inline-flex items-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${oaCategory === item.id ? 'bg-secondary text-secondary-foreground' : 'hover:bg-secondary/50'}`}
              >
                {item.title}
              </button>
            ))}
          </nav>
        </div>
        
        {/* Models List */}
        <div className="lg:w-4/5 space-y-4">
          {filteredModels.length > 0 ? (
            filteredModels.map(model => (
              <Card key={model.id} className="p-6">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                  <div className="space-y-4 flex-1">
                    <div>
                      <h3 className="text-xl font-semibold">{model.name}</h3>
                      <p className="text-muted-foreground">{model.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-2" />
                  </div>
                  <div>
                    <Button className={`w-full md:w-auto ${(provider === 'grok' ? installedGrok : installedOa).has(model.id) ? 'bg-emerald-600 text-white hover:bg-emerald-700' : ''}`} disabled={(provider === 'grok' ? installedGrok : installedOa).has(model.id)} onClick={async () => {
                      setFormModel({ id: model.id, name: model.name })
                      setFormOpen(true)
                    }}>
                      {(provider === 'grok' ? installedGrok : installedOa).has(model.id) ? 'Connected' : 'Connect'}
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
              {providerError || (searchTerm ? 'No models found' : 'No models to display')}
            </div>
          )}
        </div>
      </div>

      {/* Install -> Create Server Model Form */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect To Server (vLLM, API)</DialogTitle>
            <DialogDescription>Enter details to register an API server.</DialogDescription>
          </DialogHeader>
          <InstallCreateForm
            provider={provider}
            initialName={formModel?.name || ''}
            registerSubmit={registerCreateSubmit}
            onSavingChange={setCreating}
            onCreated={(m) => {
              if (m?.file_location) {
                const loc = String(m.file_location)
                if (loc.startsWith('openai:')) {
                  setInstalledOa(prev => new Set([...(prev || new Set()), loc.substring('openai:'.length)]))
                } else if (loc.startsWith('grok:')) {
                  setInstalledGrok(prev => new Set([...(prev || new Set()), loc.substring('grok:'.length)]))
                }
              }
              setFormOpen(false)
            }}
          />
          <DialogFooter className="sm:justify-end">
            <DialogClose asChild>
              <Button type="button" variant="secondary">Close</Button>
            </DialogClose>
            <Button onClick={() => { if (createSubmitRef.current) createSubmitRef.current() }} disabled={creating || !canSubmit}>{creating ? 'Creating…' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InstallCreateForm({ provider = 'oa', initialName = '', onCreated, registerSubmit, onSavingChange }) {
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState('')
  const [profileId, setProfileId] = useState('')
  const [profiles, setProfiles] = useState([])
  const defaultServer = provider === 'grok' ? 'https://api.x.ai/v1' : 'https://api.openai.com/v1'
  const [serverUrl, setServerUrl] = useState(defaultServer)
  const [apiKey, setApiKey] = useState('')
  const [contextSize, setContextSize] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState({ serverUrl: '', profileId: '', contextSize: '' })

  useEffect(() => {
    setName(initialName || '')
  }, [initialName])

  useEffect(() => {
    setServerUrl(provider === 'grok' ? 'https://api.x.ai/v1' : 'https://api.openai.com/v1')
  }, [provider])

  useEffect(() => {
    let stop = false
    const loadProfiles = async () => {
      try {
        const res = await fetch(`${(process.env.NEXT_PUBLIC_BACKEND_URL || api.ApiConfig.main)}/bb-models/api/profiles/list`, { credentials: 'include' })
        const data = await res.json()
        if (!stop && Array.isArray(data?.profiles)) setProfiles(data.profiles)
      } catch(_) {}
    }
    loadProfiles()
    return () => { stop = true }
  }, [])

  const submit = useCallback(async () => {
    setSaving(true)
    try { if (onSavingChange) onSavingChange(true) } catch(_) {}
    setError('')
    const nextErrors = { serverUrl: '', profileId: '', contextSize: '' }
    if (!serverUrl || !serverUrl.trim()) nextErrors.serverUrl = 'Server URL is required'
    if (!profileId) nextErrors.profileId = 'Profile is required'
    const cs = parseInt(String(contextSize).trim(), 10)
    if (!Number.isFinite(cs) || cs <= 0) nextErrors.contextSize = 'Context size (tokens) is required and must be > 0'
    setErrors(nextErrors)
    if (nextErrors.serverUrl || nextErrors.profileId || nextErrors.contextSize) { setSaving(false); try { if (onSavingChange) onSavingChange(false) } catch(_) {}; return }
    try {
      const payload = { modelId: name, title: name, description, server_url: serverUrl, api_key: apiKey, profileId: profileId ? parseInt(profileId, 10) : undefined, context_size: cs }
      const endpoint = provider === 'grok' ? '/bb-models/api/grok/install' : '/bb-models/api/oa/install'
      const res = await fetch(`${(process.env.NEXT_PUBLIC_BACKEND_URL || api.ApiConfig.main)}${endpoint}`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!data?.success) throw new Error(data?.error || `Failed to install ${provider === 'grok' ? 'Grok' : 'OpenAI'} model`)
      if (onCreated) onCreated(data.model)
      setName(initialName || ''); setDescription(''); setProfileId(''); setServerUrl(provider === 'grok' ? 'https://api.x.ai/v1' : 'https://api.openai.com/v1'); setApiKey(''); setContextSize('')
    } catch (e) {
      setError(e.message || `Failed to install ${provider === 'grok' ? 'Grok' : 'OpenAI'} model`)
    } finally {
      setSaving(false)
      try { if (onSavingChange) onSavingChange(false) } catch(_) {}
    }
  }, [name, description, profileId, serverUrl, apiKey, provider, onCreated, onSavingChange, contextSize, initialName])

  useEffect(() => {
    if (typeof registerSubmit === 'function') {
      registerSubmit(submit)
      return () => { try { registerSubmit(null) } catch(_) {} }
    }
  }, [registerSubmit, submit])

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label className="mb-1 block">Model Name</Label>
        <Input value={name} readOnly disabled placeholder={provider === 'grok' ? 'grok-2' : 'gpt-4o-mini'} />
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
        <Label className="mb-1 block">Server URL</Label>
        <Input value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} placeholder={provider === 'grok' ? 'https://api.x.ai/v1' : 'https://api.openai.com/v1'} />
        {errors.serverUrl && <div className="text-xs text-red-600">{errors.serverUrl}</div>}
      </div>
      <div className="space-y-2">
        <Label className="mb-1 block">API Key</Label>
        <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={provider === 'grok' ? 'xai-...' : 'sk-...'} />
      </div>
      <div className="space-y-2">
        <Label className="mb-1 block">Context Size (tokens)</Label>
        <Input type="number" value={contextSize} onChange={(e) => setContextSize(e.target.value)} placeholder="e.g. 8192" />
        {errors.contextSize && <div className="text-xs text-red-600">{errors.contextSize}</div>}
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
    </div>
  )
}


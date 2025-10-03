'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import api from '@/apiConfig.json'
import getBackendBaseUrl from '@/lib/backendUrl'
import { Trash2 } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function ModelsSettingsPage() {
  const [oaToken, setOaToken] = useState('')
  const [grokToken, setGrokToken] = useState('')
  const [showOaToken, setShowOaToken] = useState(false)
  const [showGrokToken, setShowGrokToken] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Profiles state
  const [profiles, setProfiles] = useState([])
  const [profileSearch, setProfileSearch] = useState('')
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [editingProfileId, setEditingProfileId] = useState(null)
  const [profileName, setProfileName] = useState('')
  const [profileDescription, setProfileDescription] = useState('')
  const [profileError, setProfileError] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [rulesSheetOpen, setRulesSheetOpen] = useState(false)
  const [activeProfile, setActiveProfile] = useState(null)
  const [ruleTypes, setRuleTypes] = useState([])
  const [rules, setRules] = useState([])
  const [rulesLoading, setRulesLoading] = useState(false)
  const [editingRule, setEditingRule] = useState(null)
  const [ruleForm, setRuleForm] = useState({ id: null, name: '', label: '', field_type: '', default_value: '', range: '', description: '' })
  const [rangeDraft, setRangeDraft] = useState({ min: '', max: '', step: 1 })
  const [ruleFormErrors, setRuleFormErrors] = useState({})
  const [ruleSubmitError, setRuleSubmitError] = useState('')
  const [ruleCreateOpen, setRuleCreateOpen] = useState(false)
  const [ruleEditOpen, setRuleEditOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [profileIdToDelete, setProfileIdToDelete] = useState(null)
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [errorDialogMessage, setErrorDialogMessage] = useState('')

  // CPU cores and thread helper state
  const [cpuCount, setCpuCount] = useState(null)
  const [threadStart, setThreadStart] = useState('')

  const load = async () => {
    setError('')
    try {
      const BASE = getBackendBaseUrl()
      const url = `${BASE}/bb-models/api/settings/get`
      const res = await fetch(url, { method: 'GET', credentials: 'include' })
      const data = await res.json()
      if (data?.success && data.settings) { 
        setOaToken(data.settings.openai_api_key || '')
        setGrokToken(data.settings.grok_api_key || '')
      }
    } catch (e) {
      setError('Failed to load settings')
    }
  }

  useEffect(() => { load() }, [])

  // Profiles API helpers
  const normalizeError = (raw) => {
    try {
      if (typeof raw === 'string') {
        const obj = JSON.parse(raw)
        if (obj && obj.error) return obj.error.message || String(raw)
        return String(raw)
      }
      if (raw && typeof raw === 'object') {
        if (raw.error) return raw.error.message || JSON.stringify(raw.error)
        if (raw.message) return raw.message
        return JSON.stringify(raw)
      }
      return 'An unknown error occurred'
    } catch (_) {
      return typeof raw === 'string' ? raw : (raw?.message || 'An unknown error occurred')
    }
  }
  const loadProfiles = async () => {
    try {
      const BASE = getBackendBaseUrl()
      const res = await fetch(`${BASE}/bb-models/api/profiles/list`, { credentials: 'include' })
      const data = await res.json()
      if (data?.success && Array.isArray(data.profiles)) setProfiles(data.profiles)
    } catch (_) {}
  }

  const createOrUpdateProfile = async () => {}

  const deleteProfile = async (id) => {
    try {
      const BASE = getBackendBaseUrl()
      const res = await fetch(`${BASE}/bb-models/api/profiles/delete`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      const data = await res.json()
      if (data?.success) {
        if (activeProfile && activeProfile.id === id) {
          setActiveProfile(null); setRules([]); setRulesSheetOpen(false)
        }
        if (editingProfileId === id) {
          setEditingProfileId(null); setProfileName(''); setProfileDescription(''); setProfileModalOpen(false)
        }
        await loadProfiles()
      } else {
        setErrorDialogMessage(normalizeError(data))
        setErrorDialogOpen(true)
      }
    } catch (e) {
      setErrorDialogMessage(normalizeError(e))
      setErrorDialogOpen(true)
    }
  }

  const requestDeleteProfile = (id) => {
    setProfileIdToDelete(id)
    setConfirmDeleteOpen(true)
  }

  const loadRuleTypes = async () => {
    try {
      const BASE = getBackendBaseUrl()
      const res = await fetch(`${BASE}/bb-models/api/pfrules/types`, { credentials: 'include' })
      const data = await res.json()
      if (data?.success) {
        const filtered = (data.types || []).filter(t => {
          const lc = String(t || '').toLowerCase()
          return lc !== 'int' && lc !== 'integer' && lc !== 'numeric' && lc !== 'array' && lc !== 'thread' && lc !== 'dropdown' && lc !== 'bool'
        })
        setRuleTypes(filtered)
      }
    } catch (_) {}
  }

  const loadProfileRules = async (pid) => {
    if (!pid) { setRules([]); return }
    try {
      const BASE = getBackendBaseUrl()
      const url = new URL(`${BASE}/bb-models/api/pfrules/by-profile`)
      url.searchParams.set('profileId', pid)
      const res = await fetch(url.toString(), { credentials: 'include' })
      const data = await res.json()
      if (data?.success && Array.isArray(data.rules)) setRules(data.rules)
    } catch (_) { setRules([]) }
  }

  useEffect(() => { loadProfiles(); loadRuleTypes(); }, [])
  useEffect(() => { loadProfileRules(editingProfileId) }, [editingProfileId])
  useEffect(() => { setRuleForm({ id: null, name: '', label: '', field_type: '', default_value: '', range: '', description: '' }); setThreadStart('') }, [editingProfileId])

  // Removed thread-specific CPU helpers and watchers

  const save = async () => {
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      const BASE = getBackendBaseUrl()
      const url = `${BASE}/bb-models/api/settings/save`
      const res = await fetch(url, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ openai_api_key: oaToken, grok_api_key: grokToken }) })
      const data = await res.json()
      if (data?.success) setSaved(true)
      else setError(data?.error || 'Failed to save settings')
    } catch (e) {
      setError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const openProfileCreate = () => {
    setEditingProfileId(null)
    setProfileName('')
    setProfileDescription('')
    setProfileModalOpen(true)
  }
  const openProfileEdit = (p) => {
    setEditingProfileId(p.id)
    setProfileName(p.name || '')
    setProfileDescription(p.description || '')
    setProfileModalOpen(true)
  }
  const saveProfileModal = async () => {
    setProfileSaving(true)
    setProfileError('')
    try {
      const payload = { id: editingProfileId, name: profileName, description: profileDescription }
      const BASE = getBackendBaseUrl()
      const url = editingProfileId ? `${BASE}/bb-models/api/profiles/update` : `${BASE}/bb-models/api/profiles/create`
      const res = await fetch(url, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!data?.success) throw new Error(data?.error || 'Failed to save profile')
      await loadProfiles()
      setProfileModalOpen(false)
      setEditingProfileId(null)
      setProfileName(''); setProfileDescription('')
    } catch (e) {
      setProfileError(e.message || 'Failed to save profile')
    } finally { setProfileSaving(false) }
  }
  const openRulesFor = async (p) => {
    setActiveProfile(p)
    setRulesLoading(true)
    setRules([])
    setRulesSheetOpen(true)
    await loadProfileRules(p.id)
    setRulesLoading(false)
  }
  const openRuleCreate = () => {
    setEditingRule(null)
    setRuleForm({ id: null, name: '', label: '', field_type: '', default_value: '', range: '', description: '' })
    setRuleFormErrors({}); setRuleSubmitError(''); setRangeDraft({ min: '', max: '', step: 1 })
    setRuleCreateOpen(true)
    setRulesSheetOpen(false)
  }
  const openRuleEdit = (r) => {
    setEditingRule(r)
    const disallowed = new Set(['int','integer','numeric','thread','dropdown','bool'])
    const ftLc = String(r.field_type || '').toLowerCase()
    const ft = ftLc === 'bool' ? 'boolean' : ftLc
    setRuleForm({ id: r.id, name: r.name || '', label: r.label || '', field_type: disallowed.has(ft) ? '' : ft, default_value: r.default_value || '', range: r.range || '', description: r.description || '' })
    // seed rangeDraft from existing range
    if (ft === 'range') {
      const s = String(r.range || '').trim()
      const m = s.match(/(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)/)
      if (m) setRangeDraft({ min: m[1], max: m[2], step: (m[1].includes('.') || m[2].includes('.')) ? 0.1 : 1 })
      else setRangeDraft({ min: '', max: '', step: 1 })
    } else {
      setRangeDraft({ min: '', max: '', step: 1 })
    }
    setRuleFormErrors({}); setRuleSubmitError('')
    setRuleEditOpen(true)
    setRulesSheetOpen(false)
  }
  const closeRuleCreate = () => { setRuleCreateOpen(false); setRulesSheetOpen(true) }
  const closeRuleEdit = () => { setRuleEditOpen(false); setRulesSheetOpen(true); setEditingRule(null) }
  const deleteRuleFromSheet = async (r) => {
    if (!activeProfile) return
    try {
      const res = await fetch(`${api.ApiConfig.main}/bb-models/api/pfrules/delete`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: r.id, profileId: activeProfile.id }) })
      const data = await res.json()
      if (data?.success) await loadProfileRules(activeProfile.id)
    } catch (_) {}
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Model Settings</h1>
        <p className="text-sm text-muted-foreground">Configure providers and manage profiles.</p>
      </div>
      <Tabs defaultValue="api" className="w-full">
        <TabsList>
          <TabsTrigger value="api">Search API</TabsTrigger>
          <TabsTrigger value="profiles">Profiles</TabsTrigger>
        </TabsList>
        <TabsContent value="api">
          <Card className="p-6 space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="oa-token">OpenAI Access Token</Label>
              <div className="flex items-center gap-2">
                <Input id="oa-token" type={showOaToken ? 'text' : 'password'} value={oaToken} onChange={(e) => setOaToken(e.target.value)} placeholder="sk-..." />
                <Button type="button" variant="outline" onClick={() => setShowOaToken(v => !v)}>
                  {showOaToken ? 'Hide' : 'Show'}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="grok-token">Grok Access Token</Label>
              <div className="flex items-center gap-2">
                <Input id="grok-token" type={showGrokToken ? 'text' : 'password'} value={grokToken} onChange={(e) => setGrokToken(e.target.value)} placeholder="xai-..." />
                <Button type="button" variant="outline" onClick={() => setShowGrokToken(v => !v)}>
                  {showGrokToken ? 'Hide' : 'Show'}
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={save} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
              {saved && <span className="text-sm text-green-600">Saved</span>}
              {error && <span className="text-sm text-red-600">{error}</span>}
            </div>
          </Card>
        </TabsContent>
        <TabsContent value="profiles">
          <Card className="p-6 space-y-6 mt-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <Input placeholder="Search profiles" value={profileSearch} onChange={(e) => setProfileSearch(e.target.value)} />
              </div>
              <Button onClick={openProfileCreate}>New Profile</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {profiles.filter(p => {
                const q = (profileSearch || '').toLowerCase().trim();
                if (!q) return true; const n = (p.name || '').toLowerCase(); const d = (p.description || '').toLowerCase(); return n.includes(q) || d.includes(q);
              }).map(p => (
                <Card key={p.id} className="p-4 flex flex-col gap-3">
                  <div>
                    <div className="text-sm font-semibold truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{p.description || ''}</div>
                  </div>
                  <div className="mt-auto flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openProfileEdit(p)}>Edit</Button>
                    <Button variant="outline" size="sm" onClick={() => requestDeleteProfile(p.id)}>Delete</Button>
                    <Button size="sm" onClick={() => openRulesFor(p)}>Rules</Button>
                  </div>
                </Card>
              ))}
            </div>
          </Card>

          {/* Create/Edit Profile Modal */}
          <Dialog open={profileModalOpen} onOpenChange={setProfileModalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingProfileId ? 'Edit Profile' : 'New Profile'}</DialogTitle>
                <DialogDescription>{editingProfileId ? 'Update profile details.' : 'Create a new profile.'}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="mb-1 block">Name</Label>
                  <Input value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="Profile name" />
                </div>
                <div>
                  <Label className="mb-1 block">Description</Label>
                  <Input value={profileDescription} onChange={(e) => setProfileDescription(e.target.value)} placeholder="Description (optional)" />
                </div>
                {profileError && <div className="text-xs text-red-600">{profileError}</div>}
              </div>
              <DialogFooter className="sm:justify-end">
                <Button variant="outline" onClick={() => setProfileModalOpen(false)}>Cancel</Button>
                <Button onClick={saveProfileModal} disabled={profileSaving}>{profileSaving ? 'Saving…' : 'Save'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Rules Sheet */}
          <Sheet open={rulesSheetOpen} onOpenChange={setRulesSheetOpen}>
            <SheetContent side="right" className="w-[420px] sm:w-[520px] flex flex-col">
              <SheetHeader>
                <SheetTitle>Rules {activeProfile ? `for ${activeProfile.name}` : ''}</SheetTitle>
                <SheetDescription>Manage rules for this profile</SheetDescription>
              </SheetHeader>
              <div className="py-3 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">{activeProfile?.description || ''}</div>
                <Button size="sm" onClick={openRuleCreate}>New Rule</Button>
              </div>
              <div className="flex-1 min-h-0">
                <ScrollArea className="h-full pr-2">
                  <div className="space-y-2">
                    {rulesLoading ? (
                      <div className="text-sm text-muted-foreground">Loading…</div>
                    ) : rules.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No rules</div>
                    ) : (
                      rules.map(r => (
                        <div key={`r-${r.id}`} className="flex items-start justify-between border rounded px-2 py-1">
                          <div>
                            <div className="text-sm font-medium">{r.label} <span className="text-xs text-muted-foreground">({r.name})</span></div>
                            <div className="text-xs text-muted-foreground">Type: {r.field_type}{r.range ? ` | Range: ${r.range}` : ''}</div>
                            {r.description ? (<div className="text-xs mt-1">{r.description}</div>) : null}
                          </div>
                          <div className="flex gap-1">
                            <Button variant="outline" size="icon" title="Edit" onClick={() => openRuleEdit(r)}>✎</Button>
                            <Button variant="outline" size="icon" title="Delete" onClick={() => deleteRuleFromSheet(r)}>×</Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
              <SheetFooter />
            </SheetContent>
          </Sheet>

          {/* Rule Create Modal */}
          <Dialog open={ruleCreateOpen} onOpenChange={(o) => { if (!o) closeRuleCreate() }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>New Rule</DialogTitle>
                <DialogDescription>Create a new rule.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-1 block">Name</Label>
                    <Input value={ruleForm.name} onChange={(e) => setRuleForm(prev => ({ ...prev, name: e.target.value }))} placeholder="unique_name" />
                    {ruleFormErrors.name && <p className="text-sm text-red-500 mt-1">{ruleFormErrors.name}</p>}
                  </div>
                  <div>
                    <Label className="mb-1 block">Label</Label>
                    <Input value={ruleForm.label} onChange={(e) => setRuleForm(prev => ({ ...prev, label: e.target.value }))} placeholder="Display Label" />
                    {ruleFormErrors.label && <p className="text-sm text-red-500 mt-1">{ruleFormErrors.label}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <Label className="mb-1 block">Field Type</Label>
                    <Select value={ruleForm.field_type} onValueChange={(v) => setRuleForm(prev => ({ ...prev, field_type: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select field type" />
                      </SelectTrigger>
                      <SelectContent>
                        {ruleTypes.map(t => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    {ruleFormErrors.field_type && <p className="text-sm text-red-500 mt-1">{ruleFormErrors.field_type}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <Label className="mb-1 block">Default Value</Label>
                    <Input value={ruleForm.default_value} onChange={(e) => setRuleForm(prev => ({ ...prev, default_value: e.target.value }))} placeholder="Default value (optional)" />
                  </div>
                  {String(ruleForm.field_type || '').toLowerCase() === 'range' && (
                    <div className="space-y-2 md:col-span-2">
                      <Label className="mb-1 block">Range</Label>
                      <div className="flex items-center gap-3">
                        <Input className="w-28" type="number" value={rangeDraft.min} onChange={e => setRangeDraft(prev => ({ ...prev, min: e.target.value }))} placeholder="Min" />
                        <Input className="w-28" type="number" value={rangeDraft.max} onChange={e => setRangeDraft(prev => ({ ...prev, max: e.target.value }))} placeholder="Max" />
                      </div>
                      {ruleFormErrors.range && <p className="text-sm text-red-500 mt-1">{ruleFormErrors.range}</p>}
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <Label className="mb-1 block">Description</Label>
                    <Input value={ruleForm.description} onChange={(e) => setRuleForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Description (optional)" />
                  </div>
                </div>
                {ruleSubmitError && <p className="text-sm text-red-500">{ruleSubmitError}</p>}
              </div>
              <DialogFooter className="sm:justify-end">
                <Button variant="outline" onClick={closeRuleCreate}>Cancel</Button>
                <Button onClick={async () => {
                  const errs = {}
                  if (!String(ruleForm.name || '').trim()) errs.name = 'Name is required'
                  if (!String(ruleForm.label || '').trim()) errs.label = 'Label is required'
                  if (!String(ruleForm.field_type || '').trim()) errs.field_type = 'Field type is required'
                  if (String(ruleForm.field_type || '').toLowerCase() === 'range') {
                    const min = String(rangeDraft.min || '').trim()
                    const max = String(rangeDraft.max || '').trim()
                    if (min === '' || max === '') errs.range = 'Min and Max are required for range'
                    else if (Number.isNaN(Number(min)) || Number.isNaN(Number(max))) errs.range = 'Min and Max must be numbers'
                  }
                  setRuleFormErrors(errs)
                  if (Object.keys(errs).length > 0) return
                  setRuleSubmitError('')
                  const payload = { ...ruleForm, profileId: activeProfile?.id }
                  if ((payload.field_type || '').toLowerCase() === 'range') {
                    payload.range = `${String(rangeDraft.min).trim()}-${String(rangeDraft.max).trim()}`
                  }
                  try {
                    const res = await fetch(`${api.ApiConfig.main}/bb-models/api/pfrules/create`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                    const data = await res.json()
                    if (!data?.success) { setRuleSubmitError(data?.error || 'Failed to create'); return }
                    await loadProfileRules(activeProfile.id)
                    closeRuleCreate()
                  } catch (e) { setRuleSubmitError('Failed to create') }
                }}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Rule Edit Modal */}
          <Dialog open={ruleEditOpen} onOpenChange={(o) => { if (!o) closeRuleEdit() }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Rule</DialogTitle>
                <DialogDescription>Update rule values.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-1 block">Name</Label>
                    <Input value={ruleForm.name} onChange={(e) => setRuleForm(prev => ({ ...prev, name: e.target.value }))} placeholder="unique_name" />
                    {ruleFormErrors.name && <p className="text-sm text-red-500 mt-1">{ruleFormErrors.name}</p>}
                  </div>
                  <div>
                    <Label className="mb-1 block">Label</Label>
                    <Input value={ruleForm.label} onChange={(e) => setRuleForm(prev => ({ ...prev, label: e.target.value }))} placeholder="Display Label" />
                    {ruleFormErrors.label && <p className="text-sm text-red-500 mt-1">{ruleFormErrors.label}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <Label className="mb-1 block">Field Type</Label>
                    <Select value={ruleForm.field_type} onValueChange={(v) => setRuleForm(prev => ({ ...prev, field_type: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select field type" />
                      </SelectTrigger>
                      <SelectContent>
                        {ruleTypes.map(t => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    {ruleFormErrors.field_type && <p className="text-sm text-red-500 mt-1">{ruleFormErrors.field_type}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <Label className="mb-1 block">Default Value</Label>
                    <Input value={ruleForm.default_value} onChange={(e) => setRuleForm(prev => ({ ...prev, default_value: e.target.value }))} placeholder="Default value (optional)" />
                  </div>
                  {String(ruleForm.field_type || '').toLowerCase() === 'range' && (
                    <div className="space-y-2 md:col-span-2">
                      <Label className="mb-1 block">Range</Label>
                      <div className="flex items-center gap-3">
                        <Input className="w-28" type="number" value={rangeDraft.min} onChange={e => setRangeDraft(prev => ({ ...prev, min: e.target.value }))} placeholder="Min" />
                        <Input className="w-28" type="number" value={rangeDraft.max} onChange={e => setRangeDraft(prev => ({ ...prev, max: e.target.value }))} placeholder="Max" />
                      </div>
                      {ruleFormErrors.range && <p className="text-sm text-red-500 mt-1">{ruleFormErrors.range}</p>}
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <Label className="mb-1 block">Description</Label>
                    <Input value={ruleForm.description} onChange={(e) => setRuleForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Description (optional)" />
                  </div>
                </div>
                {ruleSubmitError && <p className="text-sm text-red-500">{ruleSubmitError}</p>}
              </div>
              <DialogFooter className="sm:justify-end">
                <Button variant="outline" onClick={closeRuleEdit}>Cancel</Button>
                <Button onClick={async () => {
                  const errs = {}
                  if (!String(ruleForm.name || '').trim()) errs.name = 'Name is required'
                  if (!String(ruleForm.label || '').trim()) errs.label = 'Label is required'
                  if (!String(ruleForm.field_type || '').trim()) errs.field_type = 'Field type is required'
                  if (String(ruleForm.field_type || '').toLowerCase() === 'range') {
                    const min = String(rangeDraft.min || '').trim()
                    const max = String(rangeDraft.max || '').trim()
                    if (min === '' || max === '') errs.range = 'Min and Max are required for range'
                    else if (Number.isNaN(Number(min)) || Number.isNaN(Number(max))) errs.range = 'Min and Max must be numbers'
                  }
                  setRuleFormErrors(errs)
                  if (Object.keys(errs).length > 0) return
                  setRuleSubmitError('')
                  const payload = { ...ruleForm, profileId: activeProfile?.id }
                  if ((payload.field_type || '').toLowerCase() === 'range') {
                    payload.range = `${String(rangeDraft.min).trim()}-${String(rangeDraft.max).trim()}`
                  }
                  try {
                    const res = await fetch(`${api.ApiConfig.main}/bb-models/api/pfrules/update`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                    const data = await res.json()
                    if (!data?.success) { setRuleSubmitError(data?.error || 'Failed to save'); return }
                    await loadProfileRules(activeProfile.id)
                    closeRuleEdit()
                  } catch (e) { setRuleSubmitError('Failed to save') }
                }}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete profile?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the selected profile.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                const id = profileIdToDelete
                setConfirmDeleteOpen(false)
                setProfileIdToDelete(null)
                if (id) await deleteProfile(id)
              }}
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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



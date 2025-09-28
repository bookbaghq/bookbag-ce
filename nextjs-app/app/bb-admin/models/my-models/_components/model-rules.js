'use client'

import { useEffect, useMemo, useState } from 'react'
import { ListChecks, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import api from '@/apiConfig.json'

export default function ModelRules({ model }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [types, setTypes] = useState([])
  const [inherited, setInherited] = useState([])
  const [custom, setCustom] = useState([])
  const [editing, setEditing] = useState(null) // null or rule object (custom only)

  const fetchTypes = async () => {
    try {
      const res = await fetch(`${api.ApiConfig.main}/bb-models/api/pfrules/types`, { credentials: 'include' })
      const data = await res.json()
      if (data?.success && Array.isArray(data.types)) {
        // Backend now restricts types to: string, text, float, number, boolean, json, range
        const normalized = data.types
          .map(t => String(t || '').toLowerCase())
          .map(t => (t === 'bool' ? 'boolean' : t))
        const unique = Array.from(new Set(normalized))
        setTypes(unique)
      }
    } catch (_) {}
  }

  const load = async () => {
    setLoading(true)
    try {
      const url = new URL(`${api.ApiConfig.main}/bb-models/api/pfrules/list`)
      url.searchParams.set('modelId', model.id)
      const res = await fetch(url.toString(), { credentials: 'include' })
      const data = await res.json()
      if (data?.success) {
        setInherited(data.inherited || [])
        setCustom(data.custom || [])
      }
    } catch (_) {
      setInherited([])
      setCustom([])
    } finally {
      setLoading(false)
    }
  }

  const onOpen = async () => {
    setOpen(true)
    await Promise.all([fetchTypes(), load()])
  }

  const [form, setForm] = useState({ id: null, name: '', label: '', field_type: '', default_value: '', range: '', description: '' })
  const resetForm = () => setForm({ id: null, name: '', label: '', field_type: '', default_value: '', range: '', description: '' })

  const [createOpen, setCreateOpen] = useState(false)
  const openCreateModal = () => { resetForm(); setCreateOpen(true); setOpen(false) }
  const closeCreateModal = () => { setCreateOpen(false); setOpen(true) }

  const [editOpen, setEditOpen] = useState(false)
  const startEdit = (rule) => { const disallowed = new Set([]); const ftRaw = String(rule.field_type || ''); const ftLc = ftRaw.toLowerCase(); const ft = ftLc === 'bool' ? 'boolean' : ftLc; setForm({
    id: rule.id,
    name: rule.name || '',
    label: rule.label || '',
    field_type: disallowed.has(ft) ? '' : ft,
    default_value: rule.default_value || '',
    range: rule.range || '',
    description: rule.description || ''
  }); setEditing(rule); setEditOpen(true); setOpen(false) }

  const cancelEdit = () => { setEditing(null); resetForm(); setEditOpen(false); setOpen(true) }

  const saveRule = async () => {
    const payload = { ...form, modelId: model.id }
    if ((payload.field_type || '').toLowerCase() === 'range') {
      payload.range = buildRangeString()
    }
    const url = editing?.id ? `${api.ApiConfig.main}/bb-models/api/pfrules/update` : `${api.ApiConfig.main}/bb-models/api/pfrules/create`
    try {
      const res = await fetch(url, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!data?.success) throw new Error(data?.error || 'Failed to save')
      await load()
      cancelEdit()
    } catch (_) {}
  }

  const deleteRule = async (rule) => {
    try {
      const res = await fetch(`${api.ApiConfig.main}/bb-models/api/pfrules/delete`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: rule.id, modelId: model.id }) })
      const data = await res.json()
      if (data?.success) await load()
    } catch (_) {}
  }

  // Range helpers
  const [rangeDraft, setRangeDraft] = useState({ min: '', max: '', step: 1 })
  const [formErrors, setFormErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  useEffect(() => {
    if (form.field_type === 'range') {
      const s = String(form.range || '').trim()
      const m = s.match(/(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)/)
      if (m) {
        setRangeDraft({ min: m[1], max: m[2], step: (m[1].includes('.') || m[2].includes('.')) ? 0.1 : 1 })
      } else {
        setRangeDraft({ min: '', max: '', step: 1 })
      }
    }
  }, [form.field_type, form.range])

  const buildRangeString = () => {
    const min = String(rangeDraft.min || '').trim()
    const max = String(rangeDraft.max || '').trim()
    if (min === '' || max === '') return ''
    return `${min}-${max}`
  }

  return (
    <>
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setOpen(false); setEditing(null); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" onClick={onOpen} title="Manage Rules">
          <ListChecks className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Rules for {model.name}</DialogTitle>
          <DialogDescription>
            View inherited rules from the model&apos;s profile and manage model-specific rules.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Inherited (read-only)</h4>
            </div>
            <ScrollArea className="h-[280px] pr-2">
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : inherited.length === 0 ? (
                <div className="text-sm text-muted-foreground">No inherited rules</div>
              ) : (
                <div className="space-y-2">
                  {inherited.map(r => (
                    <div key={r.id} className="border rounded p-2">
                      <div className="text-sm font-medium">{r.label} <span className="text-xs text-muted-foreground">({r.name})</span></div>
                      <div className="text-xs text-muted-foreground">Type: {r.field_type}{r.range ? ` | Range: ${r.range}` : ''}</div>
                      {r.description ? (<div className="text-xs mt-1">{r.description}</div>) : null}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Custom (editable)</h4>
              <Button size="sm" onClick={openCreateModal}><Plus className="h-4 w-4 mr-1"/>New Rule</Button>
            </div>
            <ScrollArea className="h-[280px] pr-2">
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : custom.length === 0 ? (
                <div className="text-sm text-muted-foreground">No custom rules yet</div>
              ) : (
                <div className="space-y-2">
                  {custom.map(r => (
                    <div key={r.id} className="border rounded p-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-medium">{r.label} <span className="text-xs text-muted-foreground">({r.name})</span></div>
                          <div className="text-xs text-muted-foreground">Type: {r.field_type}{r.range ? ` | Range: ${r.range}` : ''}</div>
                          {r.description ? (<div className="text-xs mt-1">{r.description}</div>) : null}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="outline" size="icon" onClick={() => startEdit(r)} title="Edit"><Pencil className="h-4 w-4"/></Button>
                          <Button variant="outline" size="icon" onClick={() => deleteRule(r)} title="Delete"><Trash2 className="h-4 w-4"/></Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        {null}

        <DialogFooter />
      </DialogContent>
    </Dialog>

    {/* New Rule Modal */}
    <Dialog open={createOpen} onOpenChange={(o) => { if (!o) { setCreateOpen(false); setOpen(true) } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Rule</DialogTitle>
          <DialogDescription>Create a new rule.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="mb-1 block">Name</Label>
              <Input value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="unique_name" />
              {formErrors.name && <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>}
            </div>
            <div>
              <Label className="mb-1 block">Label</Label>
              <Input value={form.label} onChange={(e) => setForm(prev => ({ ...prev, label: e.target.value }))} placeholder="Display Label" />
              {formErrors.label && <p className="text-sm text-red-500 mt-1">{formErrors.label}</p>}
            </div>
            <div className="md:col-span-2">
              <Label className="mb-1 block">Field Type</Label>
              <Select value={form.field_type} onValueChange={(v) => setForm(prev => ({ ...prev, field_type: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select field type" />
                </SelectTrigger>
                <SelectContent>
                  {types.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.field_type && <p className="text-sm text-red-500 mt-1">{formErrors.field_type}</p>}
            </div>
            <div className="md:col-span-2">
              <Label className="mb-1 block">Default Value</Label>
              <Input value={form.default_value} onChange={(e) => setForm(prev => ({ ...prev, default_value: e.target.value }))} placeholder="Default value (optional)" />
            </div>
            {form.field_type === 'range' && (
              <div className="space-y-2 md:col-span-2">
                <Label className="mb-1 block">Range</Label>
                <div className="flex items-center gap-3">
                  <Input className="w-28" type="number" value={rangeDraft.min} onChange={e => setRangeDraft(prev => ({ ...prev, min: e.target.value }))} placeholder="Min" />
                  <Input className="w-28" type="number" value={rangeDraft.max} onChange={e => setRangeDraft(prev => ({ ...prev, max: e.target.value }))} placeholder="Max" />
                </div>
                {formErrors.range && <p className="text-sm text-red-500 mt-1">{formErrors.range}</p>}
              </div>
            )}
            <div className="md:col-span-2">
              <Label className="mb-1 block">Description</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Description (optional)" />
            </div>
          </div>
          {submitError && <p className="text-sm text-red-500">{submitError}</p>}
        </div>
        <DialogFooter className="sm:justify-end">
          <Button variant="outline" onClick={closeCreateModal}>Cancel</Button>
          <Button onClick={async () => {
            const errs = {}
            if (!String(form.name || '').trim()) errs.name = 'Name is required'
            if (!String(form.label || '').trim()) errs.label = 'Label is required'
            if (!String(form.field_type || '').trim()) errs.field_type = 'Field type is required'
            if (String(form.field_type || '').toLowerCase() === 'range') {
              const min = String(rangeDraft.min || '').trim()
              const max = String(rangeDraft.max || '').trim()
              if (min === '' || max === '') errs.range = 'Min and Max are required for range'
              else if (Number.isNaN(Number(min)) || Number.isNaN(Number(max))) errs.range = 'Min and Max must be numbers'
            }
            setFormErrors(errs)
            if (Object.keys(errs).length > 0) return
            setSubmitError('')
            const payload = { ...form, modelId: model.id }
            if ((payload.field_type || '').toLowerCase() === 'range') {
              payload.range = buildRangeString()
            }
            try {
              const res = await fetch(`${api.ApiConfig.main}/bb-models/api/pfrules/create`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              })
              const data = await res.json()
              if (!data?.success) {
                setSubmitError(data?.error || 'Failed to create')
                return
              }
              await load()
              setCreateOpen(false)
              setOpen(true)
            } catch (e) {
              setSubmitError('Failed to create')
            }
          }}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Edit Rule Modal */}
    <Dialog open={editOpen} onOpenChange={(o) => { if (!o) { setEditOpen(false); setOpen(true); setEditing(null); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Rule</DialogTitle>
          <DialogDescription>Update rule values.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="mb-1 block">Name</Label>
              <Input value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="unique_name" />
              {formErrors.name && <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>}
            </div>
            <div>
              <Label className="mb-1 block">Label</Label>
              <Input value={form.label} onChange={(e) => setForm(prev => ({ ...prev, label: e.target.value }))} placeholder="Display Label" />
              {formErrors.label && <p className="text-sm text-red-500 mt-1">{formErrors.label}</p>}
            </div>
            <div className="md:col-span-2">
              <Label className="mb-1 block">Field Type</Label>
              <Select value={form.field_type} onValueChange={(v) => setForm(prev => ({ ...prev, field_type: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select field type" />
                </SelectTrigger>
                <SelectContent>
                  {types.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.field_type && <p className="text-sm text-red-500 mt-1">{formErrors.field_type}</p>}
            </div>
            <div className="md:col-span-2">
              <Label className="mb-1 block">Default Value</Label>
              <Input value={form.default_value} onChange={(e) => setForm(prev => ({ ...prev, default_value: e.target.value }))} placeholder="Default value (optional)" />
            </div>
            {form.field_type === 'range' && (
              <div className="space-y-2 md:col-span-2">
                <Label className="mb-1 block">Range</Label>
                <div className="flex items-center gap-3">
                  <Input className="w-28" type="number" value={rangeDraft.min} onChange={e => setRangeDraft(prev => ({ ...prev, min: e.target.value }))} placeholder="Min" />
                  <Input className="w-28" type="number" value={rangeDraft.max} onChange={e => setRangeDraft(prev => ({ ...prev, max: e.target.value }))} placeholder="Max" />
                </div>
                {formErrors.range && <p className="text-sm text-red-500 mt-1">{formErrors.range}</p>}
              </div>
            )}
            <div className="md:col-span-2">
              <Label className="mb-1 block">Description</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Description (optional)" />
            </div>
          </div>
          {submitError && <p className="text-sm text-red-500">{submitError}</p>}
        </div>
        <DialogFooter className="sm:justify-end">
          <Button variant="outline" onClick={cancelEdit}>Cancel</Button>
          <Button onClick={async () => {
            const errs = {}
            if (!String(form.name || '').trim()) errs.name = 'Name is required'
            if (!String(form.label || '').trim()) errs.label = 'Label is required'
            if (!String(form.field_type || '').trim()) errs.field_type = 'Field type is required'
            if (String(form.field_type || '').toLowerCase() === 'range') {
              const min = String(rangeDraft.min || '').trim()
              const max = String(rangeDraft.max || '').trim()
              if (min === '' || max === '') errs.range = 'Min and Max are required for range'
              else if (Number.isNaN(Number(min)) || Number.isNaN(Number(max))) errs.range = 'Min and Max must be numbers'
            }
            setFormErrors(errs)
            if (Object.keys(errs).length > 0) return
            setSubmitError('')
            const payload = { ...form, modelId: model.id }
            if ((payload.field_type || '').toLowerCase() === 'range') {
              payload.range = buildRangeString()
            }
            try {
              const res = await fetch(`${api.ApiConfig.main}/bb-models/api/pfrules/update`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              })
              const data = await res.json()
              if (!data?.success) {
                setSubmitError(data?.error || 'Failed to save')
                return
              }
              await load()
              cancelEdit()
            } catch (e) {
              setSubmitError('Failed to save')
            }
          }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { Settings2, RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
  SheetOverlay,
} from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

import api from '@/apiConfig.json'

export default function ModelSettings({ model }) {
  // Initialize settings with defaults or stored values
  const [settings, setSettings] = useState({})
  const [defaults, setDefaults] = useState(null)
  const [stopStringsInput, setStopStringsInput] = useState('')
  const [stopStrings, setStopStrings] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [profileFields, setProfileFields] = useState([])
  const [fieldValues, setFieldValues] = useState({}) // key: fieldRuleId -> value
  const [fieldErrors, setFieldErrors] = useState({}) // key: fieldRuleId -> error text
  const [saveState, setSaveState] = useState({ saving: false, saved: false, error: '' })
  const [hasPromptTemplateField, setHasPromptTemplateField] = useState(false)
  
  // Handle input changes
  const handleChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }))
  }
  
  const fetchModelAndDefaults = async () => {
    setLoaded(false)
    // Capture model-derived field data (like dynamic ranges) to merge later
    let modelFieldsById = {}
    try {
      const url = new URL(`${api.ApiConfig.main}/bb-models/api/models/get`)
      url.searchParams.set('id', model.id)
      const res = await fetch(url.toString(), { credentials: 'include' })
      const data = await res.json()
      if (data?.success) {
        const m = data.model
        if (Array.isArray(m?.profileFields)) {
          modelFieldsById = m.profileFields.reduce((acc, fld) => {
            acc[fld.fieldRuleId] = fld
            return acc
          }, {})
        }
        const safeNumber = (v, d=0) => {
          const n = Number(v)
          return Number.isFinite(n) ? n : d
        }
        setSettings({
          id: m.id,
          maxContextTokens: safeNumber(m.context_size, 8192),
          systemPrompt: m.system_prompt || '',
          summarizeTokenCount: safeNumber(m.summerize_token_count, 2048),
          seedCount: safeNumber(m.seed_count, 0),
          gpuOffload: safeNumber(m.threads, 0),
          temperature: safeNumber(m.temperature, 0.7),
          topK: safeNumber(m.top_k, 40),
          topP: safeNumber(m.top_p, 0.9),
          maxTokens: safeNumber(m.max_tokens, 2048),
          repeatPenalty: String(m.repeat_penalty || '1.1'),
          forceThinkRendering: m.force_think_rendering || '',
          systemPromptNoThinking: m.system_prompt_force_no_thinking || '',
          promptTemplate: m.prompt_template || ''
        })
        // Initialize stop strings from model.profileFields.stopStringArray if provided
        try {
          const stopField = Array.isArray(m.profileFields)
            ? m.profileFields.find(f => String(f.name).toLowerCase() === 'stop_strings')
            : null
          if (stopField && Array.isArray(stopField.stopStringArray)) {
            const listFromModel = stopField.stopStringArray.map(s => (
              typeof s === 'string' ? { id: null, content: s } : { id: s.id ?? null, content: s.content ?? String(s) }
            )).filter(x => typeof x.content === 'string' && x.content.length > 0)
            setStopStrings(listFromModel)
          }
        } catch(_) {}
        setStopStringsInput('')
      }
    } catch(_) {}
    // Load dynamic profile fields (rules + overrides)
    try {
      const fUrl = new URL(`${api.ApiConfig.main}/bb-models/api/profiles/fields`)
      fUrl.searchParams.set('modelId', model.id)
      const fres = await fetch(fUrl.toString(), { credentials: 'include' })
      const fdata = await fres.json()
      if (fdata?.success && Array.isArray(fdata.fields)) {
        // Merge in dynamic properties (e.g., range) from modelFieldsById when present
        const mergedRaw = fdata.fields.map(f => {
          const mf = modelFieldsById[f.fieldRuleId]
          if (mf) {
            return {
              ...f,
              range: (typeof mf.range !== 'undefined' && mf.range !== null && String(mf.range).trim() !== '') ? mf.range : f.range
            }
          }
          return f
        })
        // Deduplicate by name (model-specific overrides should replace inherited with same name)
        const byName = new Map()
        for (const fld of mergedRaw) {
          const key = String(fld.name || '').toLowerCase()
          byName.set(key, fld)
        }
        const merged = Array.from(byName.values())
        setProfileFields(merged)
        const init = {}
        for (const fld of merged) {
          init[fld.fieldRuleId] = fld.effectiveValue ?? ''
        }
        setFieldValues(init)
        const promptField = merged.find(f => String(f.name).toLowerCase() === 'prompt_template')
        if (promptField) {
          setSettings(prev => ({ ...prev, promptTemplate: promptField.effectiveValue ?? '' }))
          setHasPromptTemplateField(true)
        } else {
          setHasPromptTemplateField(false)
        }
        // Initialize stop strings from stopStringArray if provided
        try {
          const stopField = merged.find(f => String(f.name).toLowerCase() === 'stop_strings')
          if (stopField) {
            const raw = stopField.stopStringArray
            if (Array.isArray(raw)) {
              const listFromField = raw.map(s => (
                typeof s === 'string' ? { id: null, content: s } : { id: s.id ?? null, content: s.content ?? String(s) }
              )).filter(x => typeof x.content === 'string' && x.content.length > 0)
              setStopStrings(listFromField)
            }
          }
        } catch(_) { /* keep existing stopStrings from model response */ }
      } else {
        setProfileFields([])
        setFieldValues({})
        setHasPromptTemplateField(false)
      }
    } catch(_) {}
    try {
      const res = await fetch(`${api.ApiConfig.main}/bb-models/api/models/defaults`, { credentials: 'include' })
      const d = await res.json();
      if (d?.success) setDefaults(d.defaults)
    } catch(_) {}
    setLoaded(true)
  }

  // Only fetch when opening the settings panel via the trigger button

  // Save settings to backend
  const saveSettings = async () => {
    try {
      const url = `${api.ApiConfig.main}/bb-models/api/models/update`
      const payload = {
        id: settings.id,
        context_size: settings.maxContextTokens,
        system_prompt: settings.systemPrompt,
        summerize_token_count: settings.summarizeTokenCount,
        seed_count: settings.seedCount,
        threads: settings.gpuOffload,
        temperature: settings.temperature,
        top_k: settings.topK,
        top_p: settings.topP,
        max_tokens: settings.maxTokens,
        repeat_penalty: settings.repeatPenalty,
        force_think_rendering: settings.forceThinkRendering,
        system_prompt_force_no_thinking: settings.systemPromptNoThinking,
        prompt_template: settings.promptTemplate,
        stopStrings: stopStringsInput.split('\n').map(s => s.trim()).filter(Boolean)
      }
      await fetch(url, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    } catch(_) {}
  }

  const validateFieldValue = (field, value) => {
    const t = (field.fieldType || '').toLowerCase()
    if (t === 'float' || t === 'number') {
      if (value === '' || value === null || value === undefined) return ''
      const n = Number(value)
      return Number.isFinite(n) ? '' : 'Enter a valid number or leave blank for default'
    }
    if (t === 'json') {
      if (value === '' || value === null || value === undefined) return ''
      try { JSON.parse(value) } catch (_) { return 'Invalid JSON; fix or leave blank for default' }
      return ''
    }
    return ''
  }
  
  // Removed CPU info prefetch on mount to avoid unnecessary calls
  
  // Open state for sheet (optional since our Sheet component manages this internally)
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" onClick={() => { setIsOpen(true); fetchModelAndDefaults() }}>
          <Settings2 className="h-4 w-4" />
          <span className="sr-only">Open settings</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:max-w-[540px]">
        <SheetHeader>
          <SheetTitle>Model Settings: {model.name}</SheetTitle>
          <SheetDescription>
            Configure settings for this model. These settings will be applied when using this model.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-200px)] px-1">
          {!loaded ? (
          <div className="space-y-6 py-6 pr-4">
            <div className="space-y-2">
              <div className="h-4 w-40 bg-muted rounded animate-pulse"></div>
              <div className="h-9 w-full bg-muted rounded animate-pulse"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 w-32 bg-muted rounded animate-pulse"></div>
              <div className="h-24 w-full bg-muted rounded animate-pulse"></div>
            </div>
          </div>
          ) : (
          <div className="space-y-6 py-6 pr-4">
            {/* Dynamic profile fields */}
            {profileFields.map(f => (
              <div key={f.fieldRuleId} className="space-y-2">
                <Label htmlFor={`fld-${f.fieldRuleId}`}>{f.label}</Label>
                {(() => {
                  const fieldTypeLc = String(f.fieldType || '').toLowerCase();
                  const hasRangeHint = typeof f.range === 'string' && f.range.trim().length > 0
                  if (fieldTypeLc === 'range' || hasRangeHint) {
                    const parseRange = (text) => {
                      const s = String(text || '').trim();
                      const norm = s.replace(/[–—−‑]/g, '-');
                      let m = norm.match(/^\s*(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)\s*$/);
                      if (!m) {
                        const nums = norm.match(/-?\d+(?:\.\d+)?/g);
                        if (nums && nums.length >= 2) {
                          m = ['', nums[0], nums[1]];
                        }
                      }
                      if (!m) return null;
                      const minStr = m[1];
                      const maxStr = m[2];
                      const min = parseFloat(minStr);
                      const max = parseFloat(maxStr);
                      if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
                      const decCount = (valStr) => {
                        const dot = valStr.indexOf('.');
                        return dot >= 0 ? (valStr.length - dot - 1) : 0;
                      };
                      const decimals = Math.max(decCount(minStr), decCount(maxStr));
                      const step = decimals > 0 ? Math.pow(10, -decimals) : 1;
                      return { min, max, step, decimals };
                    };
                    const parsed = parseRange(f.range);
                    if (parsed) {
                      const { min, max, step, decimals } = parsed;
                      const toFixedStr = (num) => (decimals > 0 ? Number(num).toFixed(decimals) : String(Math.round(Number(num))));
                      const raw = fieldValues[f.fieldRuleId] ?? f.effectiveValue ?? '';
                      const currentNum = Number(raw);
                      const valueNum = Number.isFinite(currentNum) ? currentNum : min;
                      return (
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <Slider id={`fld-${f.fieldRuleId}`} min={min} max={max} step={step} value={[valueNum]} onValueChange={(vals) => {
                              const v = Array.isArray(vals) ? Number(vals[0]) : min;
                              if (!Number.isFinite(v)) return;
                              const clamped = Math.min(Math.max(v, min), max);
                              setFieldValues(prev => ({ ...prev, [f.fieldRuleId]: toFixedStr(clamped) }))
                            }} />
                          </div>
                          <Input className="w-24" type="number" step={step} min={min} max={max} value={String(fieldValues[f.fieldRuleId] ?? toFixedStr(valueNum))} onChange={(e) => {
                            const v = Number(e.target.value);
                            if (!Number.isFinite(v)) return;
                            const clamped = Math.min(Math.max(v, min), max);
                            setFieldValues(prev => ({ ...prev, [f.fieldRuleId]: toFixedStr(clamped) }))
                          }} />
                        </div>
                      )
                    }
                    // Graceful fallback when range parsing fails
                    return (
                      <Input id={`fld-${f.fieldRuleId}`} type="number" placeholder={hasRangeHint ? `Range ${f.range}` : undefined} value={fieldValues[f.fieldRuleId] ?? ''} onChange={(e) => {
                        const v = e.target.value
                        setFieldValues(prev => ({ ...prev, [f.fieldRuleId]: v }))
                        setFieldErrors(prev => ({ ...prev, [f.fieldRuleId]: validateFieldValue(f, v) }))
                      }} />
                    )
                  }
                  if (fieldTypeLc === 'string') {
                    return (
                      <Input id={`fld-${f.fieldRuleId}`} type="text" value={fieldValues[f.fieldRuleId] ?? ''} onChange={(e) => {
                        const v = e.target.value
                        setFieldValues(prev => ({ ...prev, [f.fieldRuleId]: v }))
                        setFieldErrors(prev => ({ ...prev, [f.fieldRuleId]: validateFieldValue(f, v) }))
                      }} placeholder={`Leave blank to use default (${f.defaultValue ?? ''})`} />
                    )
                  }
                  if (fieldTypeLc === 'text') {
                    return (
                      <Textarea id={`fld-${f.fieldRuleId}`} rows={4} value={fieldValues[f.fieldRuleId] ?? ''} onChange={(e) => {
                        const v = e.target.value
                        setFieldValues(prev => ({ ...prev, [f.fieldRuleId]: v }))
                        setFieldErrors(prev => ({ ...prev, [f.fieldRuleId]: validateFieldValue(f, v) }))
                      }} placeholder={`Leave blank to use default (${f.defaultValue ?? ''})`} />
                    )
                  }
                  if (fieldTypeLc === 'json') {
                    return (
                      <Textarea id={`fld-${f.fieldRuleId}`} rows={6} value={fieldValues[f.fieldRuleId] ?? ''} onChange={(e) => {
                        const v = e.target.value
                        setFieldValues(prev => ({ ...prev, [f.fieldRuleId]: v }))
                        setFieldErrors(prev => ({ ...prev, [f.fieldRuleId]: validateFieldValue(f, v) }))
                      }} placeholder={`JSON; leave blank to use default`} />
                    )
                  }
                  return (
                    <Input id={`fld-${f.fieldRuleId}`} type={(fieldTypeLc === 'float' || fieldTypeLc === 'number') ? 'number' : 'text'} step={fieldTypeLc === 'float' || fieldTypeLc === 'number' ? 0.1 : 1} value={fieldValues[f.fieldRuleId] ?? ''} onChange={(e) => {
                      const v = e.target.value
                      setFieldValues(prev => ({ ...prev, [f.fieldRuleId]: v }))
                      setFieldErrors(prev => ({ ...prev, [f.fieldRuleId]: validateFieldValue(f, v) }))
                    }} placeholder={`Leave blank to use default (${f.defaultValue ?? ''})`} />
                  )
                })()}
                {f.description && f.fieldType !== 'bool' && (
                  <p className="text-xs text-muted-foreground">{f.description}</p>
                )}
                {fieldErrors[f.fieldRuleId] && (
                  <p className="text-xs text-red-600">{fieldErrors[f.fieldRuleId]}</p>
                )}
              </div>
            ))}

            {/* Removed hardcoded Stop Strings and Prompt Template sections; handled dynamically above */}
          </div>
          )}
        </ScrollArea>
        <SheetFooter>
          <div className="flex items-center gap-2 ml-auto">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="secondary" size="icon" type="button" onClick={async () => {
                    try {
                      setSaveState({ saving: true, saved: false, error: '' })
                      const res = await fetch(`${api.ApiConfig.main}/bb-models/api/profiles/overrides/reset`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ modelId: settings.id }) })
                      const data = await res.json()
                      if (!data?.success) throw new Error(data?.error || 'Failed to reset overrides')
                      await fetchModelAndDefaults()
                      setSaveState({ saving: false, saved: true, error: '' })
                    } catch(_) { setSaveState({ saving: false, saved: false, error: 'Failed to reset overrides' }) }
                  }}>
                    <RotateCcw className="h-4 w-4" />
                    <span className="sr-only">Reset to Defaults</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Restore to defaults
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <SheetClose asChild>
              <Button type="button" variant="outline" size="icon" aria-label="Cancel">
                <X className="h-4 w-4" />
              </Button>
            </SheetClose>
            <SheetClose asChild>
              <Button type="submit" onClick={async () => {
                setSaveState({ saving: true, saved: false, error: '' })
                try {
                  // Validate all fields first
                  const errs = {}
                  for (const f of profileFields) {
                    const v = fieldValues[f.fieldRuleId]
                    const err = validateFieldValue(f, v)
                    if (err) errs[f.fieldRuleId] = err
                  }
                  setFieldErrors(errs)
                  if (Object.keys(errs).length > 0) {
                    setSaveState({ saving: false, saved: false, error: 'Fix validation errors before saving.' })
                    return
                  }
                  // Save prompt template to model column only if there is no dynamic prompt_template field
                  if (!hasPromptTemplateField) {
                    try {
                      await fetch(`${api.ApiConfig.main}/bb-models/api/models/update`, {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: settings.id, prompt_template: settings.promptTemplate })
                      })
                    } catch(_) {}
                  } else {
                    // If there is a dynamic field for prompt_template, keep its override in sync with the textarea value (if any)
                    const promptField = profileFields.find(f => String(f.name).toLowerCase() === 'prompt_template')
                    if (promptField) {
                      setFieldValues(prev => ({ ...prev, [promptField.fieldRuleId]: settings.promptTemplate || '' }))
                    }
                  }
                  const overrides = profileFields.map(f => ({ fieldRuleId: f.fieldRuleId, value: fieldValues[f.fieldRuleId] }))
                  const res = await fetch(`${api.ApiConfig.main}/bb-models/api/profiles/overrides/save`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ modelId: settings.id, overrides }) })
                  const data = await res.json()
                  if (!data?.success) throw new Error(data?.error || 'Failed to save')
                  setSaveState({ saving: false, saved: true, error: '' })
                } catch(e) {
                  setSaveState({ saving: false, saved: false, error: 'Failed to save overrides' })
                }
              }}>
                {saveState.saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </SheetClose>
          </div>
          <div className="flex items-center gap-3 mt-2 ml-auto">
            {saveState.saved && <span className="text-sm text-green-600">Saved</span>}
            {saveState.error && <span className="text-sm text-red-600">{saveState.error}</span>}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import MailService from "@/services/mailService";

export default function MailLogsPage() {
  const service = useMemo(() => new MailService(), []);
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [toFilter, setToFilter] = useState("");
  const [provider, setProvider] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorDialogMessage, setErrorDialogMessage] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  function normalizeError(raw) {
    try {
      if (typeof raw === 'string') {
        const obj = JSON.parse(raw);
        if (obj && obj.error) return obj.error.message || String(raw);
        return String(raw);
      }
      if (raw && typeof raw === 'object') {
        if (raw.error) return raw.error.message || JSON.stringify(raw.error);
        if (raw.message) return raw.message;
        return JSON.stringify(raw);
      }
      return 'An unknown error occurred';
    } catch (_) {
      return typeof raw === 'string' ? raw : (raw?.message || 'An unknown error occurred');
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await service.getLogsPage({ page, limit, status, q: query, to: toFilter, provider });
      if (resp?.success) {
        setLogs(resp.logs || []);
        setHasMore(!!resp.hasMore);
      } else {
        setLogs([]);
      }
    } catch (e) {
      setLogs([]);
      setErrorDialogMessage(normalizeError(e));
      setErrorDialogOpen(true);
    } finally {
      setLoading(false);
    }
  }, [service, page, limit, status, query, toFilter, provider]);

  useEffect(() => { load(); }, [load]);

  const onSearch = () => { setPage(1); load(); };

  async function onDelete(id) {
    try {
      const resp = await service.deleteLog(id);
      if (resp?.success) {
        load();
      } else {
        setErrorDialogMessage(normalizeError(resp));
        setErrorDialogOpen(true);
      }
    } catch (e) {
      setErrorDialogMessage(normalizeError(e));
      setErrorDialogOpen(true);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Email Logs</CardTitle>
          <CardDescription>Search and manage recent emails</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <Input placeholder="Search subject" value={query} onChange={e => setQuery(e.target.value)} />
            <Input placeholder="To email filter" value={toFilter} onChange={e => setToFilter(e.target.value)} />
            <Input placeholder="Provider filter" value={provider} onChange={e => setProvider(e.target.value)} />
            <Select value={status || undefined} onValueChange={(v) => setStatus(v === 'all' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={onSearch} disabled={loading}>Search</Button>
          </div>

          <div className="divide-y rounded-md border">
            {logs.map(l => (
              <div key={l.id} className="flex items-center justify-between py-3 px-3 text-sm">
                <div className="flex flex-col">
                  <div className="font-medium">{l.subject || '(no subject)'} <span className="text-xs text-muted-foreground">→ {l.to_email}</span></div>
                  <div className="text-xs text-muted-foreground">{l.provider || 'smtp'} • {l.status} • {l.created_at ? new Date(parseInt(l.created_at)).toLocaleString() : ''}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="destructive" size="sm" onClick={() => setDeleteId(l.id)}>Delete</Button>
                </div>
              </div>
            ))}
            {(!logs || logs.length === 0) && (
              <div className="py-6 text-sm text-muted-foreground text-center">No logs found.</div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page</span>
              <Select value={String(limit)} onValueChange={(v) => setLimit(parseInt(v))}>
                <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" disabled={loading || page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
              <div className="text-sm">Page {page}</div>
              <Button variant="outline" disabled={loading || !hasMore} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>

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

      {/* Delete confirmation modal */}
      <Dialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete log?</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">This action cannot be undone.</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={async () => { if (!deleteId) return; setDeleting(true); try { await onDelete(deleteId); setDeleteId(null); } finally { setDeleting(false); } }} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}



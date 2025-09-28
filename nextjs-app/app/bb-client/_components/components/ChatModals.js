/**
 * Chat Modals Component
 * Handles confirmation dialogs for chat actions
 */
'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function ChatModals({
  deleteDialogOpen,
  setDeleteDialogOpen,
  archiveDialogOpen,
  setArchiveDialogOpen,
  onDeleteConfirm,
  onArchiveConfirm,
  errorDialogOpen,
  setErrorDialogOpen,
  errorData
}) {
  return (
    <>
      {/* Error Dialog */}
      <AlertDialog open={!!errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Error</AlertDialogTitle>
            <AlertDialogDescription>
              {errorData?.message || 'An unexpected error occurred.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {(errorData?.code || errorData?.status || errorData?.provider) && (
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              {errorData?.code && (
                <div><strong>Code:</strong> {String(errorData.code)}</div>
              )}
              {errorData?.status && (
                <div><strong>Status:</strong> {String(errorData.status)}</div>
              )}
              {errorData?.provider && (
                <div><strong>Provider:</strong> {String(errorData.provider)}</div>
              )}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setErrorDialogOpen(false)}>
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Archive Dialog */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Chat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive this chat session? You can restore it later from Archived Chats.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setArchiveDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-yellow-600 hover:bg-yellow-700"
              onClick={onArchiveConfirm}
            >
              Yes, Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this chat session? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={onDeleteConfirm}
            >
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

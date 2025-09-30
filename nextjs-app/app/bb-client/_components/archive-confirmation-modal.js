'use client'

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Archive } from "lucide-react";
import { Spinner } from "@/components/spinner";

export function ArchiveConfirmationModal({ isOpen, onClose, onConfirm, isArchiving }) {
  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-[425px]"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-zinc-600" />
            Archive Chat Session
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-300">
            Are you sure you want to archive this chat session? Archived chats will be moved out of your active chat list but can be restored later.
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isArchiving}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isArchiving}
            className="flex-1 bg-zinc-700 hover:bg-zinc-800 text-white"
          >
            {isArchiving ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Archiving...
              </>
            ) : (
              'Yes, Archive'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

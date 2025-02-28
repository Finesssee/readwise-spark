
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Highlight } from '@/lib/types';

interface NoteDialogProps {
  highlight: Highlight;
  onSave: (highlight: Highlight) => void;
  onClose: () => void;
}

const NoteDialog: React.FC<NoteDialogProps> = ({ highlight, onSave, onClose }) => {
  const [note, setNote] = useState(highlight.note || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...highlight,
      note,
    });
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
      <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 rounded-lg">
        <div className="flex flex-col space-y-1.5 text-center sm:text-left">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold leading-none tracking-tight">Add Note</h2>
            <button
              className="rounded-full p-1.5 hover:bg-secondary transition-colors"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            Add a note to your highlight
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4">
            <div className="rounded-md bg-muted/50 p-3">
              <p className="text-sm italic">"{highlight.text}"</p>
            </div>
            <div className="grid gap-2">
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                placeholder="Write your note here..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring h-9 px-4 py-2 border border-input hover:bg-secondary"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring h-9 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Save Note
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NoteDialog;

import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Highlight } from '@/lib/types';

interface TagDialogProps {
  highlight: Highlight;
  onSave: (highlight: Highlight) => void;
  onClose: () => void;
  availableTags?: string[];
}

const TagDialog: React.FC<TagDialogProps> = ({ highlight, onSave, onClose, availableTags = [] }) => {
  const [tags, setTags] = useState<string[]>(highlight.tags || []);
  const [newTag, setNewTag] = useState('');

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...highlight,
      tags,
    });
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
      <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 rounded-lg">
        <div className="flex flex-col space-y-1.5 text-center sm:text-left">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold leading-none tracking-tight">Manage Tags</h2>
            <button
              className="rounded-full p-1.5 hover:bg-secondary transition-colors"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            Add or remove tags from your highlight
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4">
            <div className="rounded-md bg-muted/50 p-3">
              <p className="text-sm italic">"{highlight.text}"</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium"
                >
                  {tag}
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                placeholder="Add a tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <button
                type="button"
                className="inline-flex h-9 items-center justify-center rounded-md border border-input px-3 hover:bg-secondary"
                onClick={handleAddTag}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {availableTags.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Suggested Tags</p>
                <div className="flex flex-wrap gap-2">
                  {availableTags
                    .filter(tag => !tags.includes(tag))
                    .map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className="rounded-full bg-secondary/50 px-2.5 py-0.5 text-xs font-medium hover:bg-secondary"
                        onClick={() => setTags([...tags, tag])}
                      >
                        {tag}
                      </button>
                    ))}
                </div>
              </div>
            )}

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
                Save Tags
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TagDialog; 

import React, { useState } from 'react';
import { Highlight } from '@/lib/types';
import { X, Plus } from 'lucide-react';

interface TagDialogProps {
  highlight: Highlight;
  onSave: (highlight: Highlight) => void;
  onClose: () => void;
  availableTags?: string[];
}

const TagDialog: React.FC<TagDialogProps> = ({ highlight, onSave, onClose, availableTags = [] }) => {
  const [tags, setTags] = useState<string[]>(highlight.tags || []);
  const [newTag, setNewTag] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...highlight,
      tags,
    });
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const addExistingTag = (tag: string) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
      <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 rounded-lg">
        <div className="flex flex-col space-y-1.5 text-center sm:text-left">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold leading-none tracking-tight">Add Tags</h2>
            <button
              className="rounded-full p-1.5 hover:bg-secondary transition-colors"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            Add tags to your highlight for easier organization
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4">
            <div className="rounded-md bg-muted/50 p-3">
              <p className="text-sm italic">"{highlight.text}"</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <div key={index} className="flex items-center bg-primary/10 text-primary px-2 py-1 rounded-full text-sm">
                    {tag}
                    <button 
                      type="button" 
                      className="ml-1 text-primary/70 hover:text-primary"
                      onClick={() => removeTag(tag)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                  placeholder="Add new tag..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring h-9 px-3 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  onClick={addTag}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            {availableTags && availableTags.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Suggested Tags</p>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag, index) => (
                    <button
                      key={index}
                      type="button"
                      className={`px-2 py-1 rounded-full text-sm ${
                        tags.includes(tag) 
                          ? 'bg-primary/10 text-primary' 
                          : 'bg-secondary hover:bg-secondary/80'
                      }`}
                      onClick={() => addExistingTag(tag)}
                      disabled={tags.includes(tag)}
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


import React, { useState } from 'react';
import { Highlight as HighlightType } from '@/lib/types';
import { BookOpen, Trash2, Edit, MessageSquare } from 'lucide-react';

interface HighlightProps {
  highlight: HighlightType;
  onDelete?: (id: string) => void;
  onEdit?: (highlight: HighlightType) => void;
}

const Highlight = ({ highlight, onDelete, onEdit }: HighlightProps) => {
  const [showOptions, setShowOptions] = useState(false);
  
  const highlightColors = {
    yellow: 'bg-highlight-yellow border-yellow-300',
    blue: 'bg-highlight-blue border-blue-300',
    green: 'bg-highlight-green border-green-300',
    pink: 'bg-highlight-pink border-pink-300',
  };
  
  return (
    <div 
      className="group relative rounded-lg border p-4 transition-all hover:shadow-sm"
      onMouseEnter={() => setShowOptions(true)}
      onMouseLeave={() => setShowOptions(false)}
    >
      <div className="mb-3">
        <div className={`${highlightColors[highlight.color]} p-3 rounded-md border`}>
          <p className="text-base">"{highlight.text}"</p>
        </div>
      </div>
      
      {highlight.note && (
        <div className="pl-3 border-l-2 border-muted mb-3">
          <p className="text-sm text-muted-foreground">{highlight.note}</p>
        </div>
      )}
      
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center">
          <BookOpen className="w-3 h-3 mr-1" />
          <span>From article</span>
        </div>
        <span>{new Date(highlight.createdAt).toLocaleDateString()}</span>
      </div>
      
      {/* Highlight Actions */}
      <div 
        className={`absolute right-2 top-2 flex items-center space-x-1 transition-opacity duration-200 ${
          showOptions ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {!highlight.note && (
          <button 
            className="p-1.5 rounded-full hover:bg-muted transition-colors"
            title="Add note"
            onClick={() => onEdit && onEdit(highlight)}
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
        )}
        {highlight.note && (
          <button 
            className="p-1.5 rounded-full hover:bg-muted transition-colors"
            title="Edit note"
            onClick={() => onEdit && onEdit(highlight)}
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
        )}
        <button 
          className="p-1.5 rounded-full hover:bg-muted transition-colors"
          title="Delete highlight"
          onClick={() => onDelete && onDelete(highlight.id)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default Highlight;

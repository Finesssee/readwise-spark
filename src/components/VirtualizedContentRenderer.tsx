import React, { useEffect, useRef, useState } from 'react';
import { VariableSizeList as List, ListChildComponentProps } from 'react-window';
import { trackComponentPerformance } from '../utils/performanceMonitoring';

interface DocumentSection {
  id: string;
  content: string;
  type: 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'image' | 'code' | 'list' | 'quote';
  metadata?: Record<string, any>;
}

interface VirtualizedContentRendererProps {
  sections: DocumentSection[];
  width?: number | string;
  height?: number | string;
  onSectionVisibilityChange?: (visibleSections: string[]) => void;
  initialScrollIndex?: number;
  className?: string;
  annotationHighlights?: Record<string, { color: string, note?: string }>;
  defaultFontSize?: number;
}

const estimateSectionHeight = (
  section: DocumentSection, 
  width: number, 
  fontSize: number
): number => {
  // Basic height estimates based on content length and type
  // These are approximate and would need adjustment based on actual rendering
  const lineHeight = fontSize * 1.5;
  const charsPerLine = Math.max(50, Math.floor(width / (fontSize * 0.5)));
  
  switch (section.type) {
    case 'heading1':
      return fontSize * 2.5;
    case 'heading2':
      return fontSize * 2.2;
    case 'heading3':
      return fontSize * 2;
    case 'image':
      return 300; // Default height for images
    case 'code':
      // Code blocks typically need more height
      return Math.ceil(section.content.length / charsPerLine) * lineHeight + 40;
    case 'quote':
      return Math.ceil(section.content.length / charsPerLine) * lineHeight + 24;
    case 'list':
      // Lists have additional spacing between items
      const listItems = section.content.split('\n').length;
      return listItems * lineHeight + listItems * 8;
    case 'paragraph':
    default:
      // Estimate based on text length, accounting for wrapping
      return Math.ceil(section.content.length / charsPerLine) * lineHeight + 16;
  }
};

export const VirtualizedContentRenderer: React.FC<VirtualizedContentRendererProps> = ({
  sections,
  width = '100%',
  height = '100vh',
  onSectionVisibilityChange,
  initialScrollIndex = 0,
  className = '',
  annotationHighlights = {},
  defaultFontSize = 16,
}) => {
  const listRef = useRef<List>(null);
  const [sectionHeights, setSectionHeights] = useState<number[]>([]);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleSections, setVisibleSections] = useState<string[]>([]);
  const [fontSize, setFontSize] = useState<number>(defaultFontSize);
  
  // Track component performance
  useEffect(() => {
    return trackComponentPerformance('VirtualizedContentRenderer');
  }, []);
  
  // Calculate container width after mount and on resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);
  
  // Recalculate section heights when container width changes
  useEffect(() => {
    if (containerWidth > 0) {
      const heights = sections.map(section => 
        estimateSectionHeight(section, containerWidth, fontSize)
      );
      setSectionHeights(heights);
      
      // Force react-window to recalculate after height changes
      if (listRef.current) {
        listRef.current.resetAfterIndex(0);
      }
    }
  }, [sections, containerWidth, fontSize]);
  
  // Update visible sections callback
  useEffect(() => {
    if (onSectionVisibilityChange && visibleSections.length > 0) {
      onSectionVisibilityChange(visibleSections);
    }
  }, [visibleSections, onSectionVisibilityChange]);
  
  const getItemSize = (index: number) => {
    return sectionHeights[index] || estimateSectionHeight(sections[index], containerWidth, fontSize);
  };
  
  const onItemsRendered = React.useCallback(({
    visibleStartIndex,
    visibleStopIndex,
  }: {
    visibleStartIndex: number;
    visibleStopIndex: number;
  }) => {
    const newVisibleSections = sections
      .slice(visibleStartIndex, visibleStopIndex + 1)
      .map(section => section.id);
    
    setVisibleSections(newVisibleSections);
  }, [sections]);
  
  const renderSection = ({ index, style }: ListChildComponentProps) => {
    const section = sections[index];
    const highlight = annotationHighlights[section.id];
    
    return (
      <div 
        style={{
          ...style,
          padding: '8px 16px',
          backgroundColor: highlight ? `${highlight.color}30` : 'transparent',
          border: highlight ? `1px solid ${highlight.color}` : 'none',
          fontSize: `${fontSize}px`,
        }}
        data-section-id={section.id}
      >
        {renderSectionContent(section)}
        {highlight?.note && (
          <div className="note-indicator" style={{ 
            backgroundColor: highlight.color,
            padding: '4px 8px',
            borderRadius: '4px',
            marginTop: '4px',
            fontSize: '0.9em'
          }}>
            {highlight.note}
          </div>
        )}
      </div>
    );
  };
  
  const renderSectionContent = (section: DocumentSection) => {
    switch (section.type) {
      case 'heading1':
        return <h1 className="text-2xl font-bold mb-2">{section.content}</h1>;
      case 'heading2':
        return <h2 className="text-xl font-bold mb-2">{section.content}</h2>;
      case 'heading3':
        return <h3 className="text-lg font-bold mb-2">{section.content}</h3>;
      case 'image':
        return (
          <div className="my-4">
            <img 
              src={section.metadata?.src || ''} 
              alt={section.content} 
              className="max-w-full"
              loading="lazy"
            />
            {section.content && (
              <figcaption className="text-sm text-gray-600 mt-1">
                {section.content}
              </figcaption>
            )}
          </div>
        );
      case 'code':
        return (
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
            <code>{section.content}</code>
          </pre>
        );
      case 'quote':
        return (
          <blockquote className="border-l-4 border-gray-300 pl-4 py-1 italic">
            {section.content}
          </blockquote>
        );
      case 'list':
        return (
          <ul className="list-disc pl-5">
            {section.content.split('\n').map((item, i) => (
              <li key={i} className="mb-1">{item}</li>
            ))}
          </ul>
        );
      case 'paragraph':
      default:
        return <p className="mb-4">{section.content}</p>;
    }
  };
  
  // Handle font size changes
  const changeFontSize = (delta: number) => {
    setFontSize(prevSize => {
      const newSize = Math.max(12, Math.min(24, prevSize + delta));
      return newSize;
    });
  };
  
  // Keyboard handlers for accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === '+') {
      e.preventDefault();
      changeFontSize(1);
    } else if (e.ctrlKey && e.key === '-') {
      e.preventDefault();
      changeFontSize(-1);
    }
  };
  
  return (
    <div 
      ref={containerRef}
      className={`virtualized-content ${className}`}
      style={{ width, height }}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {sectionHeights.length > 0 && containerWidth > 0 ? (
        <List
          ref={listRef}
          height={typeof height === 'number' ? height : containerRef.current?.offsetHeight || 500}
          width="100%"
          itemCount={sections.length}
          itemSize={getItemSize}
          initialScrollOffset={initialScrollIndex > 0 ? 
            sectionHeights.slice(0, initialScrollIndex).reduce((sum, h) => sum + h, 0) : 0
          }
          onItemsRendered={onItemsRendered}
        >
          {renderSection}
        </List>
      ) : (
        <div className="p-4 text-center">Loading content...</div>
      )}
    </div>
  );
}; 
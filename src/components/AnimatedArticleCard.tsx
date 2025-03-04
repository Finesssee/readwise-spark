import React from 'react';
import { motion } from 'framer-motion';
import { useDocumentStore } from '../store/documentStore';
import { trackComponentPerformance } from '../utils/performanceMonitoring';

interface AnimatedArticleCardProps {
  articleId: string;
  onClick?: () => void;
  view?: 'grid' | 'list';
  index?: number; // For staggered animations
}

export const AnimatedArticleCard: React.FC<AnimatedArticleCardProps> = ({
  articleId,
  onClick,
  view = 'grid',
  index = 0,
}) => {
  const article = useDocumentStore(state => state.documents[articleId]);
  
  // Track component render performance
  React.useEffect(() => {
    return trackComponentPerformance('AnimatedArticleCard');
  }, []);
  
  if (!article) {
    return null;
  }
  
  // Calculate how long ago the article was last opened
  const getTimeAgo = (date?: Date) => {
    if (!date) return 'Never opened';
    
    const now = new Date();
    const lastOpened = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - lastOpened.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    
    return lastOpened.toLocaleDateString();
  };
  
  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  // Animation variants
  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95,
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: { 
        duration: 0.3, 
        delay: index * 0.05, // Stagger based on index
        ease: 'easeOut'
      }
    },
    hover: { 
      y: -5,
      scale: 1.02,
      boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
      transition: { duration: 0.2 }
    },
    tap: { 
      scale: 0.98,
      boxShadow: '0 5px 10px rgba(0,0,0,0.1)',
      transition: { duration: 0.1 }
    }
  };
  
  // Progress indicator variants
  const progressVariants = {
    initial: { width: '0%' },
    animate: { 
      width: `${article.progress || 0}%`,
      transition: { 
        duration: 0.8, 
        delay: 0.3 + index * 0.05,
        ease: 'easeOut'
      }
    }
  };
  
  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      whileTap="tap"
      className={`bg-white rounded-lg shadow-md overflow-hidden ${
        view === 'grid' ? 'w-full' : 'flex items-center w-full'
      }`}
      onClick={onClick}
      layout
    >
      <div className={`${view === 'grid' ? 'h-40 relative' : 'w-24 h-24 relative'}`}>
        {/* Cover or thumbnail */}
        {article.metadata?.coverImage ? (
          <motion.img 
            src={article.metadata.coverImage} 
            alt={article.title}
            className="w-full h-full object-cover" 
            layoutId={`cover-${articleId}`}
          />
        ) : (
          <div className={`
            w-full h-full flex items-center justify-center 
            ${getFileTypeColor(article.fileType)}
          `}>
            <span className="text-white text-2xl font-bold">
              {article.fileType.slice(0, 1)}
            </span>
          </div>
        )}
        
        {/* File type badge */}
        <motion.div 
          className="absolute top-2 right-2 bg-white bg-opacity-90 rounded-full px-2 py-1 text-xs font-medium"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          {article.fileType}
        </motion.div>
      </div>
      
      <div className={`p-4 flex flex-col ${view === 'grid' ? '' : 'flex-1'}`}>
        {/* Title */}
        <motion.h3 
          className="font-bold text-lg mb-1 line-clamp-2"
          layoutId={`title-${articleId}`}
        >
          {article.title}
        </motion.h3>
        
        {/* Metadata */}
        <div className="text-sm text-gray-600 mb-2">
          {article.metadata?.author && (
            <div className="line-clamp-1">
              By {article.metadata.author}
            </div>
          )}
          <div className="flex justify-between">
            <span>{formatFileSize(article.fileSize)}</span>
            <span>{getTimeAgo(article.lastOpened)}</span>
          </div>
        </div>
        
        {/* Progress bar */}
        {article.progress !== undefined && (
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden mt-auto">
            <motion.div 
              className="h-full bg-blue-500"
              variants={progressVariants}
              initial="initial"
              animate="animate"
            />
          </div>
        )}
        
        {/* Annotations count if available */}
        {article.annotations && article.annotations.length > 0 && (
          <motion.div 
            className="mt-2 text-sm text-blue-600 font-medium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {article.annotations.length} {article.annotations.length === 1 ? 'note' : 'notes'}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

// Helper to get a color based on file type
const getFileTypeColor = (fileType: string): string => {
  switch (fileType.toLowerCase()) {
    case 'pdf':
      return 'bg-red-500';
    case 'epub':
      return 'bg-green-500';
    case 'text':
      return 'bg-blue-500';
    case 'html':
      return 'bg-orange-500';
    default:
      return 'bg-gray-500';
  }
}; 
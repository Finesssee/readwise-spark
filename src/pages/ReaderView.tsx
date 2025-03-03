import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getArticleById, updateArticle } from '@/utils/mockData';
import { Article } from '@/lib/types';
import Reader from '@/components/Reader';
import { Loader } from 'lucide-react';

const ReaderView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Load article function with polling for content updates
  const loadArticle = useCallback(() => {
    if (!id) {
      navigate('/');
      return;
    }
    
    const foundArticle = getArticleById(id);
    if (foundArticle) {
      setArticle(foundArticle);
      
      // If content is empty, we're still loading it in the background
      // Continue polling for updates until content is available
      if (foundArticle.content === '' && loading) {
        // Set a timer to check for content updates
        const timer = setTimeout(() => {
          loadArticle();
        }, 500);
        
        return () => clearTimeout(timer);
      }
    } else {
      navigate('/');
    }
    setLoading(false);
  }, [id, navigate, loading]);

  useEffect(() => {
    const timer = setTimeout(loadArticle, 100);
    return () => clearTimeout(timer);
  }, [id, loadArticle]);
  
  const handleUpdateArticle = (updatedArticle: Article) => {
    updateArticle(updatedArticle);
    setArticle(updatedArticle);
  };
  
  if (loading && !article) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center animate-pulse">
          <Loader className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">Loading article...</p>
        </div>
      </div>
    );
  }
  
  if (!article) {
    return null;
  }
  
  return <Reader article={article} onUpdateArticle={handleUpdateArticle} />;
};

export default ReaderView;

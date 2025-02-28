
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getArticleById } from '@/utils/mockData';
import { Article } from '@/lib/types';
import Reader from '@/components/Reader';
import { Loader } from 'lucide-react';

const ReaderView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!id) {
      navigate('/');
      return;
    }
    
    // Simulate loading from API
    const timer = setTimeout(() => {
      const foundArticle = getArticleById(id);
      if (foundArticle) {
        setArticle(foundArticle);
      } else {
        navigate('/');
      }
      setLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [id, navigate]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
  
  return <Reader article={article} />;
};

export default ReaderView;

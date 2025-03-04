import Fuse from 'fuse.js';
import { Article, Highlight } from '@/lib/types';
import { SearchFilters } from '@/lib/types/search';

interface SearchableArticle extends Article {
  searchableContent: string;
}

const prepareArticleForSearch = (article: Article): SearchableArticle => {
  // Combine all searchable content into a single string
  const highlightTexts = article.highlights?.map(h => h.text).join(' ') || '';
  const highlightNotes = article.highlights?.map(h => h.note).filter(Boolean).join(' ') || '';
  const tags = article.tags?.join(' ') || '';
  
  const searchableContent = `
    ${article.title}
    ${article.content}
    ${highlightTexts}
    ${highlightNotes}
    ${tags}
  `.toLowerCase();

  return {
    ...article,
    searchableContent,
  };
};

export class SearchService {
  private fuse: Fuse<SearchableArticle>;
  private articles: SearchableArticle[];

  constructor(articles: Article[]) {
    this.articles = articles.map(prepareArticleForSearch);
    
    // Configure Fuse.js for fuzzy searching
    const fuseOptions: Fuse.IFuseOptions<SearchableArticle> = {
      keys: [
        { name: 'title', weight: 2 },
        { name: 'searchableContent', weight: 1 },
        { name: 'source', weight: 0.5 },
        { name: 'tags', weight: 0.5 }
      ],
      includeScore: true,
      threshold: 0.3,
      ignoreLocation: true,
    };

    this.fuse = new Fuse(this.articles, fuseOptions);
  }

  private applyFilters(articles: SearchableArticle[], filters: SearchFilters): SearchableArticle[] {
    return articles.filter(article => {
      if (filters.dateRange) {
        const articleDate = new Date(article.createdAt);
        if (articleDate < filters.dateRange.from || articleDate > filters.dateRange.to) {
          return false;
        }
      }

      if (filters.source?.length) {
        if (!filters.source.includes(article.source)) {
          return false;
        }
      }

      if (filters.readStatus && filters.readStatus !== 'all') {
        if (filters.readStatus === 'read' && !article.readAt) {
          return false;
        }
        if (filters.readStatus === 'unread' && article.readAt) {
          return false;
        }
      }

      if (filters.tags?.length) {
        if (!article.tags?.some(tag => filters.tags?.includes(tag))) {
          return false;
        }
      }

      if (filters.hasHighlights !== undefined) {
        const hasHighlights = (article.highlights?.length ?? 0) > 0;
        if (filters.hasHighlights !== hasHighlights) {
          return false;
        }
      }

      if (filters.hasNotes !== undefined) {
        const hasNotes = article.highlights?.some(h => h.note) ?? false;
        if (filters.hasNotes !== hasNotes) {
          return false;
        }
      }

      return true;
    });
  }

  search(query: string, filters: SearchFilters): Article[] {
    let results: SearchableArticle[];

    if (query.trim()) {
      // If there's a query, use Fuse.js for fuzzy search
      const fuseResults = this.fuse.search(query);
      results = fuseResults.map(result => result.item);
    } else {
      // If no query, start with all articles
      results = this.articles;
    }

    // Apply filters to the results
    results = this.applyFilters(results, filters);

    // Convert back to regular Articles
    return results.map(({ searchableContent, ...article }) => article);
  }

  // Update the articles index
  updateIndex(articles: Article[]) {
    this.articles = articles.map(prepareArticleForSearch);
    this.fuse.setCollection(this.articles);
  }

  // Get unique sources from all articles
  getSources(): string[] {
    return Array.from(new Set(this.articles.map(article => article.source)));
  }

  // Get unique tags from all articles
  getTags(): string[] {
    const tagSet = new Set<string>();
    this.articles.forEach(article => {
      article.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet);
  }
} 
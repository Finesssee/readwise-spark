import { Article } from "@/lib/types";
import { SearchService } from "@/lib/services/SearchService";
import { SearchFilters } from "@/lib/types/search";

const STORAGE_KEY = 'readwise_articles';

// Initialize with some mock data
// eslint-disable-next-line prefer-const
let articles: Article[] = (() => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }

  return [
  {
    id: "1",
      title: "The Future of AI",
      content: "Artificial Intelligence is rapidly evolving and transforming various industries. From healthcare to finance, AI is making significant impacts on how we work and live.",
      url: "https://example.com/ai-future",
      source: "Web",
      author: "John Doe",
      imageUrl: "https://picsum.photos/800/400",
      readingTime: 5,
    saved: true,
      createdAt: "2024-03-15T10:00:00Z",
    highlights: [
      {
        id: "h1",
        articleId: "1",
          text: "AI is rapidly evolving and transforming various industries",
        color: "yellow",
          createdAt: "2024-03-15T10:30:00Z",
      },
      {
        id: "h2",
        articleId: "1",
          text: "From healthcare to finance, AI is making significant impacts",
        color: "blue",
          note: "Important applications of AI",
          createdAt: "2024-03-15T10:35:00Z",
      }
    ],
      tags: ["AI", "technology", "future"],
  },
  {
    id: "2",
      title: "Understanding TypeScript",
      content: "TypeScript adds static typing to JavaScript, making it easier to build and maintain large-scale applications. Learn about interfaces, generics, and more.",
      url: "https://example.com/typescript-guide",
      source: "PDF",
      author: "Jane Smith",
      imageUrl: "https://picsum.photos/800/400",
      readingTime: 8,
    saved: true,
      createdAt: "2024-03-14T15:00:00Z",
      readAt: "2024-03-14T16:00:00Z",
    highlights: [
      {
        id: "h3",
          articleId: "2",
          text: "TypeScript adds static typing to JavaScript",
        color: "green",
          createdAt: "2024-03-14T15:30:00Z",
        },
        {
          id: "h4",
          articleId: "2",
          text: "Learn about interfaces, generics, and more",
          color: "purple",
          note: "Core TypeScript concepts",
          createdAt: "2024-03-14T15:45:00Z",
        }
      ],
      tags: ["TypeScript", "programming", "JavaScript"],
    },
    {
      id: "3",
      title: "Modern React Patterns",
      content: "Explore modern React patterns and best practices. From hooks to context, learn how to write clean and maintainable React code.",
      url: "https://example.com/react-patterns",
      source: "Web",
      author: "Sarah Johnson",
      imageUrl: "https://picsum.photos/800/400",
      readingTime: 10,
    saved: false,
      createdAt: "2024-03-13T09:00:00Z",
    highlights: [
      {
          id: "h5",
          articleId: "3",
          text: "Explore modern React patterns and best practices",
        color: "pink",
          createdAt: "2024-03-13T10:00:00Z",
        }
      ],
      tags: ["React", "JavaScript", "programming"],
    }
  ];
})();

// Initialize SearchService
const searchService = new SearchService(articles);

// Get all articles
export const getArticles = (): Article[] => {
  return articles;
};

// Get article by ID
export const getArticleById = (id: string): Article | undefined => {
  return articles.find(article => article.id === id);
};

// Update article
export const updateArticle = (updatedArticle: Article): void => {
  const index = articles.findIndex(article => article.id === updatedArticle.id);
  if (index !== -1) {
    articles[index] = updatedArticle;
    // Persist to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
    // Update search index when article is modified
    searchService.updateIndex(articles);
  }
};

// Search articles
export const searchArticles = (query: string, filters: SearchFilters): Article[] => {
  return searchService.search(query, filters);
};

// Get unique sources
export const getSources = (): string[] => {
  return searchService.getSources();
};

// Get unique tags
export const getTags = (): string[] => {
  return searchService.getTags();
};

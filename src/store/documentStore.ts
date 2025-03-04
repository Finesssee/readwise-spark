import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { measurePerformance } from '../utils/performanceMonitoring';

export interface Document {
  id: string;
  title: string;
  content: string;
  metadata?: {
    author?: string;
    publisher?: string;
    publicationDate?: string;
    language?: string;
    [key: string]: any;
  };
  lastOpened?: Date;
  progress?: number;
  bookmarks?: {
    position: string;
    label: string;
    createdAt: Date;
  }[];
  annotations?: {
    id: string;
    text: string;
    cfi?: string; // EPUB Content Fragment Identifier
    positionPercent?: number;
    color?: string;
    note?: string;
    tags?: string[];
    createdAt: Date;
  }[];
  fileType: 'PDF' | 'EPUB' | 'Text' | 'HTML' | 'Other';
  fileSize: number;
  fileName: string;
}

export interface ReaderSettings {
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  theme: 'light' | 'dark' | 'sepia';
  showAnnotations: boolean;
  scrollMode: 'continuous' | 'paginated';
  marginSize: 'small' | 'medium' | 'large';
}

interface DocumentState {
  // Document collections
  documents: Record<string, Document>;
  recentDocuments: string[]; // IDs of recently opened documents
  
  // Active document state
  activeDocumentId: string | null;
  activeDocument: Document | null;
  
  // UI state
  isLoadingDocument: boolean;
  loadingProgress: number;
  loadingError: string | null;
  
  // Reader settings
  readerSettings: ReaderSettings;
  
  // Actions
  setActiveDocument: (documentId: string | null) => void;
  addDocument: (document: Document) => void;
  updateDocument: (documentId: string, updates: Partial<Document>) => void;
  removeDocument: (documentId: string) => void;
  updateReaderSettings: (settings: Partial<ReaderSettings>) => void;
  addAnnotation: (documentId: string, annotation: Omit<Document['annotations'][0], 'id' | 'createdAt'>) => void;
  removeAnnotation: (documentId: string, annotationId: string) => void;
  setLoadingProgress: (progress: number) => void;
  setLoadingError: (error: string | null) => void;
}

export const useDocumentStore = create<DocumentState>()(
  persist(
    (set, get) => ({
      // Document collections
      documents: {},
      recentDocuments: [],
      
      // Active document state
      activeDocumentId: null,
      activeDocument: null,
      
      // UI state
      isLoadingDocument: false,
      loadingProgress: 0,
      loadingError: null,
      
      // Reader settings with sensible defaults
      readerSettings: {
        fontSize: 16,
        lineHeight: 1.5,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        theme: 'light',
        showAnnotations: true,
        scrollMode: 'continuous',
        marginSize: 'medium',
      },
      
      // Actions
      setActiveDocument: (documentId) => {
        // Performance tracking
        const startTime = performance.now();
        
        if (documentId === null) {
          set({ 
            activeDocumentId: null, 
            activeDocument: null,
            isLoadingDocument: false,
            loadingProgress: 0,
            loadingError: null,
          });
          return;
        }
        
        const document = get().documents[documentId];
        
        if (!document) {
          set({ 
            loadingError: `Document with ID ${documentId} not found`,
            isLoadingDocument: false
          });
          return;
        }
        
        // Update the recent documents list
        const recentDocuments = [
          documentId,
          ...get().recentDocuments.filter(id => id !== documentId)
        ].slice(0, 10); // Keep only 10 most recent
        
        set({ 
          activeDocumentId: documentId,
          activeDocument: document,
          recentDocuments,
          isLoadingDocument: false,
          // Update the last opened time
          documents: {
            ...get().documents,
            [documentId]: {
              ...document,
              lastOpened: new Date()
            }
          }
        });
        
        const duration = performance.now() - startTime;
        if (duration > 50) {
          console.log(`[Performance] setActiveDocument took ${duration.toFixed(2)}ms`);
        }
      },
      
      addDocument: (document) => {
        return measurePerformance('addDocument', async () => {
          set(state => ({
            documents: {
              ...state.documents,
              [document.id]: document
            },
            recentDocuments: [
              document.id,
              ...state.recentDocuments.filter(id => id !== document.id)
            ].slice(0, 10) // Keep only 10 most recent
          }));
        });
      },
      
      updateDocument: (documentId, updates) => {
        set(state => {
          const document = state.documents[documentId];
          if (!document) return state; // No changes if document doesn't exist
          
          const updatedDocument = {
            ...document,
            ...updates
          };
          
          return {
            documents: {
              ...state.documents,
              [documentId]: updatedDocument
            },
            // If active document is being updated, update that as well
            activeDocument: state.activeDocumentId === documentId 
              ? updatedDocument 
              : state.activeDocument
          };
        });
      },
      
      removeDocument: (documentId) => {
        set(state => {
          const { [documentId]: _, ...restDocuments } = state.documents;
          
          return {
            documents: restDocuments,
            recentDocuments: state.recentDocuments.filter(id => id !== documentId),
            // If removing the active document, clear it
            activeDocumentId: state.activeDocumentId === documentId ? null : state.activeDocumentId,
            activeDocument: state.activeDocumentId === documentId ? null : state.activeDocument
          };
        });
      },
      
      updateReaderSettings: (settings) => {
        set(state => ({
          readerSettings: {
            ...state.readerSettings,
            ...settings
          }
        }));
      },
      
      addAnnotation: (documentId, annotation) => {
        set(state => {
          const document = state.documents[documentId];
          if (!document) return state; // No changes if document doesn't exist
          
          const newAnnotation = {
            ...annotation,
            id: `annotation-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            createdAt: new Date()
          };
          
          const updatedDocument = {
            ...document,
            annotations: [
              ...(document.annotations || []),
              newAnnotation
            ]
          };
          
          return {
            documents: {
              ...state.documents,
              [documentId]: updatedDocument
            },
            // If active document is being updated, update that as well
            activeDocument: state.activeDocumentId === documentId 
              ? updatedDocument 
              : state.activeDocument
          };
        });
      },
      
      removeAnnotation: (documentId, annotationId) => {
        set(state => {
          const document = state.documents[documentId];
          if (!document || !document.annotations) return state;
          
          const updatedDocument = {
            ...document,
            annotations: document.annotations.filter(a => a.id !== annotationId)
          };
          
          return {
            documents: {
              ...state.documents,
              [documentId]: updatedDocument
            },
            // If active document is being updated, update that as well
            activeDocument: state.activeDocumentId === documentId 
              ? updatedDocument 
              : state.activeDocument
          };
        });
      },
      
      setLoadingProgress: (progress) => {
        set({ loadingProgress: progress, isLoadingDocument: progress < 100 });
      },
      
      setLoadingError: (error) => {
        set({ loadingError: error, isLoadingDocument: false });
      }
    }),
    {
      name: 'document-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist document metadata, not full content for large files
      partialize: (state) => ({
        documents: Object.fromEntries(
          Object.entries(state.documents).map(([id, doc]) => [
            id, 
            {
              id: doc.id,
              title: doc.title,
              metadata: doc.metadata,
              lastOpened: doc.lastOpened,
              progress: doc.progress,
              bookmarks: doc.bookmarks,
              annotations: doc.annotations,
              fileType: doc.fileType,
              fileSize: doc.fileSize,
              fileName: doc.fileName,
              // Don't persist the full content
            }
          ])
        ),
        recentDocuments: state.recentDocuments,
        readerSettings: state.readerSettings
      }),
    }
  )
); 
// Text Parser Web Worker
// This worker handles text parsing operations in a separate thread

// Define the message types
interface ParseRequest {
  text: string;
  operation: 'parse' | 'extract' | 'analyze';
  options?: any;
}

interface ParseResponse {
  parsed: any;
  stats?: {
    wordCount: number;
    charCount: number;
    processingTimeMs: number;
  };
}

// Set up event listeners
self.addEventListener('message', async (event: MessageEvent<ParseRequest>) => {
  const startTime = performance.now();
  const { text, operation, options } = event.data;
  
  try {
    let result;
    
    // Choose parsing strategy based on operation
    switch (operation) {
      case 'parse':
        result = parseText(text, options);
        break;
      case 'extract':
        result = extractEntities(text, options);
        break;
      case 'analyze':
        result = analyzeText(text, options);
        break;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
    
    // Calculate stats
    const endTime = performance.now();
    const processingTimeMs = endTime - startTime;
    
    // Send back the result
    const response: ParseResponse = {
      parsed: result,
      stats: {
        wordCount: countWords(text),
        charCount: text.length,
        processingTimeMs
      }
    };
    
    self.postMessage(response);
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : 'Unknown error',
      parsed: null
    });
  }
});

// Basic text parsing function - very fast
function parseText(text: string, options: any = {}): any {
  // Split by paragraphs
  const paragraphs = text.split(/\n\s*\n/);
  
  // Process each paragraph based on options
  return paragraphs.map(p => {
    // Skip empty paragraphs
    if (!p.trim()) return null;
    
    // Process paragraph
    let processed = p.trim();
    
    // Apply options
    if (options.toLowerCase) {
      processed = processed.toLowerCase();
    }
    
    if (options.removeSpecialChars) {
      processed = processed.replace(/[^\w\s]/g, '');
    }
    
    return {
      text: processed,
      length: processed.length
    };
  }).filter(Boolean);
}

// Entity extraction function
function extractEntities(text: string, options: any = {}): any {
  // Simple patterns for entity extraction
  const emails = options.extractEmails ? 
    text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g) || [] : [];
  
  const urls = options.extractUrls ?
    text.match(/https?:\/\/[^\s]+/g) || [] : [];
  
  // Simple date extraction (not comprehensive)
  const dates = options.extractDates ?
    text.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/g) || [] : [];
  
  return {
    emails,
    urls,
    dates
  };
}

// Text analysis function
function analyzeText(text: string, options: any = {}): any {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  // Calculate readability if requested
  let readability = {};
  if (options.calculateReadability) {
    // Very simple Flesch-Kincaid implementation
    const totalWords = words.length;
    const totalSentences = sentences.length;
    const totalSyllables = countSyllables(text);
    
    // Simple Flesch Reading Ease score
    const fleschScore = 206.835 - 1.015 * (totalWords / totalSentences) - 84.6 * (totalSyllables / totalWords);
    
    readability = {
      fleschScore,
      averageWordsPerSentence: totalWords / totalSentences,
      averageSyllablesPerWord: totalSyllables / totalWords
    };
  }
  
  return {
    wordCount: words.length,
    sentenceCount: sentences.length,
    averageWordLength: words.reduce((sum, word) => sum + word.length, 0) / words.length,
    readability
  };
}

// Helper function to count words
function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

// Very simple syllable counter (English only, not 100% accurate)
function countSyllables(text: string): number {
  const words = text.toLowerCase().split(/\s+/);
  let count = 0;
  
  for (const word of words) {
    if (word.length <= 3) {
      count += 1;
      continue;
    }
    
    // Count vowel groups as syllables
    let wordCount = word.replace(/(?:[^laeiouy]|ed|[^laeiouy]e)$/, '')
      .replace(/^y/, '')
      .match(/[aeiouy]{1,2}/g)?.length || 1;
    
    // Handle special cases
    if (word.length > 0) {
      wordCount = Math.max(1, wordCount);
    }
    
    count += wordCount;
  }
  
  return count;
}

// Explicitly mark as a module
export {}; 
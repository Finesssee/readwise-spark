/**
 * High-Performance Parser System
 * Main exports for the parsing system
 */

// Export core types and interfaces
export * from './types';

// Export parser engine
export { ParserEngine } from './ParserEngine';

// Export stages
export { EpubExtractionStage } from './stages/EpubExtractionStage';
export { PdfExtractionStage } from './stages/PdfExtractionStage';

// Create and configure a default parser instance with all stages
import { ParserEngine } from './ParserEngine';
import { EpubExtractionStage } from './stages/EpubExtractionStage';
import { PdfExtractionStage } from './stages/PdfExtractionStage';

/**
 * Create and configure a parser with all available stages
 */
export function createParser() {
  const parser = new ParserEngine();
  
  // Add extraction stages
  parser.addStage(new EpubExtractionStage());
  parser.addStage(new PdfExtractionStage());
  
  // Will add more stages as they're implemented
  
  return parser;
}

// Export a default preconfigured parser instance
export const defaultParser = createParser(); 
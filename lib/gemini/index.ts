// Barrel file - re-exports all public API from gemini modules
// This ensures backward compatibility with existing imports from '@/lib/gemini'

export { generateStencilFromImage, generateStencilWithCost } from './stencil-generation';
export { generateTattooIdea } from './image-generation';
export { enhanceImage, removeBackground } from './image-enhancement';
export { analyzeImageColors } from './image-analysis';
export { generateLinesFromTopographic } from './pipelines';

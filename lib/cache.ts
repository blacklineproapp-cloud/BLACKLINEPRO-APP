/**
 * Sistema de cache híbrido com Redis
 *
 * Usa Redis quando disponível (produção) e fallback para memória (desenvolvimento)
 * Compatível com código legado via re-exports
 */

// Re-export tudo do cache-redis para manter compatibilidade
export {
  getOrSetCache,
  getCached,
  invalidateCache,
  invalidateCacheByPattern,
  invalidateCacheByTag,
  clearAllCache as clearCache,
  getCacheStats,
  isRedisConnected,
  type CacheOptions,
} from './cache-redis';

// Aliases para compatibilidade com código antigo
export { invalidateCacheByPattern as invalidateCacheByPrefix } from './cache-redis';

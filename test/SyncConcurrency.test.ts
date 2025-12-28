import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebDAVService } from '../services/webdavService';
import { db } from '../db';
import { clearDatabase, setupTestData } from './db-test-utils';

describe('Sync Concurrency', () => {
  const mockConfig: any = {
    webdavUrl: 'https://example.com/dav',
    webdavUsername: 'user',
    webdavPassword: 'pass'
  };

  beforeEach(async () => {
    await clearDatabase();
    await setupTestData();
    vi.restoreAllMocks();
  });

  it('sync() should execute shard syncs concurrently', async () => {
    const service = new WebDAVService(mockConfig);
    
    let activeShardRequests = 0;
    let maxConcurrentShardRequests = 0;

    // Use stubGlobal to ensure fetch is mocked correctly
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string, init?: any) => {
      // We only care about shard uploads/downloads for concurrency check
      const isShardOp = url.includes('.json') && !url.includes('sync-manifest.json');
      
      if (isShardOp) {
        activeShardRequests++;
        maxConcurrentShardRequests = Math.max(maxConcurrentShardRequests, activeShardRequests);
      }

      try {
        if (url.includes('sync-manifest.json')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              version: 3,
              lastUpdated: 1000,
              files: {} // Remote is empty
            })
          };
        }
        
        if (url.includes('PROPFIND')) {
          return { ok: true, status: 207 };
        }

        if (init?.method === 'PUT' || init?.method === 'GET') {
          // Simulate network delay for shard ops
          await new Promise(resolve => setTimeout(resolve, 50));
          return { ok: true, status: 200, json: async () => ([]) };
        }

        return { ok: true, status: 200, json: async () => ([]) };
      } finally {
        if (isShardOp) {
          activeShardRequests--;
        }
      }
    }));

    // Mock generateManifestFromLocalDB to return updatedAt > lastSyncUpdatedAt
    vi.spyOn(service, 'generateManifestFromLocalDB').mockResolvedValue({
      version: 3,
      lastUpdated: 5000,
      files: {
        'life-habits-data/todo/all.json': { updatedAt: 5000 },
        'life-habits-data/habits/all.json': { updatedAt: 5000 },
        'life-habits-data/projects/all.json': { updatedAt: 5000 },
        'life-habits-data/reviews/templates.json': { updatedAt: 5000 },
        'life-habits-data/accounting/2025-W52.json': { updatedAt: 5000 },
        'life-habits-data/accounting/2025-W51.json': { updatedAt: 5000 },
        'life-habits-data/reviews/2025-W52.json': { updatedAt: 5000 },
        'life-habits-data/reviews/2025-W51.json': { updatedAt: 5000 },
      }
    });

    // Mock getShardDataFromDb to return non-null so uploadShard proceeds
    // Since it's private, we use prototype or cast to any
    vi.spyOn(WebDAVService.prototype as any, 'getShardDataFromDb').mockResolvedValue([{ id: '1' }]);

    await service.sync();
    
    console.log(`Max concurrent shard requests: ${maxConcurrentShardRequests}`);
    
    // Currently serial, so max concurrent should be 1
    // After my change, it should be > 1 (ideally equal to the concurrency limit)
    expect(maxConcurrentShardRequests).toBeGreaterThan(1);
  });
});
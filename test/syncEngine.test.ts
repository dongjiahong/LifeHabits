import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebDAVService, SyncManifest } from '../services/webdavService';
import { db } from '../db';
import { clearDatabase } from './db-test-utils';
import { TaskStatus, LogType } from '../types';

describe('Sync Engine Core', () => {
  const mockConfig: any = {
    webdavUrl: 'https://example.com/dav',
    webdavUsername: 'user',
    webdavPassword: 'pass'
  };

  beforeEach(async () => {
    await clearDatabase();
    vi.restoreAllMocks();
  });

  it('generateManifestFromLocalDB should reflect local database state', async () => {
    const service = new WebDAVService(mockConfig);
    
    // Add a task
    const now = Date.now();
    await db.tasks.add({
      title: 'Task 1',
      date: '2025-12-25',
      status: TaskStatus.PENDING,
      isPriority: false,
      createdAt: now,
      updatedAt: now
    });

    // Add a log
    await db.logs.add({
      type: LogType.TIME,
      name: 'Work',
      value: 60,
      date: '2025-12-25',
      createdAt: now,
      updatedAt: now + 1000,
      isDeleted: false
    });

    const manifest = await service.generateManifestFromLocalDB();
    
    expect(manifest.files['life-habits-data/todo/all.json']).toBeDefined();
    expect(manifest.files['life-habits-data/todo/all.json'].updatedAt).toBe(now);
    
    // 2025-12-25 is 2025-W52
    expect(manifest.files['life-habits-data/accounting/2025-W52.json']).toBeDefined();
    expect(manifest.files['life-habits-data/accounting/2025-W52.json'].updatedAt).toBe(now + 1000);
  });

  it('determineSyncActions should correctly identify upload/download needs', () => {
    const service = new WebDAVService(mockConfig);
    
    const local: SyncManifest = {
      version: 2,
      lastUpdated: 1000,
      files: {
        'life-habits-data/todo/all.json': { updatedAt: 500 },
        'life-habits-data/accounting/2025-W01.json': { updatedAt: 800 }
      }
    };

    const remote: SyncManifest = {
      version: 2,
      lastUpdated: 2000,
      files: {
        'life-habits-data/todo/all.json': { updatedAt: 600 }, // Remote newer
        'life-habits-data/accounting/2025-W01.json': { updatedAt: 700 }, // Local newer
        'life-habits-data/reviews/all.json': { updatedAt: 900 } // Local missing
      }
    };

    const actions = service.determineSyncActions(local, remote);
    
    const todoAction = actions.find(a => a.filePath === 'life-habits-data/todo/all.json');
    expect(todoAction?.type).toBe('download');

    const accountingAction = actions.find(a => a.filePath === 'life-habits-data/accounting/2025-W01.json');
    expect(accountingAction?.type).toBe('upload');

    const reviewAction = actions.find(a => a.filePath === 'life-habits-data/reviews/all.json');
    expect(reviewAction?.type).toBe('download');
  });

  it('lwwSyncTable should handle template name conflicts correctly', async () => {
    const service = new WebDAVService(mockConfig);
    
    // 1. Pre-populate local templates
    const t1CreatedAt = 1000;
    await db.templates.add({
      name: 'Template A',
      questions: ['Q1'],
      createdAt: t1CreatedAt,
      updatedAt: t1CreatedAt,
      isDeleted: false
    });

    // 2. Remote has a template with same name but different createdAt
    const t2CreatedAt = 2000;
    const remoteItems = [
      {
        name: 'Template A', // Same name
        questions: ['Q1 updated'],
        createdAt: t2CreatedAt, // Different createdAt
        updatedAt: 3000,
        isDeleted: false
      }
    ];

    // This should NOT throw ConstraintError and should update the local item (or at least handle it)
    await (service as any).lwwSyncTable(db.templates, remoteItems);

    const localItems = await db.templates.toArray();
    // It should have matched by name and updated the existing one OR merged them?
    // According to my fix, it matches by name if createdAt not found.
    expect(localItems.length).toBe(1);
    expect(localItems[0].name).toBe('Template A');
    expect(localItems[0].questions).toContain('Q1 updated');
    expect(localItems[0].updatedAt).toBe(3000);
  });
});

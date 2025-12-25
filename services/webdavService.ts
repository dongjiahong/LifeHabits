
import { db } from '../db';
import { AppSettings, Task, AccountLog, Review, Habit, HabitLog } from '../types';
import { getWeekStr } from '../utils';

export interface SyncManifest {
  version: number;
  lastUpdated: number;
  files: {
    [filePath: string]: {
      updatedAt: number;
      size?: number;
    }
  };
}

export interface SyncAction {
  type: 'upload' | 'download' | 'noop';
  filePath: string;
}

const DATA_ROOT = 'life-habits-data/';
const MANIFEST_FILE = DATA_ROOT + 'sync-manifest.json';

export async function getWebDAVService(): Promise<WebDAVService | null> {
  const settings = await db.settings.toArray();
  if (settings.length > 0 && settings[0].webdavUrl && settings[0].webdavUsername && settings[0].webdavPassword) {
    return new WebDAVService(settings[0]);
  }
  return null;
}

export class WebDAVService {
  private config: AppSettings;
  private authHeader: string;
  private baseUrl: string;

  constructor(config: AppSettings) {
    this.config = config;
    if (!config.webdavUrl || !config.webdavUsername || !config.webdavPassword) {
      throw new Error("WebDAV 配置不完整");
    }
    this.authHeader = `Basic ${btoa(`${config.webdavUsername}:${config.webdavPassword}`)}`;
    this.baseUrl = config.webdavUrl.trim().replace(/\/?$/, '/');
  }

  async fetchManifest(): Promise<SyncManifest | null> {
    try {
      const response = await fetch(this.baseUrl + MANIFEST_FILE, {
        headers: { 'Authorization': this.authHeader }
      });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Failed to fetch manifest: ${response.status}`);
      return await response.json();
    } catch (e) {
      console.error("fetchManifest error:", e);
      return null;
    }
  }

  async updateManifest(manifest: SyncManifest): Promise<void> {
    await this.createFolderIfNotExists(this.baseUrl + DATA_ROOT);
    const response = await fetch(this.baseUrl + MANIFEST_FILE, {
      method: 'PUT',
      headers: { 
        'Authorization': this.authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(manifest)
    });
    if (!response.ok) {
      throw new Error(`Failed to update manifest: ${response.status}`);
    }
  }

  async generateManifestFromLocalDB(): Promise<SyncManifest> {
    const manifest: SyncManifest = {
      version: 2,
      lastUpdated: Date.now(),
      files: {}
    };

    const updateFileMax = (path: string, updatedAt: number) => {
      if (!manifest.files[path] || updatedAt > manifest.files[path].updatedAt) {
        manifest.files[path] = { updatedAt };
      }
    };

    const lastTask = await db.tasks.orderBy('updatedAt').last();
    if (lastTask?.updatedAt) updateFileMax(this.getFilePathForData('todo'), lastTask.updatedAt);

    const lastHabit = await db.habits.orderBy('updatedAt').last();
    const lastHabitLog = await db.habitLogs.orderBy('updatedAt').last();
    const habitMax = Math.max(lastHabit?.updatedAt || 0, lastHabitLog?.updatedAt || 0);
    if (habitMax > 0) updateFileMax(this.getFilePathForData('habit'), habitMax);

    await db.logs.each(log => {
      const path = this.getFilePathForData('accounting', log.date);
      if (log.updatedAt) updateFileMax(path, log.updatedAt);
    });

    await db.reviews.each(review => {
      const path = this.getFilePathForData('review', review.date);
      if (review.updatedAt) updateFileMax(path, review.updatedAt);
    });
    
    const lastTpl = await db.templates.orderBy('updatedAt').last();
    if (lastTpl?.updatedAt) updateFileMax(this.getFilePathForData('template'), lastTpl.updatedAt);

    return manifest;
  }

  determineSyncActions(local: SyncManifest, remote: SyncManifest | null): SyncAction[] {
    if (!remote) {
      return Object.keys(local.files).map(filePath => ({ type: 'upload', filePath }));
    }

    const actions: SyncAction[] = [];
    const allPaths = new Set([...Object.keys(local.files), ...Object.keys(remote.files)]);

    for (const filePath of allPaths) {
      const localFile = local.files[filePath];
      const remoteFile = remote.files[filePath];

      if (!remoteFile) {
        actions.push({ type: 'upload', filePath });
      } else if (!localFile) {
        actions.push({ type: 'download', filePath });
      } else if (localFile.updatedAt > remoteFile.updatedAt) {
        actions.push({ type: 'upload', filePath });
      } else if (remoteFile.updatedAt > localFile.updatedAt) {
        actions.push({ type: 'download', filePath });
      } else {
        actions.push({ type: 'noop', filePath });
      }
    }
    return actions;
  }

  async sync(): Promise<string> {
    // 0. 尝试从 V1 迁移 (如果清单不存在)
    const remoteManifest = await this.fetchManifest();
    if (!remoteManifest) {
        await this.migrateFromV1();
    }

    const currentManifest = await this.fetchManifest();
    const localManifest = await this.generateManifestFromLocalDB();
    const actions = this.determineSyncActions(localManifest, currentManifest);

    let downloadCount = 0;
    let uploadCount = 0;

    for (const action of actions) {
      if (action.type === 'download' && this.isCriticalPath(action.filePath)) {
        await this.downloadAndApply(action.filePath);
        downloadCount++;
      }
    }

    for (const action of actions) {
      if (action.type === 'upload') {
        await this.uploadShard(action.filePath);
        uploadCount++;
      }
    }

    if (uploadCount > 0 || downloadCount > 0 || !remoteManifest) {
      const finalManifest = await this.generateManifestFromLocalDB();
      await this.updateManifest(finalManifest);
    }

    if (uploadCount === 0 && downloadCount === 0) return "数据已是最新";
    return `同步完成！上传了 ${uploadCount} 个分片，下载了 ${downloadCount} 个分片。`;
  }

  async lazyDownloadIfNeeded(weekStr: string): Promise<void> {
    const remoteManifest = await this.fetchManifest();
    if (!remoteManifest) return;

    const paths = [
      this.getFilePathForData('accounting', weekStr),
      this.getFilePathForData('review', weekStr)
    ];

    const localManifest = await this.generateManifestFromLocalDB();

    for (const path of paths) {
      const remoteFile = remoteManifest.files[path];
      const localFile = localManifest.files[path];

      if (remoteFile && (!localFile || remoteFile.updatedAt > localFile.updatedAt)) {
        await this.downloadAndApply(path);
      }
    }
  }

  getFilePathForData(type: 'todo' | 'habit' | 'accounting' | 'review' | 'template', dateOrWeek?: string): string {
    let path = '';
    switch (type) {
      case 'todo': path = 'todo/all.json'; break;
      case 'habit': path = 'habits/all.json'; break;
      case 'template': path = 'reviews/templates.json'; break;
      case 'accounting': 
        const week = dateOrWeek?.includes('-W') ? dateOrWeek : getWeekStr(dateOrWeek!);
        path = `accounting/${week}.json`;
        break;
      case 'review':
        const rWeek = dateOrWeek?.includes('-W') ? dateOrWeek : getWeekStr(dateOrWeek!);
        path = `reviews/${rWeek}.json`;
        break;
    }
    return DATA_ROOT + path;
  }

  private isCriticalPath(filePath: string): boolean {
    const todoPath = this.getFilePathForData('todo');
    const habitPath = this.getFilePathForData('habit');
    const templatePath = this.getFilePathForData('template');

    if (filePath === todoPath || filePath === habitPath || filePath === templatePath) return true;
    
    const today = new Date().toISOString().split('T')[0];
    const currentWeek = getWeekStr(today);
    const prevDate = new Date();
    prevDate.setDate(prevDate.getDate() - 7);
    const prevWeek = getWeekStr(prevDate.toISOString().split('T')[0]);

    return filePath.includes(currentWeek) || filePath.includes(prevWeek);
  }

  private async downloadAndApply(filePath: string) {
    const res = await fetch(this.baseUrl + filePath, {
      headers: { 'Authorization': this.authHeader }
    });
    if (res.ok) {
      const data = await res.json();
      await this.applyShardToLocalDb(filePath, data);
    }
  }

  private async uploadShard(filePath: string) {
    const data = await this.getShardDataFromDb(filePath);
    if (!data) return;

    // 确保目录结构存在 (例如 life-habits-data/accounting/)
    const parts = filePath.split('/');
    if (parts.length > 1) {
        let currentPath = '';
        for (let i = 0; i < parts.length - 1; i++) {
            currentPath += parts[i] + '/';
            await this.createFolderIfNotExists(this.baseUrl + currentPath);
        }
    }

    const res = await fetch(this.baseUrl + filePath, {
      method: 'PUT',
      headers: { 
        'Authorization': this.authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`Failed to upload ${filePath}: ${res.status}`);
  }

  private async getShardDataFromDb(filePath: string): Promise<any> {
    if (filePath === this.getFilePathForData('todo')) return await db.tasks.toArray();
    if (filePath === this.getFilePathForData('habit')) {
      return {
        habits: await db.habits.toArray(),
        habitLogs: await db.habitLogs.toArray()
      };
    }
    if (filePath === this.getFilePathForData('template')) return await db.templates.toArray();
    
    if (filePath.includes('accounting/')) {
      const week = filePath.match(/accounting\/(.*)\.json/)?.[1];
      if (!week) return null;
      return await db.logs.filter(l => getWeekStr(l.date) === week).toArray();
    }

    if (filePath.includes('reviews/')) {
      const week = filePath.match(/reviews\/(.*)\.json/)?.[1];
      if (!week) return null;
      return await db.reviews.filter(r => getWeekStr(r.date) === week).toArray();
    }
    return null;
  }

  private async applyShardToLocalDb(filePath: string, remoteData: any) {
    if (filePath === this.getFilePathForData('habit')) {
      await this.lwwSyncTable(db.habits, remoteData.habits || []);
      await this.lwwSyncTable(db.habitLogs, remoteData.habitLogs || []);
      return;
    }

    let table: any = null;
    if (filePath === this.getFilePathForData('todo')) table = db.tasks;
    else if (filePath.includes('accounting/')) table = db.logs;
    else if (filePath === this.getFilePathForData('template')) table = db.templates;
    else if (filePath.includes('reviews/')) table = db.reviews;

    if (table && Array.isArray(remoteData)) {
      await this.lwwSyncTable(table, remoteData);
    }
  }

  private async lwwSyncTable(table: any, remoteItems: any[]) {
    await db.transaction('rw', table, async () => {
      for (const remoteItem of remoteItems) {
        let localItem = await table.where('createdAt').equals(remoteItem.createdAt).first();
        
        // 特殊处理 templates 表：如果 createdAt 不匹配，尝试按 name 匹配（name 是唯一的）
        if (!localItem && table.name === 'templates' && remoteItem.name) {
          localItem = await table.where('name').equals(remoteItem.name).first();
        }

        if (!localItem) {
          const { id, ...rest } = remoteItem;
          try {
            await table.add(rest);
          } catch (e: any) {
            // 如果仍然发生冲突（例如并发写入或逻辑漏洞），记录错误但不中断整个同步
            if (e.name === 'ConstraintError') {
              console.warn(`Sync ConstraintError on ${table.name} for item:`, remoteItem, e);
              // 再次尝试更新，以防万一
              if (table.name === 'templates' && remoteItem.name) {
                const existing = await table.where('name').equals(remoteItem.name).first();
                if (existing && remoteItem.updatedAt > (existing.updatedAt || 0)) {
                  await table.update(existing.id, remoteItem);
                }
              }
            } else {
              throw e;
            }
          }
        } else if (remoteItem.updatedAt > (localItem.updatedAt || 0)) {
          await table.update(localItem.id, remoteItem);
        }
      }
    });
  }

  private async migrateFromV1() {
    const v1Folder = this.baseUrl + DATA_ROOT;
    const files = await this.listV1Files(v1Folder);
    if (files.length === 0) return;

    for (const fileName of files) {
        try {
            const res = await fetch(v1Folder + fileName, { headers: { 'Authorization': this.authHeader } });
            if (!res.ok) continue;
            const data = await res.json();
            
            await this.applyShardToLocalDb(this.getFilePathForData('todo'), data.tasks || []);
            await this.applyShardToLocalDb(this.getFilePathForData('habit'), { habits: data.habits || [], habitLogs: data.habitLogs || [] });
            
            const weekStr = fileName.match(/data_(.*)\.json/)?.[1];
            if (weekStr) {
                await this.applyShardToLocalDb(this.getFilePathForData('accounting', weekStr), data.logs || []);
                await this.applyShardToLocalDb(this.getFilePathForData('review', weekStr), data.reviews || []);
            }
        } catch (e) {
            console.error(`Failed to migrate ${fileName}`, e);
        }
    }
  }

  private async listV1Files(url: string): Promise<string[]> {
    try {
      const res = await fetch(url, { method: 'PROPFIND', headers: { 'Authorization': this.authHeader, 'Depth': '1' } });
      if (!res.ok) return [];
      const text = await res.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, 'text/xml');
      const hrefs = Array.from(xml.getElementsByTagName('href')).map(h => h.textContent || '');
      return hrefs
        .map(h => decodeURIComponent(h).split('/').pop() || '')
        .filter(f => f.startsWith('data_') && f.endsWith('.json'));
    } catch (e) {
      return [];
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'PROPFIND',
        headers: { 'Authorization': this.authHeader, 'Depth': '0' }
      });
      return response.status < 400;
    } catch (e) {
      return false;
    }
  }

  private async createFolderIfNotExists(url: string) {
    const check = await fetch(url, {
      method: 'PROPFIND',
      headers: { 'Authorization': this.authHeader, 'Depth': '0' }
    });
    if (check.status === 404) {
      await fetch(url, {
        method: 'MKCOL',
        headers: { 'Authorization': this.authHeader }
      });
    }
  }
}

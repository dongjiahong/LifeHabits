import { db } from '../db';
import { WebDAVService, getWebDAVService } from './webdavService';

/**
 * 自动同步服务
 * 
 * 功能：
 * 1. 监听数据库变化，变更后 debounce 自动同步
 * 2. 监听页面可见性，切回时自动下载
 * 3. 应用启动时执行初始同步
 */
class AutoSyncServiceClass {
  private debounceTimer: number | null = null;
  private isEnabled: boolean = false;
  private debounceMs: number = 3000;
  private isSyncing: boolean = false;
  private visibilityHandler: (() => void) | null = null;
  private hookCleanups: (() => void)[] = [];
  
  // 同步状态变化回调，用于 UI 更新
  private onSyncStatusChange: ((syncing: boolean) => void) | null = null;

  /**
   * 启动自动同步服务
   */
  async start(debounceMs?: number): Promise<void> {
    if (this.isEnabled) return;
    
    this.isEnabled = true;
    this.debounceMs = debounceMs ?? 3000;
    
    console.log('[AutoSync] 服务已启动, debounce:', this.debounceMs, 'ms');
    
    // 设置数据库变化监听
    this.setupDbHooks();
    
    // 设置页面可见性监听
    this.setupVisibilityListener();
    
    // 执行初始同步
    await this.performSync();
  }

  /**
   * 停止自动同步服务
   */
  stop(): void {
    if (!this.isEnabled) return;
    
    this.isEnabled = false;
    
    // 清除 debounce 定时器
    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    
    // 清除数据库 hooks
    this.hookCleanups.forEach(cleanup => cleanup());
    this.hookCleanups = [];
    
    // 清除可见性监听
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
    
    console.log('[AutoSync] 服务已停止');
  }

  /**
   * 设置同步状态变化回调
   */
  setOnSyncStatusChange(callback: ((syncing: boolean) => void) | null): void {
    this.onSyncStatusChange = callback;
  }

  /**
   * 触发同步（带 debounce）
   */
  triggerSync(): void {
    if (!this.isEnabled) return;
    
    // 清除之前的定时器
    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
    }
    
    // 设置新的定时器
    this.debounceTimer = window.setTimeout(() => {
      this.debounceTimer = null;
      this.performSync();
    }, this.debounceMs);
    
    console.log('[AutoSync] 数据变化，将在', this.debounceMs, 'ms 后同步');
  }

  /**
   * 执行同步
   */
  private async performSync(): Promise<void> {
    if (this.isSyncing) {
      console.log('[AutoSync] 已有同步进行中，跳过');
      return;
    }

    const service = await getWebDAVService();
    if (!service) {
      console.log('[AutoSync] WebDAV 未配置，跳过同步');
      return;
    }

    this.isSyncing = true;
    this.onSyncStatusChange?.(true);
    
    try {
      console.log('[AutoSync] 开始同步...');
      const result = await service.sync();
      console.log('[AutoSync] 同步完成:', result);
      
      // 更新最后同步时间
      const settings = await db.settings.toArray();
      if (settings.length > 0) {
        await db.settings.update(settings[0].id!, { lastSyncTime: Date.now() });
      }
    } catch (e: any) {
      console.error('[AutoSync] 同步失败:', e.message);
    } finally {
      this.isSyncing = false;
      this.onSyncStatusChange?.(false);
    }
  }

  /**
   * 设置数据库变化监听
   */
  private setupDbHooks(): void {
    const tables = [db.tasks, db.habits, db.habitLogs, db.logs, db.reviews, db.templates, db.projects, db.bigGoals, db.smallGoals];
    
    for (const table of tables) {
      // 监听创建
      const createHook = () => this.triggerSync();
      table.hook('creating', createHook);
      this.hookCleanups.push(() => table.hook('creating').unsubscribe(createHook));
      
      // 监听更新
      const updateHook = () => this.triggerSync();
      table.hook('updating', updateHook);
      this.hookCleanups.push(() => table.hook('updating').unsubscribe(updateHook));
      
      // 监听删除
      const deleteHook = () => this.triggerSync();
      table.hook('deleting', deleteHook);
      this.hookCleanups.push(() => table.hook('deleting').unsubscribe(deleteHook));
    }
    
    console.log('[AutoSync] 数据库 hooks 已设置');
  }

  /**
   * 设置页面可见性监听
   */
  private setupVisibilityListener(): void {
    this.visibilityHandler = () => {
      if (document.visibilityState === 'visible' && this.isEnabled) {
        console.log('[AutoSync] 页面变为可见，触发同步');
        this.performSync();
      }
    };
    
    document.addEventListener('visibilitychange', this.visibilityHandler);
    console.log('[AutoSync] 可见性监听已设置');
  }

  /**
   * 获取当前同步状态
   */
  getIsSyncing(): boolean {
    return this.isSyncing;
  }

  /**
   * 获取是否启用
   */
  getIsEnabled(): boolean {
    return this.isEnabled;
  }
}

// 导出单例
export const AutoSyncService = new AutoSyncServiceClass();

/**
 * 根据设置初始化自动同步服务
 */
export async function initAutoSync(): Promise<void> {
  const settings = await db.settings.toArray();
  if (settings.length > 0 && settings[0].autoSyncEnabled) {
    const debounceMs = settings[0].autoSyncDebounceMs ?? 3000;
    await AutoSyncService.start(debounceMs);
  }
}

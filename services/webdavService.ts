import { db } from "../db";
import {
  AppSettings,
  Task,
  AccountLog,
  Review,
  Habit,
  HabitLog,
} from "../types";
import { getWeekStr } from "../utils";

export interface SyncManifest {
  version: number;
  lastUpdated: number;
  files: {
    [filePath: string]: {
      updatedAt: number;
      size?: number;
    };
  };
}

export interface SyncAction {
  type: "upload" | "download" | "noop";
  filePath: string;
}

const DATA_ROOT = "life-habits-data/";
const MANIFEST_FILE = DATA_ROOT + "sync-manifest.json";

export async function getWebDAVService(): Promise<WebDAVService | null> {
  const settings = await db.settings.toArray();
  if (
    settings.length > 0 &&
    settings[0].webdavUrl &&
    settings[0].webdavUsername &&
    settings[0].webdavPassword
  ) {
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
    this.authHeader = `Basic ${btoa(
      `${config.webdavUsername}:${config.webdavPassword}`
    )}`;
    this.baseUrl = config.webdavUrl.trim().replace(/\/?$/, "/");
  }

  async fetchManifest(): Promise<SyncManifest | null> {
    try {
      const response = await fetch(this.baseUrl + MANIFEST_FILE, {
        headers: { Authorization: this.authHeader },
      });
      if (response.status === 404) return null;
      if (!response.ok)
        throw new Error(`Failed to fetch manifest: ${response.status}`);
      return await response.json();
    } catch (e) {
      console.error("fetchManifest error:", e);
      return null;
    }
  }

  async updateManifest(manifest: SyncManifest): Promise<void> {
    await this.createFolderIfNotExists(this.baseUrl + DATA_ROOT);
    const response = await fetch(this.baseUrl + MANIFEST_FILE, {
      method: "PUT",
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(manifest),
    });
    if (!response.ok) {
      throw new Error(`Failed to update manifest: ${response.status}`);
    }
  }

  async generateManifestFromLocalDB(): Promise<SyncManifest> {
    const manifest: SyncManifest = {
      version: 3, // Version 3: String IDs (UUID)
      lastUpdated: Date.now(),
      files: {},
    };

    const updateFileMax = (path: string, updatedAt: number) => {
      if (!manifest.files[path] || updatedAt > manifest.files[path].updatedAt) {
        manifest.files[path] = { updatedAt };
      }
    };

    const lastTask = await db.tasks.orderBy("updatedAt").last();
    if (lastTask?.updatedAt)
      updateFileMax(this.getFilePathForData("todo"), lastTask.updatedAt);

    const lastHabit = await db.habits.orderBy("updatedAt").last();
    const lastHabitLog = await db.habitLogs.orderBy("updatedAt").last();
    const habitMax = Math.max(
      lastHabit?.updatedAt || 0,
      lastHabitLog?.updatedAt || 0
    );
    if (habitMax > 0) updateFileMax(this.getFilePathForData("habit"), habitMax);

    await db.logs.each((log) => {
      const path = this.getFilePathForData("accounting", log.date);
      if (log.updatedAt) updateFileMax(path, log.updatedAt);
    });

    await db.reviews.each((review) => {
      const path = this.getFilePathForData("review", review.date);
      if (review.updatedAt) updateFileMax(path, review.updatedAt);
    });

    const lastTpl = await db.templates.orderBy("updatedAt").last();
    if (lastTpl?.updatedAt)
      updateFileMax(this.getFilePathForData("template"), lastTpl.updatedAt);

    const lastProj = await db.projects.orderBy("updatedAt").last();
    const lastBG = await db.bigGoals.orderBy("updatedAt").last();
    const lastSG = await db.smallGoals.orderBy("updatedAt").last();
    const projMax = Math.max(
      lastProj?.updatedAt || 0,
      lastBG?.updatedAt || 0,
      lastSG?.updatedAt || 0
    );
    if (projMax > 0) updateFileMax(this.getFilePathForData("project"), projMax);

    return manifest;
  }

  determineSyncActions(
    local: SyncManifest,
    remote: SyncManifest | null
  ): SyncAction[] {
    if (!remote) {
      return Object.keys(local.files).map((filePath) => ({
        type: "upload",
        filePath,
      }));
    }

    const actions: SyncAction[] = [];
    const allPaths = new Set([
      ...Object.keys(local.files),
      ...Object.keys(remote.files),
    ]);

    for (const filePath of allPaths) {
      const localFile = local.files[filePath];
      const remoteFile = remote.files[filePath];

      if (!remoteFile) {
        actions.push({ type: "upload", filePath });
      } else if (!localFile) {
        actions.push({ type: "download", filePath });
      } else if (localFile.updatedAt > remoteFile.updatedAt) {
        actions.push({ type: "upload", filePath });
      } else if (remoteFile.updatedAt > localFile.updatedAt) {
        actions.push({ type: "download", filePath });
      } else {
        actions.push({ type: "noop", filePath });
      }
    }
    return actions;
  }

  async sync(): Promise<string> {
    const remoteManifest = await this.fetchManifest();

    // Check version compatibility
    if (remoteManifest && remoteManifest.version < 3) {
      console.warn(
        "Remote data is older version (number IDs). Ignoring/Overwriting for V3 (string IDs)."
      );
    }

    let downloadCount = 0;
    let uploadCount = 0;

    // 关键修复：始终先下载远程数据并合并，再上传合并后的结果
    // 这确保了不同设备创建的记录（即使内容相同但ID不同）都能正确保留
    const criticalPaths = [
      this.getFilePathForData("todo"),
      this.getFilePathForData("habit"),
      this.getFilePathForData("project"),
      this.getFilePathForData("template"),
    ];

    // 1. 下载所有 critical path 的远程数据并合并到本地
    for (const path of criticalPaths) {
      if (remoteManifest?.files[path]) {
        await this.downloadAndApply(path);
        downloadCount++;
      }
    }

    // 同步当前周和上一周的账目和回顾数据
    const today = new Date().toISOString().split("T")[0];
    const currentWeek = getWeekStr(today);
    const prevDate = new Date();
    prevDate.setDate(prevDate.getDate() - 7);
    const prevWeek = getWeekStr(prevDate.toISOString().split("T")[0]);

    const weeklyPaths = [
      this.getFilePathForData("accounting", currentWeek),
      this.getFilePathForData("accounting", prevWeek),
      this.getFilePathForData("review", currentWeek),
      this.getFilePathForData("review", prevWeek),
    ];

    for (const path of weeklyPaths) {
      if (remoteManifest?.files[path]) {
        await this.downloadAndApply(path);
        downloadCount++;
      }
    }

    // 2. 上传合并后的本地数据
    for (const path of criticalPaths) {
      await this.uploadShard(path);
      uploadCount++;
    }

    // 上传当前周和上周的账目和回顾
    for (const path of weeklyPaths) {
      await this.uploadShard(path);
      uploadCount++;
    }

    // 更新 manifest
    const finalManifest = await this.generateManifestFromLocalDB();
    await this.updateManifest(finalManifest);

    if (downloadCount === 0 && uploadCount === 0) return "数据已是最新";
    return `同步完成！下载并合并了 ${downloadCount} 个分片，上传了 ${uploadCount} 个分片。`;
  }

  async lazyDownloadIfNeeded(weekStr: string): Promise<void> {
    const remoteManifest = await this.fetchManifest();
    if (!remoteManifest) return;

    const paths = [
      this.getFilePathForData("accounting", weekStr),
      this.getFilePathForData("review", weekStr),
    ];

    const localManifest = await this.generateManifestFromLocalDB();

    for (const path of paths) {
      const remoteFile = remoteManifest.files[path];
      const localFile = localManifest.files[path];

      if (
        remoteFile &&
        (!localFile || remoteFile.updatedAt > localFile.updatedAt)
      ) {
        await this.downloadAndApply(path);
      }
    }
  }

  getFilePathForData(
    type: "todo" | "habit" | "accounting" | "review" | "template" | "project",
    dateOrWeek?: string
  ): string {
    let path = "";
    switch (type) {
      case "todo":
        path = "todo/all.json";
        break;
      case "habit":
        path = "habits/all.json";
        break;
      case "project":
        path = "projects/all.json";
        break;
      case "template":
        path = "reviews/templates.json";
        break;
      case "accounting":
        const week = dateOrWeek?.includes("-W")
          ? dateOrWeek
          : getWeekStr(dateOrWeek!);
        path = `accounting/${week}.json`;
        break;
      case "review":
        const rWeek = dateOrWeek?.includes("-W")
          ? dateOrWeek
          : getWeekStr(dateOrWeek!);
        path = `reviews/${rWeek}.json`;
        break;
    }
    return DATA_ROOT + path;
  }

  private isCriticalPath(filePath: string): boolean {
    const todoPath = this.getFilePathForData("todo");
    const habitPath = this.getFilePathForData("habit");
    const projectPath = this.getFilePathForData("project");
    const templatePath = this.getFilePathForData("template");

    if (
      filePath === todoPath ||
      filePath === habitPath ||
      filePath === projectPath ||
      filePath === templatePath
    )
      return true;

    const today = new Date().toISOString().split("T")[0];
    const currentWeek = getWeekStr(today);
    const prevDate = new Date();
    prevDate.setDate(prevDate.getDate() - 7);
    const prevWeek = getWeekStr(prevDate.toISOString().split("T")[0]);

    return filePath.includes(currentWeek) || filePath.includes(prevWeek);
  }

  private async downloadAndApply(filePath: string) {
    const res = await fetch(this.baseUrl + filePath, {
      headers: { Authorization: this.authHeader },
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
    const parts = filePath.split("/");
    if (parts.length > 1) {
      let currentPath = "";
      for (let i = 0; i < parts.length - 1; i++) {
        currentPath += parts[i] + "/";
        await this.createFolderIfNotExists(this.baseUrl + currentPath);
      }
    }

    const res = await fetch(this.baseUrl + filePath, {
      method: "PUT",
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to upload ${filePath}: ${res.status}`);
  }

  private async getShardDataFromDb(filePath: string): Promise<any> {
    if (filePath === this.getFilePathForData("todo"))
      return await db.tasks.toArray();
    if (filePath === this.getFilePathForData("habit")) {
      return {
        habits: await db.habits.toArray(),
        habitLogs: await db.habitLogs.toArray(),
      };
    }
    if (filePath === this.getFilePathForData("project")) {
      return {
        projects: await db.projects.toArray(),
        bigGoals: await db.bigGoals.toArray(),
        smallGoals: await db.smallGoals.toArray(),
      };
    }
    if (filePath === this.getFilePathForData("template"))
      return await db.templates.toArray();

    if (filePath.includes("accounting/")) {
      const week = filePath.match(/accounting\/(.*)\.json/)?.[1];
      if (!week) return null;
      return await db.logs.filter((l) => getWeekStr(l.date) === week).toArray();
    }

    if (filePath.includes("reviews/")) {
      const week = filePath.match(/reviews\/(.*)\.json/)?.[1];
      if (!week) return null;
      return await db.reviews
        .filter((r) => getWeekStr(r.date) === week)
        .toArray();
    }
    return null;
  }

  private async applyShardToLocalDb(filePath: string, remoteData: any) {
    if (filePath === this.getFilePathForData("habit")) {
      await this.lwwSyncTable(db.habits, remoteData.habits || []);
      await this.lwwSyncTable(db.habitLogs, remoteData.habitLogs || []);
      return;
    }

    if (filePath === this.getFilePathForData("project")) {
      await this.lwwSyncTable(db.projects, remoteData.projects || []);
      await this.lwwSyncTable(db.bigGoals, remoteData.bigGoals || []);
      await this.lwwSyncTable(db.smallGoals, remoteData.smallGoals || []);
      return;
    }

    let table: any = null;
    if (filePath === this.getFilePathForData("todo")) table = db.tasks;
    else if (filePath.includes("accounting/")) table = db.logs;
    else if (filePath === this.getFilePathForData("template"))
      table = db.templates;
    else if (filePath.includes("reviews/")) table = db.reviews;

    if (table && Array.isArray(remoteData)) {
      await this.lwwSyncTable(table, remoteData);
    }
  }

  private async lwwSyncTable(table: any, remoteItems: any[]) {
    console.log(
      `[WebDAV] Starting sync for table: ${table.name}, count: ${remoteItems.length}`
    );
    await db.transaction("rw", table, async () => {
      for (const remoteItem of remoteItems) {
        if (!remoteItem.id) continue; // Skip invalid items

        const localItem = await table.get(remoteItem.id);

        if (!localItem) {
          // 本地不存在，使用 put 替代 add 确保幂等性（避免并发冲突）
          try {
            await table.put(remoteItem);
          } catch (e: any) {
            console.error(`[WebDAV] Sync Put Error on ${table.name}:`, {
              item: remoteItem,
              error: e,
            });
          }
        } else if (remoteItem.updatedAt > (localItem.updatedAt || 0)) {
          // 远程更新，覆盖本地
          try {
            await table.put(remoteItem);
          } catch (e: any) {
            console.error(`[WebDAV] Sync Update Error on ${table.name}:`, {
              id: localItem.id,
              item: remoteItem,
              error: e,
            });
          }
        }
        // 否则：本地更新或相同，保持本地版本不变
      }
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(this.baseUrl, {
        method: "PROPFIND",
        headers: { Authorization: this.authHeader, Depth: "0" },
      });
      return response.status < 400;
    } catch (e) {
      return false;
    }
  }

  private async createFolderIfNotExists(url: string) {
    const check = await fetch(url, {
      method: "PROPFIND",
      headers: { Authorization: this.authHeader, Depth: "0" },
    });
    if (check.status === 404) {
      await fetch(url, {
        method: "MKCOL",
        headers: { Authorization: this.authHeader },
      });
    }
  }
}

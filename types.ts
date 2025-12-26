export enum TaskStatus {
  PENDING = 0,
  COMPLETED = 1,
}

export enum ProjectStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  DELAYED = 'DELAYED',
}

export interface Task {
  id?: number;
  title: string;
  status: TaskStatus;
  date: string; // YYYY-MM-DD
  isPriority: boolean; // 是否为最重要的5件事之一
  createdAt: number;
  updatedAt?: number;
  isDeleted?: boolean;
  // 项目关联
  projectId?: number;
  bigGoalId?: number;
  smallGoalId?: number;
}

export interface Project {
  id?: number;
  name: string;
  description?: string; // 支持 Markdown
  status: ProjectStatus;
  startDate?: string;
  endDate?: string;
  progress: number; // 0-100
  createdAt: number;
  updatedAt?: number;
  isDeleted?: boolean;
}

export interface BigGoal {
  id?: number;
  projectId: number;
  name: string;
  description?: string;
  status: ProjectStatus;
  startDate?: string;
  endDate?: string;
  progress: number; // 0-100
  isMilestone?: boolean;
  createdAt: number;
  updatedAt?: number;
  isDeleted?: boolean;
}

export interface SmallGoal {
  id?: number;
  projectId: number;
  bigGoalId: number;
  name: string;
  description?: string;
  status: ProjectStatus;
  startDate?: string;
  endDate?: string;
  progress: number; // 0-100
  isMilestone: boolean;
  createdAt: number;
  updatedAt?: number;
  isDeleted?: boolean;
}

export enum LogType {
  TIME = 'TIME',
  MONEY = 'MONEY',
}

export interface AccountLog {
  id?: number;
  type: LogType;
  name: string; // 事项名称 或 消费原因
  value: number; // 分钟数 或 金额
  date: string;
  createdAt: number;
  updatedAt?: number;
  isDeleted?: boolean;
}

export interface ReviewTemplate {
  id?: number;
  name: string;
  questions: string[]; // 问题数组
  isDefault?: boolean;
  createdAt?: number; // Add createdAt if missing, seemingly missing in original
  updatedAt?: number;
  isDeleted?: boolean;
}

export interface Review {
  id?: number;
  date: string;
  templateId?: number; // 使用的模版ID
  templateName: string; // 当时使用的模版名称（快照）
  answers: { question: string; answer: string }[]; // 问题和答案的键值对，替代原来的固定字段
  aiSummary?: string; // AI 生成的总结
  createdAt: number;
  updatedAt?: number;
  isDeleted?: boolean;
  
  // 兼容旧数据字段 (可选)
  done?: string;
  problems?: string;
  solutions?: string;
  insights?: string;
  otherNotes?: string;
  // Make these optional as they are legacy
}

export interface AppSettings {
  id?: number;
  aiProvider: 'gemini' | 'openai';
  
  // Gemini Config
  geminiKey?: string;
  geminiModel: string;

  // OpenAI Config
  openaiUrl?: string;
  openaiKey?: string;
  openaiModel?: string;

  // WebDAV Config
  webdavUrl?: string;
  webdavUsername?: string;
  webdavPassword?: string;
  lastSyncTime?: number;
}

export interface Habit {
  id?: number;
  name: string;
  icon: string; // Emoji
  greenBeans: number; // 成功次数
  redBeans: number; // 失败次数
  isArchived: boolean; // 是否已养成/归档
  createdAt: number;
  updatedAt?: number;
  isDeleted?: boolean;
}

export interface HabitLog {
  id?: number;
  habitId: number;
  type: 'green' | 'red';
  date: string;
  createdAt: number;
  updatedAt?: number;
  isDeleted?: boolean;
}

export type TabView = 'todo' | 'accounting' | 'review' | 'habits' | 'settings' | 'projects';
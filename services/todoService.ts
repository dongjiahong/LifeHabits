import { nanoid } from 'nanoid';
import { db } from '../db';
import { Task, TaskStatus } from '../types';
import { calculateProjectProgress } from './projectService';

export async function addTask(task: Omit<Task, 'id'>): Promise<string> {
    const id = nanoid();
    const newTask = {
        ...task,
        id,
        createdAt: task.createdAt || Date.now(),
        updatedAt: Date.now(),
        isDeleted: false
    };
    await db.tasks.add(newTask);
    if (task.projectId) {
        await calculateProjectProgress(task.projectId);
    }
    return id;
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<void> {
    await db.tasks.update(id, {
        ...updates,
        updatedAt: Date.now()
    });
    const task = await db.tasks.get(id);
    if (task?.projectId) {
        await calculateProjectProgress(task.projectId);
    }
}

export async function deleteTask(id: string): Promise<void> {
    const task = await db.tasks.get(id);
    await db.tasks.update(id, {
        isDeleted: true,
        updatedAt: Date.now()
    });
    if (task?.projectId) {
        await calculateProjectProgress(task.projectId);
    }
}

export async function getTasks(date: string, includeOverdue: boolean = false): Promise<Task[]> {
    let tasks = await db.tasks
        .where('date').equals(date)
        .filter(t => !t.isDeleted)
        .toArray();

    if (includeOverdue) {
        const overdueTasks = await db.tasks
            .where('date').below(date)
            .filter(t => !t.isDeleted && t.status === TaskStatus.PENDING)
            .toArray();
        
        // 合并并去重（防止某些边界情况）
        const taskIds = new Set(tasks.map(t => t.id));
        const uniqueOverdue = overdueTasks.filter(t => !taskIds.has(t.id));
        tasks = [...uniqueOverdue, ...tasks];
    }

    return tasks;
}
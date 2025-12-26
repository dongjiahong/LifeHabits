import { db } from '../db';
import { Task, TaskStatus } from '../types';

export async function addTask(task: Omit<Task, 'id'>): Promise<number> {
    const newTask = {
        ...task,
        createdAt: task.createdAt || Date.now(),
        updatedAt: Date.now(),
        isDeleted: false
    };
    return await db.tasks.add(newTask);
}

export async function updateTask(id: number, updates: Partial<Task>): Promise<void> {
    await db.tasks.update(id, {
        ...updates,
        updatedAt: Date.now()
    });
}

export async function deleteTask(id: number): Promise<void> {
    await db.tasks.update(id, {
        isDeleted: true,
        updatedAt: Date.now()
    });
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
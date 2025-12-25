import { db } from '../db';
import { Task } from '../types';

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

export async function getTasks(date: string): Promise<Task[]> {
    return await db.tasks
        .where('date').equals(date)
        .filter(t => !t.isDeleted)
        .toArray();
}
import { nanoid } from 'nanoid';
import { Review, ReviewTemplate } from '../types';
import { db } from '../db';

export async function addReview(review: Omit<Review, 'id'>): Promise<string> {
    const id = nanoid();
    const newReview = {
        ...review,
        id,
        createdAt: review.createdAt || Date.now(),
        updatedAt: Date.now(),
        isDeleted: false
    };
    await db.reviews.add(newReview);
    return id;
}

export async function updateReview(id: string, updates: Partial<Review>): Promise<void> {
    await db.reviews.update(id, {
        ...updates,
        updatedAt: Date.now()
    });
}

export async function getReviewByDate(date: string): Promise<Review | undefined> {
    return await db.reviews
        .where('date').equals(date)
        .filter(r => !r.isDeleted)
        .first();
}

export async function getReviews(): Promise<Review[]> {
    return await db.reviews
        .orderBy('date').reverse()
        .filter(r => !r.isDeleted)
        .toArray();
}

export async function addTemplate(template: Omit<ReviewTemplate, 'id'>): Promise<string> {
    const id = nanoid();
    const newTemplate = {
        ...template,
        id,
        createdAt: template.createdAt || Date.now(),
        updatedAt: Date.now(),
        isDeleted: false
    };
    await db.templates.add(newTemplate);
    return id;
}

export async function getTemplates(): Promise<ReviewTemplate[]> {
    return await db.templates
        .filter(t => !t.isDeleted)
        .toArray();
}
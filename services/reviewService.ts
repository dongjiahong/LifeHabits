import { Review, ReviewTemplate } from '../types';
import { db } from '../db';

export async function addReview(review: Omit<Review, 'id'>): Promise<number> {
    const newReview = {
        ...review,
        createdAt: review.createdAt || Date.now(),
        updatedAt: Date.now(),
        isDeleted: false
    };
    return await db.reviews.add(newReview);
}

export async function updateReview(id: number, updates: Partial<Review>): Promise<void> {
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

export async function addTemplate(template: Omit<ReviewTemplate, 'id'>): Promise<number> {
    const newTemplate = {
        ...template,
        createdAt: template.createdAt || Date.now(),
        updatedAt: Date.now(),
        isDeleted: false
    };
    return await db.templates.add(newTemplate);
}

export async function getTemplates(): Promise<ReviewTemplate[]> {
    return await db.templates
        .filter(t => !t.isDeleted)
        .toArray();
}
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import { clearDatabase } from './db-test-utils';
import { addReview, updateReview, getReviewByDate, getReviews, addTemplate, getTemplates } from '../services/reviewService';

describe('Review Service DAO', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it('should add and get a review', async () => {
    await addReview({
        date: '2025-12-25',
        templateName: 'Daily',
        answers: [],
        createdAt: Date.now()
    });

    const review = await getReviewByDate('2025-12-25');
    expect(review).toBeDefined();
    expect(review?.templateName).toBe('Daily');
  });

  it('should get all reviews (history)', async () => {
    await addReview({ date: '2025-12-24', templateName: 'A', answers: [], createdAt: Date.now() });
    await addReview({ date: '2025-12-25', templateName: 'B', answers: [], createdAt: Date.now() });

    const reviews = await getReviews();
    expect(reviews.length).toBe(2);
    expect(reviews[0].date).toBe('2025-12-25'); // Reverse order
  });

  it('should manage templates', async () => {
    await addTemplate({ name: 'T1', questions: ['Q1'] });
    const templates = await getTemplates();
    // clearDatabase clears tables.
    const myTemplate = templates.find(t => t.name === 'T1');
    expect(myTemplate).toBeDefined();
    expect(myTemplate?.isDeleted).toBe(false);
  });
});

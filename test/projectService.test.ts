import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import { clearDatabase } from './db-test-utils';
import { 
  addProject, getProjects, updateProject, deleteProject,
  addBigGoal, getBigGoals, updateBigGoal, deleteBigGoal,
  addSmallGoal, getSmallGoals, updateSmallGoal, deleteSmallGoal,
  calculateProjectProgress
} from '../services/projectService';
import { ProjectStatus, TaskStatus } from '../types';

describe('Project Service', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  describe('Project CRUD', () => {
    it('should add a project', async () => {
      const id = await addProject({ 
        name: 'Project 1', 
        status: ProjectStatus.IN_PROGRESS, 
        progress: 0, 
        createdAt: Date.now() 
      });
      const project = await db.projects.get(id);
      expect(project).toBeDefined();
      expect(project?.name).toBe('Project 1');
    });

    it('should get all active projects', async () => {
      await addProject({ name: 'P1', status: ProjectStatus.IN_PROGRESS, progress: 0, createdAt: Date.now() });
      const id2 = await addProject({ name: 'P2', status: ProjectStatus.IN_PROGRESS, progress: 0, createdAt: Date.now() });
      await deleteProject(id2);

      const projects = await getProjects();
      expect(projects.length).toBe(1);
      expect(projects[0].name).toBe('P1');
    });

    it('should update a project', async () => {
      const id = await addProject({ name: 'Old Name', status: ProjectStatus.IN_PROGRESS, progress: 0, createdAt: Date.now() });
      await updateProject(id, { name: 'New Name' });
      const project = await db.projects.get(id);
      expect(project?.name).toBe('New Name');
    });
  });

  describe('Goal CRUD', () => {
    it('should add big goals and small goals', async () => {
      const projectId = await addProject({ name: 'P1', status: ProjectStatus.IN_PROGRESS, progress: 0, createdAt: Date.now() });
      
      const bigGoalId = await addBigGoal({ 
        projectId, 
        name: 'BG1', 
        status: ProjectStatus.IN_PROGRESS, 
        progress: 0, 
        createdAt: Date.now() 
      });
      
      const smallGoalId = await addSmallGoal({ 
        projectId, 
        bigGoalId, 
        name: 'SG1', 
        status: ProjectStatus.IN_PROGRESS, 
        progress: 0, 
        isMilestone: true, 
        createdAt: Date.now() 
      });

      const bigGoals = await getBigGoals(projectId);
      expect(bigGoals.length).toBe(1);
      expect(bigGoals[0].name).toBe('BG1');

      const smallGoals = await getSmallGoals(bigGoalId);
      expect(smallGoals.length).toBe(1);
      expect(smallGoals[0].name).toBe('SG1');
      expect(smallGoals[0].isMilestone).toBe(true);
    });

    it('should update and delete goals', async () => {
      const projectId = await addProject({ name: 'P1', status: ProjectStatus.IN_PROGRESS, progress: 0, createdAt: Date.now() });
      const bigGoalId = await addBigGoal({ projectId, name: 'BG1', status: ProjectStatus.IN_PROGRESS, progress: 0, createdAt: Date.now() });
      const smallGoalId = await addSmallGoal({ projectId, bigGoalId, name: 'SG1', status: ProjectStatus.IN_PROGRESS, progress: 0, isMilestone: false, createdAt: Date.now() });

      await updateBigGoal(bigGoalId, { name: 'New BG' });
      const bg = await db.bigGoals.get(bigGoalId);
      expect(bg?.name).toBe('New BG');

      await updateSmallGoal(smallGoalId, { name: 'New SG' });
      const sg = await db.smallGoals.get(smallGoalId);
      expect(sg?.name).toBe('New SG');

      await deleteSmallGoal(smallGoalId);
      const smallGoals = await getSmallGoals(bigGoalId);
      expect(smallGoals.length).toBe(0);

      await deleteBigGoal(bigGoalId);
      const bigGoals = await getBigGoals(projectId);
      expect(bigGoals.length).toBe(0);
    });
  });

  describe('Progress Calculation', () => {
    it('should calculate progress based on tasks and sub-goals', async () => {
      const projectId = await addProject({ name: 'P1', status: ProjectStatus.IN_PROGRESS, progress: 0, createdAt: Date.now() });
      const bigGoalId = await addBigGoal({ projectId, name: 'BG1', status: ProjectStatus.IN_PROGRESS, progress: 0, createdAt: Date.now() });
      const smallGoalId = await addSmallGoal({ projectId, bigGoalId, name: 'SG1', status: ProjectStatus.IN_PROGRESS, progress: 0, isMilestone: false, createdAt: Date.now() });

      // Add tasks to small goal
      await db.tasks.add({ 
        title: 'T1', 
        status: TaskStatus.COMPLETED, 
        projectId, bigGoalId, smallGoalId, 
        date: '2025-12-26', isPriority: false, createdAt: Date.now() 
      });
      await db.tasks.add({ 
        title: 'T2', 
        status: TaskStatus.PENDING, 
        projectId, bigGoalId, smallGoalId, 
        date: '2025-12-26', isPriority: false, createdAt: Date.now() 
      });

      // Calculate progress
      await calculateProjectProgress(projectId);

      const smallGoal = await db.smallGoals.get(smallGoalId);
      expect(smallGoal?.progress).toBe(50);

      const bigGoal = await db.bigGoals.get(bigGoalId);
      expect(bigGoal?.progress).toBe(50);

      const project = await db.projects.get(projectId);
      expect(project?.progress).toBe(50);
    });
  });
});

import { db } from '../db';
import { Project, BigGoal, SmallGoal, ProjectStatus, TaskStatus } from '../types';

// Projects
export async function addProject(project: Omit<Project, 'id'>) {
  const newProject = {
    ...project,
    updatedAt: Date.now(),
    isDeleted: false
  };
  return await db.projects.add(newProject as Project);
}

export async function getProjects() {
  return await db.projects.filter(p => !p.isDeleted).toArray();
}

export async function updateProject(id: number, changes: Partial<Project>) {
  return await db.projects.update(id, {
    ...changes,
    updatedAt: Date.now()
  });
}

export async function deleteProject(id: number) {
  // Cascade delete big goals
  const bigGoals = await db.bigGoals.where('projectId').equals(id).toArray();
  for (const bg of bigGoals) {
    await deleteBigGoal(bg.id!);
  }

  return await db.projects.update(id, {
    isDeleted: true,
    updatedAt: Date.now()
  });
}

// Big Goals
export async function addBigGoal(goal: Omit<BigGoal, 'id'>) {
  const newGoal = {
    ...goal,
    updatedAt: Date.now(),
    isDeleted: false
  };
  return await db.bigGoals.add(newGoal as BigGoal);
}

export async function getBigGoals(projectId: number) {
  return await db.bigGoals.filter(g => g.projectId === projectId && !g.isDeleted).toArray();
}

export async function updateBigGoal(id: number, changes: Partial<BigGoal>) {
  return await db.bigGoals.update(id, {
    ...changes,
    updatedAt: Date.now()
  });
}

export async function deleteBigGoal(id: number) {
  // Cascade delete small goals
  const smallGoals = await db.smallGoals.where('bigGoalId').equals(id).toArray();
  for (const sg of smallGoals) {
    await deleteSmallGoal(sg.id!);
  }

  return await db.bigGoals.update(id, {
    isDeleted: true,
    updatedAt: Date.now()
  });
}

// Small Goals
export async function addSmallGoal(goal: Omit<SmallGoal, 'id'>) {
  const newGoal = {
    ...goal,
    updatedAt: Date.now(),
    isDeleted: false
  };
  return await db.smallGoals.add(newGoal as SmallGoal);
}

export async function getSmallGoals(bigGoalId: number) {
  return await db.smallGoals.filter(g => g.bigGoalId === bigGoalId && !g.isDeleted).toArray();
}

export async function updateSmallGoal(id: number, changes: Partial<SmallGoal>) {
  return await db.smallGoals.update(id, {
    ...changes,
    updatedAt: Date.now()
  });
}

export async function deleteSmallGoal(id: number) {
  // Cascade delete tasks
  await db.tasks
    .where('smallGoalId')
    .equals(id)
    .modify({ isDeleted: true, updatedAt: Date.now() });

  return await db.smallGoals.update(id, {
    isDeleted: true,
    updatedAt: Date.now()
  });
}

// Progress Calculation
export async function calculateProjectProgress(projectId: number) {
  const bigGoals = await getBigGoals(projectId);
  
  for (const bg of bigGoals) {
    const smallGoals = await getSmallGoals(bg.id!);
    
    for (const sg of smallGoals) {
      const tasks = await db.tasks
        .where('smallGoalId')
        .equals(sg.id!)
        .filter(t => !t.isDeleted)
        .toArray();
      
      if (tasks.length > 0) {
        const completedTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED).length;
        const progress = Math.round((completedTasks / tasks.length) * 100);
        await updateSmallGoal(sg.id!, { progress });
      } else {
        await updateSmallGoal(sg.id!, { progress: 0 });
      }
    }

    // Refresh small goals to get updated progress
    const updatedSmallGoals = await getSmallGoals(bg.id!);
    if (updatedSmallGoals.length > 0) {
      const avgProgress = Math.round(
        updatedSmallGoals.reduce((sum, sg) => sum + (sg.progress || 0), 0) / updatedSmallGoals.length
      );
      await updateBigGoal(bg.id!, { progress: avgProgress });
    } else {
      await updateBigGoal(bg.id!, { progress: 0 });
    }
  }

  // Final project progress
  const updatedBigGoals = await getBigGoals(projectId);
  if (updatedBigGoals.length > 0) {
    const avgProgress = Math.round(
      updatedBigGoals.reduce((sum, bg) => sum + (bg.progress || 0), 0) / updatedBigGoals.length
    );
    await updateProject(projectId, { progress: avgProgress });
  } else {
    await updateProject(projectId, { progress: 0 });
  }
}

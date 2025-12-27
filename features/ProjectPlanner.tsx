import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, CheckCircle2, Circle, Trash2, Target } from 'lucide-react';
import { Project, BigGoal, SmallGoal, Task, ProjectStatus, TaskStatus } from '../types';
import { 
  getBigGoals, addBigGoal, updateBigGoal, deleteBigGoal,
  getSmallGoals, addSmallGoal, updateSmallGoal, deleteSmallGoal,
  calculateProjectProgress
} from '../services/projectService';
import { addTask, updateTask, deleteTask } from '../services/todoService';
import { db } from '../db';
import { Button, Input, Modal, ProgressBar } from '../components/UIComponents';
import { GoalItem } from './ProjectComponents';
import { useToast } from '../components/Toast';

interface ProjectPlannerProps {
  project: Project;
  onBack: () => void;
}

export const ProjectPlanner: React.FC<ProjectPlannerProps> = ({ project, onBack }) => {
  const [bigGoals, setBigGoals] = useState<BigGoal[]>([]);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [modalContext, setModalContext] = useState<{
    type: 'big' | 'small' | 'task';
    parentId?: string;
    editingId?: string;
  } | null>(null);
  const [goalName, setGoalName] = useState('');
  const [tasks, setTasks] = useState<Record<string, Task[]>>({}); // smallGoalId -> Task[]
  
  const { showToast } = useToast();

  const loadData = async () => {
    if (!project.id) return;
    const bgs = await getBigGoals(project.id);
    setBigGoals(bgs.sort((a, b) => a.createdAt - b.createdAt));
    
    // Load all small goals and tasks in parallel for simplicity
    const taskMap: Record<string, Task[]> = {};
    for (const bg of bgs) {
      if (!bg.id) continue;
      const sgs = await getSmallGoals(bg.id);
      for (const sg of sgs) {
        if (!sg.id) continue;
        const sgTasks = await db.tasks
          .where('smallGoalId')
          .equals(sg.id)
          .filter(t => !t.isDeleted)
          .toArray();
        taskMap[sg.id] = sgTasks.sort((a, b) => a.createdAt - b.createdAt);
      }
    }
    setTasks(taskMap);
  };

  useEffect(() => {
    loadData();
  }, [project.id]);

  const handleAddBigGoal = () => {
    setModalContext({ type: 'big' });
    setGoalName('');
    setIsGoalModalOpen(true);
  };

  const handleAddSmallGoal = (bigGoalId: string) => {
    setModalContext({ type: 'small', parentId: bigGoalId });
    setGoalName('');
    setIsGoalModalOpen(true);
  };

  const handleAddTask = (smallGoalId: string) => {
    setModalContext({ type: 'task', parentId: smallGoalId });
    setGoalName('');
    setIsGoalModalOpen(true);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalName.trim() || !modalContext) return;
    if (!project.id) return;

    try {
      if (modalContext.type === 'big') {
        await addBigGoal({
          projectId: project.id,
          name: goalName,
          status: ProjectStatus.IN_PROGRESS,
          progress: 0,
          createdAt: Date.now()
        });
      } else if (modalContext.type === 'small') {
        if (!modalContext.parentId) return;
        await addSmallGoal({
          projectId: project.id,
          bigGoalId: modalContext.parentId,
          name: goalName,
          status: ProjectStatus.IN_PROGRESS,
          progress: 0,
          isMilestone: false,
          createdAt: Date.now()
        });
      } else if (modalContext.type === 'task') {
        if (!modalContext.parentId) return;
        // Find bigGoalId for this small goal
        const sg = await db.smallGoals.get(modalContext.parentId);
        await addTask({
          title: goalName,
          status: TaskStatus.PENDING,
          date: new Date().toISOString().split('T')[0],
          isPriority: false,
          projectId: project.id,
          bigGoalId: sg?.bigGoalId,
          smallGoalId: modalContext.parentId,
          createdAt: Date.now()
        });
      }
      
      setIsGoalModalOpen(false);
      loadData();
      showToast('添加成功', 'success');
    } catch (err) {
      showToast('添加失败', 'error');
    }
  };

  const toggleTaskStatus = async (task: Task) => {
    if (!task.id) return;
    const newStatus = task.status === TaskStatus.COMPLETED ? TaskStatus.PENDING : TaskStatus.COMPLETED;
    await updateTask(task.id, { status: newStatus });
    loadData(); // This will also trigger progress calculation via Service
  };

  const handleDeleteBigGoal = async (id: string) => {
    if (confirm('确定要删除这个大目标及其下属所有内容吗？')) {
      await deleteBigGoal(id);
      if (project.id) await calculateProjectProgress(project.id);
      loadData();
    }
  };

  const handleDeleteSmallGoal = async (id: string) => {
    if (confirm('确定要删除这个小目标及其任务吗？')) {
      await deleteSmallGoal(id);
      if (project.id) await calculateProjectProgress(project.id);
      loadData();
    }
  };

  const handleUpdateBigGoalTitle = async (id: string, newTitle: string) => {
    await updateBigGoal(id, { name: newTitle });
    loadData();
  };

  const handleUpdateSmallGoalTitle = async (id: string, newTitle: string) => {
    await updateSmallGoal(id, { name: newTitle });
    loadData();
  };

  const handleDeleteTask = async (taskId: string) => {
    if (confirm('确定要删除这个任务吗？')) {
      await deleteTask(taskId);
      if (project.id) await calculateProjectProgress(project.id);
      loadData();
    }
  };

  const toggleMilestone = async (sg: SmallGoal) => {
    if (!sg.id) return;
    await updateSmallGoal(sg.id, { isMilestone: !sg.isMilestone });
    loadData();
  };

  const toggleBigGoalMilestone = async (bg: BigGoal) => {
    if (!bg.id) return;
    await updateBigGoal(bg.id, { isMilestone: !bg.isMilestone });
    loadData();
  };

  return (
    <div className="animate-slide-up pb-10">
      {/* Top Bar */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-white/50 text-slate-500">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-black text-slate-800 truncate">
            {project.name} <span className="text-sm font-normal text-slate-400 ml-2">(规划视图)</span>
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <ProgressBar progress={project.progress} className="h-1.5 flex-1" />
            <span className="text-[10px] font-bold text-indigo-600">{project.progress}%</span>
          </div>
        </div>
      </div>

      {/* Big Goals List */}
      <div className="space-y-4">
        {bigGoals.length === 0 && (
          <div className="text-center py-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 mb-4">
            <Target size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm text-slate-500 mb-4">还没有制定目标计划</p>
            <Button size="sm" onClick={handleAddBigGoal}>
              <Plus size={16} className="mr-1" /> 创建第一个大目标
            </Button>
          </div>
        )}

        {bigGoals.map(bg => (
          <GoalItem 
            key={bg.id} 
            goal={bg} 
            isBig 
            onAddSub={() => bg.id && handleAddSmallGoal(bg.id)}
            onEdit={() => toggleBigGoalMilestone(bg)}
            onDelete={() => bg.id && handleDeleteBigGoal(bg.id)}
            onUpdateTitle={(title) => bg.id && handleUpdateBigGoalTitle(bg.id, title)}
          >
            {bg.id && (
              <BigGoalContent 
                bgId={bg.id} 
                project={project} 
                tasks={tasks} 
                toggleMilestone={toggleMilestone} 
                onDeleteSmallGoal={handleDeleteSmallGoal} 
                onUpdateSmallGoalTitle={handleUpdateSmallGoalTitle}
                toggleTaskStatus={toggleTaskStatus} 
                onAddTask={handleAddTask} 
                onDeleteTask={handleDeleteTask}
              />
            )}
          </GoalItem>
        ))}

        <Button 
          variant="secondary" 
          className="w-full border border-indigo-200 bg-indigo-50/50 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 py-4 shadow-sm font-bold"
          onClick={handleAddBigGoal}
        >
          <Plus size={20} className="mr-2" /> 添加新的大目标
        </Button>
      </div>

      {/* Goal Modal */}
      <Modal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        title={modalContext?.type === 'big' ? '新建大目标' : modalContext?.type === 'small' ? '新建小目标' : '新建待办任务'}
      >
        <form onSubmit={handleModalSubmit} className="space-y-4">
          <Input 
            label="名称" 
            autoFocus
            value={goalName}
            onChange={(e) => setGoalName(e.target.value)}
            placeholder={modalContext?.type === 'task' ? '要做什么...' : '输入目标名称...'}
          />
          <Button type="submit" className="w-full">确认添加</Button>
        </form>
      </Modal>
    </div>
  );
};

// Helper component for Big Goal content to manage its own small goals
const BigGoalContent: React.FC<{ 
  bgId: string, 
  project: Project, 
  tasks: Record<string, Task[]>,
  toggleMilestone: (sg: SmallGoal) => void,
  onDeleteSmallGoal: (id: string) => void,
  onUpdateSmallGoalTitle: (id: string, title: string) => void,
  toggleTaskStatus: (task: Task) => void,
  onAddTask: (id: string) => void,
  onDeleteTask: (id: string) => void
}> = ({ bgId, project, tasks, toggleMilestone, onDeleteSmallGoal, onUpdateSmallGoalTitle, toggleTaskStatus, onAddTask, onDeleteTask }) => {
  const [smallGoals, setSmallGoals] = useState<SmallGoal[]>([]);

  useEffect(() => {
    getSmallGoals(bgId).then(setSmallGoals);
  }, [bgId, tasks]); // Reload when tasks change as it might affect progress visibility

  return (
    <>
      {smallGoals.map(sg => (
        <GoalItem 
          key={sg.id} 
          goal={sg} 
          onEdit={() => toggleMilestone(sg)} 
          onDelete={() => sg.id && onDeleteSmallGoal(sg.id)}
          onUpdateTitle={(title) => sg.id && onUpdateSmallGoalTitle(sg.id, title)}
        >
          {/* Inline Task List */}
          <div className="ml-8 mt-1 space-y-2 mb-4">
            {sg.id && (tasks[sg.id] || []).map(task => (
              <div key={task.id} className="flex items-center gap-2 group">
                <button 
                  onClick={() => toggleTaskStatus(task)}
                  className={`transition-colors ${task.status === TaskStatus.COMPLETED ? 'text-emerald-500' : 'text-slate-300'}`}
                >
                  {task.status === TaskStatus.COMPLETED ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                </button>
                <span className={`text-sm flex-1 ${task.status === TaskStatus.COMPLETED ? 'text-slate-400 line-through' : 'text-slate-600'}`}>
                  {task.title}
                </span>
                <button 
                  onClick={() => task.id && onDeleteTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-rose-400 transition-opacity"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {sg.id && (
              <button 
                onClick={() => onAddTask(sg.id!)}
                className="w-full flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-indigo-600 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-lg py-2 mt-2 transition-all"
              >
                <Plus size={14} /> 添加待办任务
              </button>
            )}
          </div>
        </GoalItem>
      ))}
    </>
  );
};
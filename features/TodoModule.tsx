import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Task, TaskStatus } from '../types';
import { getTodayStr, getTomorrowStr } from '../utils';
import { Button, Input, Card } from '../components/UIComponents';
import { Plus, Check, Trash2, Calendar, Moon, Star, Flame, Circle } from 'lucide-react';

export const TodoModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'today' | 'tomorrow'>('today');
  const [newTask, setNewTask] = useState('');
  
  const currentDateStr = activeTab === 'today' ? getTodayStr() : getTomorrowStr();

  const tasks = useLiveQuery(
    () => db.tasks.where('date').equals(currentDateStr).toArray(),
    [currentDateStr]
  );

  // 分离任务列表
  const priorityTasks = tasks?.filter(t => t.isPriority) || [];
  const otherTasks = tasks?.filter(t => !t.isPriority) || [];

  const addTask = async () => {
    if (!newTask.trim()) return;
    
    // 默认如果重要任务少于5个，则自动设为重要，否则进入普通池
    const isPriority = priorityTasks.length < 5;

    await db.tasks.add({
      title: newTask.trim(),
      status: TaskStatus.PENDING,
      date: currentDateStr,
      isPriority: isPriority,
      createdAt: Date.now(),
    });
    setNewTask('');
  };

  const toggleTaskStatus = async (task: Task) => {
    if (!task.id) return;
    await db.tasks.update(task.id, {
      status: task.status === TaskStatus.PENDING ? TaskStatus.COMPLETED : TaskStatus.PENDING
    });
  };

  const togglePriority = async (task: Task) => {
    if (!task.id) return;
    
    // 如果要升级为重要任务，检查是否已满5个
    if (!task.isPriority && priorityTasks.length >= 5) {
      alert("🔥 贪多嚼不烂！每天最重要的事建议不超过 5 件。\n请先完成或移除一件重要任务。");
      return;
    }

    await db.tasks.update(task.id, {
      isPriority: !task.isPriority
    });
  };

  const deleteTask = async (id?: number) => {
    if (id) await db.tasks.delete(id);
  };

  const totalTasks = tasks?.length || 0;
  const completedCount = tasks?.filter(t => t.status === TaskStatus.COMPLETED).length || 0;
  const progress = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;

  return (
    <div className="space-y-6 pt-2">
      {/* 顶部日期与进度 */}
      <div className="flex flex-col items-center space-y-4">
        <div className="flex bg-slate-100 p-1 rounded-full mx-auto shadow-inner">
          <button
            onClick={() => setActiveTab('today')}
            className={`flex items-center px-4 py-1.5 text-xs font-bold rounded-full transition-all ${
              activeTab === 'today' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
            }`}
          >
            <Calendar size={14} className="mr-1.5" />
            今日执行
          </button>
          <button
            onClick={() => setActiveTab('tomorrow')}
            className={`flex items-center px-4 py-1.5 text-xs font-bold rounded-full transition-all ${
              activeTab === 'tomorrow' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500'
            }`}
          >
            <Moon size={14} className="mr-1.5" />
            明日规划
          </button>
        </div>

        {/* 顶部进度条 - 仅今日 */}
        {activeTab === 'today' && (
          <div className="w-2/3 max-w-[200px] bg-slate-200 rounded-full h-3 overflow-hidden shadow-inner relative">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-slate-600 mix-blend-multiply">
              {Math.round(progress)}%
            </div>
          </div>
        )}
      </div>

      {/* 输入区域 */}
      <div className="relative">
        <input 
          type="text"
          placeholder={activeTab === 'today' ? "新增什么任务？" : "规划明天..."}
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTask()}
          className="w-full h-14 pl-5 pr-14 rounded-2xl bg-white shadow-lg shadow-indigo-100 border-none outline-none text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-200 transition-all"
        />
        <button 
          onClick={addTask} 
          disabled={!newTask.trim()}
          className="absolute right-2 top-2 bottom-2 w-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 disabled:bg-slate-300"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* 核心任务区 (Top 5) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Flame size={18} className="text-orange-500 fill-orange-500" />
          <h3 className="text-sm font-bold text-slate-700">Priority Focus</h3>
          <span className="text-xs text-orange-400 bg-orange-50 px-2 py-0.5 rounded-full font-medium">
            {priorityTasks.length}/5
          </span>
        </div>
        
        {priorityTasks.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center">
            <p className="text-slate-400 text-sm">将最重要的事情设为星标 ⭐</p>
          </div>
        ) : (
          priorityTasks.map(task => (
            <TaskItem 
              key={task.id} 
              task={task} 
              onToggleStatus={() => toggleTaskStatus(task)}
              onTogglePriority={() => togglePriority(task)}
              onDelete={() => deleteTask(task.id)}
              isPriorityList={true}
            />
          ))
        )}
      </div>

      {/* 其他任务区 */}
      <div className="space-y-3 pb-8">
        <div className="flex items-center gap-2 px-1 mt-6">
          <Circle size={16} className="text-slate-400" />
          <h3 className="text-sm font-bold text-slate-500">Backlog</h3>
        </div>

        {otherTasks.length === 0 && priorityTasks.length > 0 && (
          <p className="text-center text-slate-300 text-xs py-4">所有任务都已升级为重要事项</p>
        )}

        {otherTasks.map(task => (
          <TaskItem 
            key={task.id} 
            task={task} 
            onToggleStatus={() => toggleTaskStatus(task)}
            onTogglePriority={() => togglePriority(task)}
            onDelete={() => deleteTask(task.id)}
            isPriorityList={false}
          />
        ))}
      </div>
    </div>
  );
};

// 单个任务组件
const TaskItem: React.FC<{ 
  task: Task; 
  onToggleStatus: () => void;
  onTogglePriority: () => void;
  onDelete: () => void;
  isPriorityList: boolean;
}> = ({ task, onToggleStatus, onTogglePriority, onDelete, isPriorityList }) => {
  return (
    <div className={`group flex items-center p-3.5 bg-white rounded-xl transition-all duration-300 ${
      task.status === TaskStatus.COMPLETED ? 'opacity-60 bg-slate-50' : 'shadow-sm shadow-indigo-100 hover:shadow-md'
    }`}>
      {/* 勾选框 */}
      <button
        onClick={onToggleStatus}
        className={`flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center mr-3 transition-colors ${
          task.status === TaskStatus.COMPLETED
            ? 'bg-indigo-500 border-indigo-500 text-white'
            : 'border-slate-300 text-transparent hover:border-indigo-300'
        }`}
      >
        <Check size={14} strokeWidth={3} />
      </button>
      
      {/* 标题 */}
      <span className={`flex-1 text-sm font-medium transition-all ${
        task.status === TaskStatus.COMPLETED ? 'text-slate-400 line-through' : 'text-slate-800'
      }`}>
        {task.title}
      </span>

      {/* 操作区 */}
      <div className="flex items-center gap-1">
        <button 
          onClick={onTogglePriority}
          className={`p-2 rounded-lg transition-colors ${
            task.isPriority ? 'text-orange-400 hover:bg-orange-50' : 'text-slate-300 hover:text-orange-400'
          }`}
        >
          {task.isPriority ? <Star size={18} fill="currentColor" /> : <Star size={18} />}
        </button>
        
        <button 
          onClick={onDelete}
          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};
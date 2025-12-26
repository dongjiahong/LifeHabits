import { ChevronRight, ChevronDown, Calendar, Flag, MoreVertical, Plus, Trash2 } from 'lucide-react';
import { Project, BigGoal, SmallGoal, ProjectStatus } from '../types';
import { ProgressBar, MilestoneIcon, Badge, Card, Button, Input } from '../components/UIComponents';
import ReactMarkdown from 'react-markdown';
import { useState, useRef, useEffect } from 'react';

interface ProjectCardProps {
  project: Project;
  milestoneStats?: { total: number; completed: number };
  onEdit?: () => void;
  onClick?: () => void;
  children?: React.ReactNode;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, milestoneStats, onEdit, onClick, children }) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const shouldClamp = project.description && project.description.length > 60;

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.COMPLETED: return 'bg-emerald-100 text-emerald-600';
      case ProjectStatus.DELAYED: return 'bg-rose-100 text-rose-600';
      default: return 'bg-indigo-100 text-indigo-600';
    }
  };

  return (
    <Card className="mb-3 hover:border-indigo-200 transition-colors cursor-pointer group p-4" onClick={onClick}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2 mb-1">
            <Badge color={getStatusColor(project.status)} className="scale-90 origin-left">
              {project.status === ProjectStatus.IN_PROGRESS ? '进行中' : 
               project.status === ProjectStatus.COMPLETED ? '已完成' : '已延期'}
            </Badge>
            <h3 className="text-base font-bold text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
              {project.name}
            </h3>
          </div>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
          className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 -mt-1 -mr-1"
        >
          <MoreVertical size={16} />
        </button>
      </div>

      {project.description && (
        <div className="mb-3" onClick={(e) => e.stopPropagation()}>
          <div className={`text-sm text-slate-600 leading-relaxed prose prose-sm prose-slate max-w-none ${(!isDescriptionExpanded && shouldClamp) ? 'line-clamp-3' : ''}`}>
            <ReactMarkdown>{project.description}</ReactMarkdown>
          </div>
          {shouldClamp && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsDescriptionExpanded(!isDescriptionExpanded);
              }}
              className="text-xs text-indigo-500 font-medium mt-1 hover:text-indigo-600 flex items-center gap-1"
            >
              {isDescriptionExpanded ? (
                <>收起 <ChevronDown size={12} className="rotate-180" /></>
              ) : (
                <>展开全部 <ChevronDown size={12} /></>
              )}
            </button>
          )}
        </div>
      )}

      <div className="flex items-center gap-4 text-[10px] text-slate-400 mb-3">
        {project.endDate && (
          <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md">
            <Calendar size={12} />
            <span>截止: {project.endDate}</span>
          </div>
        )}
        {milestoneStats && milestoneStats.total > 0 && (
          <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-1 rounded-md">
            <MilestoneIcon active size={12} className="!p-0 !bg-transparent !text-amber-500" />
            <span className="font-medium">里程碑: {milestoneStats.completed}/{milestoneStats.total}</span>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-medium">
          <span className="text-slate-400">总体进度</span>
          <span className="text-indigo-600 font-bold">{project.progress}%</span>
        </div>
        <ProgressBar progress={project.progress} className="h-1.5" />
      </div>

      {children && <div className="mt-2">{children}</div>}
    </Card>
  );
};

interface GoalItemProps {
  goal: BigGoal | SmallGoal;
  isBig?: boolean;
  onAddSub?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onUpdateTitle?: (newTitle: string) => void;
  children?: React.ReactNode;
}

export const GoalItem: React.FC<GoalItemProps> = ({ goal, isBig, onAddSub, onEdit, onDelete, onUpdateTitle, children }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(goal.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editTitle.trim() && editTitle !== goal.name) {
      onUpdateTitle?.(editTitle.trim());
    } else {
      setEditTitle(goal.name);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setEditTitle(goal.name);
      setIsEditing(false);
    }
  };

  return (
    <div className={`mb-3 ${isBig ? '' : 'ml-6'}`}>
      <div 
        className={`flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-slate-50 ${isBig ? 'bg-slate-50/50 border border-slate-100' : ''}`}
      >
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className={`p-1 rounded-md hover:bg-slate-200 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
        >
          <ChevronRight size={16} />
        </button>

        {goal.isMilestone && (
          <MilestoneIcon active={goal.progress === 100} />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1 min-h-[24px]">
            {isEditing ? (
              <input
                ref={inputRef}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="w-full text-sm font-bold bg-white border border-indigo-200 rounded px-1 py-0.5 outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            ) : (
              <h4 
                onDoubleClick={() => {
                  setEditTitle(goal.name);
                  setIsEditing(true);
                }}
                className={`font-bold truncate cursor-text ${isBig ? 'text-slate-800' : 'text-slate-700 text-sm'}`}
                title="双击编辑名称"
              >
                {goal.name}
              </h4>
            )}
            <span className="text-[10px] font-bold text-indigo-500 ml-2">{goal.progress}%</span>
          </div>
          <ProgressBar progress={goal.progress} className="h-1" />
        </div>

        <div className="flex items-center gap-1 ml-2">
          {onAddSub && (
            <button 
              onClick={(e) => { e.stopPropagation(); onAddSub(); }} 
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors text-xs font-bold"
              title="添加子目标"
            >
              <Plus size={14} /> 
              <span>拆解</span>
            </button>
          )}
          {onDelete && (
             <button
               onClick={(e) => { e.stopPropagation(); onDelete(); }}
               className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-colors"
               title="删除目标"
             >
               <Trash2 size={16} />
             </button>
          )}
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit?.(); }} 
            className={`p-1.5 rounded-lg hover:bg-amber-50 transition-colors ${goal.isMilestone ? 'text-amber-500' : 'text-slate-300 hover:text-amber-500'}`}
            title="设为/取消里程碑"
          >
            <Flag size={16} fill={goal.isMilestone ? "currentColor" : "none"} />
          </button>
        </div>
      </div>

      {isExpanded && children && (
        <div className="mt-2 space-y-2">
          {children}
        </div>
      )}
    </div>
  );
};
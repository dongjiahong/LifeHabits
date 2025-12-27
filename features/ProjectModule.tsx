import React, { useState, useEffect } from 'react';
import { Plus, Search, Briefcase, Trash2 } from 'lucide-react';
import { db } from '../db';
import { Project, ProjectStatus } from '../types';
import { getProjects, addProject, updateProject, deleteProject } from '../services/projectService';
import { Button, Input, Select, Textarea, Modal } from '../components/UIComponents';
import { ProjectCard } from './ProjectComponents';
import { ProjectPlanner } from './ProjectPlanner';
import { useToast } from '../components/Toast';
import { useLiveQuery } from 'dexie-react-hooks';

interface ProjectModuleProps {
  initialProjectId?: string | null;
}

export const ProjectModule: React.FC<ProjectModuleProps> = ({ initialProjectId }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { showToast } = useToast();
  const lastHandledProjectId = React.useRef<string | null>(null);

  // Handle initial project selection
  useEffect(() => {
    if (initialProjectId && projects.length > 0 && initialProjectId !== lastHandledProjectId.current) {
      const target = projects.find(p => p.id === initialProjectId);
      if (target) {
        setSelectedProject(target);
        lastHandledProjectId.current = initialProjectId;
      }
    }
  }, [initialProjectId, projects]);

  // Milestone Stats Map: projectId -> { total: number, completed: number }
  const milestoneStats = useLiveQuery(async () => {
    const [bgs, sgs] = await Promise.all([
      db.bigGoals.filter(bg => !!bg.isMilestone).toArray(),
      db.smallGoals.filter(sg => !!sg.isMilestone).toArray()
    ]);

    const stats: Record<string, { total: number, completed: number }> = {};
    
    const allMilestones = [...bgs, ...sgs];
    
    allMilestones.forEach(m => {
      if (!stats[m.projectId]) stats[m.projectId] = { total: 0, completed: 0 };
      stats[m.projectId].total++;
      if (m.progress === 100) stats[m.projectId].completed++;
    });
    
    return stats;
  }, []);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: ProjectStatus.IN_PROGRESS,
    endDate: '',
  });

  const loadProjects = async () => {
    const data = await getProjects();
    setProjects(data.sort((a, b) => b.createdAt - a.createdAt));
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleOpenModal = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setFormData({
        name: project.name,
        description: project.description || '',
        status: project.status,
        endDate: project.endDate || '',
      });
    } else {
      setEditingProject(null);
      setFormData({
        name: '',
        description: '',
        status: ProjectStatus.IN_PROGRESS,
        endDate: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      if (editingProject && editingProject.id) {
        await updateProject(editingProject.id, formData);
        showToast('项目已更新', 'success');
      } else {
        await addProject({
          ...formData,
          progress: 0,
          createdAt: Date.now(),
        });
        showToast('项目已创建', 'success');
      }
      setIsModalOpen(false);
      loadProjects();
    } catch (err) {
      showToast('操作失败', 'error');
    }
  };

  const handleDeleteProject = async () => {
    if (!editingProject || !editingProject.id) return;
    if (confirm('确定要删除这个项目及其所有目标和任务吗？此操作不可恢复。')) {
      try {
        await deleteProject(editingProject.id);
        showToast('项目已删除', 'success');
        setIsModalOpen(false);
        loadProjects();
      } catch (err) {
        showToast('删除失败', 'error');
      }
    }
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedProject) {
    return (
      <ProjectPlanner 
        project={selectedProject} 
        onBack={() => {
          setSelectedProject(null);
          loadProjects();
        }} 
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center px-1">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">我的项目</h2>
        <Button onClick={() => handleOpenModal()} size="sm" className="rounded-full px-4 shadow-md shadow-indigo-100">
          <Plus size={18} className="mr-1" /> 新建项目
        </Button>
      </div>

      {/* Search */}
      <div className="relative group px-1">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
        <input
          type="text"
          placeholder="搜索项目..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-slate-100 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-slate-800 shadow-sm focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
        />
      </div>

      {/* Project List */}
      <div className="space-y-4">
        {filteredProjects.length === 0 ? (
          <div className="text-center py-20 bg-white/50 rounded-3xl border border-dashed border-slate-200">
            <div className="inline-flex p-4 bg-slate-50 rounded-full text-slate-300 mb-3">
              <Briefcase size={32} />
            </div>
            <p className="text-slate-400 text-sm">暂无项目，开始你的第一个规划吧</p>
          </div>
        ) : (
          filteredProjects.map(project => (
            <ProjectCard 
              key={project.id} 
              project={project} 
              milestoneStats={project.id ? milestoneStats?.[project.id] : undefined}
              onEdit={() => handleOpenModal(project)}
              onClick={() => setSelectedProject(project)}
            />
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={editingProject ? '编辑项目' : '新建项目'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="项目名称" 
            placeholder="例如: 学习 React 进阶" 
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
          />
          <Textarea 
            label="项目描述 (支持 Markdown)" 
            placeholder="详细描述这个项目的目标..." 
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select 
              label="状态"
              value={formData.status}
              onChange={(val) => setFormData({...formData, status: val as ProjectStatus})}
              options={[
                { value: ProjectStatus.IN_PROGRESS, label: '进行中' },
                { value: ProjectStatus.COMPLETED, label: '已完成' },
                { value: ProjectStatus.DELAYED, label: '已延期' },
              ]}
            />
            <Input 
              label="截止日期" 
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({...formData, endDate: e.target.value})}
            />
          </div>
          
          <div className="pt-2 flex flex-col gap-3">
            <Button type="submit" className="w-full">
              {editingProject ? '保存修改' : '立即创建'}
            </Button>
            
            {editingProject && (
              <Button 
                type="button" 
                variant="danger" 
                className="w-full bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100"
                onClick={handleDeleteProject}
              >
                <Trash2 size={16} className="mr-2" /> 删除项目
              </Button>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
};
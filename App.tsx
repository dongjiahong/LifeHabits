import React, { useState, Suspense, lazy } from 'react';
import { Layout } from './Layout';
import { TabView } from './types';
import { ToastProvider } from './components/Toast';
import { Loader2 } from 'lucide-react';

// Lazy load feature modules to reduce initial bundle size
const TodoModule = lazy(() => import('./features/TodoModule').then(module => ({ default: module.TodoModule })));
const AccountingModule = lazy(() => import('./features/AccountingModule').then(module => ({ default: module.AccountingModule })));
const ReviewModule = lazy(() => import('./features/ReviewModule').then(module => ({ default: module.ReviewModule })));
const SettingsModule = lazy(() => import('./features/SettingsModule').then(module => ({ default: module.SettingsModule })));
const HabitModule = lazy(() => import('./features/HabitModule').then(module => ({ default: module.HabitModule })));
const ProjectModule = lazy(() => import('./features/ProjectModule').then(module => ({ default: module.ProjectModule })));

const LoadingFallback = () => (
  <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
    <Loader2 size={32} className="animate-spin text-indigo-500" />
    <p className="text-xs font-medium animate-pulse">正在加载模块...</p>
  </div>
);

const AppContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabView>('todo');
  const [targetProjectId, setTargetProjectId] = useState<string | null>(null);

  const handleTabChange = (tab: TabView) => {
    setCurrentTab(tab);
    if (tab !== 'projects') {
      setTargetProjectId(null);
    }
  };

  const handleNavigateToProject = (projectId: string) => {
    setTargetProjectId(projectId);
    setCurrentTab('projects');
  };

  const renderContent = () => {
    switch (currentTab) {
      case 'todo':
        return <TodoModule onNavigateToProject={handleNavigateToProject} />;
      case 'accounting':
        return <AccountingModule />;
      case 'review':
        return <ReviewModule />;
      case 'habits':
        return <HabitModule />;
      case 'projects':
        return <ProjectModule initialProjectId={targetProjectId} />;
      case 'settings':
        return <SettingsModule />;
      default:
        return <TodoModule onNavigateToProject={handleNavigateToProject} />;
    }
  };

  return (
    <Layout activeTab={currentTab} onTabChange={handleTabChange}>
      <div className="animate-fade-in h-full">
        <Suspense fallback={<LoadingFallback />}>
          {renderContent()}
        </Suspense>
      </div>
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
};

export default App;
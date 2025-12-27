import React, { useState } from 'react';
import { Layout } from './Layout';
import { TodoModule } from './features/TodoModule';
import { AccountingModule } from './features/AccountingModule';
import { ReviewModule } from './features/ReviewModule';
import { SettingsModule } from './features/SettingsModule';
import { HabitModule } from './features/HabitModule';
import { ProjectModule } from './features/ProjectModule';
import { TabView } from './types';
import { ToastProvider } from './components/Toast';

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
      <div className="animate-fade-in">
        {renderContent()}
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
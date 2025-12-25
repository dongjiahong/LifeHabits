import React, { useState } from 'react';
import { Layout } from './Layout';
import { TodoModule } from './features/TodoModule';
import { AccountingModule } from './features/AccountingModule';
import { ReviewModule } from './features/ReviewModule';
import { SettingsModule } from './features/SettingsModule';
import { TabView } from './types';
import { ToastProvider } from './components/Toast.tsx';

const AppContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabView>('todo');

  const renderContent = () => {
    switch (currentTab) {
      case 'todo':
        return <TodoModule />;
      case 'accounting':
        return <AccountingModule />;
      case 'review':
        return <ReviewModule />;
      case 'settings':
        return <SettingsModule />;
      default:
        return <TodoModule />;
    }
  };

  return (
    <Layout activeTab={currentTab} onTabChange={setCurrentTab}>
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
import React, { useState, useEffect, useRef } from 'react';
import { TabView } from './types';
import { CheckSquare, PieChart, BookOpen, Settings, RefreshCw, Loader2, Sprout, Briefcase } from 'lucide-react';
import { useToast } from './components/Toast';
import { db } from './db';
import { WebDAVService } from './services/webdavService';
import { initAutoSync, AutoSyncService } from './services/autoSyncService';

// App Logo Component
const AppLogo = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-indigo-600">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-20"/>
    <path d="M12 18V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M12 12L8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M12 12L16 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="12" cy="12" r="3" fill="currentColor" className="opacity-20"/>
  </svg>
);

interface LayoutProps {
  children: React.ReactNode;
  activeTab: TabView;
  onTabChange: (tab: TabView) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  const { showToast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const wasAutoSyncing = useRef(false);

  // 初始化自动同步服务并监听状态变化
  useEffect(() => {
    // 设置同步状态回调
    AutoSyncService.setOnSyncStatusChange((syncing) => {
      setIsSyncing(syncing);
      
      // 自动同步完成时显示通知
      if (wasAutoSyncing.current && !syncing) {
        showToast('自动同步完成', 'success');
      }
      wasAutoSyncing.current = syncing;
    });
    
    // 初始化服务
    initAutoSync();
    
    return () => {
      AutoSyncService.setOnSyncStatusChange(null);
    };
  }, [showToast]);

  const handleQuickSync = async () => {
    if (isSyncing) return;

    try {
      const settings = await db.settings.toArray();
      const config = settings[0];

      if (!config || !config.webdavUrl || !config.webdavUsername || !config.webdavPassword) {
        showToast('请先在设置中配置 WebDAV 信息', 'info');
        onTabChange('settings');
        return;
      }

      setIsSyncing(true);

      const service = new WebDAVService(config);
      const result = await service.sync();

      // 更新最后同步时间
      await db.settings.update(config.id!, { lastSyncTime: Date.now() });

      showToast(result, 'success');
    } catch (e: any) {
      console.error(e);
      showToast(`同步失败: ${e.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-emerald-50/30 relative overflow-hidden">
      {/* 顶部装饰光斑 - Updated colors to Emerald/Indigo */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[30%] bg-indigo-200/20 blur-3xl rounded-full pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[30%] bg-emerald-200/20 blur-3xl rounded-full pointer-events-none z-0" />

      {/* Main Container - Updated to use glass-panel */}
      <div className="w-full max-w-md sm:max-w-[520px] h-[100dvh] flex flex-col shadow-2xl relative overflow-hidden glass-panel sm:rounded-3xl sm:h-[90vh] sm:my-auto z-10 border-none sm:border ring-1 ring-black/5">
        
        {/* 左上角功能区 (设置 & 同步 & Logo) */}
        <div className="absolute top-4 left-4 z-50 flex items-center gap-3">
          {/* Logo 放在最左侧作为品牌标识 */}
          <div className="glass-card p-2 rounded-full">
            <AppLogo />
          </div>

          <div className="h-6 w-[1px] bg-slate-400/20 mx-1"></div>

          {/* 设置按钮 */}
          <button 
            onClick={() => onTabChange('settings')}
            className={`glass-button transition-all duration-300 hover:scale-110 active:scale-95 ${
              activeTab === 'settings' ? 'text-indigo-600 bg-white shadow-md scale-105' : ''
            }`}
            aria-label="设置"
          >
            <Settings size={16} />
          </button>

          {/* 同步按钮 */}
          <button 
            onClick={handleQuickSync}
            disabled={isSyncing}
            className={`glass-button transition-all duration-300 hover:scale-110 active:scale-95 ${
              isSyncing 
                ? 'bg-indigo-50 text-indigo-500 cursor-not-allowed'
                : 'hover:text-blue-600'
            }`}
            aria-label="同步"
            title="同步数据"
          >
            {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          </button>
        </div>

        {/* 主内容区域 */}
        <main className="flex-1 overflow-y-auto p-4 pt-20 pb-2 no-scrollbar z-10 scroll-smooth">
          {children}
        </main>

        {/* 底部导航栏 - 紧凑靠底 */}
        <div className="px-3 pb-3 pt-0 shrink-0 z-30">
          <nav className="w-full glass-panel shadow-lg shadow-slate-200/50 rounded-2xl flex justify-around items-center py-2">
            <NavButton 
              active={activeTab === 'todo'} 
              onClick={() => onTabChange('todo')} 
              icon={<CheckSquare size={20} />} 
              label="清单" 
            />
             <NavButton 
              active={activeTab === 'habits'} 
              onClick={() => onTabChange('habits')} 
              icon={<Sprout size={20} />} 
              label="习惯" 
            />
            <NavButton 
              active={activeTab === 'projects'} 
              onClick={() => onTabChange('projects')} 
              icon={<Briefcase size={20} />} 
              label="项目" 
            />
            <NavButton 
              active={activeTab === 'accounting'} 
              onClick={() => onTabChange('accounting')} 
              icon={<PieChart size={20} />} 
              label="记账" 
            />
            <NavButton 
              active={activeTab === 'review'} 
              onClick={() => onTabChange('review')} 
              icon={<BookOpen size={20} />} 
              label="复盘" 
            />
          </nav>
        </div>
      </div>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({
  active,
  onClick,
  icon,
  label
}) => (
  <button
    onClick={onClick}
    className={`relative flex flex-col items-center justify-center gap-0.5 transition-all duration-300 w-12 group ${
      active ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
    }`}
  >
    <div className={`p-1.5 rounded-xl transition-all duration-300 ${active ? 'bg-indigo-50 scale-110' : 'group-hover:bg-white/50 group-hover:scale-110 group-active:scale-95'}`}>
      {icon}
    </div>
    <span className={`text-[9px] font-bold transition-all duration-300 ${active ? 'opacity-100 translate-y-0 h-auto' : 'opacity-0 -translate-y-2 h-0 overflow-hidden'}`}>
      {label}
    </span>
  </button>
);

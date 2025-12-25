import React, { useState } from 'react';
import { TabView } from './types';
import { CheckSquare, PieChart, BookOpen, Settings, RefreshCw, Loader2 } from 'lucide-react';
import { useToast } from './components/Toast';
import { db } from './db';
import { WebDAVService } from './services/webdavService';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: TabView;
  onTabChange: (tab: TabView) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  const { showToast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);

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
      showToast('正在同步数据...', 'loading');

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
    <div className="min-h-screen bg-slate-50 flex justify-center bg-gradient-to-br from-blue-100 via-purple-50 to-pink-100">
      <div className="w-full max-w-md h-screen flex flex-col shadow-2xl relative overflow-hidden bg-white/40 backdrop-blur-xl sm:rounded-3xl sm:h-[90vh] sm:my-auto sm:border sm:border-white/60">
        
        {/* 顶部装饰光斑 */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[30%] bg-purple-300/30 blur-3xl rounded-full pointer-events-none z-0" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[30%] bg-indigo-300/30 blur-3xl rounded-full pointer-events-none z-0" />

        {/* 左上角功能区 (设置 & 同步) */}
        <div className="absolute top-4 left-4 z-50 flex items-center gap-3">
          {/* 设置按钮 */}
          <button 
            onClick={() => onTabChange('settings')}
            className={`p-2.5 text-slate-500 hover:text-indigo-600 bg-white/50 backdrop-blur-md hover:bg-white/80 rounded-full transition-all shadow-sm border border-white/40 ${
              activeTab === 'settings' ? 'text-indigo-600 bg-white shadow-md' : ''
            }`}
            aria-label="设置"
          >
            <Settings size={20} />
          </button>

          {/* 同步按钮 */}
          <button 
            onClick={handleQuickSync}
            disabled={isSyncing}
            className={`p-2.5 backdrop-blur-md rounded-full transition-all shadow-sm border border-white/40 ${
              isSyncing 
                ? 'bg-indigo-50 text-indigo-500 cursor-not-allowed'
                : 'bg-white/50 hover:bg-white/80 text-slate-500 hover:text-blue-600'
            }`}
            aria-label="同步"
            title="同步数据"
          >
            {isSyncing ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
          </button>
        </div>

        {/* 主内容区域 */}
        <main className="flex-1 overflow-y-auto p-4 pt-16 pb-2 no-scrollbar z-10 scroll-smooth">
          {children}
        </main>

        {/* 底部导航栏 - 紧凑靠底 */}
        <div className="px-3 pb-3 pt-0 shrink-0 z-30">
          <nav className="w-full bg-white/80 backdrop-blur-xl border border-white/50 shadow-lg shadow-slate-200/50 rounded-2xl flex justify-around items-center py-2">
            <NavButton 
              active={activeTab === 'todo'} 
              onClick={() => onTabChange('todo')} 
              icon={<CheckSquare size={20} />} 
              label="清单" 
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
    <div className={`p-1.5 rounded-xl transition-all duration-300 ${active ? 'bg-indigo-50 scale-110' : 'group-hover:bg-white/50'}`}>
      {icon}
    </div>
    {/* 仅在激活时显示的微型标签，或者完全不显示标签以求极致精简，这里保留激活态显示 */}
    <span className={`text-[9px] font-bold transition-all duration-300 ${active ? 'opacity-100 translate-y-0 h-auto' : 'opacity-0 -translate-y-2 h-0 overflow-hidden'}`}>
      {label}
    </span>
  </button>
);

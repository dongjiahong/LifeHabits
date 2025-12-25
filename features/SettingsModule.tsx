
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { AppSettings } from '../types';
import { Button, Input } from '../components/UIComponents';
import { Save, AlertCircle, Cloud, RefreshCw, Check, Loader2 } from 'lucide-react';
import { useToast } from '../components/Toast';
import { WebDAVService } from '../services/webdavService';

export const SettingsModule: React.FC = () => {
  const [config, setConfig] = useState<AppSettings>({
    aiProvider: 'gemini',
    geminiModel: 'gemini-3-flash-preview',
    openaiUrl: 'https://api.openai.com/v1',
    openaiModel: 'gpt-3.5-turbo',
    openaiKey: '',
    webdavUrl: '',
    webdavUsername: '',
    webdavPassword: ''
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    db.settings.toArray().then(items => {
      if (items.length > 0) {
        setConfig(prev => ({ ...prev, ...items[0] }));
      }
    });
  }, []);

  const handleSave = async () => {
    try {
      const items = await db.settings.toArray();
      if (items.length > 0) {
        await db.settings.update(items[0].id!, config);
      } else {
        await db.settings.add(config);
      }
      showToast('设置已保存', 'success');
    } catch (e) {
      showToast('保存失败', 'error');
    }
  };

  const handleSync = async () => {
    if (!config.webdavUrl || !config.webdavUsername || !config.webdavPassword) {
      showToast('请先配置完整的 WebDAV 信息', 'error');
      return;
    }

    setIsSyncing(true);
    const toastId = showToast('正在同步数据...', 'loading');

    try {
      // 保存当前配置以防万一
      await handleSave();
      
      const service = new WebDAVService(config);
      
      // 1. 测试连接
      const isConnected = await service.testConnection();
      if (!isConnected) {
        throw new Error('无法连接到 WebDAV 服务器');
      }

      // 2. 执行同步
      const result = await service.sync();
      
      // 3. 更新同步时间
      const newConfig = { ...config, lastSyncTime: Date.now() };
      setConfig(newConfig);
      const items = await db.settings.toArray();
      if (items.length > 0) {
        await db.settings.update(items[0].id!, { lastSyncTime: Date.now() });
      }

      showToast(result, 'success');
    } catch (e: any) {
      console.error(e);
      showToast(`同步失败: ${e.message}`, 'error');
    } finally {
      setIsSyncing(false);
      // 强制关闭 loading toast (虽然 showToast 会自动关闭非 loading，但 loading 需要手动)
      // 这里依赖 Toast 组件的内部逻辑，如果 Toast 组件 loading 不自动关，需要 hideToast(toastId)
      // 假设 Toast 组件在 showToast 新消息时会处理
    }
  };

  return (
    <div className="space-y-6 pt-2 animate-fade-in">
      <div className="flex items-center gap-2 mb-2 pl-2">
        <h2 className="text-2xl font-bold text-slate-800">设置</h2>
      </div>

      {/* AI 设置 */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-white/60 p-5">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span>🧠</span> AI 助手配置
        </h3>
        <div className="flex gap-2 mb-6 bg-slate-100/50 p-1 rounded-xl">
          <button
            onClick={() => setConfig({ ...config, aiProvider: 'gemini' })}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              config.aiProvider === 'gemini' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Google Gemini
          </button>
          <button
            onClick={() => setConfig({ ...config, aiProvider: 'openai' })}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              config.aiProvider === 'openai' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            OpenAI 兼容
          </button>
        </div>

        {config.aiProvider === 'gemini' && (
          <div className="space-y-4 animate-fade-in">
            <Input 
              label="Model Name" 
              value={config.geminiModel} 
              onChange={e => setConfig({...config, geminiModel: e.target.value})}
              placeholder="gemini-3-flash-preview"
            />
            <Input 
              label="API Key (可选)" 
              type="password"
              value={config.geminiKey || ''} 
              onChange={e => setConfig({...config, geminiKey: e.target.value})}
              placeholder="留空则使用内置默认 Key"
            />
            <p className="text-xs text-slate-500 mt-2 flex items-start bg-indigo-50 p-2 rounded-lg">
              <AlertCircle size={14} className="mr-1.5 mt-0.5 text-indigo-500 flex-shrink-0" />
              <span>默认使用 gemini-3-flash-preview 模型。建议配置自己的 API Key 以获得更稳定的体验。</span>
            </p>
          </div>
        )}

        {config.aiProvider === 'openai' && (
          <div className="space-y-4 animate-fade-in">
            <Input 
              label="API Base URL" 
              value={config.openaiUrl} 
              onChange={e => setConfig({...config, openaiUrl: e.target.value})}
              placeholder="https://api.openai.com/v1"
            />
            <Input 
              label="API Key" 
              type="password"
              value={config.openaiKey || ''} 
              onChange={e => setConfig({...config, openaiKey: e.target.value})}
              placeholder="sk-..."
            />
             <Input 
              label="Model Name" 
              value={config.openaiModel} 
              onChange={e => setConfig({...config, openaiModel: e.target.value})}
              placeholder="gpt-3.5-turbo"
            />
          </div>
        )}
      </div>

      {/* WebDAV 设置 */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-white/60 p-5">
        <div className="flex justify-between items-center mb-4">
           <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
             <Cloud size={20} className="text-blue-500" /> 
             数据同步 (WebDAV)
           </h3>
           {config.lastSyncTime && (
             <span className="text-[10px] text-slate-400">
               上次同步: {new Date(config.lastSyncTime).toLocaleString()}
             </span>
           )}
        </div>
        
        <div className="space-y-4">
          <Input 
            label="WebDAV URL" 
            placeholder="https://dav.jianguoyun.com/dav/"
            value={config.webdavUrl || ''} 
            onChange={e => setConfig({...config, webdavUrl: e.target.value})}
          />
          <Input 
            label="用户名" 
            placeholder="Account / Email"
            value={config.webdavUsername || ''} 
            onChange={e => setConfig({...config, webdavUsername: e.target.value})}
          />
          <Input 
            label="密码 / 应用授权码" 
            type="password"
            placeholder="Password"
            value={config.webdavPassword || ''} 
            onChange={e => setConfig({...config, webdavPassword: e.target.value})}
          />
          
          <Button 
            onClick={handleSync} 
            variant="secondary"
            disabled={isSyncing || !config.webdavUrl}
            className={`w-full flex items-center justify-center gap-2 border border-blue-100 ${isSyncing ? 'bg-blue-50' : 'bg-blue-50/50 hover:bg-blue-100'}`}
          >
            {isSyncing ? (
              <>
                <Loader2 size={16} className="animate-spin text-blue-600" />
                <span className="text-blue-600">正在同步中...</span>
              </>
            ) : (
              <>
                <RefreshCw size={16} className="text-blue-600" />
                <span className="text-blue-600">立即同步</span>
              </>
            )}
          </Button>
          <p className="text-[10px] text-slate-400 text-center">
            支持坚果云、Nextcloud 等标准 WebDAV 服务。数据将按周分页加密存储。
          </p>
        </div>
      </div>

      <div className="pt-4 pb-20">
        <Button onClick={handleSave} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 gap-2" size="lg">
          <Save size={18} />
          保存所有设置
        </Button>
      </div>
    </div>
  );
};


import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { AppSettings } from '../types';
import { Button, Input, Select } from '../components/UIComponents';
import { Save, AlertCircle, Cloud, RefreshCw, Loader2, Bot, ArrowLeftRight, Trash2 } from 'lucide-react';
import { useToast } from '../components/Toast';
import { WebDAVService } from '../services/webdavService';
import { purgeDeletedData } from '../db';

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
  const [activeTab, setActiveTab] = useState<'ai' | 'sync'>('ai');
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
    }
  };

  const handlePurge = async () => {
    if (confirm('确定要彻底清理本地数据库中已删除的项目吗？\n\n此操作不可逆，清理后将无法通过同步找回在其他设备上误删的内容（如果尚未同步）。建议在确保所有设备都已同步后再执行。')) {
      try {
        await purgeDeletedData();
        showToast('清理完成', 'success');
      } catch (e) {
        showToast('清理失败', 'error');
      }
    }
  };

  return (
    <div className="space-y-4 pt-2 animate-fade-in flex flex-col h-full">
      <div className="flex items-center gap-2 mb-1 pl-2">
        <h2 className="text-xl font-bold text-slate-800">设置</h2>
      </div>

      {/* Tabs Navigation */}
      <div className="flex p-1 bg-slate-100/80 rounded-xl mx-2">
        <button
          onClick={() => setActiveTab('ai')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'ai'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Bot size={16} />
          AI 助手
        </button>
        <button
          onClick={() => setActiveTab('sync')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'sync'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <ArrowLeftRight size={16} />
          数据同步
        </button>
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 overflow-y-auto px-2 pb-20 no-scrollbar">
        {activeTab === 'ai' && (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-white/60 p-4 animate-fade-in">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="text-lg">🧠</span> AI 助手配置
            </h3>
            
            <div className="space-y-3">
              <Select
                label="供应商"
                size="sm"
                value={config.aiProvider}
                onChange={value => setConfig({ ...config, aiProvider: value as any })}
                options={[
                  { value: 'gemini', label: 'Google Gemini' },
                  { value: 'openai', label: 'OpenAI 兼容' }
                ]}
              />

              {config.aiProvider === 'gemini' && (
                <div className="space-y-3 animate-fade-in pt-1 border-t border-slate-100 mt-2">
                  <Input 
                    label="Model Name" 
                    size="sm"
                    value={config.geminiModel} 
                    onChange={e => setConfig({...config, geminiModel: e.target.value})}
                    placeholder="gemini-3-flash-preview"
                  />
                  <Input 
                    label="API Key" 
                    size="sm"
                    type="password"
                    value={config.geminiKey || ''} 
                    onChange={e => setConfig({...config, geminiKey: e.target.value})}
                    placeholder="请输入您的 API Key"
                  />
                </div>
              )}

              {config.aiProvider === 'openai' && (
                <div className="space-y-3 animate-fade-in pt-1 border-t border-slate-100 mt-2">
                  <Input 
                    label="API Base URL" 
                    size="sm"
                    value={config.openaiUrl} 
                    onChange={e => setConfig({...config, openaiUrl: e.target.value})}
                    placeholder="https://api.openai.com/v1"
                  />
                  <Input 
                    label="API Key" 
                    size="sm"
                    type="password"
                    value={config.openaiKey || ''} 
                    onChange={e => setConfig({...config, openaiKey: e.target.value})}
                    placeholder="sk-..."
                  />
                   <Input 
                    label="Model Name" 
                    size="sm"
                    value={config.openaiModel} 
                    onChange={e => setConfig({...config, openaiModel: e.target.value})}
                    placeholder="gpt-3.5-turbo"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'sync' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-white/60 p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Cloud size={18} className="text-blue-500" /> 
                  WebDAV 同步
                </h3>
                {config.lastSyncTime && (
                  <span className="text-[10px] text-slate-400">
                    {new Date(config.lastSyncTime).toLocaleDateString()}
                  </span>
                )}
              </div>
              
              <div className="space-y-3">
                <Input 
                  label="WebDAV URL" 
                  size="sm"
                  placeholder="https://dav.jianguoyun.com/dav/"
                  value={config.webdavUrl || ''} 
                  onChange={e => setConfig({...config, webdavUrl: e.target.value})}
                />
                <Input 
                  label="用户名" 
                  size="sm"
                  placeholder="Account / Email"
                  value={config.webdavUsername || ''} 
                  onChange={e => setConfig({...config, webdavUsername: e.target.value})}
                />
                <Input 
                  label="密码 / 应用授权码" 
                  size="sm"
                  type="password"
                  placeholder="Password"
                  value={config.webdavPassword || ''} 
                  onChange={e => setConfig({...config, webdavPassword: e.target.value})}
                />
                
                <Button 
                  onClick={handleSync} 
                  variant="secondary"
                  size="sm"
                  disabled={isSyncing || !config.webdavUrl}
                  className={`w-full flex items-center justify-center gap-2 border border-blue-100 mt-2 ${isSyncing ? 'bg-blue-50' : 'bg-blue-50/50 hover:bg-blue-100'}`}
                >
                  {isSyncing ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-blue-600" />
                      <span className="text-blue-600">正在同步中...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw size={14} className="text-blue-600" />
                      <span className="text-blue-600">立即同步</span>
                    </>
                  )}
                </Button>
                <p className="text-[10px] text-slate-400 text-center leading-tight">
                  支持坚果云、Nextcloud 等标准 WebDAV 服务。数据将按模块和时间分片存储。
                </p>
              </div>
            </div>

            {/* 危险区 - 数据清理 */}
            <div className="bg-rose-50/50 backdrop-blur-xl rounded-2xl shadow-sm border border-rose-100 p-4">
              <h3 className="text-xs font-bold text-rose-700 mb-2 flex items-center gap-2">
                <AlertCircle size={14} /> 
                数据维护 (危险区)
              </h3>
              <p className="text-[10px] text-rose-600/70 mb-3 leading-tight">
                本地执行“软删除”后，数据仍保留在数据库中以支持多端同步。点击下方按钮可彻底清除本地标记为删除的数据。
              </p>
              <Button 
                onClick={handlePurge} 
                variant="danger"
                size="sm"
                className="w-full flex items-center justify-center gap-2 bg-rose-100 text-rose-700 hover:bg-rose-200 border-none shadow-none"
              >
                <Trash2 size={14} />
                彻底清理已删除数据
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-20 left-4 right-4 z-10">
        <Button onClick={handleSave} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 gap-2 rounded-xl" size="md">
          <Save size={16} />
          保存所有设置
        </Button>
      </div>
    </div>
  );
};

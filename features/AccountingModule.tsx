import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { LogType, AccountLog } from '../types';
import { getTodayStr, formatCurrency, formatDuration } from '../utils';
import { calculateTotal, formatChartData } from '../services/accountingService';
import { Button, Input } from '../components/UIComponents';
import { Clock, DollarSign, TrendingUp, Edit2, Trash2, X } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useToast } from '../components/Toast';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const AccountingModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<LogType>(LogType.TIME);
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const { showToast } = useToast();

  const todayStr = getTodayStr();
  const logs = useLiveQuery(
    () => db.logs.where('date').equals(todayStr).and(l => l.type === activeTab).toArray(),
    [todayStr, activeTab]
  );

  const handleSave = async () => {
    if (!name.trim() || !value) return;
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
        showToast('请输入有效的数值', 'error');
        return;
    }

    try {
        if (editingId) {
            await db.logs.update(editingId, { name: name.trim(), value: numValue });
            setEditingId(null);
            showToast('更新成功', 'success');
        } else {
            await db.logs.add({
                type: activeTab,
                name: name.trim(),
                value: numValue,
                date: todayStr,
                createdAt: Date.now(),
            });
            showToast('记录已添加', 'success');
        }
        setName('');
        setValue('');
    } catch (e) {
        showToast('保存失败', 'error');
    }
  };

  const startEdit = (log: AccountLog) => {
    setEditingId(log.id!);
    setName(log.name);
    setValue(log.value.toString());
  };
  const cancelEdit = () => { setEditingId(null); setName(''); setValue(''); };

  const deleteLog = async (id: number) => {
    if (confirm('确定要删除这条记录吗？')) {
      await db.logs.delete(id);
      if (editingId === id) cancelEdit();
      showToast('已删除', 'info');
    }
  };

  const totalValue = calculateTotal(logs);
  const chartData = formatChartData(logs);

  return (
    <div className="space-y-3 pt-1 animate-fade-in">
      {/* 1. 头部切换 - 极简紧凑 */}
      <div className="flex bg-slate-200/60 p-1 rounded-xl mx-auto max-w-[240px] backdrop-blur-sm">
        <button
          onClick={() => { setActiveTab(LogType.TIME); cancelEdit(); }}
          className={`flex-1 flex items-center justify-center py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === LogType.TIME ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Clock size={14} className="mr-1" />
          时间账
        </button>
        <button
          onClick={() => { setActiveTab(LogType.MONEY); cancelEdit(); }}
          className={`flex-1 flex items-center justify-center py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === LogType.MONEY ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <DollarSign size={14} className="mr-1" />
          金钱账
        </button>
      </div>

      {/* 2. 统计卡片 - 并排紧凑 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/70 backdrop-blur rounded-xl p-3 border border-white/60 flex flex-col items-center justify-center shadow-sm">
           <span className="text-slate-500 text-[10px] mb-0.5">今日累计</span>
           <span className={`text-lg font-bold ${activeTab === LogType.TIME ? 'text-indigo-600' : 'text-emerald-600'}`}>
             {activeTab === LogType.TIME ? formatDuration(totalValue) : formatCurrency(totalValue)}
           </span>
        </div>
        <div className="bg-white/70 backdrop-blur rounded-xl p-3 border border-white/60 flex flex-col items-center justify-center shadow-sm">
           <span className="text-slate-500 text-[10px] mb-0.5">记录笔数</span>
           <span className="text-lg font-bold text-slate-800">{logs?.length || 0}</span>
        </div>
      </div>

      {/* 3. 录入表单 - 单行紧凑 */}
      <div className="bg-white/80 backdrop-blur rounded-xl p-3 border border-white/60 shadow-sm">
        <div className="flex items-center justify-between mb-2">
           <h3 className="text-xs font-bold text-slate-700">{editingId ? "修改记录" : (activeTab === LogType.TIME ? "时间去哪了？" : "钱花哪了？")}</h3>
           {editingId && <button onClick={cancelEdit} className="text-xs text-slate-400"><X size={14}/></button>}
        </div>
        
        <div className="space-y-2">
          {/* 输入框并排 */}
          <div className="flex gap-2">
             <div className="flex-1">
               <Input 
                  placeholder={activeTab === LogType.TIME ? "事项 (如: 阅读)" : "用途 (如: 早餐)"}
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 text-xs" // 降低高度，减小字体
               />
             </div>
             <div className="w-24">
               <Input 
                  type="number" 
                  placeholder={activeTab === LogType.TIME ? "分钟" : "金额"} 
                  value={value} 
                  onChange={(e) => setValue(e.target.value)} 
                  className="h-9 text-xs text-center px-1" 
               />
             </div>
          </div>
          <Button onClick={handleSave} disabled={!name || !value} className="w-full h-9 text-xs bg-indigo-600 shadow-md shadow-indigo-200 rounded-lg">
             {editingId ? '保存修改' : '记一笔'}
          </Button>
        </div>
      </div>

      {/* 4. 图表与列表 - 左右分栏紧凑布局 */}
      {logs && logs.length > 0 && (
        <div className="bg-white/80 backdrop-blur rounded-xl p-3 border border-white/60 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-700">分布概览</h3>
          </div>
          
          <div className="flex gap-2 h-36">
             {/* 左侧：饼图 */}
             <div className="w-[110px] h-full relative shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={25} outerRadius={45} paddingAngle={2} dataKey="value" stroke="none">
                      {chartData?.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => activeTab === LogType.TIME ? `${value}m` : `¥${value}`} contentStyle={{fontSize: '10px', padding: '4px', borderRadius: '8px'}} />
                  </PieChart>
                </ResponsiveContainer>
                {/* 饼图中心文字 */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-[10px] text-slate-400 font-medium">分布</span>
                </div>
             </div>

             {/* 右侧：滚动列表 */}
             <div className="flex-1 overflow-y-auto pr-1 no-scrollbar space-y-1.5 h-full border-l border-slate-100 pl-2">
               {logs.slice().reverse().map((log) => (
                 <div key={log.id} className={`flex justify-between items-center text-xs p-1.5 rounded-lg transition-colors border border-transparent ${editingId === log.id ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50/50 hover:bg-slate-100'}`}>
                    <div className="flex flex-col overflow-hidden min-w-0 flex-1 mr-2">
                      <span className="font-medium text-slate-700 truncate">{log.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`font-bold ${activeTab === LogType.TIME ? 'text-indigo-500' : 'text-emerald-500'}`}>
                        {activeTab === LogType.TIME ? `${log.value}m` : `¥${log.value}`}
                      </span>
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(log)} className="text-slate-300 hover:text-indigo-500 p-0.5"><Edit2 size={12} /></button>
                        <button onClick={() => deleteLog(log.id!)} className="text-slate-300 hover:text-red-500 p-0.5"><Trash2 size={12} /></button>
                      </div>
                    </div>
                 </div>
               ))}
             </div>
          </div>
        </div>
      )}
      
      {(!logs || logs.length === 0) && (
        <div className="text-center py-12 text-slate-400 text-xs">
          <TrendingUp className="mx-auto mb-2 opacity-20" size={32} />
          <p>暂无记录，开始第一笔吧</p>
        </div>
      )}
    </div>
  );
};
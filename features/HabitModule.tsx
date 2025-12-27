import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Habit } from '../types';
import { calculateHabitUpdate, addHabit, updateHabit, deleteHabit, getHabits, getHabit, addHabitLog, getHabitLogs } from '../services/habitService';
import { Button, Input, Modal } from '../components/UIComponents';
import { Plus, Trash2, ChevronLeft, Sprout } from 'lucide-react';
import { getTodayStr } from '../utils';
import { useToast } from '../components/Toast';

const EMOJI_PRESETS = ['💧', '🏃', '📚', '🧘', '🚭', '🥦', '🎹', '💰', '🛌', '📝'];

export const HabitModule: React.FC = () => {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Create Habit State
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitIcon, setNewHabitIcon] = useState('🌱');
  
  const { showToast } = useToast();

  const habits = useLiveQuery(() => getHabits());

  const handleCreate = async () => {
    if (!newHabitName.trim()) {
      showToast('请填写习惯名称', 'error');
      return;
    }
    await addHabit({
      name: newHabitName.trim(),
      icon: newHabitIcon,
      greenBeans: 0,
      redBeans: 0,
      isArchived: false,
      createdAt: Date.now()
    });
    setNewHabitName('');
    setNewHabitIcon('🌱');
    setShowCreateModal(false);
    showToast('新习惯已种下 🌱', 'success');
  };

  const handleOpenDetail = (id: string) => {
    setSelectedHabitId(id);
    setView('detail');
  };

  if (view === 'detail' && selectedHabitId) {
    return <HabitDetail id={selectedHabitId} onBack={() => setView('list')} />;
  }

  return (
    <div className="space-y-6 pt-2 animate-fade-in relative min-h-[500px]">
      <div className="flex items-center justify-between mb-2 pl-2">
        <h2 className="text-2xl font-bold text-slate-800">习惯花园</h2>
        {/* 修改为实心靛蓝色按钮，解决看不清的问题 */}
        <Button 
          onClick={() => setShowCreateModal(true)} 
          size="sm" 
          className="bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 border border-indigo-500 transition-transform active:scale-95"
        >
          <Plus size={20} strokeWidth={3} />
        </Button>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-2 gap-4">
        {habits?.map(habit => (
           <div 
             key={habit.id}
             onClick={() => habit.id && handleOpenDetail(habit.id)}
             className={`relative bg-white/80 backdrop-blur rounded-2xl p-4 shadow-sm border border-white/60 hover:shadow-md hover:scale-[1.02] hover:bg-white active:scale-[0.98] transition-all duration-300 cursor-pointer flex flex-col items-center gap-3 overflow-hidden group ${habit.isArchived ? 'ring-2 ring-amber-300 bg-amber-50/50' : ''}`}
           >
              {/* Formed Badge */}
              {habit.isArchived && (
                <div className="absolute top-0 right-0 bg-amber-300 text-amber-800 text-[9px] font-bold px-2 py-1 rounded-bl-xl shadow-sm z-10">
                  已养成
                </div>
              )}

              <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center text-3xl shadow-inner relative group-hover:scale-110 transition-transform">
                {habit.icon}
                {/* Mini progress ring visual */}
                <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 36 36">
                  <path
                    className="text-indigo-100"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className={habit.isArchived ? "text-amber-400" : "text-indigo-500"}
                    strokeDasharray={`${Math.min(habit.greenBeans, 100)}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                </svg>
              </div>
              
              <div className="text-center w-full">
                 <h3 className="font-bold text-slate-700 text-sm truncate w-full px-2">{habit.name}</h3>
                 <p className="text-xs text-slate-400 mt-1 flex justify-center gap-2">
                   <span className="text-emerald-600 font-medium bg-emerald-50 px-1.5 rounded-md">{habit.greenBeans}</span>
                   <span className="text-red-500 font-medium bg-red-50 px-1.5 rounded-md">{habit.redBeans}</span>
                 </p>
              </div>
           </div>
        ))}

        {/* Empty State / Add New Placeholder */}
        {(!habits || habits.length === 0) && (
          <div 
            onClick={() => setShowCreateModal(true)}
            className="col-span-2 border-2 border-dashed border-slate-300 rounded-2xl p-8 flex flex-col items-center justify-center text-slate-400 gap-2 cursor-pointer hover:bg-slate-50/50 transition-colors"
          >
             <Sprout size={32} className="opacity-50" />
             <span className="text-xs">种下第一个习惯</span>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="种下一个新习惯">
         <div className="space-y-4">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-4xl border-2 border-dashed border-slate-200">
                {newHabitIcon}
              </div>
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
               {EMOJI_PRESETS.map(e => (
                 <button 
                   key={e} 
                   onClick={() => setNewHabitIcon(e)}
                   className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-colors ${newHabitIcon === e ? 'bg-indigo-100 border border-indigo-200' : 'bg-slate-50 hover:bg-slate-100'}`}
                 >
                   {e}
                 </button>
               ))}
            </div>

            <Input 
               placeholder="习惯名称 (如: 早起喝水)" 
               value={newHabitName}
               onChange={e => setNewHabitName(e.target.value)}
            />
            
            <Button className="w-full mt-4" onClick={handleCreate}>开始培养</Button>
         </div>
      </Modal>
    </div>
  );
};

const HabitDetail: React.FC<{ id: string; onBack: () => void }> = ({ id, onBack }) => {
  const habit = useLiveQuery(() => getHabit(id), [id]);
  const logs = useLiveQuery(() => getHabitLogs(id), [id]);
  const { showToast } = useToast();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const updateBeans = async (type: 'green' | 'red') => {
    if (!habit) return;

    const { habit: updatedHabit, message } = calculateHabitUpdate(habit, type);

    const changes: Partial<Habit> = {
      greenBeans: updatedHabit.greenBeans,
      redBeans: updatedHabit.redBeans,
      isArchived: updatedHabit.isArchived
    };

    await updateHabit(id, changes);
    await addHabitLog({
      habitId: id,
      type,
      date: getTodayStr(),
      createdAt: Date.now()
    });
    
    showToast(message, type === 'green' ? 'success' : 'info');
  };

  const confirmDelete = async () => {
     try {
       await deleteHabit(id);
       // Soft delete handles synchronization. Logs are implicitly orphaned/deleted.
       setShowDeleteModal(false);
       onBack();
       showToast('习惯已移除', 'info');
     } catch (e) {
       showToast('删除失败', 'error');
     }
  };

  // 生成豆子列表 (优先使用 Logs 以保证时间顺序，没有 Logs 则使用 Counts 降级处理)
  const beanList = useMemo(() => {
    if (!habit) return [];
    
    // 如果有日志，直接根据日志生成，这样就是严格的“添加顺序”
    if (logs && logs.length > 0) {
      return logs.map((log, index) => ({
        id: log.id || index.toString(),
        type: log.type,
        // 根据索引生成确定的形状，避免闪烁，但保持有机感
        rotation: (index * 137) % 360, // 黄金角，分布均匀
        borderRadius: [
          '50%', 
          '55% 45% 40% 60% / 50% 40% 60% 50%', 
          '45% 55% 60% 40% / 50% 60% 40% 50%',
        ][index % 3]
      }));
    }

    // 降级方案：如果没有日志（旧数据），则先展示绿豆，再展示红豆
    const arr = [
        ...Array(habit.greenBeans).fill('green'),
        ...Array(habit.redBeans).fill('red')
    ];
    
    return arr.map((type, idx) => ({
        id: idx.toString(),
        type,
        rotation: (idx * 137) % 360,
        borderRadius: [
            '50%', 
            '55% 45% 40% 60% / 50% 40% 60% 50%', 
            '45% 55% 60% 40% / 50% 60% 40% 50%',
        ][idx % 3]
    }));
  }, [habit, logs]);

  if (!habit) return null;

  return (
    <div className="h-full flex flex-col pt-2 animate-scale-in">
       {/* Header - 增加 relative 和 z-50 确保在玻璃瓶层级之上，保证按钮可点击 */}
       <div className="flex items-center justify-between mb-2 relative z-50 px-1">
          <button 
            onClick={onBack} 
            className="p-2 rounded-full bg-white/50 hover:bg-white text-slate-600 transition-colors shadow-sm border border-white/60"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="flex flex-col items-center">
             <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
               {habit.icon} {habit.name}
             </h2>
             {habit.isArchived && <span className="text-[10px] bg-amber-200 text-amber-800 px-2 rounded-full">🏆 已养成</span>}
          </div>
          <button 
            onClick={() => setShowDeleteModal(true)} 
            className="p-2 rounded-full bg-white/50 hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors shadow-sm border border-white/60"
          >
            <Trash2 size={20} />
          </button>
       </div>

       {/* 玻璃瓶区域 */}
       <div className="flex-1 flex justify-center items-end pb-6 relative overflow-hidden">
          
          <div className="relative flex flex-col items-center z-10">
             
             {/* --- 瓶盖区 --- */}
             <div className="w-16 h-6 bg-slate-200/80 border border-slate-300 rounded-t-sm z-20 relative shadow-sm">
                <div className="absolute top-[-3px] left-[-2px] right-[-2px] h-2 bg-slate-300 rounded-t-sm border border-slate-400"></div>
             </div>
             
             {/* --- 瓶颈 --- */}
             <div className="w-14 h-8 bg-white/10 border-x border-white/40 z-10 relative -mt-[1px]">
                {/* 仅在背后加模糊 */}
                <div className="absolute inset-0 bg-white/5 backdrop-blur-[1px] z-[-1]"></div>
             </div>

             {/* --- 瓶身 --- */}
             <div className="relative w-64 h-80 -mt-[1px]">
                
                {/* 1. 瓶身背部 (Back Layer) - 负责模糊背景 */}
                <div className="absolute inset-0 rounded-b-[3rem] rounded-t-[2.5rem] bg-slate-100/10 backdrop-blur-sm border-b border-x border-white/30 z-0"></div>

                {/* 2. 豆子层 (Content Layer) - 位于中间，清晰无遮挡 */}
                {/* flex-wrap-reverse 配合 content-start 实现从底部向上堆积 */}
                <div className="absolute inset-0 w-full h-full p-3 flex flex-wrap-reverse content-start justify-center gap-[2px] overflow-y-auto no-scrollbar z-10 rounded-b-[3rem] rounded-t-[2.5rem]">
                    {beanList.map((bean) => (
                    <div 
                        key={bean.id}
                        className={`w-3.5 h-3.5 shadow-[1px_1px_2px_rgba(0,0,0,0.15)] border border-white/20 transition-all duration-300 ${
                        bean.type === 'green' 
                            // 鲜艳的绿
                            ? 'bg-emerald-400' 
                            // 鲜艳的红
                            : 'bg-rose-400'
                        }`}
                        style={{
                        borderRadius: bean.borderRadius,
                        transform: `rotate(${bean.rotation}deg)`,
                        }}
                    >
                        {/* 强高光点，制造“糖果/玻璃珠”质感 */}
                        <div className="w-1.5 h-1 bg-white/80 rounded-[100%] ml-[2px] mt-[2px] blur-[0.3px]"></div>
                    </div>
                    ))}
                    {/* 占位符，如果数量太少，确保容器撑开 */}
                    <div className="w-full h-0 basis-full"></div>
                </div>

                {/* 3. 瓶身前部 (Front Layer) - 负责反光，不模糊，高透明度 */}
                <div className="absolute inset-0 rounded-b-[3rem] rounded-t-[2.5rem] z-20 pointer-events-none shadow-[inset_0_0_15px_rgba(255,255,255,0.3)] border border-white/40 ring-1 ring-white/20">
                    {/* 左侧反光条 */}
                    <div className="absolute top-8 left-3 w-3 h-64 bg-gradient-to-b from-white/60 via-white/10 to-transparent rounded-full opacity-70"></div>
                    {/* 右侧反光条 */}
                    <div className="absolute top-10 right-3 w-1 h-56 bg-white/20 rounded-full"></div>
                </div>

                {/* 目标线 */}
                {!habit.isArchived && (
                    <div className="absolute top-[10%] w-full flex items-center justify-center opacity-60 z-10 pointer-events-none">
                            <div className="w-full border-t border-dashed border-slate-400 absolute"></div>
                            <span className="bg-white/90 px-1.5 py-0.5 rounded text-[8px] text-slate-500 font-bold z-10 shadow-sm border border-slate-200">100</span>
                    </div>
                )}
             </div>
             
             {/* 瓶底阴影 */}
             <div className="absolute -bottom-3 left-10 right-10 h-3 bg-indigo-900/10 rounded-[100%] blur-sm z-[-1]"></div>
          </div>
       </div>

       {/* Controls */}
       <div className="mb-2 space-y-4 z-20">
          <div className="flex justify-center items-center gap-8 bg-white/40 backdrop-blur rounded-2xl py-3 mx-4 border border-white/40 shadow-sm">
             <div className="text-center">
                <div className="text-2xl font-bold text-emerald-500/80">{habit.greenBeans}</div>
                <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">坚持</div>
             </div>
             <div className="h-8 w-[1px] bg-slate-300/50"></div>
             <div className="text-center">
                <div className="text-2xl font-bold text-rose-400/80">{habit.redBeans}</div>
                <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">放弃</div>
             </div>
          </div>

          <div className="flex gap-4 px-4 pb-2">
             <button 
               onClick={() => updateBeans('green')}
               className="flex-1 bg-gradient-to-br from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 text-white py-3.5 rounded-2xl shadow-lg shadow-emerald-200/50 hover:shadow-emerald-300/60 active:scale-[0.98] hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2 group"
             >
                <div className="bg-white/20 p-1.5 rounded-full group-hover:scale-110 transition-transform">
                   <Plus size={16} strokeWidth={3} />
                </div>
                <span className="font-bold text-sm">做到了</span>
             </button>
             <button 
               onClick={() => updateBeans('red')}
               className="flex-1 bg-white hover:bg-rose-50 text-slate-600 border border-slate-200 hover:border-rose-200 py-3.5 rounded-2xl shadow-sm hover:shadow-md active:scale-[0.98] hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2"
             >
                <span className="text-xl">💤</span>
                <span className="font-bold text-sm">没做到</span>
             </button>
          </div>
       </div>

       {/* Delete Confirmation Modal */}
       <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="确认移除">
         <div className="space-y-4">
            <p className="text-slate-600 text-sm">
               确定要连根拔起这颗习惯树吗？<br/>
               相关的成长记录（豆子）也将一并消失，无法恢复。
            </p>
            <div className="flex gap-3">
               <Button variant="secondary" onClick={() => setShowDeleteModal(false)} className="flex-1">留下它</Button>
               <Button variant="danger" onClick={confirmDelete} className="flex-1">移除</Button>
            </div>
         </div>
       </Modal>
    </div>
  );
};
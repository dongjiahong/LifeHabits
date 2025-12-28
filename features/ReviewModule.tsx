import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { getTodayStr } from '../utils';
import { ReviewTemplate, Review, TaskStatus, LogType } from '../types';
import { Button, Textarea, Input, Modal } from '../components/UIComponents';
import { Save, History, Plus, Sparkles, ChevronDown, ChevronRight, X, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { generateDailyInsight } from '../services/aiService';
import { useToast } from '../components/Toast';
import { addReview, updateReview, getReviewByDate, getReviews, addTemplate, getTemplates } from '../services/reviewService';
import { getAllLogs } from '../services/accountingService';
import { getTasks } from '../services/todoService';
import { getWebDAVService } from '../services/webdavService';
import { getWeekStr } from '../utils';

export const ReviewModule: React.FC = () => {
  const todayStr = getTodayStr();
  const [view, setView] = useState<'daily' | 'history' | 'create-template'>('daily');
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  
  // 弹窗状态
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [instantSummary, setInstantSummary] = useState<string | null>(null);
  
  const { showToast, hideToast } = useToast();
  const skipNextSync = useRef(false);

  const templates = useLiveQuery(() => getTemplates());
  const todayReview = useLiveQuery(
    () => getReviewByDate(todayStr),
    [todayStr]
  );

  useEffect(() => {
    if (todayReview) {
      if (skipNextSync.current) {
        skipNextSync.current = false;
        return;
      }
      if (todayReview.answers) {
         const ansMap: Record<string, string> = {};
         todayReview.answers.forEach(a => ansMap[a.question] = a.answer);
         setAnswers(ansMap);
         setActiveTemplateId(todayReview.templateId || null);
      } else {
         setAnswers({
           '我今天做了什么？': todayReview.done || '',
           '今天遇到了什么问题？': todayReview.problems || '',
           '我可以如何解决？': todayReview.solutions || '',
           '今天的感悟和收获？': todayReview.insights || ''
         });
      }
      if (todayReview.aiSummary) {
        setInstantSummary(todayReview.aiSummary);
      }
    } else if (templates && templates.length > 0 && activeTemplateId === null) {
      const defaultTpl = templates.find(t => t.isDefault) || templates[0];
      if (defaultTpl.id) setActiveTemplateId(defaultTpl.id);
    }
  }, [todayReview, templates]);

  const currentTemplate = templates?.find(t => t.id === activeTemplateId);

  const handleSave = async () => {
    if (!currentTemplate || !currentTemplate.id) return;
    
    const answersArray = currentTemplate.questions.map(q => ({
      question: q,
      answer: answers[q] || ''
    }));
    // 修改验证逻辑：只要任意一个问题有回答（长度>0）即可保存
    const hasContent = answersArray.some(a => a.answer.trim().length > 0);
    
    if (!hasContent) {
      showToast('写点什么再保存吧~', 'info');
      return;
    }

    setIsSaving(true);
    setAiLoading(true);
    
    const loadingToastId = showToast('正在聚合今日数据并呼叫 AI...', 'loading');

    // 1. 准备复盘内容
    const contentText = answersArray.map(a => `Q: ${a.question}\nA: ${a.answer}`).join('\n\n');

    // 2. 准备上下文数据 (代办 & 记账)
    let contextData = '';
    try {
      // Use getTasks from todoService
      const tasks = await getTasks(todayStr);
      // Use getAllLogs from service
      const logs = await getAllLogs(todayStr);

      // 代办概况
      const completedTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED);
      const pendingTasks = tasks.filter(t => t.status === TaskStatus.PENDING);
      const priorityCompleted = completedTasks.filter(t => t.isPriority).length;
      const priorityTotal = tasks.filter(t => t.isPriority).length;

      const taskSummary = `
- 清单概况：共 ${tasks.length} 项，已完成 ${completedTasks.length} 项，未完成 ${pendingTasks.length} 项。
- 重要事项：${priorityTotal} 项重要事项中完成了 ${priorityCompleted} 项。
- 已完成：${completedTasks.map(t => t.title).join(', ') || '无'}
- 未完成：${pendingTasks.map(t => t.title).join(', ') || '无'}
`;

      // 记账概况
      const timeLogs = logs.filter(l => l.type === LogType.TIME);
      const moneyLogs = logs.filter(l => l.type === LogType.MONEY);
      const totalTime = timeLogs.reduce((acc, cur) => acc + cur.value, 0);
      const totalMoney = moneyLogs.reduce((acc, cur) => acc + cur.value, 0);

      const logSummary = `
- 时间投入：共记录 ${timeLogs.length} 笔，累计 ${totalTime} 分钟。主要：${timeLogs.map(l => `${l.name}(${l.value}m)`).join(', ')}
- 金钱消费：共记录 ${moneyLogs.length} 笔，累计 ${totalMoney} 元。主要：${moneyLogs.map(l => `${l.name}(${l.value}元)`).join(', ')}
`;
      
      contextData = taskSummary + logSummary;
    } catch (e) {
      console.error("Fetch context failed", e);
      contextData = "无法获取今日客观数据";
    }

    let summary = '';
    
    try {
       // 传入复盘内容和上下文数据
       summary = await generateDailyInsight(contentText, contextData);
       hideToast(loadingToastId); 
       showToast('复盘已保存，AI 总结完成！', 'success');
    } catch (error: any) {
       console.error(error);
       hideToast(loadingToastId);
       showToast(`保存成功，但 AI 失败: ${error.message}`, 'error');
       summary = ''; 
    }

    const data = {
      date: todayStr,
      templateId: currentTemplate.id,
      templateName: currentTemplate.name,
      answers: answersArray,
      aiSummary: summary,
      createdAt: Date.now()
    };

    try {
      if (todayReview && todayReview.id) {
        await updateReview(todayReview.id, data);
      } else {
        await addReview(data);
      }
      
      // AI 成功生成并保存后，清空输入框
      if (summary) {
        skipNextSync.current = true;
        setAnswers({});
      }
    } catch (e) {
      showToast('数据库保存失败', 'error');
    }

    if (summary) {
      setInstantSummary(summary);
      setShowSummaryModal(true);
    }
    
    setAiLoading(false);
    setIsSaving(false);
  };

  if (view === 'history') return <HistoryView onBack={() => setView('daily')} />;
  if (view === 'create-template') return <CreateTemplateView onBack={() => setView('daily')} />;

  return (
    // 移除 pb-24，改为 pb-4，因为底部导航栏不再悬浮覆盖
    <div className="space-y-6 pb-4 relative animate-fade-in">
      {/* 顶部栏 - 移除 sticky top-0，使其随页面自然滚动 */}
      <div className="flex justify-between items-end py-2 mb-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
            每日复盘
          </h2>
          <p className="text-slate-500 text-xs mt-1">与自己对话，让成长发生。</p>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={() => setView('create-template')}
             className="p-2 bg-white/60 backdrop-blur-md text-slate-600 rounded-xl border border-white/60 shadow-sm hover:text-indigo-600 transition-all hover:bg-white"
             title="新建模版"
           >
             <Plus size={18} />
           </button>
           <button 
             onClick={() => setView('history')}
             className="p-2 bg-white/60 backdrop-blur-md text-slate-600 rounded-xl border border-white/60 shadow-sm hover:text-indigo-600 transition-all hover:bg-white"
             title="历史记录"
           >
             <History size={18} />
           </button>
        </div>
      </div>

      {/* 模版选择 */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mask-linear-fade">
        {templates?.map(tpl => (
          <button
            key={tpl.id}
            onClick={() => {
              if (tpl.id) {
                setActiveTemplateId(tpl.id);
                if (!todayReview) setAnswers({});
              }
            }}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${activeTemplateId === tpl.id 
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200' 
                : 'bg-white/60 backdrop-blur-sm border-white/60 text-slate-600 hover:bg-white'
            }`}
          >
            {tpl.name}
          </button>
        ))}
      </div>

      {/* 动态表单 */}
      {currentTemplate ? (
        <div className="space-y-4 animate-fade-in">
          {currentTemplate.questions.map((q, idx) => (
            <div key={idx} className="bg-white/70 backdrop-blur-md rounded-2xl p-5 shadow-sm border border-white/50 hover:shadow-md transition-shadow focus-within:ring-2 focus-within:ring-indigo-100/50">
              <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center">
                <span className="w-6 h-6 rounded-full bg-indigo-100/50 text-indigo-600 flex items-center justify-center text-xs mr-2 shrink-0 font-bold border border-indigo-100">
                  {idx + 1}
                </span>
                {q}
              </h3>
              <Textarea 
                placeholder="在此输入思考..."
                rows={3}
                value={answers[q] || ''}
                onChange={(e) => setAnswers({...answers, [q]: e.target.value})}
                className="bg-transparent border-none focus:ring-0 p-0 text-slate-700 placeholder:text-slate-400"
              />
            </div>
          ))}
          
          {/* 按钮移至表单下方，减少 padding-bottom */}
          <div className="pt-4 pb-4">
             <button
               onClick={handleSave}
               disabled={isSaving || aiLoading}
               className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-xl shadow-lg shadow-indigo-200 transform transition-all disabled:opacity-70 active:scale-95"
             >
               {aiLoading ? (
                 <>
                   <Sparkles size={18} className="animate-spin" />
                   <span className="font-bold text-sm">正在深度思考中...</span>
                 </>
               ) : (
                 <>
                   <Save size={18} />
                   <span className="font-bold text-sm">保存并总结</span>
                 </>
               )}
             </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-20 text-slate-400">加载模版中...</div>
      )}

      {/* AI 总结弹窗 */}
      <Modal 
        isOpen={showSummaryModal} 
        onClose={() => setShowSummaryModal(false)}
        title="AI 每日洞察"
      >
        <div className="space-y-4">
           <div className="flex justify-center">
             <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500 animate-bounce-slow">
               <Bot size={32} />
             </div>
           </div>
           <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100 text-sm text-slate-700 leading-relaxed prose prose-sm max-w-none">
              {instantSummary ? <ReactMarkdown>{instantSummary}</ReactMarkdown> : '正在生成...'}
           </div>
           <Button className="w-full" onClick={() => setShowSummaryModal(false)}>
             收入囊中
           </Button>
        </div>
      </Modal>
    </div>
  );
};

// ... CreateTemplateView 和 HistoryView ...

const CreateTemplateView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [name, setName] = useState('');
  const [questions, setQuestions] = useState<string[]>(['']);
  const { showToast } = useToast();

  const addQuestion = () => setQuestions([...questions, '']);
  const updateQuestion = (idx: number, val: string) => {
    const newQ = [...questions];
    newQ[idx] = val;
    setQuestions(newQ);
  };
  const removeQuestion = (idx: number) => {
    const newQ = questions.filter((_, i) => i !== idx);
    setQuestions(newQ);
  };

  const handleCreate = async () => {
    if (!name.trim() || questions.some(q => !q.trim())) {
      showToast("请填写模版名称和所有问题", 'error');
      return;
    }
    await addTemplate({
      name,
      questions: questions.filter(q => q.trim()),
      isDefault: false
    });
    showToast("模版创建成功", 'success');
    onBack();
  };
  
  return (
    <div className="space-y-6 pt-2">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-white rounded-full transition-colors">
           <X size={20} className="text-slate-500" />
        </button>
        <h2 className="text-xl font-bold text-slate-800">新建复盘模版</h2>
      </div>

      <div className="bg-white/80 backdrop-blur rounded-2xl shadow-sm border border-white/60 p-5 space-y-4">
        <Input label="模版名称" placeholder="例如：每周五总结" value={name} onChange={e => setName(e.target.value)} />
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">问题列表</label>
          {questions.map((q, idx) => (
            <div key={idx} className="flex gap-2">
              <Input placeholder={`问题 ${idx + 1}`} value={q} onChange={e => updateQuestion(idx, e.target.value)} />
              {questions.length > 1 && (
                 <button onClick={() => removeQuestion(idx)} className="text-red-400 hover:text-red-600 px-2"><X size={18}/></button>
              )}
            </div>
          ))}
          <Button variant="secondary" onClick={addQuestion} className="w-full border border-dashed border-slate-300">添加问题</Button>
        </div>
      </div>
      <Button className="w-full" onClick={handleCreate}>创建模版</Button>
    </div>
  );
};

const HistoryView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const reviews = useLiveQuery(() => getReviews());
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchMoreHistory = async () => {
    setIsSyncing(true);
    const service = await getWebDAVService();
    if (service) {
      // 尝试拉取过去 12 周的历史数据
      const today = new Date();
      for (let i = 1; i <= 12; i++) {
        const d = new Date();
        d.setDate(today.getDate() - (i * 7));
        const weekStr = getWeekStr(d.toISOString().split('T')[0]);
        await service.lazyDownloadIfNeeded(weekStr);
      }
    }
    setIsSyncing(false);
  };

  return (
    <div className="space-y-4 animate-fade-in pt-2">
       <div className="flex items-center justify-between mb-6">
         <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-white rounded-full transition-colors">
                <X size={20} className="text-slate-500" />
            </button>
            <h2 className="text-xl font-bold text-slate-800">历史足迹</h2>
         </div>
         <button 
            onClick={fetchMoreHistory} 
            disabled={isSyncing}
            className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg hover:bg-indigo-100 disabled:opacity-50"
         >
            {isSyncing ? '同步中...' : '同步更多历史'}
         </button>
       </div>
       <div className="space-y-6">
         {reviews?.map(review => <HistoryCard key={review.id} review={review} />)}
         {(!reviews || reviews.length === 0) && (
            <div className="text-center py-20 text-slate-400">
                <p>暂无本地历史复盘</p>
                <button onClick={fetchMoreHistory} className="mt-2 text-indigo-500 text-xs underline">尝试从云端同步</button>
            </div>
         )}
       </div>
    </div>
  );
};

const HistoryCard: React.FC<{ review: Review }> = ({ review }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-white/80 backdrop-blur rounded-2xl border border-white/60 shadow-sm overflow-hidden transition-all hover:shadow-md">
      <div className="p-5 flex justify-between items-start cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div>
          <div className="flex items-center gap-2 mb-1">
             <span className="font-bold text-lg text-slate-800">{review.date}</span>
             <span className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">{review.templateName || '通用复盘'}</span>
          </div>
          <div className="text-xs text-slate-400">{new Date(review.createdAt).toLocaleTimeString()} · 已记录</div>
        </div>
        {expanded ? <ChevronDown size={20} className="text-slate-400"/> : <ChevronRight size={20} className="text-slate-400"/>}
      </div>
      {review.aiSummary && (
        <div className="px-5 pb-5 pt-0">
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100/50 relative">
             <Bot size={20} className="absolute top-4 left-4 text-indigo-500" />
             <div className="pl-8">
               <h4 className="text-xs font-bold text-indigo-600 mb-1">AI 每日洞察</h4>
               <div className="text-sm text-slate-700 leading-relaxed prose prose-sm max-w-none"><ReactMarkdown>{review.aiSummary}</ReactMarkdown></div>
             </div>
          </div>
        </div>
      )}
      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-slate-100 pt-4">
          {review.answers ? review.answers.map((item, idx) => (
              <div key={idx}>
                <h4 className="text-xs font-bold text-slate-500 mb-1">{item.question}</h4>
                <p className="text-sm text-slate-800 whitespace-pre-wrap bg-white/50 p-3 rounded-lg border border-slate-100">{item.answer || <span className="text-slate-300 italic">未填写</span>}</p>
              </div>
            )) : <div className="text-sm text-slate-400">旧数据格式</div>}
        </div>
      )}
    </div>
  );
};

import { GoogleGenAI } from "@google/genai";
import { db } from "../db";
import { getHabits, getHabitLogsByDate } from "./habitService";
import { getTodayStr } from "../utils";

// 增加 contextData 参数，用于接收代办和记账数据
export const generateDailyInsight = async (reviewContent: string, contextData: string = ''): Promise<string> => {
  // 1. 获取配置 (处理可能为空的情况)
  const settingsList = await db.settings.toArray();
  const config = settingsList[0] || {
    aiProvider: 'gemini',
    geminiModel: 'gemini-3-flash-preview',
    geminiKey: '' // Explicitly empty if not found
  };

  const systemPrompt = `
    你是一个温暖、充满智慧的人生教练。
    请根据用户的【每日清单执行情况】、【记账数据】、【习惯打卡情况】以及【深度复盘内容】，生成一段“每日洞察”。
    
    要求：
    1. 结合用户今天的实际行动数据（是否完成了重要任务、时间投入方向、习惯完成情况）和他的主观复盘思考进行综合点评和洞察或者启发。
    2. 如果用户说做到了但数据没显示，或者数据很好但用户很焦虑，请敏锐地指出这种反差。
    3. 你像一位长者一样关爱晚辈也像一个资深的复盘教练不光帮我复盘同时指导我复盘。
    4. 字数控制在 2000 字以内，语言精炼。
    5. 使用 Markdown 格式。
  `;

  // Fetch Habit Data
  let habitContext = '';
  try {
      const todayStr = getTodayStr();
      const habits = await getHabits();
      const logs = await getHabitLogsByDate(todayStr);
      
      const activeHabits = habits.filter(h => !h.isArchived);
      const doneCount = logs.filter(l => l.type === 'green').length;
      const failCount = logs.filter(l => l.type === 'red').length;
      
      // Detailed status
      const habitDetails = activeHabits.map(h => {
          const log = logs.find(l => l.habitId === h.id);
          const status = log ? (log.type === 'green' ? '✅ 完成' : '🔴 未完成') : '⬜️ 未打卡';
          return `- ${h.name}: ${status}`;
      }).join('\n');

      habitContext = `
【今日习惯打卡】
- 活跃习惯数：${activeHabits.length}
- 今日完成：${doneCount}
- 今日未完成/跳过：${failCount}
- 详情：
${habitDetails}
`;
  } catch (e) {
      console.error("Failed to fetch habits in aiService", e);
  }
  
  // 组合用户内容
  const fullUserContent = `
【今日客观数据】
${contextData}
${habitContext}

【今日主观复盘】
${reviewContent}
`;

  // 2. 根据提供商调用
  if (config.aiProvider === 'openai') {
    return callOpenAICompatible(config, systemPrompt, fullUserContent);
  } else {
    // 默认走 Gemini
    return callGemini(config, systemPrompt, fullUserContent);
  }
};

async function callGemini(config: any, systemPrompt: string, userContent: string): Promise<string> {
  // 必须使用用户配置的 Key
  const apiKey = config.geminiKey;
  
  if (!apiKey) {
    throw new Error("未配置 API Key。请点击左上角设置，配置 Gemini Key。");
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const modelName = config.geminiModel || 'gemini-3-flash-preview';
    
    const response = await ai.models.generateContent({
      model: modelName,
      contents: `${systemPrompt}\n\n用户输入：\n${userContent}`,
    });

    if (!response.text) {
      throw new Error("AI 返回内容为空，请重试。");
    }
    return response.text;
  } catch (error: any) {
    console.error("Gemini AI Error:", error);
    // 抛出更友好的错误信息
    throw new Error(`Gemini 调用失败: ${error.message || '网络或 Key 错误'}`);
  }
}

async function callOpenAICompatible(config: any, systemPrompt: string, userContent: string): Promise<string> {
  const url = config.openaiUrl?.replace(/\/+$/, '') + '/chat/completions';
  const apiKey = config.openaiKey;
  const model = config.openaiModel || 'gpt-3.5-turbo';

  if (!url || !apiKey) {
    throw new Error("OpenAI 配置不完整，请检查 URL 和 Key。");
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Status ${response.status}: ${err}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("AI 返回内容为空");
    }
    return content;
  } catch (error: any) {
    console.error("OpenAI Compatible Error:", error);
    throw new Error(`AI 调用失败: ${error.message}`);
  }
}

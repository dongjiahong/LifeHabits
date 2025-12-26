# Product Guidelines: Life Habits

## Visual Identity & Design Language
- **Style**: **Glassmorphism (玻璃拟态)**. 使用半透明背景、柔和的阴影和背景模糊（Backdrop Blur）效果，营造出通透、轻盈的视觉感。
- **Color Palette**: 
    - 基础背景色: `#f8fafc` (Slate 50).
    - 主色调: 柔和的绿色 (`Emerald`) 代表成长与生命，温润的蓝色 (`Sky/Indigo`) 代表平静与深度。
    - 警示色: 珊瑚粉 (`Rose/Coral`) 替代尖锐的红色。
- **Typography**: 
    - 字体: `Noto Sans SC` (思源黑体).
    - 粗细: 常用 300 (Light) 和 400 (Regular) 保持纤细美感，700 用于关键标题。
- **Icons**: 使用 `Lucide React`，保持线条纤细 (Stroke width: 1.5 - 2px)，风格统一。

## Prose Style & Tone of Voice
- **Core Tone**: **温暖、包容、鼓励性**. 
- **Voice Guidelines**:
    - **禁止说教**: 避免使用“你应该”、“你必须”，改用“试着...”、“或许可以...”。
    - **正向反馈**: 在 AI 复盘和任务完成时，给予具体而非空洞的肯定。
    - **第一人称/第二人称**: 应用可以作为“我（你的成长助手）”或“我们（共同进步）”的语境与用户沟通。
    - **极简文案**: 按钮和操作提示尽量简短，让数据和内容自己说话。

## Interaction Principles
- **Minimalism First**: 每个界面只保留最核心的操作。非高频功能应通过二级菜单或长按呼出。
- **Physical Feedback**: 习惯花园中的“豆子”下落应有物理规律的动态反馈，增强交互的真实感。
- **Desktop Adaptive**: 在桌面端采用受限宽度的居中容器布局，通过悬浮态 (Hover) 增强和微量缩放动画提升桌面鼠标操作的愉悦度与反馈感。
- **Local-First Speed**: 所有的操作必须是瞬时完成的，不应因为等待网络同步而产生阻塞感。

## AI Interaction Logic
- **Empathy**: AI 生成的洞察报告不仅要分析数据，更要关注用户的情绪波动。
- **Insightful**: 避免废话。AI 应该从待办完成情况和记账流向中，发现用户自己没注意到的模式（例如：每到周三下午记账显示咖啡消费激增，且待办完成率下降）。

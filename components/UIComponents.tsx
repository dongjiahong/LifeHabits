import React, { useId } from 'react';
import { X, ChevronDown, Trophy, Medal } from 'lucide-react';

// 卡片容器
export const Card: React.FC<{ children: React.ReactNode; className?: string; title?: string; onClick?: () => void }> = ({
  children,
  className = '',
  title,
  onClick,
}) => (
  <div 
    onClick={onClick} 
    className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-5 transition-all duration-300 ${onClick ? 'cursor-pointer hover:shadow-md hover:scale-[1.01] active:scale-[0.99]' : ''} ${className}`}
  >
    {title && <h3 className="text-lg font-bold text-slate-800 mb-4">{title}</h3>}
    {children}
  </div>
);

// 进度条
export const ProgressBar: React.FC<{ progress: number; color?: string; className?: string }> = ({
  progress,
  color = 'bg-indigo-600',
  className = '',
}) => (
  <div className={`w-full bg-slate-100 rounded-full h-2 overflow-hidden ${className}`}>
    <div
      data-testid="progress-bar-inner"
      className={`h-full transition-all duration-500 ease-out ${color}`}
      style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
    />
  </div>
);

// 里程碑图标
export const MilestoneIcon: React.FC<{ active?: boolean; className?: string; size?: number }> = ({
  active = false,
  className = '',
  size = 16,
}) => (
  <div 
    data-testid="milestone-icon"
    className={`p-1.5 rounded-lg transition-colors ${active ? 'bg-amber-50 text-amber-500' : 'bg-slate-50 text-slate-400'} ${className}`}
  >
    <Trophy size={size} />
  </div>
);

// 徽章/状态标签
export const Badge: React.FC<{ children: React.ReactNode; color?: string; className?: string; onClick?: () => void }> = ({
  children,
  color = 'bg-slate-100 text-slate-600',
  className = '',
  onClick
}) => (
  <span onClick={onClick} className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${color} ${className}`}>
    {children}
  </span>
);

// 按钮
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) => {
  const baseStyle = "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none hover:scale-[1.02] active:scale-[0.98]";
  
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 focus:ring-slate-500",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 focus:ring-red-500",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-50 focus:ring-slate-400",
  };

  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base",
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// 输入框
interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  size?: 'sm' | 'md';
}

export const Input: React.FC<InputProps> = ({ label, size = 'md', className = '', id: propsId, ...props }) => {
  const generatedId = useId();
  const id = propsId || generatedId;
  const sizeClass = size === 'sm' ? 'h-9 text-xs px-2.5' : 'h-11 px-3 text-sm';
  
  return (
    <div className="w-full">
      {label && <label htmlFor={id} className={`block font-medium text-slate-700 mb-1.5 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>{label}</label>}
      <input
        id={id}
        className={`w-full rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none placeholder:text-slate-400 ${sizeClass} ${className}`}
        {...props}
      />
    </div>
  );
};

// 下拉选择框
interface SelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  size?: 'sm' | 'md';
  className?: string;
  id?: string;
}

export const Select: React.FC<SelectProps> = ({ label, value, onChange, options, size = 'md', className = '', id: propsId }) => {
  const generatedId = useId();
  const id = propsId || generatedId;
  const [isOpen, setIsOpen] = React.useState(false);
  
  const sizeClass = size === 'sm' ? 'h-9 text-xs px-2.5' : 'h-11 px-3 text-sm';
  const selectedLabel = options.find(opt => opt.value === value)?.label || value;

  return (
    <div className="w-full relative">
      {label && <label htmlFor={id} className={`block font-medium text-slate-700 mb-1.5 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>{label}</label>}
      
      {/* Trigger Button */}
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none ${sizeClass} ${className}`}
      >
        <span className={!value ? 'text-slate-400' : ''}>{selectedLabel}</span>
        <ChevronDown size={size === 'sm' ? 14 : 16} className="text-slate-400" />
      </button>

      {/* Backdrop for click-outside */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)} 
        />
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-lg z-50 overflow-hidden animate-scale-in origin-top">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors flex items-center justify-between ${size === 'sm' ? 'text-xs' : 'text-sm'} ${value === opt.value ? 'text-indigo-600 bg-indigo-50/50 font-medium' : 'text-slate-700'}`}
            >
              {opt.label}
              {value === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// 文本域
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, className = '', ...props }) => (
  <div className="w-full">
    {label && <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>}
    <textarea
      className={`w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none placeholder:text-slate-400 resize-none ${className}`}
      {...props}
    />
  </div>
);

// 弹窗组件
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Content */}
      <div className="relative w-full max-w-sm bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden animate-scale-in border border-white/50">
        <div className="flex justify-between items-center p-4 border-b border-slate-100/50">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>
        <div className="p-5 max-h-[70vh] overflow-y-auto no-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};
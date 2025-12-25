import React, { useId } from 'react';
import { X, ChevronDown } from 'lucide-react';

// 卡片容器
export const Card: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({
  children,
  className = '',
  title,
}) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-5 ${className}`}>
    {title && <h3 className="text-lg font-bold text-slate-800 mb-4">{title}</h3>}
    {children}
  </div>
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
  const baseStyle = "inline-flex items-center justify-center rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none";
  
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
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
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
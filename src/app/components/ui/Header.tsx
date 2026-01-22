import React from 'react';
import { LucideIcon } from 'lucide-react';

interface HeaderProps {
  title: string;
  subTitle?: string;
  actionIcon?: LucideIcon;
  onAction?: () => void;
  branchControl?: React.ReactNode;
  variant?: 'default' | 'simple';
}

/**
 * Универсальный компонент шапки для всех экранов
 * Поддерживает два варианта: полный (default) и упрощенный (simple)
 */
export const Header: React.FC<HeaderProps> = ({ 
  title, 
  subTitle, 
  actionIcon: ActionIcon, 
  onAction, 
  branchControl,
  variant = 'default' 
}) => {
  if (variant === 'simple') {
    return (
      <div className="px-6 pt-12 pb-4 bg-white border-b border-zinc-200 flex items-center justify-between sticky top-0 z-10 shrink-0">
        <h1 className="text-2xl font-black">{title}</h1>
        {ActionIcon && onAction && (
          <button 
            onClick={onAction} 
            className="bg-black text-white p-2.5 rounded-full shadow-lg active:scale-95 transition-all"
          >
            <ActionIcon size={20} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-200/50 px-6 pt-12 pb-3 shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-3xl font-black text-black tracking-tight leading-none">
            {title}
          </h1>
          {subTitle && (
            <p className="text-xs font-semibold text-zinc-400 mt-1 uppercase tracking-wide">
              {subTitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {branchControl}
          {ActionIcon && onAction && (
            <button 
              onClick={onAction} 
              className="w-9 h-9 rounded-full flex items-center justify-center bg-black text-white shadow-md active:scale-95 transition-all"
            >
              <ActionIcon size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

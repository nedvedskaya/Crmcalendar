import { LogOut, User, Shield, ChevronDown } from 'lucide-react';
import { getUserAuth, logout, getRoleName } from '@/utils/auth';
import { isAdmin } from '@/utils/permissions';
import { useState } from 'react';

interface UserMenuProps {
  onLogout: () => void;
}

export const UserMenu = ({ onLogout }: UserMenuProps) => {
  const user = getUserAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (!user) return null;

  const handleLogout = () => {
    if (confirm('Вы уверены, что хотите выйти?')) {
      logout();
      onLogout();
    }
  };

  const userIsAdmin = isAdmin(user.role);

  return (
    <div className="bg-white border-b border-zinc-200 px-4 py-2 relative">
      <div className="flex items-center justify-between">
        {/* Информация о пользователе - кликабельная */}
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="flex items-center gap-1.5 hover:bg-zinc-50 px-2 py-1.5 rounded-lg transition-all"
        >
          <div className="text-xs font-bold text-zinc-900">{user.name}</div>
          <ChevronDown 
            size={14} 
            className={`text-zinc-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} 
          />
        </button>
      </div>

      {/* Выпадающее меню */}
      {isMenuOpen && (
        <>
          {/* Backdrop для закрытия меню */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsMenuOpen(false)}
          />
          
          {/* Меню */}
          <div className="absolute top-full left-4 mt-1 bg-white rounded-xl shadow-xl border border-zinc-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 min-w-[160px]">
            <button
              onClick={() => {
                setIsMenuOpen(false);
                handleLogout();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors group"
            >
              <LogOut size={16} className="text-zinc-600 group-hover:text-red-600 transition-colors" />
              <span className="text-sm font-bold text-zinc-700 group-hover:text-red-600 transition-colors">
                Выйти
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
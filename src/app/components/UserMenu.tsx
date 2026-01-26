import { LogOut, User, ChevronDown } from 'lucide-react';
import { getUserAuth, logout } from '@/utils/auth';
import { useState } from 'react';

interface UserMenuProps {
  onLogout: () => void;
  onShowProfile?: () => void;
}

export const UserMenu = ({ onLogout, onShowProfile }: UserMenuProps) => {
  const user = getUserAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (!user) return null;

  const handleLogout = async () => {
    if (confirm('Вы уверены, что хотите выйти?')) {
      await logout();
      onLogout();
    }
  };

  return (
    <div className="bg-white border-b border-zinc-200 px-4 py-2 relative">
      <div className="flex items-center justify-between">
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

      {isMenuOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsMenuOpen(false)}
          />
          
          <div className="absolute top-full left-4 mt-1 bg-white rounded-xl shadow-xl border border-zinc-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 min-w-[160px]">
            {onShowProfile && (
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onShowProfile();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors group border-b border-zinc-100"
              >
                <User size={16} className="text-zinc-600" />
                <span className="text-sm font-medium text-zinc-700">
                  Профиль
                </span>
              </button>
            )}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                handleLogout();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors group"
            >
              <LogOut size={16} className="text-zinc-600 group-hover:text-red-600 transition-colors" />
              <span className="text-sm font-medium text-zinc-700 group-hover:text-red-600 transition-colors">
                Выйти
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

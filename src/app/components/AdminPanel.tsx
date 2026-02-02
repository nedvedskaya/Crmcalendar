import { useState, useEffect } from 'react';
import { Users, Activity, UserPlus, Search, Shield, ShieldOff, Clock, ArrowLeft, X } from 'lucide-react';
import { api } from '@/utils/api';
import { getRoleName } from '@/utils/permissions';

interface User {
  id: number;
  username: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role: string;
  isOwner: boolean;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

interface ActivityLog {
  id: number;
  userId: number;
  userName: string;
  action: string;
  entityType?: string;
  entityId?: number;
  entityName?: string;
  details?: string;
  ipAddress?: string;
  createdAt: string;
}

interface AdminPanelProps {
  onBack: () => void;
}

type AdminTab = 'users' | 'logs' | 'add-user';

export const AdminPanel = ({ onBack }: AdminPanelProps) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    role: 'manager'
  });

  useEffect(() => {
    loadUsers();
    loadLogs();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminUsers({ search: searchQuery || undefined });
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      const data = await api.getActivityLogs({ limit: 100 });
      setLogs(data);
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  };

  const handleSearch = () => {
    loadUsers();
  };

  const handleBlockUser = async (user: User) => {
    if (user.isOwner) {
      alert('Нельзя заблокировать владельца');
      return;
    }
    
    const action = user.isActive ? 'заблокировать' : 'разблокировать';
    if (!confirm(`Вы уверены, что хотите ${action} пользователя ${user.name}?`)) return;
    
    try {
      await api.blockUser(user.id, !user.isActive);
      loadUsers();
      loadLogs();
    } catch (error) {
      alert('Ошибка при изменении статуса пользователя');
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password || !newUser.name) {
      alert('Заполните все обязательные поля');
      return;
    }
    
    try {
      await api.createAdminUser(newUser);
      setNewUser({ username: '', password: '', name: '', email: '', role: 'manager' });
      setShowAddModal(false);
      loadUsers();
      loadLogs();
    } catch (error: any) {
      alert(error.message || 'Ошибка при создании пользователя');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'login': 'Вход в систему',
      'logout': 'Выход из системы',
      'user_created': 'Создание пользователя',
      'user_updated': 'Обновление пользователя',
      'user_deleted': 'Удаление пользователя',
      'user_blocked': 'Блокировка пользователя',
      'user_unblocked': 'Разблокировка пользователя',
      'client_created': 'Создание клиента',
      'client_updated': 'Обновление клиента',
      'client_deleted': 'Удаление клиента'
    };
    return labels[action] || action;
  };

  const navItems = [
    { id: 'users' as AdminTab, label: 'Пользователи', icon: Users },
    { id: 'logs' as AdminTab, label: 'Логи действий', icon: Activity }
  ];

  return (
    <div className="flex h-screen bg-zinc-100">
      <div className="w-64 bg-zinc-900 text-white flex flex-col">
        <div className="p-6 border-b border-zinc-800">
          <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-4">
            <ArrowLeft size={18} />
            <span className="text-sm">Назад</span>
          </button>
          <h1 className="text-xl font-bold">Админ-панель</h1>
          <p className="text-zinc-500 text-sm mt-1">Управление системой</p>
        </div>
        
        <nav className="flex-1 p-4">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                activeTab === item.id 
                  ? 'bg-white/10 text-white' 
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
        
        <div className="p-4 border-t border-zinc-800">
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition-colors"
          >
            <UserPlus size={18} />
            <span className="font-medium">Добавить менеджера</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {activeTab === 'users' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-zinc-900">Пользователи</h2>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    <input
                      type="text"
                      placeholder="Поиск по имени или email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="pl-10 pr-4 py-2.5 border border-zinc-200 rounded-lg w-80 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    className="px-4 py-2.5 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
                  >
                    Найти
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-zinc-50 border-b border-zinc-200">
                    <tr>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-zinc-600">Пользователь</th>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-zinc-600">Email</th>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-zinc-600">Роль</th>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-zinc-600">Статус</th>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-zinc-600">Последний вход</th>
                      <th className="text-right px-6 py-4 text-sm font-semibold text-zinc-600">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                          Загрузка...
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                          Пользователи не найдены
                        </td>
                      </tr>
                    ) : (
                      users.map(user => (
                        <tr key={user.id} className="hover:bg-zinc-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-zinc-200 rounded-full flex items-center justify-center text-zinc-600 font-medium">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium text-zinc-900">{user.name}</div>
                                <div className="text-sm text-zinc-500">@{user.username}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-zinc-600">{user.email || '-'}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                              user.isOwner 
                                ? 'bg-amber-100 text-amber-700' 
                                : user.role === 'manager' 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-zinc-100 text-zinc-700'
                            }`}>
                              {user.isOwner && <Shield size={12} />}
                              {getRoleName(user.role as any)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                              user.isActive 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {user.isActive ? 'Активен' : 'Заблокирован'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-zinc-500 text-sm">
                            {user.lastLogin ? formatDate(user.lastLogin) : 'Никогда'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {!user.isOwner && (
                              <button
                                onClick={() => handleBlockUser(user)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                  user.isActive 
                                    ? 'text-red-600 hover:bg-red-50' 
                                    : 'text-green-600 hover:bg-green-50'
                                }`}
                              >
                                {user.isActive ? (
                                  <>
                                    <ShieldOff size={14} />
                                    Заблокировать
                                  </>
                                ) : (
                                  <>
                                    <Shield size={14} />
                                    Разблокировать
                                  </>
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Опасная зона */}
              <div className="mt-8 p-6 border-2 border-red-200 rounded-xl bg-red-50/50">
                <h3 className="text-lg font-bold text-red-900 mb-2">Опасная зона</h3>
                <p className="text-sm text-red-700 mb-4">Удаление всех данных приложения (клиенты, задачи, транзакции, брони). Это действие нельзя отменить.</p>
                <button
                  onClick={async () => {
                    if (window.confirm('Вы уверены? Это удалит ВСЕ данные (клиентов, задачи, финансы, брони). Действие нельзя отменить!')) {
                      try {
                        await api.clearAllData();
                        alert('Все данные успешно удалены. Страница будет перезагружена.');
                        window.location.reload();
                      } catch (error) {
                        alert('Ошибка при удалении данных');
                      }
                    }
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  Удалить все данные
                </button>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-zinc-900">Логи действий</h2>
                <button
                  onClick={loadLogs}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg transition-colors"
                >
                  Обновить
                </button>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-zinc-50 border-b border-zinc-200">
                    <tr>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-zinc-600">Время</th>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-zinc-600">Пользователь</th>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-zinc-600">Действие</th>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-zinc-600">Объект</th>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-zinc-600">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                          Логи пока отсутствуют
                        </td>
                      </tr>
                    ) : (
                      logs.map(log => (
                        <tr key={log.id} className="hover:bg-zinc-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-sm text-zinc-600">
                              <Clock size={14} className="text-zinc-400" />
                              {formatDate(log.createdAt)}
                            </div>
                          </td>
                          <td className="px-6 py-4 font-medium text-zinc-900">{log.userName || 'Система'}</td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 bg-zinc-100 text-zinc-700 rounded-lg text-sm">
                              {getActionLabel(log.action)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-zinc-600">
                            {log.entityName || (log.entityType ? `${log.entityType} #${log.entityId}` : '-')}
                          </td>
                          <td className="px-6 py-4 text-zinc-500 text-sm font-mono">{log.ipAddress || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-zinc-200">
              <h3 className="text-lg font-semibold text-zinc-900">Добавить менеджера</h3>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-400 hover:text-zinc-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Логин *</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Пароль *</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                  minLength={6}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Имя *</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Роль</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="manager">Менеджер</option>
                  <option value="master">Мастер</option>
                </select>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 border border-zinc-200 text-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

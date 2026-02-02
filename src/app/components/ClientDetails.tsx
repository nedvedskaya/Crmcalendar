import { useState } from 'react';
import { 
  ChevronLeft, Edit3, Trash2, Phone, MessageSquare, 
  CalendarDays, CheckCircle2, RotateCcw, History, 
  ChevronDown, AlertOctagon, Coins, Users, CheckSquare, 
  Calendar, Wallet 
} from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { BranchSelector } from '@/app/components/ui/BranchSelector';
import { TaskFormFields } from '@/app/components/forms/TaskFormFields';
import { AppointmentInputs } from '@/app/components/forms/AppointmentInputs';
import { BTN_METAL, CARD_METAL } from '@/utils/constants';
import { formatDate, formatMoney, getDateStr } from '@/utils/helpers';
import { getInitialTaskState, getInitialRecordState } from '@/utils/initialStates';
import { sanitizeTelUrl, sanitizeWhatsAppUrl, safeOpenLink } from '@/utils/sanitize';
import { canAccessTab } from '@/utils/permissions';

interface ClientDetailsProps {
  client: any;
  onBack: () => void;
  tasks: any[];
  onEdit: () => void;
  onAddTask: (task: any) => void;
  onDelete: () => void;
  onToggleTask: (id: any) => void;
  onAddRecord: (clientId: any, record: any) => void;
  onEditRecord: (clientId: any, recordId: any, record: any) => void;
  onCompleteRecord: (clientId: any, recordId: any) => void;
  onRestoreRecord: (clientId: any, recordId: any) => void;
  onDeleteTask: (id: any) => void;
  onEditTask: (task: any) => void;
  onUpdateBranch?: (clientId: any, branch: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  categories: any[];
  userRole?: string;
}

const TaskItem = ({ task, onToggle, onDelete, onEdit }: any) => {
  const isOverdue = task.date < getDateStr(0) && !task.completed;
  const isUrgent = task.urgency === 'high' || task.isUrgent;
  
  return (
    <div className={`p-4 rounded-xl border ${task.completed ? 'bg-zinc-50 border-zinc-200 opacity-60' : isOverdue ? 'bg-red-50 border-red-200' : isUrgent ? 'bg-orange-50 border-orange-200' : 'bg-white border-zinc-200'} shadow-sm`}>
      <div className="flex items-start gap-3">
        <button 
          onClick={() => onToggle(task.id)}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${task.completed ? 'bg-green-500 border-green-500 text-white' : 'border-zinc-300 hover:border-zinc-400'}`}
        >
          {task.completed && <CheckCircle2 size={14} />}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`font-bold text-sm ${task.completed ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>
            {task.title || task.task}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs ${isOverdue ? 'text-red-500 font-bold' : 'text-zinc-400'}`}>
              {formatDate(task.date)} • {task.time}
            </span>
            {isUrgent && !task.completed && (
              <span className="text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded font-bold">
                СРОЧНО
              </span>
            )}
          </div>
        </div>
        {!task.completed && onEdit && (
          <button onClick={() => onEdit(task)} className="text-zinc-400 hover:text-zinc-600">
            <Edit3 size={16} />
          </button>
        )}
        {!task.completed && onDelete && (
          <button onClick={() => onDelete(task.id)} className="text-red-400 hover:text-red-600">
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export const ClientDetails = ({ 
  client, onBack, tasks, onEdit, onAddTask, onDelete, onToggleTask, 
  onAddRecord, onEditRecord, onCompleteRecord, onRestoreRecord, 
  onDeleteTask, onEditTask, onUpdateBranch, activeTab, setActiveTab, 
  categories, userRole = 'owner' 
}: ClientDetailsProps) => {
  const clientTasks = tasks.filter(t => t.clientId === client.id);
  const activeTasks = clientTasks.filter(t => !t.completed);
  const completedTasks = clientTasks.filter(t => t.completed);
  const [showArchive, setShowArchive] = useState(false);
  const [showRecordsArchive, setShowRecordsArchive] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [newTask, setNewTask] = useState(getInitialTaskState(client.branch));
  const [isAddingRecord, setIsAddingRecord] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<any>(null);
  const [newRecord, setNewRecord] = useState(getInitialRecordState(client.branch));
  const [completingRecordId, setCompletingRecordId] = useState<any>(null);
  
  const clientRecords = client.records || [];
  const today = getDateStr(0);
  
  const activeRecords = clientRecords.filter((r: any) => !r.isCompleted && r.date >= today);
  const archivedRecords = clientRecords
    .filter((r: any) => r.isCompleted || r.date < today)
    .sort((a: any, b: any) => b.date.localeCompare(a.date));
  
  const totalEarnings = clientRecords.reduce((sum: number, record: any) => {
    if (record.paymentStatus === 'paid') {
      const amount = Number(record.amount) || 0;
      return sum + amount;
    }
    return sum;
  }, 0);
  
  const handleCompleteClick = (recordId: any) => {
    setCompletingRecordId(recordId);
    setTimeout(() => {
      onCompleteRecord(client.id, recordId);
      setCompletingRecordId(null);
    }, 300);
  };
  
  const handleEditTask = (task: any) => {
    setEditingTask(task);
    setNewTask({
      title: task.title || '',
      date: task.date || getDateStr(0),
      time: task.time || '12:00',
      isUrgent: task.isUrgent || task.urgency === 'high',
      branch: task.branch || client.branch
    });
    setIsAddingTask(true);
  };
  
  const handleSaveTask = () => {
    if (editingTask) {
      onEditTask({ ...editingTask, ...newTask, urgency: newTask.isUrgent ? 'high' : 'low' });
      setEditingTask(null);
    } else {
      onAddTask({...newTask, clientId: client.id, clientName: client.name, completed: false, urgency: newTask.isUrgent ? 'high' : 'low'});
    }
    setIsAddingTask(false);
    setNewTask(getInitialTaskState(client.branch));
  };
  
  const handleCancelTask = () => {
    setIsAddingTask(false);
    setEditingTask(null);
    setNewTask(getInitialTaskState(client.branch));
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[120] bg-zinc-50 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300" style={{bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))'}}>
      <div className="px-5 pb-4 bg-white border-b border-zinc-200 flex items-center justify-between shrink-0" style={{paddingTop: 'max(env(safe-area-inset-top, 12px), 48px)'}}>
        <button onClick={onBack} className="flex items-center gap-1 text-zinc-600 font-bold"><ChevronLeft size={24} /> Назад</button>
        <div className="flex gap-4"><button onClick={onEdit} className="text-zinc-500 hover:text-black transition-colors"><Edit3 size={20} /></button><button onClick={onDelete} className="text-red-500 transition-colors"><Trash2 size={20} /></button></div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-8 overscroll-contain" style={{paddingBottom: '40px', WebkitOverflowScrolling: 'touch'} as any}>
        <div className="text-center">
          <h2 className="text-3xl font-black text-black leading-tight mb-2">{String(client.name || '')}</h2>
          <span className="text-xl font-medium text-zinc-400">{String(client.phone || '')}</span>
          
          <div className="flex justify-center mt-4 mb-6">
            <BranchSelector
              value={client.branch}
              onChange={(branch) => onUpdateBranch && onUpdateBranch(client.id, branch)}
              size="md"
            />
          </div>
          
          <div className="flex gap-3 w-full">
            <Button 
              variant="primary" 
              icon={Phone} 
              onClick={() => {
                const telUrl = sanitizeTelUrl(client.phone);
                if (telUrl) window.location.href = telUrl;
              }} 
              className="flex-1"
            >
              Позвонить
            </Button>
            <Button 
              variant="primary" 
              icon={MessageSquare} 
              onClick={() => {
                const waUrl = sanitizeWhatsAppUrl(client.phone);
                if (waUrl) safeOpenLink(waUrl);
              }} 
              className="flex-1"
            >
              WhatsApp
            </Button>
          </div>
        </div>
        <div className={`rounded-2xl p-5 ${CARD_METAL} space-y-4 shadow-sm`}>
          <div className="flex justify-between border-b border-zinc-100 pb-3 text-sm font-medium"><span className="text-zinc-500">Автомобиль</span><div className="flex gap-2 font-bold"><span className="bg-black text-white px-2 py-0.5 rounded text-xs uppercase tracking-tighter">{String(client.carBrand || '')}</span><span className="text-zinc-800 tracking-tight">{String(client.carModel || '')}</span></div></div>
          <div className="flex justify-between border-b border-zinc-100 pb-3 text-sm font-medium"><span className="text-zinc-500">Город</span><span className="font-bold text-zinc-800">{String(client.city || '')}</span></div>
          <div className="flex justify-between border-b border-zinc-100 pb-3 text-sm font-medium"><span className="text-zinc-500">Дата рождения</span><span className="font-bold text-zinc-800">{client.birthDate ? formatDate(client.birthDate) : '-'}</span></div>
          <div className="flex justify-between text-sm font-medium"><span className="text-zinc-500">В базе с</span><span className="font-bold text-zinc-800">{client.createdAt ? formatDate(client.createdAt) : formatDate(getDateStr(0))}</span></div>
        </div>
        
        {totalEarnings > 0 && (
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Coins size={18} className="text-orange-100" />
              <span className="text-xs font-black text-orange-100 uppercase tracking-widest">Всего принес</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-white">{formatMoney(totalEarnings)}</span>
              <span className="text-lg font-bold text-orange-100">₽</span>
            </div>
            <p className="text-xs text-orange-100 mt-1 font-medium">За {clientRecords.filter((r: any) => r.paymentStatus === 'paid').length} {clientRecords.filter((r: any) => r.paymentStatus === 'paid').length === 1 ? 'бронь' : 'броней'}</p>
          </div>
        )}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 text-zinc-700 leading-relaxed text-sm shadow-sm">{String(client.comment || "Нет заметок.")}</div>
        
        {/* Бронь */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">Бронь</span>
            {!isAddingRecord && !editingRecordId && (
              <button onClick={() => setIsAddingRecord(true)} className={`text-[10px] font-bold px-3 py-1.5 rounded-lg ${BTN_METAL}`}>
                + Добавить
              </button>
            )}
          </div>
          
          {(isAddingRecord || editingRecordId) && (
            <div className="space-y-4 mb-4">
              <AppointmentInputs data={newRecord} onChange={(e: any) => setNewRecord({...newRecord, [e.target.name]: e.target.value})} categories={categories || []} />
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsAddingRecord(false); 
                    setEditingRecordId(null); 
                    setNewRecord(getInitialRecordState(client.branch));
                  }}
                  className="flex-1"
                >
                  Отмена
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    if (editingRecordId) { 
                      onEditRecord(client.id, editingRecordId, newRecord); 
                    } else { 
                      onAddRecord(client.id, newRecord); 
                    } 
                    setIsAddingRecord(false); 
                    setEditingRecordId(null); 
                    setNewRecord(getInitialRecordState(client.branch));
                  }}
                  className="flex-1"
                >
                  Сохранить
                </Button>
              </div>
            </div>
          )}
          
          {activeRecords.length > 0 ? (
            <div className="space-y-3">
              {activeRecords.map((record: any) => {
                const category = categories?.find(cat => cat.id === record.category);
                const isMsk = record.branch === 'msk';
                const isRnd = record.branch === 'rnd';
                
                const topBarColor = isMsk 
                  ? 'bg-gradient-to-r from-orange-600 to-orange-700'
                  : isRnd 
                  ? 'bg-gradient-to-r from-blue-700 to-blue-800'
                  : 'bg-gradient-to-r from-zinc-400 to-zinc-500';
                
                const iconColor = isMsk 
                  ? 'text-orange-600'
                  : isRnd 
                  ? 'text-blue-700'
                  : 'text-zinc-500';
                
                return (
                  <div key={record.id} className="space-y-2">
                    <div className="rounded-2xl bg-white border border-zinc-200 shadow-md overflow-hidden">
                      <div className={`h-1.5 ${topBarColor}`}></div>
                      
                      <div className="p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CalendarDays size={18} className={iconColor} />
                            <span className="text-sm font-bold text-zinc-900">Активная бронь</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {record.branch && (
                              <Badge variant={record.branch === 'msk' ? 'branch-msk' : 'branch-rnd'}>
                                {record.branch === 'msk' ? 'МСК' : 'РНД'}
                              </Badge>
                            )}
                            {record.paymentStatus === 'paid' && <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-lg font-semibold">Оплачено</span>}
                            {record.paymentStatus === 'advance' && <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-lg font-semibold">Аванс</span>}
                            {(!record.paymentStatus || record.paymentStatus === 'none') && <span className="text-xs bg-orange-100 text-orange-700 px-2.5 py-1 rounded-lg font-semibold">Не оплачено</span>}
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="text-2xl font-black text-zinc-900 leading-tight">{String(record.service || '')}</h3>
                          {category && (
                            <div className="flex items-center gap-1.5 mt-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: category.color }} />
                              <span className="text-sm text-zinc-500 font-medium">{category.name}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 pt-3 border-t border-zinc-100">
                          <div className="flex items-center gap-2 flex-1">
                            <CalendarDays size={16} className="text-orange-500 shrink-0" />
                            <div>
                              <p className="text-base font-bold text-zinc-900">{formatDate(record.date)}</p>
                              {record.endDate && record.endDate !== record.date && (
                                <p className="text-xs text-orange-500 font-medium mt-0.5">→ {formatDate(record.endDate)}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-base">⏰</span>
                            <p className="text-base font-bold text-zinc-900">{String(record.time || '')}</p>
                          </div>
                        </div>
                        
                        {record.amount && (
                          <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
                            <span className="text-sm text-zinc-500 font-medium">Сумма</span>
                            <div className="text-right">
                              <p className="text-2xl font-black text-orange-500">{formatMoney(record.amount)} ₽</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          setNewRecord(record);
                          setEditingRecordId(record.id);
                        }} 
                        className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 ${BTN_METAL} font-bold text-sm`}
                      >
                        <Edit3 size={16} />
                        Редактировать
                      </button>
                      <button 
                        onClick={() => handleCompleteClick(record.id)} 
                        className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm shadow-md active:scale-95 transition-all duration-300 ${
                          completingRecordId === record.id 
                          ? 'bg-gradient-to-b from-orange-500 to-orange-600 text-white scale-[0.98]' 
                          : `${BTN_METAL}`
                        }`}
                      >
                        <CheckCircle2 size={16} />
                        Выполнено
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : !isAddingRecord && !editingRecordId && (
            <div className="p-4 rounded-xl border border-dashed border-zinc-300 text-center text-xs text-zinc-400 italic">
              Нет активных броней
            </div>
          )}
          
          {archivedRecords.length > 0 && (
            <div className="mt-6">
              <button 
                onClick={() => setShowRecordsArchive(!showRecordsArchive)} 
                className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3 hover:text-zinc-600 transition-all"
              >
                <History size={12} />
                Архив броней ({archivedRecords.length})
                <ChevronDown size={12} className={`transition-transform ${showRecordsArchive ? 'rotate-180' : ''}`} />
              </button>
              {showRecordsArchive && (
                <div className="space-y-3 animate-in fade-in">
                  {archivedRecords.map((record: any) => (
                    <div key={record.id} className="rounded-xl bg-white border border-zinc-200 shadow-sm overflow-hidden">
                      <div className="h-1 bg-gradient-to-r from-zinc-300 to-zinc-400"></div>
                      
                      <div className="p-4 space-y-2 relative">
                        <div className="flex items-center gap-2 justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 size={14} className="text-green-600" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Выполнено</span>
                            {record.isPaid && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold">Оплачено</span>}
                          </div>
                          
                          <button 
                            onClick={() => {
                              if (window.confirm('Восстановить бронь? Связанная транзакция будет удалена из финансов.')) {
                                onRestoreRecord(client.id, record.id);
                              }
                            }} 
                            className="p-1.5 rounded-lg bg-gradient-to-b from-orange-500 to-orange-600 text-white shadow-sm hover:shadow-md active:scale-90 transition-all duration-200"
                            title="Восстановить бронь"
                          >
                            <RotateCcw size={14} />
                          </button>
                        </div>
                        <p className="text-base font-bold text-zinc-700">{String(record.service || '')}</p>
                        <div className="flex justify-between items-center">
                          <p className="text-sm font-medium text-zinc-500">{formatDate(record.date)} • {String(record.time || '')}</p>
                          <p className="text-lg font-black text-zinc-800">{formatMoney(record.amount)} ₽</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Задачи */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">Задачи</span>
            <button onClick={() => setIsAddingTask(true)} className={`text-[10px] font-bold px-3 py-1.5 rounded-lg ${BTN_METAL}`}>+ Создать</button>
          </div>
          {isAddingTask && (
            <div className="bg-white p-4 rounded-2xl border border-zinc-300 shadow-sm space-y-3 mb-4 animate-in fade-in">
              <TaskFormFields
                taskData={{
                  title: String(newTask.title || ''),
                  date: String(newTask.date || ''),
                  time: String(newTask.time || ''),
                  isUrgent: newTask.isUrgent
                }}
                onChange={(e: any) => setNewTask({...newTask, [e.target.name]: e.target.value})}
                onToggleUrgent={() => setNewTask({...newTask, isUrgent: !newTask.isUrgent})}
              />
              
              <button 
                onClick={() => setNewTask({...newTask, isUrgent: !newTask.isUrgent})} 
                className={`w-full py-3 rounded-xl text-xs font-bold border-2 transition-all flex items-center justify-center gap-2 ${newTask.isUrgent ? 'bg-gradient-to-r from-red-500 to-orange-500 border-red-500 text-white shadow-lg' : 'bg-white border-zinc-300 text-zinc-400 hover:border-zinc-400'}`}
              >
                {newTask.isUrgent && <AlertOctagon size={16} strokeWidth={3} />}
                {newTask.isUrgent ? 'СРОЧНО' : 'Отметить как срочное'}
              </button>
              
              <div className="flex gap-2">
                <Button variant="secondary" onClick={handleCancelTask} className="flex-1">Отмена</Button>
                <Button variant="primary" onClick={handleSaveTask} className="flex-1">
                  {editingTask ? 'Сохранить' : 'Добавить'}
                </Button>
              </div>
            </div>
          )}
          <div className="space-y-2">{activeTasks.map(t => <TaskItem key={t.id} task={t} onToggle={onToggleTask} onDelete={onDeleteTask} onEdit={handleEditTask} />)}</div>
          {completedTasks.length > 0 && (<div className="mt-6"><button onClick={() => setShowArchive(!showArchive)} className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3 hover:text-zinc-600 transition-all">Архив ({completedTasks.length}) <ChevronDown size={12} className={showArchive ? 'rotate-180' : ''} /></button>{showArchive && <div className="space-y-2 opacity-60 animate-in fade-in">{completedTasks.map(t => <TaskItem key={t.id} task={t} onToggle={onToggleTask} />)}</div>}</div>)}
        </div>
      </div>
      
      {/* Навигация внизу карточки клиента */}
      <div className="sticky bottom-0 bg-white border-t border-zinc-200 px-4 shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]" style={{paddingBottom: 'max(env(safe-area-inset-bottom, 8px), 8px)', paddingTop: '8px'}}>
        <div className="flex justify-around">
          {canAccessTab(userRole, 'clients') && (
            <button 
              onClick={() => { onBack(); setActiveTab('clients'); }}
              className="flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all active:scale-95"
            >
              <Users size={22} className="text-zinc-400" />
              <span className="text-[10px] font-bold text-zinc-400">Клиенты</span>
            </button>
          )}
          {canAccessTab(userRole, 'tasks') && (
            <button 
              onClick={() => { onBack(); setActiveTab('tasks'); }}
              className="flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all active:scale-95"
            >
              <CheckSquare size={22} className="text-zinc-400" />
              <span className="text-[10px] font-bold text-zinc-400">Задачи</span>
            </button>
          )}
          {canAccessTab(userRole, 'calendar') && (
            <button 
              onClick={() => { onBack(); setActiveTab('calendar'); }}
              className="flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all active:scale-95"
            >
              <Calendar size={22} className="text-zinc-400" />
              <span className="text-[10px] font-bold text-zinc-400">Календарь</span>
            </button>
          )}
          {canAccessTab(userRole, 'finance') && (
            <button 
              onClick={() => { onBack(); setActiveTab('finance'); }}
              className="flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all active:scale-95"
            >
              <Wallet size={22} className="text-zinc-400" />
              <span className="text-[10px] font-bold text-zinc-400">Финансы</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

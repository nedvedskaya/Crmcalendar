import React, { useState } from 'react';
import { Plus, X, AlertOctagon, Circle, CalendarDays, Clock, CheckSquare, History, ChevronDown, CheckCircle2, Edit3, Trash2 } from 'lucide-react';
import { getDateStr, formatDate } from '@/utils/helpers';
import { getInitialTaskState } from '@/utils/initialStates';
import { Button } from '@/app/components/ui/Button';
import { BranchSelector } from '@/app/components/ui/BranchSelector';
import { Header } from '@/app/components/ui/Header';

const TaskItem = ({ task, onToggle, onDelete, onEdit, client }: any) => {
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
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-xs ${isOverdue ? 'text-red-500 font-bold' : 'text-zinc-400'}`}>
              {formatDate(task.date)} • {task.time}
            </span>
            {isUrgent && !task.completed && (
              <span className="text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded font-bold">
                СРОЧНО
              </span>
            )}
            {client && (
              <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium">
                {client.name}
              </span>
            )}
          </div>
        </div>
        {!task.completed && onEdit && (
          <button onClick={() => onEdit(task)} className="text-zinc-400 hover:text-zinc-600">
            <Edit3 size={16} />
          </button>
        )}
        {onDelete && (
          <button onClick={() => onDelete(task.id)} className="text-zinc-400 hover:text-red-500">
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

const AutocompleteInput = ({ options, value, onChange, placeholder, className }: any) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(e);
    if (val.length > 0) {
      const filtered = options.filter((opt: string) =>
        opt.toLowerCase().includes(val.toLowerCase())
      );
      setSuggestions(filtered.slice(0, 5));
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelect = (option: string) => {
    onChange({ target: { value: option } });
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={value || ''}
        onChange={handleChange}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        placeholder={placeholder}
        className={className}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((option, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(option)}
              className="w-full text-left px-4 py-2 hover:bg-zinc-50 text-sm font-medium"
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

interface Task {
    id: string;
    title: string;
    date: string;
    time: string;
    isUrgent?: boolean;
    urgency?: string;
    completed: boolean;
    clientId?: string | null;
    clientName?: string;
    branch?: string;
    isOverdue?: boolean;
}

interface Client {
    id: string;
    name: string;
}

interface TasksViewProps {
    tasks: Task[];
    onToggleTask: (taskId: string) => void;
    onAddTask: (task: Partial<Task>) => void;
    onDeleteTask: (taskId: string) => void;
    onEditTask: (task: Task) => void;
    clients: Client[];
    currentBranch: string;
}

const TasksView: React.FC<TasksViewProps> = ({ tasks, onToggleTask, onAddTask, onDeleteTask, onEditTask, clients, currentBranch }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [showArchive, setShowArchive] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [taskFilter, setTaskFilter] = useState('today');
    const [newTask, setNewTask] = useState({ 
        ...getInitialTaskState(currentBranch),
        clientName: '',
        branch: currentBranch
    });

    const today = getDateStr(0);
    
    const activeTasks = tasks.filter(t => !t.completed).map(task => {
        const isOverdue = task.date < today;
        return {
            ...task,
            isOverdue
        };
    });
    
    const archivedTasks = tasks.filter(t => t.completed);
    
    const todayTasks = activeTasks.filter(t => t.date === today || t.isOverdue);
    const futureTasks = activeTasks.filter(t => t.date > today);
    const displayTasks = taskFilter === 'today' ? todayTasks : activeTasks;
    
    const handleEditTask = (task: Task) => {
        setEditingTask(task);
        setNewTask({
            title: task.title || '',
            date: task.date || getDateStr(0),
            time: task.time || '12:00',
            isUrgent: task.isUrgent || task.urgency === 'high',
            clientName: task.clientName || '',
            branch: task.branch || 'msk'
        });
        setIsAdding(true);
    };
    
    const handleSaveTask = () => {
        if(newTask.title) {
            const client = clients.find(c => c.name === newTask.clientName);
            const taskData = {
                ...newTask, 
                completed: false,
                urgency: newTask.isUrgent ? 'high' : 'low',
                clientId: client ? client.id : null
            };
            
            if (editingTask) {
                onEditTask({ ...editingTask, ...taskData } as Task);
                setEditingTask(null);
            } else {
                onAddTask(taskData);
            }
            
            setIsAdding(false); 
            setNewTask({ 
                ...getInitialTaskState(currentBranch),
                clientName: '',
                branch: currentBranch
            });
        }
    };
    
    const handleCancel = () => {
        setIsAdding(false);
        setEditingTask(null);
        setNewTask({ 
            ...getInitialTaskState(currentBranch),
            clientName: '',
            branch: currentBranch
        });
    };

    return (
        <div className="flex flex-col h-full bg-zinc-50 overflow-hidden relative">
            <Header title="Задачи" actionIcon={Plus} onAction={() => setIsAdding(true)} />
            
            <div className="sticky top-0 z-20 bg-white px-6 pt-2 pb-2 border-b border-zinc-200">
                <div className="flex gap-2">
                    <button 
                        onClick={() => setTaskFilter('today')}
                        className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition-all ${
                            taskFilter === 'today' 
                                ? 'bg-black text-white shadow-lg' 
                                : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'
                        }`}
                    >
                        Сегодня {todayTasks.length > 0 && `(${todayTasks.length})`}
                    </button>
                    <button 
                        onClick={() => setTaskFilter('all')}
                        className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition-all ${
                            taskFilter === 'all' 
                                ? 'bg-black text-white shadow-lg' 
                                : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'
                        }`}
                    >
                        Все задачи {activeTasks.length > 0 && `(${activeTasks.length})`}
                    </button>
                </div>
            </div>
            
            {isAdding && (
                <div className="absolute inset-0 z-[150] bg-zinc-900/50 backdrop-blur-sm flex items-end animate-in fade-in">
                    <div className="w-full bg-white rounded-t-[32px] p-6 shadow-2xl space-y-6 overflow-y-auto" style={{maxHeight: '90dvh', paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 20px))'}}>
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-black">{editingTask ? 'Редактировать задачу' : 'Новая задача'}</h3>
                            <button onClick={handleCancel} className="bg-zinc-100 p-2 rounded-full">
                                <X size={20}/>
                            </button>
                        </div>
                        <div className="space-y-4">
                            <input 
                                type="text" 
                                value={String(newTask.title || '')} 
                                onChange={(e) => setNewTask({...newTask, title: e.target.value})} 
                                placeholder="Название задачи..." 
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl p-4 font-bold outline-none shadow-sm" 
                            />
                            
                            <div className="relative">
                                <AutocompleteInput 
                                    options={clients.map(c => c.name)} 
                                    value={newTask.clientName} 
                                    onChange={(e) => setNewTask({...newTask, clientName: e.target.value})} 
                                    placeholder="Выбрать клиента" 
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl p-4 font-bold outline-none shadow-sm" 
                                />
                            </div>
                            
                            <div className="flex gap-3">
                                <input 
                                    type="date" 
                                    value={String(newTask.date || '')} 
                                    onChange={(e) => setNewTask({...newTask, date: e.target.value})} 
                                    className="flex-1 bg-zinc-50 border border-zinc-200 rounded-2xl p-4 font-bold outline-none shadow-sm" 
                                />
                                <input 
                                    type="time" 
                                    value={String(newTask.time || '')} 
                                    onChange={(e) => setNewTask({...newTask, time: e.target.value})} 
                                    className="w-32 bg-zinc-50 border border-zinc-200 rounded-2xl p-4 font-bold outline-none text-center shadow-sm" 
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Филиал</label>
                                <BranchSelector
                                    value={newTask.branch}
                                    onChange={(branch) => setNewTask({...newTask, branch: branch || ''})}
                                    size="lg"
                                />
                            </div>
                            
                            <button 
                                onClick={() => setNewTask({...newTask, isUrgent: !newTask.isUrgent})} 
                                className={`w-full py-4 rounded-2xl text-sm font-bold border-2 transition-all flex items-center justify-center gap-3 ${
                                    newTask.isUrgent 
                                    ? 'bg-gradient-to-r from-red-500 to-orange-500 border-red-500 text-white shadow-xl' 
                                    : 'bg-white border-zinc-200 text-zinc-400 hover:border-zinc-300'
                                }`}
                            >
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                    newTask.isUrgent ? 'bg-white/20' : 'bg-zinc-100'
                                }`}>
                                    {newTask.isUrgent ? <AlertOctagon size={16} className="text-white" /> : <Circle size={16} />}
                                </div>
                                <span className="uppercase tracking-wide">
                                    {newTask.isUrgent ? 'Срочная задача' : 'Обычная задача'}
                                </span>
                            </button>
                            
                            <Button
                                variant="primary"
                                size="lg"
                                fullWidth
                                onClick={handleSaveTask}
                            >
                                {editingTask ? 'Сохранить изменения' : 'Добавить задачу'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="flex-1 overflow-y-auto px-6 mt-2 space-y-2.5 pt-3 overscroll-contain" style={{paddingBottom: 'calc(100px + env(safe-area-inset-bottom, 20px))', WebkitOverflowScrolling: 'touch'}}>
                {taskFilter === 'all' ? (
                    <>
                        {todayTasks.length > 0 && (
                            <div className="space-y-2.5">
                                <div className="flex items-center gap-2 text-xs font-black text-zinc-400 uppercase tracking-widest">
                                    <CalendarDays size={14} />
                                    Сегодня и просроченные
                                </div>
                                {todayTasks.map(t => {
                                    const client = t.clientId ? clients.find(c => c.id === t.clientId) : null;
                                    return <TaskItem key={t.id} task={t} onToggle={onToggleTask} onDelete={onDeleteTask} onEdit={handleEditTask} client={client} />;
                                })}
                            </div>
                        )}
                        
                        {futureTasks.length > 0 && (
                            <div className="space-y-2.5 mt-4">
                                <div className="flex items-center gap-2 text-xs font-black text-zinc-400 uppercase tracking-widest pt-3 border-t border-zinc-200">
                                    <Clock size={14} />
                                    Запланированные
                                </div>
                                {futureTasks.map(t => {
                                    const client = t.clientId ? clients.find(c => c.id === t.clientId) : null;
                                    return <TaskItem key={t.id} task={t} onToggle={onToggleTask} onDelete={onDeleteTask} onEdit={handleEditTask} client={client} />;
                                })}
                            </div>
                        )}
                        
                        {todayTasks.length === 0 && futureTasks.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-64 text-center">
                                <CheckSquare size={48} className="text-zinc-300 mb-4" />
                                <p className="text-zinc-400 font-semibold">Нет задач</p>
                                <p className="text-zinc-300 text-sm mt-1">Нажмите + чтобы добавить</p>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="space-y-2.5">
                        {displayTasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-center">
                                <CheckSquare size={48} className="text-zinc-300 mb-4" />
                                <p className="text-zinc-400 font-semibold">Нет задач на сегодня</p>
                                <p className="text-zinc-300 text-sm mt-1">Отличная работа!</p>
                            </div>
                        ) : (
                            displayTasks.map(t => {
                                const client = t.clientId ? clients.find(c => c.id === t.clientId) : null;
                                return <TaskItem key={t.id} task={t} onToggle={onToggleTask} onDelete={onDeleteTask} onEdit={handleEditTask} client={client} />;
                            })
                        )}
                    </div>
                )}

                {archivedTasks.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-zinc-200">
                        <button 
                            onClick={() => setShowArchive(!showArchive)} 
                            className="flex items-center gap-2 text-xs font-black text-zinc-400 uppercase tracking-widest mb-3 hover:text-zinc-600 transition-all"
                        >
                            <History size={14} />
                            Архив ({archivedTasks.length})
                            <ChevronDown size={14} className={`transition-transform ${showArchive ? 'rotate-180' : ''}`} />
                        </button>
                        {showArchive && (
                            <div className="space-y-2.5 opacity-60 animate-in fade-in">
                                {archivedTasks.map(t => {
                                    const client = t.clientId ? clients.find(c => c.id === t.clientId) : null;
                                    return <TaskItem key={t.id} task={t} onToggle={onToggleTask} onDelete={onDeleteTask} onEdit={handleEditTask} client={client} />;
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TasksView;

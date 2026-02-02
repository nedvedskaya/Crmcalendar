import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, CheckSquare, Calendar as CalendarIcon, Calendar, PieChart, Plus, Search, 
  ChevronRight, ArrowUpRight, ArrowDownRight, CheckCircle2, Clock, Filter, 
  Car, ChevronLeft, ChevronDown, Phone, MessageSquare, MapPin, Info, 
  Trash2, Edit3, X, Circle, AlertOctagon, CalendarDays, Copy, Wallet,
  Save, Wrench, Maximize2, History, CalendarX, Check, Lock, Tag, AlertCircle, 
  UserPlus, Coins, CheckSquare2, User, ArrowDownLeft, TrendingUp,
  TrendingDown, DollarSign, RotateCcw
} from 'lucide-react';
import { FinanceView } from '@/app/components/FinanceView';
import { Button } from '@/app/components/ui/Button';
import { Modal } from '@/app/components/ui/Modal';
import { ToggleGroup } from '@/app/components/ui/ToggleGroup';
import { Badge, ActionButton, TabButton, ContactButtons, BranchSelector } from '@/app/components/ui';
import { ClientCard, ClientListCard } from '@/app/components/clients';
import { BookingCard } from '@/app/components/bookings';
import { FormField, TaskFormFields, BookingFormFields, AppointmentInputs } from '@/app/components/forms';
import { ClientsView as ClientsViewComponent } from '@/app/views';
import { CalendarGrid } from '@/app/components/CalendarGrid';
import { LoginScreen } from '@/app/components/LoginScreen';
import { ProfilePage } from '@/app/components/ProfilePage';
import { AdminPanel } from '@/app/components/AdminPanel';
import { UserMenu } from '@/app/components/UserMenu';
import { ClientDetails } from '@/app/components/ClientDetails';
import TasksView from '@/app/components/TasksView';

// Импорт утилит и констант
import { 
  BTN_METAL, BTN_METAL_DARK, CARD_METAL,
  BRANCHES, TASK_URGENCY,
  CAR_DATABASE, CAR_ALIASES, CITIES_DATABASE,
  INITIAL_CLIENTS, INITIAL_TASKS, INITIAL_TRANSACTIONS, INITIAL_EVENTS
} from '@/utils/constants';
import { formatMoney, formatDate, getDateStr } from '@/utils/helpers';
import { getBranchColors, getBranchLabel, isMskBranch } from '@/utils/branchHelpers';
import { safeLocalStorage } from '@/utils/safeStorage';
import { sanitizePhone, sanitizeWhatsAppUrl, sanitizeTelUrl, safeOpenLink } from '@/utils/sanitize';
import { 
  getInitialTaskState, getInitialRecordState, 
  getInitialClientState, getInitialCalendarEntryState 
} from '@/utils/initialStates';
import { Header } from '@/app/components/ui/Header';
import { isAuthenticated, saveUserAuth, getUserAuth, logout } from '@/utils/auth';
import { hasPermission, canAccessTab, getAvailableTabs, isAdmin } from '@/utils/permissions';
import { api } from '@/utils/api';

// --- HELPER COMPONENTS ---

const MiniBranchSwitcher = ({ current, onChange }) => (
    <div className="flex bg-zinc-200 p-0.5 rounded-lg shrink-0">
        {Object.values(BRANCHES).map((branch) => (
            <button
                key={branch.id}
                onClick={() => onChange(branch.id)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all duration-300 uppercase tracking-wider ${
                    current === branch.id 
                    ? 'bg-white text-black shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-700'
                }`}
            >
                {String(branch.label)}
            </button>
        ))}
    </div>
);

const AutocompleteInput = ({ options, value, onChange, placeholder, className, name, disabled, aliases }) => {
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setShowSuggestions(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleInput = (e) => {
        const val = e.target.value;
        onChange(e);
        const searchVal = val.toLowerCase();
        let filtered = [];
        if (aliases) {
            const matchedBrands = new Set();
            Object.keys(aliases).forEach(alias => { if (alias.includes(searchVal)) matchedBrands.add(aliases[alias]); });
            options.forEach(opt => { if (opt.toLowerCase().includes(searchVal)) matchedBrands.add(opt); });
            filtered = Array.from(matchedBrands);
        } else {
            // Если есть ввод - фильтруем, если нет - показываем все опции
            filtered = val.length > 0 
                ? options.filter(opt => opt.toLowerCase().includes(searchVal)) 
                : options;
        }
        setSuggestions(filtered);
        setShowSuggestions(true);
    };

    const handleFocus = () => {
        if (!disabled) {
            // При фокусе показываем все доступные опции
            const val = value ? String(value).toLowerCase() : '';
            let filtered = [];
            if (aliases) {
                const matchedBrands = new Set();
                if (val) {
                    Object.keys(aliases).forEach(alias => { if (alias.includes(val)) matchedBrands.add(aliases[alias]); });
                    options.forEach(opt => { if (opt.toLowerCase().includes(val)) matchedBrands.add(opt); });
                    filtered = Array.from(matchedBrands);
                } else {
                    filtered = options;
                }
            } else {
                // Для моделей - если есть значение, фильтруем, если нет - показываем все
                filtered = val 
                    ? options.filter(opt => opt.toLowerCase().includes(val)) 
                    : options;
            }
            setSuggestions(filtered);
            setShowSuggestions(true);
        }
    };

    return (
        <div ref={wrapperRef} className="relative w-full">
            <input 
                type="text" name={name} value={String(value || '')} onChange={handleInput} 
                onFocus={handleFocus}
                placeholder={placeholder} className={className} autoComplete="off" disabled={disabled}
            />
            {showSuggestions && suggestions.length > 0 && !disabled && (
                <div className="absolute z-[150] w-full bg-white border border-zinc-200 rounded-xl mt-1 shadow-2xl max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="sticky top-0 bg-zinc-50 px-3 py-1.5 border-b border-zinc-100">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                            {suggestions.length} {suggestions.length === 1 ? 'вариант' : suggestions.length < 5 ? 'варианта' : 'вариантов'}
                        </span>
                    </div>
                    {suggestions.map((opt, idx) => (
                        <div key={idx} onClick={() => { onChange({ target: { name, value: opt } }); setShowSuggestions(false); }} className="px-4 py-3 hover:bg-zinc-50 cursor-pointer text-sm font-semibold text-zinc-700 border-b border-zinc-50 last:border-0 active:bg-zinc-100 transition-colors">{String(opt)}</div>
                    ))}
                </div>
            )}
        </div>
    );
};

// AppointmentInputs вынесен в отдельный файл: /src/app/components/forms/AppointmentInputs.tsx

const TabBar = ({ activeTab, setActiveTab, userRole = 'owner', onTabChange = null }) => {
  const allTabs = [
    { id: 'clients', icon: Users, label: 'Клиенты' },
    { id: 'tasks', icon: CheckSquare, label: 'Задачи' },
    { id: 'calendar', icon: CalendarIcon, label: 'Календарь' },
    { id: 'finance', icon: PieChart, label: 'Финансы' },
  ];
  
  // Фильтруем вкладки по правам доступа
  const tabs = allTabs.filter(tab => canAccessTab(userRole, tab.id));
  
  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    if (onTabChange) onTabChange(tabId);
  };
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-zinc-200 z-[250] shrink-0" style={{paddingBottom: 'env(safe-area-inset-bottom, 0px)', minHeight: '64px'}}>
      <div className="flex justify-between items-center max-w-lg mx-auto px-4 py-2">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => handleTabClick(tab.id)} className={`flex flex-col items-center justify-center w-full transition-all active:scale-90 ${activeTab === tab.id ? 'text-black' : 'text-zinc-400'}`}>
            <tab.icon size={24} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
            <span className="text-[10px] font-bold mt-1 uppercase tracking-tighter">{String(tab.label)}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const TaskItem = ({ task, onToggle, onDelete, onEdit, client }) => {
    const [showClientCard, setShowClientCard] = useState(false);
    
    return (
        <div className="space-y-2">
            <div className={`p-4 rounded-2xl flex gap-4 bg-white border border-zinc-200 transition-transform shadow-sm`}>
                <button 
                    onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}
                    className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${task.completed ? 'bg-black border-black' : 'border-zinc-300 hover:border-zinc-400'}`}
                >
                    {task.completed && <CheckCircle2 size={14} className="text-white" strokeWidth={3} />}
                </button>
                <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className={`font-semibold text-[15px] leading-snug ${task.completed ? 'text-zinc-400 line-through' : 'text-black'}`}>{String(task.title || '')}</p>
                        {(task.isUrgent || task.urgency === 'high') && (
                            <Badge variant="urgent" />
                        )}
                        {task.isOverdue && (
                            <Badge variant="overdue">Просрочено</Badge>
                        )}
                        {task.branch && (
                            <Badge variant={task.branch === 'msk' ? 'branch-msk' : 'branch-rnd'}>
                                {task.branch === 'msk' ? 'МСК' : 'РНД'}
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs font-medium text-zinc-400 flex items-center gap-1"><Clock size={12} /> {formatDate(task.date)} {String(task.time || '')}</span>
                    </div>
                    {task.clientName && client && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); setShowClientCard(!showClientCard); }}
                            className="mt-2 text-xs font-bold text-orange-600 flex items-center gap-1 hover:text-orange-700 transition-colors"
                        >
                            <User size={12} />
                            {task.clientName}
                            <ChevronDown size={12} className={`transition-transform ${showClientCard ? 'rotate-180' : ''}`} />
                        </button>
                    )}
                </div>
                <div className="flex gap-2">
                    {onEdit && (
                        <button onClick={(e) => { e.stopPropagation(); onEdit(task); }} className="text-zinc-300 hover:text-black transition-colors">
                            <Edit3 size={16} />
                        </button>
                    )}
                    {onDelete && (
                        <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="text-zinc-300 hover:text-red-500 transition-colors">
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            </div>
            
            {/* Раскрывающаяся карточка клиента */}
            {showClientCard && client && (
                <ClientCard 
                    client={client} 
                    className="ml-10 animate-in fade-in slide-in-from-top-2" 
                />
            )}
        </div>
    );
};

// --- 4. FORM COMPONENT (FIXED SCROLL) ---

const ClientForm = ({ onSave, onCancel, client, title = "Новый клиент", readOnlyIdentity = false, currentBranch = 'MSK' }) => {
  const [formData, setFormData] = useState(client || getInitialClientState());
  const [newTasks, setNewTasks] = useState([]);
  const [taskInput, setTaskInput] = useState(() => getInitialTaskState(currentBranch));
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [newRecords, setNewRecords] = useState([]);
  const [recordInput, setRecordInput] = useState(getInitialRecordState());
  const [isRecordFormOpen, setIsRecordFormOpen] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);
  const [isSaved, setIsSaved] = useState(false);
  const saveTimeoutRef = useRef(null);
  const formDataRef = useRef(formData);
  const newTasksRef = useRef(newTasks);
  const newRecordsRef = useRef(newRecords);

  // Обновляем refs при изменении данных
  useEffect(() => { formDataRef.current = formData; }, [formData]);
  useEffect(() => { newTasksRef.current = newTasks; }, [newTasks]);
  useEffect(() => { newRecordsRef.current = newRecords; }, [newRecords]);

  useEffect(() => {
    const models = formData.carBrand && CAR_DATABASE[formData.carBrand] ? CAR_DATABASE[formData.carBrand] : [];
    setAvailableModels(models);
  }, [formData.carBrand]);
  
  // Автосохранение с debounce (2 секунды после последнего изменения)
  useEffect(() => {
    if (!formData.name || formData.name.trim() === '') return;
    if (isSaved) return;
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(() => {
      if (formDataRef.current.name && formDataRef.current.name.trim() !== '') {
        onSave(formDataRef.current, newTasksRef.current, newRecordsRef.current, false);
        setIsSaved(true);
      }
    }, 2000);
    
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [formData.name, formData.phone, formData.carBrand, formData.carModel, formData.city, formData.comment, formData.branch, formData.birthDate, newTasks.length, newRecords.length]);
  
  // Сохранение при закрытии формы
  const handleClose = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (formData.name && formData.name.trim() !== '' && !isSaved) {
      onSave(formData, newTasks, newRecords, true);
    }
    onCancel();
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'phone') {
        let digits = value.replace(/\D/g, '');
        if (digits.length === 0) {
            setFormData(prev => ({ ...prev, [name]: '' }));
            return;
        }
        if (digits.startsWith('8')) digits = '7' + digits.slice(1);
        if (!digits.startsWith('7')) digits = '7' + digits;
        digits = digits.slice(0, 11);
        let formatted = '+7';
        if (digits.length > 1) formatted += ' (' + digits.slice(1, 4);
        if (digits.length >= 4) formatted += ')';
        if (digits.length > 4) formatted += ' ' + digits.slice(4, 7);
        if (digits.length > 7) formatted += '-' + digits.slice(7, 9);
        if (digits.length > 9) formatted += '-' + digits.slice(9, 11);
        setFormData(prev => ({ ...prev, [name]: formatted }));
        return;
    }
    if (name === 'birthDate') {
        // Автоматическое форматирование даты рождения ДД.ММ.ГГГГ
        let input = value.replace(/[^0-9]/g, ''); // Только цифры
        let formatted = '';
        
        if (input.length > 0) {
            formatted = input.substring(0, 2); // ДД
            if (input.length >= 3) {
                formatted += '.' + input.substring(2, 4); // ММ
            }
            if (input.length >= 5) {
                formatted += '.' + input.substring(4, 8); // ГГГГ
            }
        }
        
        setFormData(prev => ({ ...prev, [name]: formatted }));
        return;
    }
    if (name === 'carBrand') {
        setFormData(prev => ({ ...prev, carBrand: value, carModel: '' }));
        return;
    }
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  return (
    <div className="fixed inset-0 z-[200] bg-zinc-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5" style={{height: '100dvh', minHeight: '-webkit-fill-available'}}>
        <div className="px-6 pt-safe pb-4 bg-white border-b border-zinc-200 flex items-center justify-between shrink-0" style={{paddingTop: 'max(env(safe-area-inset-top, 12px), 48px)'}}>
            <Button variant="ghost" size="md" onClick={handleClose} className="text-base">Назад</Button>
            <span className="text-xl font-black">{String(title)}</span>
            {isSaved ? (
                <span className="text-base font-bold text-green-500 flex items-center gap-1">
                    <Check size={16} /> Сохранено
                </span>
            ) : (
                <Button 
                    variant="ghost" 
                    size="md" 
                    onClick={() => {
                        if (formData.name) {
                            onSave(formData, newTasks, newRecords, true);
                            setIsSaved(true);
                        }
                    }}
                    className="text-base font-bold !text-orange-500"
                    disabled={!formData.name}
                >
                    Сохранить
                </Button>
            )}
        </div>
        
        <div className="flex-1 overflow-y-auto px-6 pt-6 space-y-8 overscroll-contain -webkit-overflow-scrolling-touch" style={{paddingBottom: 'calc(120px + env(safe-area-inset-bottom, 20px)'}}>
            <div className="space-y-4">
                <div className="flex justify-between items-center"><h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Данные клиента</h3>{!readOnlyIdentity && <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-2 py-1 rounded-md">{formatDate(formData.createdAt)}</span>}</div>
                <div className="space-y-3">
                    <input type="text" name="name" value={String(formData.name || '')} onChange={handleChange} placeholder="Имя Фамилия" className="w-full bg-white border border-zinc-300 rounded-xl p-4 text-lg font-bold outline-none focus:border-black" disabled={readOnlyIdentity} />
                    <div className="flex gap-3">
                        <input type="tel" name="phone" value={String(formData.phone || '')} onChange={handleChange} placeholder="Телефон" className="w-full bg-white border border-zinc-300 rounded-xl p-4 font-bold outline-none shadow-sm" disabled={readOnlyIdentity} />
                        <input type="text" name="birthDate" value={String(formData.birthDate || '')} onChange={handleChange} placeholder="ДД.ММ.ГГГГ" className="w-full bg-white border border-zinc-300 rounded-xl p-4 font-bold outline-none shadow-sm" />
                    </div>
                    <AutocompleteInput name="city" value={formData.city} onChange={handleChange} options={CITIES_DATABASE} placeholder="Город" className="w-full bg-white border border-zinc-300 rounded-xl p-4 font-bold outline-none shadow-sm" />
                </div>
                <div className="flex gap-3">
                    <div className="w-1/2 relative"><AutocompleteInput name="carBrand" value={formData.carBrand} onChange={handleChange} options={Object.keys(CAR_DATABASE)} aliases={CAR_ALIASES} placeholder="Марка" className="w-full bg-white border border-zinc-300 rounded-xl p-4 font-bold outline-none shadow-sm" disabled={readOnlyIdentity} /><ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" /></div>
                    <div className="w-1/2 relative">
                        <AutocompleteInput name="carModel" value={formData.carModel} onChange={handleChange} options={availableModels} placeholder="Модель" className={`w-full bg-white border border-zinc-300 rounded-xl p-4 font-bold outline-none shadow-sm ${!formData.carBrand ? 'opacity-50' : ''}`} disabled={!formData.carBrand || readOnlyIdentity} />
                        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                    </div>
                </div>
                <textarea name="comment" value={String(formData.comment || '')} onChange={handleChange} placeholder="Комментарий..." rows={3} className="w-full bg-white border border-zinc-300 rounded-xl p-4 font-medium outline-none focus:border-black resize-none shadow-sm"/>
                
                {/* Выбор филиала */}
                <div>
                    <span className="text-xs text-zinc-400 font-bold uppercase tracking-widest block mb-3">Филиал</span>
                    <BranchSelector
                        value={formData.branch}
                        onChange={(branch) => setFormData({...formData, branch: branch || ''})}
                        size="lg"
                    />
                </div>
            </div>
            <div className="space-y-4">
                <div className="flex items-center justify-between"><h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Задачи</h3><ActionButton variant="metal" size="md" onClick={() => setIsTaskFormOpen(!isTaskFormOpen)}>+ Задача</ActionButton></div>
                {isTaskFormOpen && (
                    <div className="bg-zinc-100 p-4 rounded-xl space-y-3 shadow-inner">
                        <TaskFormFields
                            taskData={{
                                title: String(taskInput.title || ''),
                                date: String(taskInput.date || ''),
                                time: String(taskInput.time || ''),
                                isUrgent: taskInput.isUrgent
                            }}
                            onChange={(e) => setTaskInput({...taskInput, [e.target.name]: e.target.value})}
                            onToggleUrgent={() => setTaskInput({...taskInput, isUrgent: !taskInput.isUrgent})}
                        />
                        <button onClick={() => { if(taskInput.title) { setNewTasks([...newTasks, {...taskInput, id: Date.now()}]); setTaskInput(getInitialTaskState(currentBranch)); setIsTaskFormOpen(false); setIsSaved(false); } }} className={`w-full py-3 rounded-lg text-sm font-bold ${BTN_METAL_DARK}`}>Добавить задачу</button>
                    </div>
                )}
                <div className="space-y-2">
                    {newTasks.map(t => (
                        <div key={t.id} className="bg-white p-3 rounded-xl border border-zinc-200 flex items-center justify-between shadow-sm">
                            <div><p className="text-sm font-bold text-zinc-800">{String(t.title || '')}</p><span className="text-[10px] text-zinc-400">{formatDate(t.date)} {String(t.time || '')}</span></div>
                            <button onClick={() => { setNewTasks(newTasks.filter(item => item.id !== t.id)); setIsSaved(false); }} className="text-zinc-300 hover:text-red-500 transition-colors"><X size={16}/></button>
                        </div>
                    ))}
                </div>
            </div>
            <div className="space-y-4 pt-2 border-t border-zinc-200">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Бронь</h3>
                    <ActionButton variant="metal" size="md" onClick={() => setIsRecordFormOpen(!isRecordFormOpen)}>+ Бронь</ActionButton>
                </div>
                {isRecordFormOpen && (
                    <div className="bg-zinc-100 p-4 rounded-xl space-y-3 shadow-inner">
                        <AppointmentInputs 
                            data={recordInput} 
                            onChange={(e) => setRecordInput({...recordInput, [e.target.name]: e.target.value})} 
                        />
                        <button 
                            onClick={() => { 
                                if(recordInput.service && recordInput.amount) { 
                                    setNewRecords([...newRecords, {...recordInput, id: Date.now()}]); 
                                    setRecordInput(getInitialRecordState()); 
                                    setIsRecordFormOpen(false); 
                                    setIsSaved(false);
                                } 
                            }} 
                            className={`w-full py-3 rounded-lg text-sm font-bold ${BTN_METAL_DARK}`}
                        >
                            Добавить бронь
                        </button>
                    </div>
                )}
                <div className="space-y-2">
                    {newRecords.map(r => (
                        <div key={r.id} className="bg-white p-3 rounded-xl border border-zinc-200 flex items-center justify-between shadow-sm">
                            <div>
                                <p className="text-sm font-bold text-zinc-800">{String(r.service || '')}</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-zinc-400">{formatDate(r.date)} {String(r.time || '')}</span>
                                    <span className="text-[10px] font-bold text-orange-500">{formatMoney(r.amount)} ₽</span>
                                    {r.paymentStatus === 'paid' && <span className="text-[9px] bg-orange-500 text-white px-1.5 py-0.5 rounded">Оплачено</span>}
                                    {r.paymentStatus === 'advance' && <span className="text-[9px] bg-orange-400 text-white px-1.5 py-0.5 rounded">Аванс</span>}
                                </div>
                            </div>
                            <button onClick={() => { setNewRecords(newRecords.filter(item => item.id !== r.id)); setIsSaved(false); }} className="text-zinc-300 hover:text-red-500 transition-colors"><X size={16}/></button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
  );
};

// --- 5. MAIN VIEWS ---
// ClientDetails вынесен в отдельный файл: /src/app/components/ClientDetails.tsx


// ClientsView вынесен в отдельный файл: /src/app/views/ClientsView.tsx
const ClientsView = ClientsViewComponent;

// TasksView вынесен в отдельный файл: /src/app/components/TasksView.tsx


const CalendarView = ({ events, clients, onAddRecord, onOpenClient, categories, currentBranch }) => {
    const [currentDate, setCurrentDate] = useState(new Date()); 
    const [isAdding, setIsAdding] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [newEntry, setNewEntry] = useState(getInitialCalendarEntryState(currentBranch));
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const names = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
    const week = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const days = new Date(year, month + 1, 0).getDate();
    const start = new Date(year, month, 1).getDay();
    const pad = start === 0 ? 6 : start - 1;
    
    // Функция для проверки, попадает ли дата в интервал записи
    const isDateInRange = (event, checkDate) => {
        if (!event.endDate) {
            return event.date === checkDate;
        }
        return checkDate >= event.date && checkDate <= event.endDate;
    };
    
    // Функция для определения позиции события в диапазоне (начало/середина/конец)
    const getEventPosition = (event, checkDate) => {
        if (!event.endDate || event.date === event.endDate) {
            return 'single'; // Однодневное событие
        }
        if (event.date === checkDate) {
            return 'start'; // Начало диапазона
        }
        if (event.endDate === checkDate) {
            return 'end'; // Конец диапазона
        }
        return 'middle'; // Середина диапазона
    };
    
    const selectedDateEvents = selectedDate ? events.filter(e => isDateInRange(e, selectedDate)) : [];

    return (
        <div className="flex flex-col h-full bg-zinc-50 overflow-hidden relative">
             <Header title="Календарь" actionIcon={Plus} onAction={() => setIsAdding(true)} />
             {isAdding && (
                 <div className="absolute inset-0 z-[150] bg-zinc-900/50 backdrop-blur-sm flex items-end animate-in fade-in">
                    <div className="w-full bg-white rounded-t-[32px] p-6 shadow-2xl space-y-6 pb-20 overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-black">Новая бронь</h3>
                            <button onClick={() => setIsAdding(false)} className="bg-zinc-100 p-2 rounded-full"><X size={20}/></button>
                        </div>
                        <div className="space-y-4">
                            <AutocompleteInput options={clients.map(c => c.name)} value={newEntry.clientName} onChange={(e) => setNewEntry({...newEntry, clientName: e.target.value})} placeholder="Поиск клиента..." className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl p-4 font-bold outline-none" /><AppointmentInputs data={newEntry} onChange={(e) => setNewEntry({...newEntry, [e.target.name]: e.target.value})} categories={categories || []} /><Button variant="primary" size="lg" fullWidth onClick={() => { const c = clients.find(cl => cl.name === newEntry.clientName); if(c) { onAddRecord(c.id, newEntry); setIsAdding(false); setNewEntry(getInitialCalendarEntryState(currentBranch)); } else alert('Клиент не найден'); }}>Добавить</Button></div>
                    </div>
                 </div>
             )}
             <div className="px-4 py-2 flex items-center justify-between bg-white/50 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2 text-zinc-400 transition-colors hover:text-black"><ChevronLeft size={24} /></button>
                    <span className="text-3xl font-black">{names[month]}</span>
                    <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-2 text-zinc-400 transition-colors hover:text-black"><ChevronRight size={24} /></button>
                </div>
                <div className="text-sm font-bold text-zinc-400 pr-2">{year}</div>
            </div>
             <div className="flex-1 overflow-y-auto bg-white p-2 overscroll-contain" style={{paddingBottom: 'calc(100px + env(safe-area-inset-bottom, 20px))', WebkitOverflowScrolling: 'touch'}}>
                <div className="grid grid-cols-7 border-b border-zinc-100 pb-2 mb-2 text-center text-[10px] font-black text-zinc-400 uppercase">{week.map(d => <div key={d}>{d}</div>)}</div>
                <CalendarGrid
                    year={year}
                    month={month}
                    days={days}
                    pad={pad}
                    events={events}
                    clients={clients}
                    getDateStr={getDateStr}
                    onDateClick={setSelectedDate}
                />
            </div>
            
            {/* Модальное окно с планами на день */}
            {selectedDate && (
                <div className="absolute inset-0 z-[150] bg-zinc-900/50 backdrop-blur-sm flex items-end animate-in fade-in" onClick={() => setSelectedDate(null)}>
                    <div className="w-full bg-white rounded-t-[32px] p-6 shadow-2xl overflow-y-auto" style={{maxHeight: '80dvh', paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 20px))'}} onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-2xl font-black">{formatDate(selectedDate)}</h3>
                                <p className="text-sm text-zinc-400 font-medium mt-1">{selectedDateEvents.length} {selectedDateEvents.length === 1 ? 'бронь' : 'броней'}</p>
                            </div>
                            <div className="flex gap-2">
                                <Button 
                                    variant="primary"
                                    icon={Plus}
                                    onClick={() => { setNewEntry({...newEntry, date: selectedDate}); setSelectedDate(null); setIsAdding(true); }}
                                >
                                    Добавить
                                </Button>
                                <button onClick={() => setSelectedDate(null)} className="bg-zinc-100 p-2 rounded-full">
                                    <X size={20}/>
                                </button>
                            </div>
                        </div>
                        
                        {selectedDateEvents.length === 0 ? (
                            <div className="text-center py-12 text-zinc-400">
                                <CalendarDays size={48} className="mx-auto mb-3 opacity-30" />
                                <p className="font-semibold">Нет броней на этот день</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {selectedDateEvents.map((ev, idx) => {
                                    const client = clients.find(c => c.id === ev.clientId);
                                    const category = categories?.find(cat => cat.id === ev.category);
                                    const record = client?.records?.find(r => r.id === ev.recordId);
                                    const isCompleted = record?.isCompleted;
                                    const isMsk = ev.branch === 'msk';
                                    
                                    // Определяем цвета для карточки
                                    let bgGradient = 'from-zinc-50 to-white';
                                    let borderColor = 'border-zinc-200';
                                    let timeBg = 'bg-zinc-500';
                                    
                                    if (isCompleted) {
                                        bgGradient = 'from-gray-50 to-white';
                                        borderColor = 'border-gray-200';
                                        timeBg = 'bg-gray-500';
                                    } else if (isMsk) {
                                        bgGradient = 'from-orange-50 to-white';
                                        borderColor = 'border-orange-200';
                                        timeBg = 'bg-orange-600';
                                    } else if (ev.branch === 'rnd') {
                                        bgGradient = 'from-blue-50 to-white';
                                        borderColor = 'border-blue-200';
                                        timeBg = 'bg-blue-700';
                                    }
                                    
                                    return (
                                        <div key={idx} className={`bg-gradient-to-r ${bgGradient} border ${borderColor} rounded-2xl p-4 shadow-sm`}>
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-3 flex-1">
                                                    <div className={`${timeBg} text-white rounded-xl px-3 py-2 font-black text-sm shrink-0`}>
                                                        {String(ev.time || '')}
                                                    </div>
                                                    {ev.paymentStatus === 'paid' && (
                                                        <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-1 rounded font-bold uppercase flex items-center gap-1">
                                                            <CheckCircle2 size={12} /> Оплачено
                                                        </span>
                                                    )}
                                                    {ev.paymentStatus === 'advance' && (
                                                        <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold uppercase flex items-center gap-1">
                                                            <DollarSign size={12} /> Аванс
                                                        </span>
                                                    )}
                                                    <div 
                                                        className="cursor-pointer group flex-1"
                                                        onClick={() => {
                                                            if (client) {
                                                                setSelectedDate(null);
                                                                onOpenClient(client);
                                                            }
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-1.5">
                                                            <p className="font-black text-black text-base group-hover:text-orange-500 transition-colors">
                                                                {client?.name || 'Клиент'}
                                                            </p>
                                                            <ChevronRight size={20} className="text-orange-500 shrink-0 group-hover:translate-x-1 transition-transform" strokeWidth={3} />
                                                        </div>
                                                        <p className="text-sm font-bold text-zinc-700 mt-1">{String(ev.service || 'Услуга')}</p>
                                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                            {ev.branch && (
                                                                <span className="text-[10px] bg-black text-white px-2 py-0.5 rounded font-bold uppercase">
                                                                    {ev.branch === 'msk' ? 'МСК' : 'РНД'}
                                                                </span>
                                                            )}
                                                            {category && (
                                                                <div className="flex items-center gap-1.5">
                                                                    <div 
                                                                        className="w-2 h-2 rounded-full" 
                                                                        style={{ backgroundColor: category.color }}
                                                                    />
                                                                    <span className="text-xs text-zinc-500 font-medium">{category.name}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {ev.endDate && (
                                                            <p className="text-xs text-orange-600 font-bold mt-1">
                                                                {formatDate(ev.date)} - {formatDate(ev.endDate)}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            {client && (
                                                <div className="flex gap-2 mt-3 pt-3 border-t border-orange-100">
                                                    <div className="flex-1 bg-white rounded-lg px-3 py-2 border border-zinc-200">
                                                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wide">Автомобиль</p>
                                                        <p className="text-sm font-bold text-black mt-0.5">{client.carBrand} {client.carModel}</p>
                                                    </div>
                                                    <div 
                                                        className="flex-1 bg-white rounded-lg px-3 py-2 border border-zinc-200 cursor-pointer hover:bg-orange-50 hover:border-orange-300 transition-all active:scale-95"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigator.clipboard.writeText(client.phone);
                                                        }}
                                                    >
                                                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wide">Телефон</p>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <p className="text-sm font-bold text-black">{client.phone}</p>
                                                            <Copy size={14} className="text-orange-500 shrink-0" />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- 6. MAIN APP ---

const App = () => {
  // Состояние авторизации
  const [isAuth, setIsAuth] = useState(() => isAuthenticated());
  const [user, setUser] = useState(() => getUserAuth());
  const [showProfile, setShowProfile] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  // ВСЕ хуки должны быть вызваны ДО любого условного return
  const [activeTab, setActiveTab] = useState('clients');
  const [currentBranch, setCurrentBranch] = useState('msk'); 
  const [clients, setClients] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [events, setEvents] = useState(INITIAL_EVENTS);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  const [editingClient, setEditingClient] = useState(null);
  
  // Фильтр клиентов по периоду
  const [clientsDateFilter, setClientsDateFilter] = useState('all');
  
  // Категории и теги (загружаются через API)
  const [categories, setCategories] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);

  // Загрузка данных из API при монтировании
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [clientsData, tasksData, transactionsData, categoriesData, tagsData, recordsData] = await Promise.all([
          api.getClients().catch(() => []),
          api.getTasks().catch(() => []),
          api.getTransactions().catch(() => []),
          api.getData('categories').catch(() => []),
          api.getData('tags').catch(() => []),
          api.getClientRecords().catch(() => []),
        ]);
        
        // Преобразуем транзакции для совместимости с фронтендом
        const processedTransactions = (transactionsData || []).map(t => ({
          ...t,
          title: t.title || t.description || '',
          sub: t.sub || '',
          createdDate: t.created_at ? new Date(t.created_at).toISOString().split('T')[0] : getDateStr(0),
          tags: Array.isArray(t.tags) ? t.tags : (typeof t.tags === 'string' ? JSON.parse(t.tags) : [])
        }));
        
        // Группируем записи по клиентам
        const recordsByClient = {};
        (recordsData || []).forEach(record => {
          const clientId = record.client_id;
          if (!recordsByClient[clientId]) {
            recordsByClient[clientId] = [];
          }
          // Маппинг полей из БД в формат фронтенда
          const recordData = {
            id: record.id,
            service: record.service_name || record.description || '',
            date: record.date,
            time: record.time || '10:00',
            amount: parseFloat(record.amount) || 0,
            advance: parseFloat(record.advance) || 0,
            advanceDate: record.advance_date,
            endDate: record.end_date,
            category: record.category_id,
            paymentStatus: record.payment_status || 'none',
            isPaid: record.is_paid || false,
            isCompleted: record.is_completed || false
          };
          recordsByClient[clientId].push(recordData);
        });
        
        // Объединяем клиентов с их записями
        const clientsWithRecords = (clientsData || []).map(client => ({
          ...client,
          records: recordsByClient[client.id] || []
        }));
        
        // Восстанавливаем события из записей
        const eventsFromRecords = [];
        clientsWithRecords.forEach(client => {
          (client.records || []).forEach(record => {
            eventsFromRecords.push({
              id: `event_${record.id}`,
              clientId: client.id,
              recordId: record.id,
              branch: client.branch,
              date: record.date,
              endDate: record.endDate,
              time: record.time,
              service: record.service,
              title: `${client.carBrand || ''} (${record.service || ''})`,
              type: 'work'
            });
          });
        });
        
        setClients(clientsWithRecords);
        // Маппинг полей из БД в формат фронтенда
        const processedTasks = (tasksData || []).map(t => ({
          ...t,
          clientId: t.client_id || null,
          clientName: t.client_name || null,
          completed: t.status === 'completed',
          isUrgent: t.priority === 'high',
          urgency: t.priority === 'high' ? 'high' : 'low',
          task: t.title,
          date: t.due_date || t.date || getDateStr(0),
          time: t.time || '10:00'
        }));
        setTasks(processedTasks);
        setTransactions(processedTransactions);
        setCategories(categoriesData || []);
        setTags(tagsData || []);
        setEvents(eventsFromRecords);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (isAuth) {
      loadData();
    } else {
      setIsLoading(false);
    }
  }, [isAuth]);

  // Установка мета-тегов для iOS и мобильных устройств
  useEffect(() => {
    // Viewport для корректной адаптации на iPhone
    let viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!viewportMeta) {
      viewportMeta = document.createElement('meta');
      viewportMeta.setAttribute('name', 'viewport');
      document.head.appendChild(viewportMeta);
    }
    viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');

    // iOS Web App мета-теги
    const metaTags = [
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      { name: 'apple-mobile-web-app-title', content: 'CRM Автосервис' },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'theme-color', content: '#f97316' }
    ];

    metaTags.forEach(({ name, content }) => {
      let meta = document.querySelector(`meta[name="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    });

    // Добавляем класс для iOS
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      document.documentElement.classList.add('ios-device');
    }
  }, []);

  // Сохранение категорий через API (с debounce через ref)
  const categoriesRef = useRef(categories);
  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);
  
  useEffect(() => {
    if (!isLoading && categories.length > 0) {
      const timer = setTimeout(() => {
        api.saveData('categories', categories).catch(console.error);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [categories, isLoading]);

  // Сохранение тегов через API
  useEffect(() => {
    if (!isLoading && tags.length > 0) {
      const timer = setTimeout(() => {
        api.saveData('tags', tags).catch(console.error);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [tags, isLoading]);

  // Обработка входа
  const handleLogin = (userData: { id: number; name: string; email: string; role: string; isOwner: boolean }, token?: string) => {
    saveUserAuth({ name: userData.name, role: userData.role, email: userData.email, id: userData.id, isOwner: userData.isOwner }, token);
    setUser(getUserAuth());
    setIsAuth(true);
  };

  // Обработка выхода
  const handleLogout = async () => {
    await logout();
    setIsAuth(false);
    setUser(null);
  };

  // Если не а��торизован - показываем экран входа
  // Фильтрация клиентов по выбранному периоду (применяется глобально)
  const filteredClients = useMemo(() => {
    if (clientsDateFilter === 'all') return clients;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return clients.filter(client => {
      if (!client.createdDate) return false;
      
      const [year, month, day] = client.createdDate.split('-').map(Number);
      const clientDate = new Date(year, month - 1, day);
      clientDate.setHours(0, 0, 0, 0);
      
      const diffTime = today.getTime() - clientDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      switch (clientsDateFilter) {
        case 'today':
          return diffDays === 0;
        case 'week':
          return diffDays <= 7;
        case 'month':
          return diffDays <= 30;
        case 'year':
          return diffDays <= 365;
        default:
          return true;
      }
    });
  }, [clients, clientsDateFilter]);

  if (!isAuth) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (showProfile) {
    return <ProfilePage onBack={() => setShowProfile(false)} />;
  }

  if (showAdmin) {
    return <AdminPanel onBack={() => setShowAdmin(false)} />;
  }

  const addTransaction = async (amount, title, sub, type = 'income', clientName = '', category = '', customDate = null) => {
      const transactionDate = customDate || getDateStr(0);
      const transactionData = { 
          title: title, 
          description: clientName ? `${clientName} • ${sub}` : sub, 
          amount: Number(amount), 
          type: type,
          category: category || '',
          date: transactionDate
      };
      try {
        const saved = await api.createTransaction(transactionData);
        setTransactions(prev => [{ 
          ...saved,
          sub: saved.description,
          createdDate: transactionDate
        }, ...prev]);
      } catch (error) {
        console.error('Error saving transaction:', error);
        setTransactions(prev => [{ 
          id: Date.now()+Math.random(), 
          ...transactionData,
          sub: transactionData.description,
          date: transactionDate,
          createdDate: transactionDate
        }, ...prev]);
      }
  };

  const handleAddClient = async (data, tks, recs) => {
      const tempId = Date.now();
      const entry = { 
        ...data, 
        id: tempId, 
        branch: data.branch || null, 
        createdDate: getDateStr(0), 
        records: [] 
      };
      
      if (recs?.length) {
         const newRecords = recs.map((rec, idx) => {
            const recordId = tempId + idx + 1;
            setEvents(prev => [...prev, { 
                id: tempId + idx + 100, 
                clientId: tempId, 
                recordId: recordId, 
                branch: data.branch || null, 
                date: rec.date, 
                endDate: rec.endDate,
                time: rec.time,
                service: rec.service,
                title: `${data.carBrand} (${rec.service})`, 
                type: 'work' 
            }]);
            return { ...rec, id: recordId };
         });
         entry.records = newRecords;
      }
      
      setClients(prev => [entry, ...prev]);
      
      const tempTaskIds = [];
      if (tks?.length) {
        const newTasks = tks.map((t, idx) => {
          const taskTempId = `temp_${tempId}_${idx}`;
          tempTaskIds.push(taskTempId);
          return { 
            ...t, 
            id: taskTempId, 
            clientId: tempId, 
            clientName: data.name, 
            branch: data.branch || null, 
            completed: false 
          };
        });
        setTasks(prev => [...newTasks, ...prev]);
      }

      try {
        const clientData = {
          name: data.name,
          phone: data.phone || '',
          email: data.email || '',
          notes: JSON.stringify({
            carBrand: data.carBrand,
            carModel: data.carModel,
            vin: data.vin,
            licensePlate: data.licensePlate,
            branch: data.branch,
            records: [],
            ...data
          })
        };
        
        const savedClient = await api.createClient(clientData);
        const realId = savedClient.id;
        
        // Обновляем ID клиента и получаем текущие записи из состояния
        let currentRecords = [];
        setClients(prev => {
          const client = prev.find(c => c.id === tempId);
          currentRecords = client?.records || [];
          return prev.map(c => c.id === tempId ? { ...c, id: realId } : c);
        });
        setEvents(prev => prev.map(e => e.clientId === tempId ? { ...e, clientId: realId } : e));
        
        // Сохраняем все записи (брони) для нового клиента - используем текущее состояние, а не параметр recs
        if (currentRecords.length > 0) {
          for (const rec of currentRecords) {
            // Пропускаем записи, которые уже сохранены (имеют числовой ID из БД)
            if (typeof rec.id === 'number' && rec.id < 1000000000000) continue;
            
            try {
              const recordData = {
                client_id: realId,
                service_name: rec.service,
                description: rec.service,
                date: rec.date,
                time: rec.time || '10:00',
                amount: parseFloat(rec.amount) || 0,
                advance: parseFloat(rec.advance) || 0,
                advance_date: rec.advanceDate || null,
                end_date: rec.endDate || null,
                category_id: rec.category ? parseInt(rec.category) : null,
                payment_status: rec.paymentStatus || 'none',
                is_paid: rec.paymentStatus === 'paid',
                is_completed: rec.isCompleted || false
              };
              
              const savedRecord = await api.createClientRecord(recordData);
              setClients(prev => prev.map(cl => cl.id === realId ? { 
                ...cl, 
                records: (cl.records || []).map(r => r.id === rec.id ? { ...r, id: savedRecord.id } : r) 
              } : cl));
              setEvents(prev => prev.map(e => e.recordId === rec.id ? { ...e, recordId: savedRecord.id } : e));
              
              // Создаём транзакции после успешного сохранения записи
              if (rec.advance && parseFloat(rec.advance) > 0) {
                addTransaction(
                  rec.advance,
                  `Аванс: ${rec.service || 'Услуга'}`,
                  `${data.carBrand} ${data.carModel}`,
                  'income',
                  data.name,
                  rec.category || '',
                  rec.advanceDate || rec.date
                );
              }
              
              if (rec.paymentStatus === 'paid' && rec.amount && parseFloat(rec.amount) > 0) {
                const advanceAmount = parseFloat(rec.advance) || 0;
                const totalAmount = parseFloat(rec.amount) || 0;
                const remainingAmount = totalAmount - advanceAmount;
                if (remainingAmount > 0) {
                  addTransaction(
                    remainingAmount,
                    `Оплата: ${rec.service || 'Услуга'}`,
                    `${data.carBrand} ${data.carModel}`,
                    'income',
                    data.name,
                    rec.category || ''
                  );
                }
              }
            } catch (e) {
              console.error('Error creating record:', e);
            }
          }
        }
        
        // Получаем текущие задачи для этого клиента из состояния (включая добавленные после создания формы)
        let currentTasks = [];
        setTasks(prev => {
          currentTasks = prev.filter(t => t.clientId === tempId || (typeof t.id === 'string' && String(t.id).includes(tempId)));
          return prev;
        });
        
        // Сохраняем все задачи для нового клиента
        for (const task of currentTasks) {
          // Пропускаем задачи, которые уже сохранены (имеют числовой ID из БД)
          if (typeof task.id === 'number' && task.id < 1000000000000) continue;
          
          try {
            const savedTask = await api.createTask({
              title: task.title || task.task || '',
              description: task.description || '',
              status: task.completed ? 'completed' : 'pending',
              priority: task.urgency || (task.isUrgent ? 'high' : 'medium'),
              client_id: realId
            });
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, id: savedTask.id, clientId: realId } : t));
          } catch (e) {
            console.error('Error creating task:', e);
          }
        }
      } catch (error) {
        console.error('Error saving client to server:', error);
      }
  };

  const handleAddRecord = async (clientId, rec) => {
      const c = clients.find(cl => cl.id === clientId);
      if (!c) return;
      
      const tempRecordId = Date.now();
      const newRecord = { ...rec, id: tempRecordId };
      const isClientNew = typeof clientId === 'string' && clientId.startsWith('temp_');
      
      setClients(prev => prev.map(cl => cl.id === clientId ? { ...cl, records: [...(cl.records || []), newRecord] } : cl));
      setEvents(prev => [...prev, { id: tempRecordId + 1, clientId: clientId, recordId: tempRecordId, branch: c.branch, date: rec.date, endDate: rec.endDate, time: rec.time, service: rec.service, title: `${c.carBrand} (${rec.service})`, type: 'work' }]);
      
      // Если клиент ещё не сохранён в БД - запись и транзакции создадутся после сохранения клиента
      if (isClientNew) {
        console.log('Client is new, record will be saved after client is saved');
        return;
      }
      
      try {
        const recordData = {
          client_id: clientId,
          service_name: rec.service,
          description: rec.service,
          date: rec.date,
          time: rec.time || '10:00',
          amount: parseFloat(rec.amount) || 0,
          advance: parseFloat(rec.advance) || 0,
          advance_date: rec.advanceDate || null,
          end_date: rec.endDate || null,
          category_id: rec.category ? parseInt(rec.category) : null,
          payment_status: rec.paymentStatus || 'none',
          is_paid: rec.paymentStatus === 'paid',
          is_completed: rec.isCompleted || false
        };
        
        const saved = await api.createClientRecord(recordData);
        
        setClients(prev => prev.map(cl => cl.id === clientId ? { 
          ...cl, 
          records: (cl.records || []).map(r => r.id === tempRecordId ? { ...r, id: saved.id } : r) 
        } : cl));
        setEvents(prev => prev.map(e => e.recordId === tempRecordId ? { ...e, recordId: saved.id } : e));
        
        // Создаём транзакции только после успешного сохранения записи
        // Если есть аванс - создаём транзакцию аванса
        if (rec.advance && parseFloat(rec.advance) > 0) {
          addTransaction(
            rec.advance,
            `Аванс: ${rec.service || 'Услуга'}`,
            `${c.carBrand} ${c.carModel}`,
            'income',
            c.name,
            rec.category || '',
            rec.advanceDate || rec.date
          );
        }
        
        // Если статус оплаты - "оплачено", создаём транзакцию
        if (rec.paymentStatus === 'paid' && rec.amount && parseFloat(rec.amount) > 0) {
          const advanceAmount = parseFloat(rec.advance) || 0;
          const totalAmount = parseFloat(rec.amount) || 0;
          const remainingAmount = totalAmount - advanceAmount;
          if (remainingAmount > 0) {
            addTransaction(
              remainingAmount,
              `Оплата: ${rec.service || 'Услуга'}`,
              `${c.carBrand} ${c.carModel}`,
              'income',
              c.name,
              rec.category || ''
            );
          }
        }
      } catch (error) {
        console.error('Error saving record:', error);
      }
  };

  const handleEditRecord = async (clientId, recordId, rec) => {
      const c = clients.find(cl => cl.id === clientId);
      if (!c) return;
      
      setEvents(prev => prev.filter(e => !(e.clientId === clientId && e.recordId === recordId)));
      setClients(prev => prev.map(cl => cl.id === clientId ? { 
          ...cl, 
          records: (cl.records || []).map(r => r.id === recordId ? { ...rec, id: recordId } : r) 
      } : cl));
      setEvents(prev => [...prev, { id: Date.now(), clientId: clientId, recordId: recordId, branch: c.branch, date: rec.date, endDate: rec.endDate, time: rec.time, service: rec.service, title: `${c.carBrand} (${rec.service})`, type: 'work' }]);
      
      try {
        await api.updateClientRecord(recordId, {
          service_name: rec.service,
          description: rec.service,
          date: rec.date,
          time: rec.time || '10:00',
          amount: parseFloat(rec.amount) || 0,
          advance: parseFloat(rec.advance) || 0,
          advance_date: rec.advanceDate || null,
          end_date: rec.endDate || null,
          category_id: rec.category ? parseInt(rec.category) : null,
          payment_status: rec.paymentStatus || 'none',
          is_paid: rec.paymentStatus === 'paid',
          is_completed: rec.isCompleted || false
        });
      } catch (error) {
        console.error('Error updating record:', error);
      }
  };

  const handleCompleteRecord = async (clientId, recordId) => {
      const c = clients.find(cl => cl.id === clientId);
      if (!c) return;
      const record = (c.records || []).find(r => r.id === recordId);
      if (!record) return;
      
      // Вычисляем остаток: полная сумма минус аванс
      const totalAmount = parseFloat(record.amount) || 0;
      const advanceAmount = parseFloat(record.advance) || 0;
      const remainingAmount = totalAmount - advanceAmount;
      
      if (remainingAmount > 0) {
          addTransaction(
              remainingAmount, 
              `Оплата: ${record.service || 'Услуга'}`, 
              `${c.carBrand} ${c.carModel}`, 
              'income', 
              c.name, 
              record.category || ''
          );
      }
      
      setClients(prev => prev.map(cl => cl.id === clientId ? { 
          ...cl, 
          records: (cl.records || []).map(r => r.id === recordId ? { ...r, isPaid: true, isCompleted: true, paymentStatus: 'paid' } : r) 
      } : cl));
      
      try {
        await api.updateClientRecord(recordId, {
          is_paid: true,
          is_completed: true,
          payment_status: 'paid'
        });
      } catch (error) {
        console.error('Error completing record:', error);
      }
  };
  
  const handleRestoreRecord = async (clientId, recordId) => {
      const c = clients.find(cl => cl.id === clientId);
      if (!c) return;
      const record = (c.records || []).find(r => r.id === recordId);
      if (!record) return;
      
      if (record.amount) {
          const transactionTitle = `Оплата: ${record.service || 'Услуга'}`;
          
          const matchingTransaction = transactions.find(t => {
              const isSameAmount = t.amount === Number(record.amount);
              const isSameTitle = t.title === transactionTitle;
              const isSameSub = t.sub?.includes(c.name);
              const isIncome = t.type === 'income';
              return isSameAmount && isSameTitle && isSameSub && isIncome;
          });
          
          if (matchingTransaction) {
            try {
              await api.deleteTransaction(matchingTransaction.id);
              setTransactions(prev => prev.filter(t => t.id !== matchingTransaction.id));
            } catch (error) {
              console.error('Error deleting transaction:', error);
            }
          }
      }
      
      setClients(prev => prev.map(cl => cl.id === clientId ? { 
          ...cl, 
          records: (cl.records || []).map(r => r.id === recordId ? { 
              ...r, 
              isPaid: false, 
              isCompleted: false,
              paymentStatus: 'none'
          } : r) 
      } : cl));
      
      try {
        await api.updateClientRecord(recordId, {
          is_paid: false,
          is_completed: false,
          payment_status: 'none'
        });
      } catch (error) {
        console.error('Error restoring record:', error);
      }
  };
  
  const handleUpdateClientBranch = (clientId, newBranch) => {
      // Обновляем филиал клиента
      setClients(prev => prev.map(cl => 
          cl.id === clientId ? { ...cl, branch: newBranch } : cl
      ));
      
      // Обновляем филиал всех задач этого клиента
      setTasks(prev => prev.map(t => 
          t.clientId === clientId ? { ...t, branch: newBranch } : t
      ));
      
      // Обновляем филиал всех событий календаря этого клиента
      setEvents(prev => prev.map(e => 
          e.clientId === clientId ? { ...e, branch: newBranch } : e
      ));
  };
  
  const handleDeleteClient = async (id) => {
      const prevClients = [...clients];
      const prevEvents = [...events];
      const prevTasks = [...tasks];
      
      setClients(clients.filter(cl => cl.id !== id));
      setEvents(events.filter(e => e.clientId !== id));
      setTasks(tasks.filter(t => t.clientId !== id));
      
      try {
        await api.deleteClient(id);
      } catch (error) {
        console.error('Error deleting client:', error);
        setClients(prevClients);
        setEvents(prevEvents);
        setTasks(prevTasks);
      }
  };

  const handleDeleteTask = async (id) => {
      setTasks(tasks.filter(t => t.id !== id));
      
      const isRealId = typeof id === 'number' && id < 2147483647;
      const isTempId = typeof id === 'string' && id.startsWith('temp_');
      
      if (isRealId) {
        try {
          await api.deleteTask(id);
        } catch (error) {
          console.error('Error deleting task:', error);
        }
      }
  };
  
  const handleEditTask = async (updatedTask) => {
      setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
      
      const isRealId = typeof updatedTask.id === 'number' && updatedTask.id < 2147483647;
      if (!isRealId) {
        return;
      }
      
      try {
        await api.updateTask(updatedTask.id, {
          title: updatedTask.title || updatedTask.task || '',
          description: updatedTask.description || '',
          status: updatedTask.completed ? 'completed' : 'pending',
          priority: updatedTask.urgency || 'medium'
        });
      } catch (error) {
        console.error('Error updating task:', error);
      }
  };
  
  const handleAddTask = async (task) => {
      const tempId = Date.now();
      const newTask = { ...task, id: tempId };
      
      // Добавляем в локальное состояние сразу (оптимистичное обновление)
      setTasks(prev => [newTask, ...prev]);
      
      // Проверяем, не временный ли клиент
      const isClientTemp = task.clientId && typeof task.clientId === 'string' && String(task.clientId).startsWith('temp_');
      
      // Если клиент ещё не сохранён - задача сохранится вместе с клиентом
      if (isClientTemp) {
        console.log('Client is new, task will be saved after client is saved');
        return;
      }
      
      try {
        const taskData = {
          title: task.title || task.task || '',
          description: task.description || '',
          status: task.completed ? 'completed' : 'pending',
          priority: task.urgency || task.isUrgent ? 'high' : 'medium',
          client_id: task.clientId || null
        };
        
        const saved = await api.createTask(taskData);
        
        // Обновляем ID задачи на реальный из БД
        setTasks(prev => prev.map(t => t.id === tempId ? { ...t, id: saved.id } : t));
      } catch (error) {
        console.error('Error saving task:', error);
      }
  };
  
  const handleSaveClient = async (updatedClient) => {
      const previousClients = [...clients];
      setClients(clients.map(cl => cl.id === updatedClient.id ? {...cl, ...updatedClient, records: cl.records || updatedClient.records || []} : cl));
      try {
        await api.updateClient(updatedClient.id, {
          name: updatedClient.name,
          phone: updatedClient.phone || '',
          email: updatedClient.email || '',
          notes: JSON.stringify({
            carBrand: updatedClient.carBrand,
            carModel: updatedClient.carModel,
            vin: updatedClient.vin,
            licensePlate: updatedClient.licensePlate,
            branch: updatedClient.branch,
            records: updatedClient.records || [],
            ...updatedClient
          })
        });
      } catch (error) {
        console.error('Error updating client:', error);
        setClients(previousClients);
        alert('Ошибка при сохранении клиента');
      }
  };
  
  const handleAddCategory = (category) => {
      setCategories(prev => [...prev, category]);
  };
  
  const handleEditCategory = (id, updates) => {
      setCategories(prev => prev.map(c => c.id === id ? {...c, ...updates} : c));
  };
  
  const handleDeleteCategory = (id) => {
      setCategories(prev => prev.filter(c => c.id !== id));
      // Удаляем категорию из транзакций
      setTransactions(prev => prev.map(t => t.category === id ? {...t, category: null} : t));
  };
  
  const handleAddTag = (tag) => {
      setTags(prev => [...prev, tag]);
  };
  
  const handleDeleteTag = (id) => {
      setTags(prev => prev.filter(t => t.id !== id));
      // Удаляем тег из транзакций
      setTransactions(prev => prev.map(t => ({
          ...t,
          tags: t.tags ? t.tags.filter(tagId => tagId !== id) : []
      })));
  };
  
  const handleAddManualTransaction = async (transactionData) => {
      const now = new Date();
      const tempId = Date.now() + Math.random();
      const newTransaction = { 
        id: tempId, 
        title: transactionData.title, 
        sub: transactionData.sub || '', 
        amount: Number(transactionData.amount), 
        type: transactionData.type,
        date: now.toISOString(),
        createdDate: getDateStr(0),
        category: transactionData.category || '',
        tags: transactionData.tags || []
      };
      
      setTransactions(prev => [newTransaction, ...prev]);
      
      try {
        const apiData = { 
            title: transactionData.title, 
            description: transactionData.sub || '', 
            amount: Number(transactionData.amount), 
            type: transactionData.type,
            category: transactionData.category || ''
        };
        const saved = await api.createTransaction(apiData);
        
        setTransactions(prev => prev.map(t => t.id === tempId ? { 
          ...t, 
          id: saved.id,
          title: saved.description || transactionData.title
        } : t));
      } catch (error) {
        console.error('Error saving transaction:', error);
      }
  };
  
  const handleEditTransaction = async (updatedTransaction) => {
      const previousTransactions = [...transactions];
      setTransactions(transactions.map(t => t.id === updatedTransaction.id ? updatedTransaction : t));
      try {
        await api.updateTransaction(updatedTransaction.id, {
          title: updatedTransaction.title,
          description: updatedTransaction.sub || updatedTransaction.description || '',
          amount: updatedTransaction.amount,
          type: updatedTransaction.type,
          category: updatedTransaction.category || ''
        });
      } catch (error) {
        console.error('Error updating transaction:', error);
        setTransactions(previousTransactions);
      }
  };
  
  const handleDeleteTransaction = async (id) => {
      const previousTransactions = [...transactions];
      setTransactions(transactions.filter(t => t.id !== id));
      try {
        await api.deleteTransaction(id);
      } catch (error) {
        console.error('Error deleting transaction:', error);
        setTransactions(previousTransactions);
      }
  };

  const filteredEvents = events; // Показываем все события независимо от филиала

  return (
    <div className="app-container w-full bg-white flex flex-col overflow-hidden">
      {/* Меню пользователя с кнопкой выхода */}
      <UserMenu onLogout={handleLogout} onShowProfile={() => setShowProfile(true)} onShowAdmin={() => setShowAdmin(true)} />
      
      <div className="flex-1 relative overflow-hidden bg-zinc-50">
          {activeTab === 'clients' && <ClientsView allClients={filteredClients} onAddClient={handleAddClient} onDeleteClient={handleDeleteClient} onOpenClient={setSelectedClient} onEditClient={setEditingClient} ClientForm={ClientForm} currentBranch={currentBranch} dateFilter={clientsDateFilter} onDateFilterChange={setClientsDateFilter} />}
          {activeTab === 'tasks' && <TasksView tasks={tasks} onToggleTask={(id) => setTasks(tasks.map(t => t.id === id ? {...t, completed: !t.completed} : t))} onAddTask={handleAddTask} onDeleteTask={handleDeleteTask} onEditTask={handleEditTask} clients={filteredClients} currentBranch={currentBranch} />}
          {activeTab === 'calendar' && <CalendarView events={filteredEvents} clients={filteredClients} onAddRecord={handleAddRecord} onOpenClient={setSelectedClient} categories={categories} currentBranch={currentBranch} />}
          {activeTab === 'finance' && <FinanceView transactions={transactions} onAddTransaction={handleAddManualTransaction} onEditTransaction={handleEditTransaction} onDeleteTransaction={handleDeleteTransaction} categories={categories} onAddCategory={handleAddCategory} onEditCategory={handleEditCategory} onDeleteCategory={handleDeleteCategory} tags={tags} onAddTag={handleAddTag} onDeleteTag={handleDeleteTag} />}

          {selectedClient && <ClientDetails client={filteredClients.find(c => c.id === selectedClient.id) || selectedClient} tasks={tasks} onBack={() => setSelectedClient(null)} onEdit={() => setEditingClient({ client: selectedClient, mode: 'full' })} onDelete={() => {handleDeleteClient(selectedClient.id); setSelectedClient(null);}} onAddTask={handleAddTask} onToggleTask={(id) => setTasks(tasks.map(t => t.id === id ? {...t, completed: !t.completed} : t))} onAddRecord={handleAddRecord} onEditRecord={handleEditRecord} onCompleteRecord={handleCompleteRecord} onRestoreRecord={handleRestoreRecord} onDeleteTask={handleDeleteTask} onEditTask={handleEditTask} onUpdateBranch={handleUpdateClientBranch} categories={categories} userRole={user?.role || 'owner'} />}
          {editingClient && <ClientForm client={editingClient.client} onSave={(upd) => {handleSaveClient(upd); setEditingClient(null); if(selectedClient?.id === upd.id) setSelectedClient({...selectedClient, ...upd});}} onCancel={() => setEditingClient(null)} title={'Редактирование'} currentBranch={currentBranch} />}
      </div>
      <TabBar activeTab={activeTab} setActiveTab={setActiveTab} userRole={user?.role || 'owner'} onTabChange={() => setSelectedClient(null)} />
      <style>{`
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        :root {
          --app-height: 100vh;
          --safe-bottom: env(safe-area-inset-bottom, 0px);
          --safe-top: env(safe-area-inset-top, 0px);
        }
        html { 
          height: 100%; 
          overflow: hidden;
        }
        body { 
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
          background-color: #ffffff; 
          margin: 0; 
          padding: 0; 
          height: 100%;
          height: -webkit-fill-available;
          width: 100%; 
          overflow: hidden;
          overscroll-behavior: none;
          -webkit-overflow-scrolling: touch;
          padding-top: var(--safe-top);
          padding-bottom: var(--safe-bottom);
        }
        #root {
          height: 100%;
          height: -webkit-fill-available;
          width: 100%;
          overflow: hidden;
        }
        .app-container {
          height: 100%;
          height: -webkit-fill-available;
          min-height: -webkit-fill-available;
        }
        .pb-safe { padding-bottom: calc(20px + var(--safe-bottom)); }
        .animate-fade-in { animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        ::-webkit-scrollbar { display: none; }
        input, textarea, select { font-size: 16px !important; }
        
        @supports (height: 100dvh) {
          :root { --app-height: 100dvh; }
          body, #root, .app-container { height: 100dvh; min-height: 100dvh; }
        }
      `}</style>
    </div>
  );
};

export default App;
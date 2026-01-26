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
import { FormField, TaskFormFields, BookingFormFields } from '@/app/components/forms';
import { ClientsView as ClientsViewComponent } from '@/app/views';
import { CalendarGrid } from '@/app/components/CalendarGrid';
import { LoginScreen } from '@/app/components/LoginScreen';
import { ProfilePage } from '@/app/components/ProfilePage';
import { UserMenu } from '@/app/components/UserMenu';

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

const AppointmentInputs = ({ data, onChange, categories }) => {
    return (
        <div className="space-y-3">
            {/* Услуга */}
            <input 
                type="text" 
                name="service" 
                value={String(data.service || '')} 
                onChange={onChange} 
                placeholder="Услуга / Деталь" 
                className="w-full bg-white border border-zinc-300 rounded-xl p-4 text-base font-medium text-black outline-none focus:border-black shadow-sm" 
            />
            
            {/* Дата и время */}
            <div className="flex gap-3">
                <div className="flex-1">
                    <span className="text-xs text-gray-400 font-semibold block mb-2">Дата начала</span>
                    <input 
                        type="date" 
                        name="date" 
                        value={String(data.date || '')} 
                        onChange={onChange} 
                        className="w-full bg-white border border-zinc-300 rounded-xl p-4 font-medium text-black outline-none focus:border-black shadow-sm"
                    />
                </div>
                <div className="w-28">
                    <span className="text-xs text-gray-400 font-semibold block mb-2">Время</span>
                    <input 
                        type="time" 
                        name="time" 
                        value={String(data.time || '')} 
                        onChange={onChange} 
                        className="w-full bg-white border border-zinc-300 rounded-xl p-4 font-medium text-black outline-none focus:border-black shadow-sm text-center"
                    />
                </div>
            </div>
            
            {/* Дата окончания */}
            <div>
                <span className="text-xs text-gray-400 font-semibold block mb-2">Дата окончания</span>
                <input 
                    type="date" 
                    name="endDate" 
                    value={String(data.endDate || '')} 
                    onChange={onChange} 
                    className="w-full bg-white border border-zinc-300 rounded-xl p-4 font-medium text-black outline-none focus:border-black shadow-sm"
                    placeholder="Необязательно"
                />
            </div>
            {/* Категория */}
            {categories && categories.length > 0 && (
                <div>
                    <span className="text-xs text-gray-400 font-semibold block mb-2">Категория</span>
                    <div className="flex flex-wrap gap-2">
                        {categories.filter(cat => cat.type === 'income').map(cat => (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => onChange({ target: { name: 'category', value: data.category === cat.id ? '' : cat.id }})}
                                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-all ${
                                    data.category === cat.id 
                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' 
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                            >
                                <div 
                                    className="w-2 h-2 rounded-full" 
                                    style={{ backgroundColor: cat.color }}
                                />
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Сумма */}
            <div>
                <span className="text-xs text-gray-400 font-semibold block mb-2">Сумма</span>
                <input 
                    type="text" 
                    name="amount" 
                    value={String(data.amount || '')} 
                    onChange={onChange} 
                    placeholder="0 ₽" 
                    className="w-full bg-white border border-zinc-300 rounded-xl p-4 text-lg font-bold text-black outline-none focus:border-black shadow-sm" 
                />
            </div>
            
            {/* Статус оплаты */}
            <div>
                <span className="text-xs text-gray-400 font-semibold block mb-2">Оплата</span>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => onChange({ target: { name: 'paymentStatus', value: 'none' }})}
                        className={`flex-1 px-2 py-2 rounded-xl text-xs font-semibold transition-all ${
                            data.paymentStatus === 'none' || !data.paymentStatus
                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' 
                            : 'bg-gray-100 text-gray-400'
                        }`}
                    >
                        Не оплачено
                    </button>
                    <button
                        type="button"
                        onClick={() => onChange({ target: { name: 'paymentStatus', value: 'advance' }})}
                        className={`flex-1 px-2 py-2 rounded-xl text-xs font-semibold transition-all ${
                            data.paymentStatus === 'advance' 
                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' 
                            : 'bg-gray-100 text-gray-400'
                        }`}
                    >
                        Аванс
                    </button>
                    <button
                        type="button"
                        onClick={() => onChange({ target: { name: 'paymentStatus', value: 'paid' }})}
                        className={`flex-1 px-2 py-2 rounded-xl text-xs font-semibold transition-all ${
                            data.paymentStatus === 'paid' 
                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' 
                            : 'bg-gray-100 text-gray-400'
                        }`}
                    >
                        Оплачено
                    </button>
                </div>
            </div>
        </div>
    );
};

const TabBar = ({ activeTab, setActiveTab, userRole = 'owner' }) => {
  const allTabs = [
    { id: 'clients', icon: Users, label: 'Клиенты' },
    { id: 'tasks', icon: CheckSquare, label: 'Задачи' },
    { id: 'calendar', icon: CalendarIcon, label: 'Календарь' },
    { id: 'finance', icon: PieChart, label: 'Финансы' },
  ];
  
  // Фильтруем вкладки по правам доступа
  const tabs = allTabs.filter(tab => canAccessTab(userRole, tab.id));
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-zinc-200 z-[250] h-[84px] pb-safe shrink-0">
      <div className="flex justify-between items-center max-w-lg mx-auto h-full px-4">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center justify-center w-full transition-all active:scale-90 ${activeTab === tab.id ? 'text-black' : 'text-zinc-400'}`}>
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

  useEffect(() => {
    const models = formData.carBrand && CAR_DATABASE[formData.carBrand] ? CAR_DATABASE[formData.carBrand] : [];
    setAvailableModels(models);
  }, [formData.carBrand]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'phone') {
        let input = value.replace(/[^0-9+]/g, '');
        if (!input.startsWith('+')) if (input.length > 0) input = '+' + input;
        setFormData(prev => ({ ...prev, [name]: input }));
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
    <div className="absolute inset-0 z-[200] bg-zinc-50 flex flex-col h-full overflow-hidden animate-in slide-in-from-bottom-5">
        <div className="px-6 pt-12 pb-4 bg-white border-b border-zinc-200 flex items-center justify-between sticky top-0 z-10 shrink-0">
            <Button variant="ghost" size="md" onClick={onCancel} className="text-base">Отмена</Button>
            <span className="text-xl font-black">{String(title)}</span>
            <Button 
                variant="ghost" 
                size="md" 
                onClick={() => formData.name && onSave(formData, newTasks, newRecords)}
                className="text-base font-bold !text-orange-500"
            >
                Готово
            </Button>
        </div>
        
        {/* Увеличенный отступ pb-96 для предотвращения перекрытия нижним меню */}
        <div className="flex-1 overflow-y-auto px-6 pt-6 space-y-8 pb-96 overscroll-contain">
            <div className="space-y-4">
                <div className="flex justify-between items-center"><h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Данные клиента</h3>{!readOnlyIdentity && <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-2 py-1 rounded-md">{formatDate(formData.createdAt)}</span>}</div>
                <div className="space-y-3">
                    <input type="text" name="name" value={String(formData.name || '')} onChange={handleChange} placeholder="Имя Фамилия" className="w-full bg-white border border-zinc-300 rounded-xl p-4 text-lg font-bold outline-none focus:border-black" disabled={readOnlyIdentity} />
                    <div className="flex gap-3">
                        <input type="tel" name="phone" value={String(formData.phone || '')} onChange={handleChange} placeholder="+7" className="w-full bg-white border border-zinc-300 rounded-xl p-4 font-bold outline-none shadow-sm" disabled={readOnlyIdentity} />
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
                        <button onClick={() => { if(taskInput.title) { setNewTasks([...newTasks, {...taskInput, id: Date.now()}]); setTaskInput(getInitialTaskState(currentBranch)); setIsTaskFormOpen(false); } }} className={`w-full py-3 rounded-lg text-sm font-bold ${BTN_METAL_DARK}`}>Добавить задачу</button>
                    </div>
                )}
                <div className="space-y-2">
                    {newTasks.map(t => (
                        <div key={t.id} className="bg-white p-3 rounded-xl border border-zinc-200 flex items-center justify-between shadow-sm">
                            <div><p className="text-sm font-bold text-zinc-800">{String(t.title || '')}</p><span className="text-[10px] text-zinc-400">{formatDate(t.date)} {String(t.time || '')}</span></div>
                            <button onClick={() => setNewTasks(newTasks.filter(item => item.id !== t.id))} className="text-zinc-300 hover:text-red-500 transition-colors"><X size={16}/></button>
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
                            <button onClick={() => setNewRecords(newRecords.filter(item => item.id !== r.id))} className="text-zinc-300 hover:text-red-500 transition-colors"><X size={16}/></button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
  );
};

// --- 5. MAIN VIEWS ---

const ClientDetails = ({ client, onBack, tasks, onEdit, onAddTask, onDelete, onToggleTask, onAddRecord, onEditRecord, onCompleteRecord, onRestoreRecord, onDeleteTask, onEditTask, onUpdateBranch, activeTab, setActiveTab, categories }) => {
    const clientTasks = tasks.filter(t => t.clientId === client.id);
    const activeTasks = clientTasks.filter(t => !t.completed);
    const completedTasks = clientTasks.filter(t => t.completed);
    const [showArchive, setShowArchive] = useState(false);
    const [showRecordsArchive, setShowRecordsArchive] = useState(false);
    const [isAddingTask, setIsAddingTask] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [newTask, setNewTask] = useState(getInitialTaskState(client.branch));
    const [isAddingRecord, setIsAddingRecord] = useState(false);
    const [editingRecordId, setEditingRecordId] = useState(null);
    const [newRecord, setNewRecord] = useState(getInitialRecordState(client.branch));
    const [completingRecordId, setCompletingRecordId] = useState(null);
    
    const clientRecords = client.records || [];
    const today = getDateStr(0);
    
    // Разделяем записи на активные и архивные
    const activeRecords = clientRecords.filter(r => !r.isCompleted && r.date >= today);
    const archivedRecords = clientRecords
        .filter(r => r.isCompleted || r.date < today)
        .sort((a, b) => b.date.localeCompare(a.date)); // Сортируе�� от новых к старым
    
    // Подсчет общей суммы за все время (только полностью оплаченные)
    const totalEarnings = clientRecords.reduce((sum, record) => {
        // Учи��ываем только полностью оплаченные брони
        if (record.paymentStatus === 'paid') {
            const amount = Number(record.amount) || 0;
            return sum + amount;
        }
        return sum;
    }, 0);
    
    const handleCompleteClick = (recordId) => {
        setCompletingRecordId(recordId);
        setTimeout(() => {
            onCompleteRecord(client.id, recordId);
            setCompletingRecordId(null);
        }, 300);
    };
    
    const handleEditTask = (task) => {
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
            onAddTask({...newTask, clientId: client.id, clientName: client.name, completed: false, urgency: newTask.isUrgent ? 'high' : 'low', id: Date.now()});
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
        <div className="absolute inset-0 z-[120] bg-zinc-50 flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-300">
            <div className="px-5 pt-12 pb-4 bg-white border-b border-zinc-200 flex items-center justify-between sticky top-0 z-10 h-[92px] shrink-0">
                <button onClick={onBack} className="flex items-center gap-1 text-zinc-600 font-bold"><ChevronLeft size={24} /> Назад</button>
                <div className="flex gap-4"><button onClick={onEdit} className="text-zinc-500 hover:text-black transition-colors"><Edit3 size={20} /></button><button onClick={onDelete} className="text-red-500 transition-colors"><Trash2 size={20} /></button></div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-[100px] overscroll-contain">
                <div className="text-center">
                    <h2 className="text-3xl font-black text-black leading-tight mb-2">{String(client.name || '')}</h2>
                    <span className="text-xl font-medium text-zinc-400">{String(client.phone || '')}</span>
                    
                    {/* Выбор филиала клиента */}
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
                
                {/* Статистика по клиенту - показываем только если есть полностью оплаченные брони */}
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
                        <p className="text-xs text-orange-100 mt-1 font-medium">За {clientRecords.filter(r => r.paymentStatus === 'paid').length} {clientRecords.filter(r => r.paymentStatus === 'paid').length === 1 ? 'бронь' : 'броней'}</p>
                    </div>
                )}
                <div className="bg-white p-5 rounded-2xl border border-zinc-200 text-zinc-700 leading-relaxed text-sm shadow-sm">{String(client.comment || "Нет заметок.")}</div>
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
                            <AppointmentInputs data={newRecord} onChange={(e) => setNewRecord({...newRecord, [e.target.name]: e.target.value})} categories={categories || []} />
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
                            {activeRecords.map((record) => {
                                const category = categories?.find(cat => cat.id === record.category);
                                const isMsk = record.branch === 'msk';
                                const isRnd = record.branch === 'rnd';
                                
                                // Цвет полоски в зависимости от филиала
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
                                            {/* Полоска цвета филиала */}
                                            <div className={`h-1.5 ${topBarColor}`}></div>
                                            
                                            <div className="p-5 space-y-4">
                                                {/* Заголовок */}
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
                                                
                                                {/* Услуга */}
                                                <div>
                                                    <h3 className="text-2xl font-black text-zinc-900 leading-tight">{String(record.service || '')}</h3>
                                                    {category && (
                                                        <div className="flex items-center gap-1.5 mt-2">
                                                            <div 
                                                                className="w-2 h-2 rounded-full" 
                                                                style={{ backgroundColor: category.color }}
                                                            />
                                                            <span className="text-sm text-zinc-500 font-medium">{category.name}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {/* Дата и время */}
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
                                                
                                                {/* Сумма */}
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
                    
                    {/* Архив броней */}
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
                                    {archivedRecords.map((record) => (
                                        <div key={record.id} className="rounded-xl bg-white border border-zinc-200 shadow-sm overflow-hidden">
                                            {/* Серая полоска для архивных */}
                                            <div className="h-1 bg-gradient-to-r from-zinc-300 to-zinc-400"></div>
                                            
                                            <div className="p-4 space-y-2 relative">
                                                <div className="flex items-center gap-2 justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle2 size={14} className="text-green-600" />
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Выполнено</span>
                                                        {record.isPaid && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold">Оплачено</span>}
                                                    </div>
                                                    
                                                    {/* Компактная иконка восстановления */}
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
                <div>
                    <div className="flex items-center justify-between mb-3"><span className="text-xs font-black text-zinc-400 uppercase tracking-widest">Задачи</span><button onClick={() => setIsAddingTask(true)} className={`text-[10px] font-bold px-3 py-1.5 rounded-lg ${BTN_METAL}`}>+ Создать</button></div>
                    {isAddingTask && (
                        <div className="bg-white p-4 rounded-2xl border border-zinc-300 shadow-sm space-y-3 mb-4 animate-in fade-in">
                            <input type="text" value={String(newTask.title || '')} onChange={(e) => setNewTask({...newTask, title: e.target.value})} placeholder="Задача..." className="w-full bg-zinc-50 p-3 rounded-lg outline-none text-sm font-semibold shadow-inner" />
                            <div className="flex gap-2">
                                <input type="date" value={String(newTask.date || '')} onChange={(e) => setNewTask({...newTask, date: e.target.value})} className="flex-1 bg-zinc-50 p-2 rounded-lg text-xs outline-none" />
                                <input type="time" value={String(newTask.time || '')} onChange={(e) => setNewTask({...newTask, time: e.target.value})} className="w-28 bg-zinc-50 p-2 rounded-lg text-xs outline-none text-center" />
                            </div>
                            
                            {/* Выбор филиала */}
                            <ToggleGroup
                                options={[
                                    { value: 'msk', label: 'МСК' },
                                    { value: 'rnd', label: 'РНД' }
                                ]}
                                value={newTask.branch}
                                onChange={(value) => setNewTask({...newTask, branch: value})}
                                variant="minimal"
                            />
                            
                            {/* Кнопка срочно с иконкой */}
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
            <div className="sticky bottom-0 bg-white border-t border-zinc-200 px-6 py-3 shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
                <div className="flex gap-2">
                    <TabButton 
                        isActive={activeTab === 'clients'}
                        icon={Users}
                        label="Клиенты"
                        onClick={() => { onBack(); setActiveTab('clients'); }}
                    />
                    <TabButton 
                        isActive={activeTab === 'tasks'}
                        icon={CheckSquare}
                        label="Задачи"
                        onClick={() => { onBack(); setActiveTab('tasks'); }}
                    />
                    <TabButton 
                        isActive={activeTab === 'calendar'}
                        icon={Calendar}
                        label="Календарь"
                        onClick={() => { onBack(); setActiveTab('calendar'); }}
                    />
                    <TabButton 
                        isActive={activeTab === 'finance'}
                        icon={Wallet}
                        label="Финансы"
                        onClick={() => { onBack(); setActiveTab('finance'); }}
                    />
                </div>
            </div>
        </div>
    );
};

// ClientsView вынесен в отдельный файл: /src/app/views/ClientsView.tsx
const ClientsView = ClientsViewComponent;

const TasksView = ({ tasks, onToggleTask, onAddTask, onDeleteTask, onEditTask, clients, currentBranch }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [showArchive, setShowArchive] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
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
    
    const handleEditTask = (task) => {
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
                onEditTask({ ...editingTask, ...taskData });
                setEditingTask(null);
            } else {
                onAddTask({ ...taskData, id: Date.now() });
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
            
            {/* Переключатель вкладок */}
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
                    <div className="w-full bg-white rounded-t-[32px] p-6 shadow-2xl space-y-6 pb-32 overflow-y-auto max-h-[90vh]">
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
                            
                            {/* Выбор клиента */}
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
                            
                            {/* Теги филиалов */}
                            <div className="space-y-2">
                                <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Филиал</label>
                                <BranchSelector
                                    value={newTask.branch}
                                    onChange={(branch) => setNewTask({...newTask, branch: branch || ''})}
                                    size="lg"
                                />
                            </div>
                            
                            {/* Срочность */}
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
            
            <div className="flex-1 overflow-y-auto px-6 mt-2 space-y-2.5 pt-3 pb-32 overscroll-contain">
                {/* Активные задачи */}
                {taskFilter === 'all' ? (
                    <>
                        {/* Задачи на сегодня и просроченные */}
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
                        
                        {/* Будущие задачи */}
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
                        
                        {/* Если нет вообще задач */}
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

                {/* Архив */}
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
             <div className="flex-1 overflow-y-auto bg-white p-2 overscroll-contain pb-24">
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
                    <div className="w-full bg-white rounded-t-[32px] p-6 shadow-2xl max-h-[80vh] overflow-y-auto pb-32" onClick={(e) => e.stopPropagation()}>
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
          sub: t.description || t.sub || '',
          createdDate: t.created_at ? new Date(t.created_at).toISOString().split('T')[0] : getDateStr(0)
        }));
        
        // Группируем записи по клиентам
        const recordsByClient = {};
        (recordsData || []).forEach(record => {
          const clientId = record.client_id;
          if (!recordsByClient[clientId]) {
            recordsByClient[clientId] = [];
          }
          // Восстанавливаем данные записи из notes
          let recordData = { id: record.id, service: record.service, date: record.date, amount: record.amount, isPaid: record.is_paid, isCompleted: record.is_completed };
          try {
            if (record.notes) {
              const parsed = JSON.parse(record.notes);
              recordData = { ...parsed, ...recordData };
            }
          } catch (e) {}
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
        setTasks(tasksData || []);
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

  const addTransaction = async (amount, title, sub, type = 'income', clientName = '', category = '') => {
      const now = new Date();
      const transactionData = { 
          title: type === 'income' ? `Оплата: ${title}` : title, 
          description: clientName ? `${clientName} • ${sub}` : sub, 
          amount: Number(amount), 
          type: type,
          category: category || ''
      };
      try {
        const saved = await api.createTransaction(transactionData);
        setTransactions(prev => [{ 
          ...saved,
          sub: saved.description,
          createdDate: getDateStr(0)
        }, ...prev]);
      } catch (error) {
        console.error('Error saving transaction:', error);
        setTransactions(prev => [{ 
          id: Date.now()+Math.random(), 
          ...transactionData,
          sub: transactionData.description,
          date: now.toISOString(),
          createdDate: getDateStr(0)
        }, ...prev]);
      }
  };

  const handleAddClient = async (data, tks, recs) => {
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
        const id = savedClient.id;
        const entry = { 
          ...data, 
          id, 
          branch: data.branch || null, 
          createdDate: getDateStr(0), 
          records: [] 
        };
        
        if (recs?.length) {
           const newRecords = recs.map((rec, idx) => {
              const recordId = Date.now() + idx + 1;
              setEvents(prev => [...prev, { 
                  id: Date.now() + idx + 100, 
                  clientId: id, 
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
        if (tks?.length) {
          const newTasks = tks.map(t => ({ 
            ...t, 
            id: Date.now()+Math.random(), 
            clientId: id, 
            clientName: data.name, 
            branch: data.branch || null, 
            completed: false 
          }));
          setTasks(prev => [...newTasks, ...prev]);
          for (const task of newTasks) {
            api.createTask({
              title: task.title || task.task,
              description: task.description || '',
              status: 'pending',
              priority: task.urgency || 'medium',
              client_id: id
            }).catch(console.error);
          }
        }
      } catch (error) {
        console.error('Error adding client:', error);
        const id = Date.now();
        const entry = { ...data, id, branch: data.branch || null, createdDate: getDateStr(0), records: [] };
        setClients(prev => [entry, ...prev]);
      }
  };

  const handleAddRecord = async (clientId, rec) => {
      const c = clients.find(cl => cl.id === clientId);
      if (!c) return;
      
      const recordData = {
        client_id: clientId,
        service: rec.service,
        date: rec.date,
        amount: rec.amount || 0,
        is_paid: rec.isPaid || false,
        is_completed: rec.isCompleted || false,
        notes: JSON.stringify({ ...rec, clientId })
      };
      
      try {
        const saved = await api.createClientRecord(recordData);
        const newRecord = { ...rec, id: saved.id };
        setClients(prev => prev.map(cl => cl.id === clientId ? { ...cl, records: [...(cl.records || []), newRecord] } : cl));
        setEvents(prev => [...prev, { id: Date.now()+1, clientId: clientId, recordId: saved.id, branch: c.branch, date: rec.date, endDate: rec.endDate, time: rec.time, service: rec.service, title: `${c.carBrand} (${rec.service})`, type: 'work' }]);
      } catch (error) {
        console.error('Error saving record:', error);
        const recordId = Date.now();
        const newRecord = { ...rec, id: recordId };
        setClients(prev => prev.map(cl => cl.id === clientId ? { ...cl, records: [...(cl.records || []), newRecord] } : cl));
        setEvents(prev => [...prev, { id: Date.now()+1, clientId: clientId, recordId: recordId, branch: c.branch, date: rec.date, endDate: rec.endDate, time: rec.time, service: rec.service, title: `${c.carBrand} (${rec.service})`, type: 'work' }]);
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
          service: rec.service,
          date: rec.date,
          amount: rec.amount || 0,
          is_paid: rec.isPaid || false,
          is_completed: rec.isCompleted || false,
          notes: JSON.stringify({ ...rec, clientId })
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
      
      if (record.amount) {
          addTransaction(
              record.amount, 
              record.service || 'Услуга', 
              `${c.carBrand} ${c.carModel}`, 
              'income', 
              c.name, 
              record.category || ''
          );
      }
      
      setClients(prev => prev.map(cl => cl.id === clientId ? { 
          ...cl, 
          records: (cl.records || []).map(r => r.id === recordId ? { ...r, isPaid: true, isCompleted: true } : r) 
      } : cl));
      
      try {
        await api.updateClientRecord(recordId, {
          is_paid: true,
          is_completed: true
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
              isCompleted: false 
          } : r) 
      } : cl));
      
      try {
        await api.updateClientRecord(recordId, {
          is_paid: false,
          is_completed: false
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
      try {
        await api.deleteClient(id);
        setClients(clients.filter(cl => cl.id !== id));
        setEvents(events.filter(e => e.clientId !== id));
        setTasks(tasks.filter(t => t.clientId !== id));
      } catch (error) {
        console.error('Error deleting client:', error);
        alert('Ошибка при удалении клиента');
      }
  };

  const handleDeleteTask = async (id) => {
      try {
        await api.deleteTask(id);
        setTasks(tasks.filter(t => t.id !== id));
      } catch (error) {
        console.error('Error deleting task:', error);
        alert('Ошибка при удалении задачи');
      }
  };
  
  const handleEditTask = async (updatedTask) => {
      const previousTasks = [...tasks];
      setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
      try {
        await api.updateTask(updatedTask.id, {
          title: updatedTask.title || updatedTask.task || '',
          description: updatedTask.description || '',
          status: updatedTask.completed ? 'completed' : 'pending',
          priority: updatedTask.urgency || 'medium'
        });
      } catch (error) {
        console.error('Error updating task:', error);
        setTasks(previousTasks);
        alert('Ошибка при обновлении задачи');
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
      const apiData = { 
          title: transactionData.title, 
          description: transactionData.sub || '', 
          amount: Number(transactionData.amount), 
          type: transactionData.type,
          category: transactionData.category || ''
      };
      try {
        const saved = await api.createTransaction(apiData);
        setTransactions(prev => [{ 
          ...saved,
          sub: saved.description,
          createdDate: getDateStr(0),
          tags: transactionData.tags || []
        }, ...prev]);
      } catch (error) {
        console.error('Error saving transaction:', error);
        const now = new Date();
        setTransactions(prev => [{ 
          id: Date.now() + Math.random(), 
          title: transactionData.title, 
          sub: transactionData.sub || '', 
          amount: Number(transactionData.amount), 
          type: transactionData.type,
          date: now.toISOString(),
          createdDate: getDateStr(0),
          category: transactionData.category || '',
          tags: transactionData.tags || []
        }, ...prev]);
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
    <div className="w-full h-screen bg-white flex flex-col overflow-hidden">
      {/* Меню пользователя с кнопкой выхода */}
      <UserMenu onLogout={handleLogout} onShowProfile={() => setShowProfile(true)} />
      
      <div className="flex-1 relative overflow-hidden bg-zinc-50">
          {activeTab === 'clients' && <ClientsView allClients={filteredClients} onAddClient={handleAddClient} onDeleteClient={handleDeleteClient} onOpenClient={setSelectedClient} onEditClient={setEditingClient} ClientForm={ClientForm} currentBranch={currentBranch} dateFilter={clientsDateFilter} onDateFilterChange={setClientsDateFilter} />}
          {activeTab === 'tasks' && <TasksView tasks={tasks} onToggleTask={(id) => setTasks(tasks.map(t => t.id === id ? {...t, completed: !t.completed} : t))} onAddTask={(t) => setTasks([t, ...tasks])} onDeleteTask={handleDeleteTask} onEditTask={handleEditTask} clients={filteredClients} currentBranch={currentBranch} />}
          {activeTab === 'calendar' && <CalendarView events={filteredEvents} clients={filteredClients} onAddRecord={handleAddRecord} onOpenClient={setSelectedClient} categories={categories} currentBranch={currentBranch} />}
          {activeTab === 'finance' && <FinanceView transactions={transactions} onAddTransaction={handleAddManualTransaction} onEditTransaction={handleEditTransaction} onDeleteTransaction={handleDeleteTransaction} categories={categories} onAddCategory={handleAddCategory} onEditCategory={handleEditCategory} onDeleteCategory={handleDeleteCategory} tags={tags} onAddTag={handleAddTag} onDeleteTag={handleDeleteTag} />}

          {selectedClient && <ClientDetails client={filteredClients.find(c => c.id === selectedClient.id) || selectedClient} tasks={tasks} onBack={() => setSelectedClient(null)} onEdit={() => setEditingClient({ client: selectedClient, mode: 'full' })} onDelete={() => {handleDeleteClient(selectedClient.id); setSelectedClient(null);}} onAddTask={(t) => setTasks([t, ...tasks])} onToggleTask={(id) => setTasks(tasks.map(t => t.id === id ? {...t, completed: !t.completed} : t))} onAddRecord={handleAddRecord} onEditRecord={handleEditRecord} onCompleteRecord={handleCompleteRecord} onRestoreRecord={handleRestoreRecord} onDeleteTask={handleDeleteTask} onEditTask={handleEditTask} onUpdateBranch={handleUpdateClientBranch} activeTab={activeTab} setActiveTab={setActiveTab} categories={categories} />}
          {editingClient && <ClientForm client={editingClient.client} onSave={(upd) => {handleSaveClient(upd); setEditingClient(null); if(selectedClient?.id === upd.id) setSelectedClient({...selectedClient, ...upd});}} onCancel={() => setEditingClient(null)} title={'Редактирование'} currentBranch={currentBranch} />}
      </div>
      <TabBar activeTab={activeTab} setActiveTab={setActiveTab} userRole={user?.role || 'owner'} />
      <style>{`
        * { -webkit-tap-highlight-color: transparent; }
        body { 
          font-family: 'Inter', sans-serif; 
          background-color: #ffffff; 
          margin: 0; 
          padding: 0; 
          height: 100vh; 
          width: 100vw; 
          overflow: hidden;
          position: fixed;
          overscroll-behavior: none;
        }
        #root {
          height: 100vh;
          width: 100vw;
          overflow: hidden;
        }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 20px); }
        .animate-fade-in { animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        ::-webkit-scrollbar { display: none; }
        input, textarea, select { font-size: 16px !important; }
        
        /* Предотвращение резинового эффекта на iOS */
        html, body {
          position: fixed;
          overflow: hidden;
          width: 100%;
          height: 100%;
        }
      `}</style>
    </div>
  );
};

export default App;
import { useState, useMemo } from 'react';
import { Plus, X, ArrowDownLeft, ArrowUpRight, Wallet, Edit3, Trash2, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Tag, BarChart3, ChevronDown, Download } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { TransactionItem } from '@/app/components/TransactionItem';
import * as XLSX from 'xlsx';

// Импорт утилит и констант
import { BTN_METAL_DARK, BTN_METAL, CARD_METAL } from '@/utils/constants';
import { formatMoney, formatDate, formatDateShort } from '@/utils/helpers';
import { getInitialTransactionState } from '@/utils/initialStates';
import { Header } from '@/app/components/ui/Header';
import { Button } from '@/app/components/ui/Button';
import { Modal } from '@/app/components/ui/Modal';
import { ColorPicker } from '@/app/components/ui/ColorPicker';
import { ToggleGroup } from '@/app/components/ui/ToggleGroup';

const COLORS = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', 
    '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e'
];

interface FinanceViewProps {
    transactions: any[];
    onAddTransaction: (transaction: any) => void;
    onEditTransaction: (transaction: any) => void;
    onDeleteTransaction: (id: string) => void;
    categories: any[];
    onAddCategory: (category: any) => void;
    onEditCategory: (id: string, updates: any) => void;
    onDeleteCategory: (id: string) => void;
    tags: any[];
    onAddTag: (tag: any) => void;
    onDeleteTag: (id: string) => void;
}

export const FinanceView = ({ transactions, onAddTransaction, onEditTransaction, onDeleteTransaction, categories, onAddCategory, onEditCategory, onDeleteCategory, tags, onAddTag, onDeleteTag }: FinanceViewProps) => {
    const [activeSection, setActiveSection] = useState<'operations' | 'analytics'>('operations');
    const [isAdding, setIsAdding] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [newTransaction, setNewTransaction] = useState(getInitialTransactionState());
    
    // New transaction state
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
    const [isAddingNewTag, setIsAddingNewTag] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newTagName, setNewTagName] = useState('');
    const [newCategoryColor, setNewCategoryColor] = useState(COLORS[0]);
    const [newTagColor, setNewTagColor] = useState(COLORS[0]);
    
    // Analytics state
    const [viewMode, setViewMode] = useState<'income' | 'expense'>('expense');
    const [timeFilter, setTimeFilter] = useState<'day' | 'week' | 'month' | 'year'>('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [editingCategory, setEditingCategory] = useState<any>(null);
    const [newCategory, setNewCategory] = useState({ name: '', color: COLORS[0], type: 'expense' });
    const [serviceFilter, setServiceFilter] = useState<string>('all');
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

    // Переключение раскрытия категории
    const toggleCategoryExpand = (categoryId: string) => {
        setExpandedCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(categoryId)) {
                newSet.delete(categoryId);
            } else {
                newSet.add(categoryId);
            }
            return newSet;
        });
    };

    // Получаем список услуг из транзакций
    const services = useMemo(() => {
        const serviceSet = new Set(transactions.map(t => t.description).filter(Boolean));
        return ['all', ...Array.from(serviceSet)];
    }, [transactions]);

    // Фильтрация транзакций по времени для аналитики
    const filteredTransactions = useMemo(() => {
        const now = currentDate;
        let filtered = transactions.filter(t => t.type === viewMode);

        if (timeFilter === 'day') {
            // Получаем локальную дату в формате YYYY-MM-DD
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const today = `${year}-${month}-${day}`;
            
            filtered = filtered.filter(t => {
                const tDateStr = t.createdDate || new Date(t.date).toISOString().split('T')[0];
                return tDateStr === today;
            });
        } else if (timeFilter === 'week') {
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            filtered = filtered.filter(t => {
                const tDate = new Date(t.date);
                return tDate >= weekStart && tDate <= weekEnd;
            });
        } else if (timeFilter === 'month') {
            filtered = filtered.filter(t => {
                const tDate = new Date(t.date);
                return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
            });
        } else if (timeFilter === 'year') {
            filtered = filtered.filter(t => {
                const tDate = new Date(t.date);
                return tDate.getFullYear() === now.getFullYear();
            });
        }

        // Фильтр по услугам
        if (serviceFilter !== 'all') {
            filtered = filtered.filter(t => t.description === serviceFilter);
        }

        return filtered;
    }, [transactions, viewMode, timeFilter, currentDate, serviceFilter]);

    // Группировка по категориям
    const categoryStats = useMemo(() => {
        const stats: Record<string, { amount: number; count: number; percentage: number; category: any }> = {};
        const total = filteredTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        filteredTransactions.forEach(t => {
            const catId = t.category || 'uncategorized';
            if (!stats[catId]) {
                const cat = categories.find(c => c.id === catId) || { id: 'uncategorized', name: 'Без категории', color: '#94a3b8' };
                stats[catId] = { amount: 0, count: 0, percentage: 0, category: cat };
            }
            stats[catId].amount += Number(t.amount) || 0;
            stats[catId].count += 1;
        });

        // Подсчет процентов
        Object.keys(stats).forEach(key => {
            stats[key].percentage = total > 0 ? (stats[key].amount / total) * 100 : 0;
        });

        return Object.values(stats).sort((a, b) => b.amount - a.amount);
    }, [filteredTransactions, categories]);

    const totalAmount = useMemo(() => 
        filteredTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
    , [filteredTransactions]);

    // Навигация по времени
    const navigateTime = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        if (timeFilter === 'day') {
            newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        } else if (timeFilter === 'week') {
            newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        } else if (timeFilter === 'month') {
            newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        } else if (timeFilter === 'year') {
            newDate.setFullYear(newDate.getFullYear() + (direction === 'next' ? 1 : -1));
        }
        setCurrentDate(newDate);
    };

    const getDateLabel = () => {
        if (timeFilter === 'day') {
            const dateStr = currentDate.toISOString().split('T')[0];
            return formatDate(dateStr);
        } else if (timeFilter === 'week') {
            const weekStart = new Date(currentDate);
            weekStart.setDate(currentDate.getDate() - currentDate.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            const startStr = weekStart.toISOString().split('T')[0];
            const endStr = weekEnd.toISOString().split('T')[0];
            return `${formatDate(startStr)} - ${formatDate(endStr)}`;
        } else if (timeFilter === 'month') {
            return currentDate.toLocaleDateString('ru-RU', { month: 'long' });
        } else {
            return currentDate.getFullYear().toString();
        }
    };

    const handleSaveCategory = () => {
        if (editingCategory) {
            onEditCategory(editingCategory.id, newCategory);
            setEditingCategory(null);
        } else {
            onAddCategory({ ...newCategory, id: Date.now().toString() });
        }
        setIsAddingCategory(false);
        setNewCategory({ name: '', color: COLORS[0], type: 'expense' });
    };
    
    const income = useMemo(() => transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount || 0), 0), [transactions]);
    const expense = useMemo(() => transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount || 0), 0), [transactions]);
    const balance = income - expense;
    
    const handleSaveTransaction = () => {
        if (!newTransaction.title || !newTransaction.amount) return;
        
        const transactionData = {
            ...newTransaction,
            category: selectedCategory,
            tags: selectedTags,
        };
        
        if (editingTransaction) {
            onEditTransaction({ ...editingTransaction, ...transactionData });
        } else {
            onAddTransaction(transactionData);
        }
        
        setIsAdding(false);
        setEditingTransaction(null);
        setNewTransaction(getInitialTransactionState());
        setSelectedCategory('');
        setSelectedTags([]);
    };
    
    const toggleTag = (tagId: string) => {
        setSelectedTags(prev => 
            prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
        );
    };
    
    const handleAddQuickCategory = () => {
        if (!newCategoryName.trim()) return;
        const newCat = {
            id: Date.now().toString(),
            name: newCategoryName,
            color: newCategoryColor,
            type: newTransaction.type
        };
        onAddCategory(newCat);
        setSelectedCategory(newCat.id);
        setNewCategoryName('');
        setIsAddingNewCategory(false);
    };
    
    const handleAddQuickTag = () => {
        if (!newTagName.trim()) return;
        const newTag = {
            id: Date.now().toString(),
            name: newTagName.toUpperCase(),
            color: newTagColor
        };
        onAddTag(newTag);
        setSelectedTags([...selectedTags, newTag.id]);
        setNewTagName('');
        setIsAddingNewTag(false);
    };
    
    const filteredCategories = categories.filter(c => c.type === newTransaction.type);
    
    const handleEditClick = (t) => {
        setEditingTransaction(t);
        setNewTransaction({ title: t.title.replace('Оплата: ', ''), amount: t.amount, type: t.type, sub: t.sub || '' });
        setSelectedCategory(t.category || '');
        setSelectedTags(t.tags || []);
        setIsAdding(true);
    };
    
    const incomeTransactions = transactions.filter(t => t.type === 'income');
    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    
    // Группировка транзакций по датам
    const transactionsByDate = useMemo(() => {
        const grouped: Record<string, any[]> = {};
        
        // Сортируем все транзакции по дате (новые сверху)
        const sorted = [...transactions].sort((a, b) => {
            const dateA = a.date || a.createdDate;
            const dateB = b.date || b.createdDate;
            return new Date(dateB).getTime() - new Date(dateA).getTime();
        });
        
        sorted.forEach(t => {
            // Используем date для группировки (это дата самой операции)
            const dateKey = t.date || t.createdDate || new Date().toISOString().split('T')[0];
            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            grouped[dateKey].push(t);
        });
        
        return grouped;
    }, [transactions]);
    
    // Функция экспорта в Excel
    const exportToExcel = () => {
        if (transactions.length === 0) {
            alert('Нет данных для экспорта');
            return;
        }

        // Подготовка данных для экспорта
        const exportData = transactions.map(t => {
            const category = categories.find(c => c.id === t.category);
            const transactionTags = tags.filter(tag => t.tags?.includes(tag.id));
            
            return {
                'Дата': formatDate(t.date || t.createdDate),
                'Тип': t.type === 'income' ? 'Доход' : 'Расход',
                'Название': t.title,
                'Сумма': Number(t.amount || 0),
                'Описание': t.sub || '',
                'Категория': category?.name || 'Без категории',
                'Теги': transactionTags.map(tag => tag.name).join(', ') || '',
                'Филиал': t.branch || ''
            };
        });

        // Создание рабочей книги Excel
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Операции');

        // Автоподбор ширины колонок
        const maxWidth = exportData.reduce((acc, row) => {
            Object.keys(row).forEach((key, i) => {
                const cellLength = String(row[key]).length;
                acc[i] = Math.max(acc[i] || 10, cellLength + 2);
            });
            return acc;
        }, [] as number[]);

        worksheet['!cols'] = maxWidth.map(w => ({ wch: w }));

        // Генерация имени файла с текущей датой
        const now = new Date();
        const dateStr = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()}`;
        const fileName = `Финансы_${dateStr}.xlsx`;

        // Сохранение файла
        XLSX.writeFile(workbook, fileName);
    };
    
    return (
      <div className="flex flex-col h-full bg-zinc-50 overflow-hidden relative">
        {isAdding && (
            <div className="absolute inset-0 z-[200] bg-zinc-900/50 backdrop-blur-sm flex items-end animate-in fade-in" onClick={() => { 
                setIsAdding(false); 
                setEditingTransaction(null); 
                setNewTransaction(getInitialTransactionState());
                setSelectedCategory('');
                setSelectedTags([]);
            }}>
                <div className="w-full bg-white rounded-t-[32px] p-6 shadow-2xl max-h-[90vh] overflow-y-auto pb-32" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-black">{editingTransaction ? 'Редактировать' : 'Новая операция'}</h3>
                        <button onClick={() => { 
                            setIsAdding(false); 
                            setEditingTransaction(null); 
                            setNewTransaction(getInitialTransactionState());
                            setSelectedCategory('');
                            setSelectedTags([]);
                        }} className="bg-zinc-100 p-2 rounded-full">
                            <X size={20}/>
                        </button>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-2 block">Тип операции</label>
                            <ToggleGroup
                                options={[
                                    { value: 'income', label: 'Доход', icon: ArrowDownLeft },
                                    { value: 'expense', label: 'Расход', icon: ArrowUpRight }
                                ]}
                                value={newTransaction.type}
                                onChange={(value) => setNewTransaction({...newTransaction, type: value as 'income' | 'expense'})}
                                variant="default"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-2 block">Название</label>
                            <input 
                                type="text" 
                                value={newTransaction.title} 
                                onChange={(e) => setNewTransaction({...newTransaction, title: e.target.value})}
                                placeholder="Например: Зарплата, Аренда..." 
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm font-bold outline-none focus:border-black transition-all" 
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-2 block">Сумма</label>
                            <input 
                                type="number" 
                                value={newTransaction.amount} 
                                onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
                                placeholder="0" 
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-2xl font-black outline-none focus:border-black transition-all" 
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-2 block">Дата</label>
                            <input 
                                type="date" 
                                value={newTransaction.date} 
                                onChange={(e) => setNewTransaction({...newTransaction, date: e.target.value})}
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm font-bold outline-none focus:border-black transition-all" 
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-2 block">Описание (необязательно)</label>
                            <input 
                                type="text" 
                                value={newTransaction.sub} 
                                onChange={(e) => setNewTransaction({...newTransaction, sub: e.target.value})}
                                placeholder="Дополнительная информация..." 
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm font-medium outline-none focus:border-orange-500 transition-all" 
                            />
                        </div>
                        {/* Категория - компактный блок */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Категория</label>
                                <button 
                                    onClick={() => setIsAddingNewCategory(true)}
                                    className="text-[11px] font-bold text-zinc-600 hover:text-black transition-all"
                                >
                                    + Добавить
                                </button>
                            </div>
                            {/* Список категорий для выбора */}
                            {filteredCategories.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {filteredCategories.map(cat => (
                                        <div
                                            key={cat.id}
                                            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-all group relative cursor-pointer ${
                                                selectedCategory === cat.id 
                                                ? 'bg-black text-white shadow-md' 
                                                : 'bg-white border border-zinc-200 text-zinc-700 hover:border-zinc-300'
                                            }`}
                                            onClick={() => setSelectedCategory(selectedCategory === cat.id ? '' : cat.id)}
                                        >
                                            <div 
                                                className="w-2 h-2 rounded-full" 
                                                style={{ backgroundColor: cat.color }}
                                            />
                                            {cat.name}
                                            <span
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm(`Удалить категорию "${cat.name}"?`)) {
                                                        onDeleteCategory(cat.id);
                                                        if (selectedCategory === cat.id) setSelectedCategory('');
                                                    }
                                                }}
                                                className={`ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${
                                                    selectedCategory === cat.id ? 'text-white hover:text-red-300' : 'text-red-500 hover:text-red-700'
                                                }`}
                                            >
                                                <X size={12} />
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-zinc-400 italic">Нет категорий</p>
                            )}
                        </div>
                        {/* Теги - компактный блок */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Теги</label>
                                <button 
                                    onClick={() => setIsAddingNewTag(true)}
                                    className="text-[11px] font-bold text-zinc-600 hover:text-black transition-all"
                                >
                                    + Добавить
                                </button>
                            </div>
                            {/* Список тегов для выбора */}
                            {tags.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {tags.map(tag => (
                                        <div
                                            key={tag.id}
                                            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-all group relative cursor-pointer ${
                                                selectedTags.includes(tag.id)
                                                ? 'bg-black text-white shadow-md' 
                                                : 'bg-white border border-zinc-200 text-zinc-700 hover:border-zinc-300'
                                            }`}
                                            onClick={() => toggleTag(tag.id)}
                                        >
                                            <div 
                                                className="w-2 h-2 rounded-full" 
                                                style={{ backgroundColor: tag.color || COLORS[0] }}
                                            />
                                            {tag.name}
                                            <span
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm(`Удалить тег "${tag.name}"?`)) {
                                                        onDeleteTag(tag.id);
                                                        setSelectedTags(prev => prev.filter(id => id !== tag.id));
                                                    }
                                                }}
                                                className={`ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${
                                                    selectedTags.includes(tag.id) ? 'text-white hover:text-red-300' : 'text-red-500 hover:text-red-700'
                                                }`}
                                            >
                                                <X size={12} />
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-zinc-400 italic">Нет тегов</p>
                            )}
                        </div>
                        <Button
                            variant="primary"
                            size="lg"
                            fullWidth
                            onClick={handleSaveTransaction}
                            className="mt-6"
                        >
                            {editingTransaction ? 'Сохранить' : 'Добавить операцию'}
                        </Button>
                    </div>
                </div>
            </div>
        )}

        {/* Модальное окно добавления категории */}
        <Modal
            isOpen={isAddingNewCategory}
            onClose={() => {
                setIsAddingNewCategory(false);
                setNewCategoryName('');
                setNewCategoryColor(COLORS[0]);
            }}
            title="Новая категория"
            position="center"
            maxWidth="md"
        >
            <input 
                type="text" 
                value={newCategoryName} 
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Название категории..."
                className="w-full bg-zinc-50 border-2 border-zinc-200 p-4 rounded-xl outline-none text-base font-bold focus:border-orange-500 transition-all mb-4"
                autoFocus
            />
            <ColorPicker
                colors={COLORS}
                selectedColor={newCategoryColor}
                onColorSelect={setNewCategoryColor}
                label="Цвет"
            />
            <div className="flex gap-3 mt-6">
                <Button
                    variant="secondary"
                    onClick={() => {
                        setIsAddingNewCategory(false);
                        setNewCategoryName('');
                        setNewCategoryColor(COLORS[0]);
                    }}
                    fullWidth
                >
                    Отмена
                </Button>
                <Button
                    variant="primary"
                    onClick={handleAddQuickCategory}
                    fullWidth
                >
                    Сохранить
                </Button>
            </div>
        </Modal>

        {/* Модальное окно добавления тега */}
        <Modal
            isOpen={isAddingNewTag}
            onClose={() => {
                setIsAddingNewTag(false);
                setNewTagName('');
                setNewTagColor(COLORS[0]);
            }}
            title="Новый тег"
            position="center"
            maxWidth="md"
        >
            <input 
                type="text" 
                value={newTagName} 
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Название тега..."
                className="w-full bg-zinc-50 border-2 border-zinc-200 p-4 rounded-xl outline-none text-base font-bold focus:border-orange-500 transition-all mb-4"
                autoFocus
            />
            <ColorPicker
                colors={COLORS}
                selectedColor={newTagColor}
                onColorSelect={setNewTagColor}
                label="Цвет"
            />
            <div className="flex gap-3 mt-6">
                <Button
                    variant="secondary"
                    onClick={() => {
                        setIsAddingNewTag(false);
                        setNewTagName('');
                        setNewTagColor(COLORS[0]);
                    }}
                    fullWidth
                >
                    Отмена
                </Button>
                <Button
                    variant="primary"
                    onClick={handleAddQuickTag}
                    fullWidth
                >
                    Сохранить
                </Button>
            </div>
        </Modal>
        
        <Header title="Финансы" actionIcon={activeSection === 'operations' ? Plus : null} onAction={activeSection === 'operations' ? () => setIsAdding(true) : null} variant="simple" />
        
        {/* Переключатель разделов: Операции / Аналитика */}
        <div className="px-4 pt-2 pb-2 bg-white border-b border-zinc-200 shrink-0">
            <ToggleGroup
                options={[
                    { value: 'operations', label: 'ОПЕРАЦИИ', icon: Wallet },
                    { value: 'analytics', label: 'АНАЛИТИКА', icon: BarChart3 }
                ]}
                value={activeSection}
                onChange={(value) => setActiveSection(value as 'operations' | 'analytics')}
                variant="default"
            />
        </div>

        {/* Контент: Операции */}
        {activeSection === 'operations' && (
            <div className="flex-1 overflow-y-auto pb-44 bg-zinc-50">
              {/* Баланс - градиент как в аналитике */}
              <div className="px-6 pt-6 pb-4">
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl p-6 text-center shadow-xl">
                  <div className="text-sm font-medium text-white mb-2 uppercase tracking-wide">Баланс</div>
                  <div className="text-5xl font-bold text-white mb-6 tracking-tight">{formatMoney(balance)} ₽</div>
                  <div className="flex gap-4 justify-center">
                      <div>
                          <div className="text-xs text-white/80 mb-1">Доход</div>
                          <div className="text-xl font-bold text-white">+{formatMoney(income)}</div>
                      </div>
                      <div className="w-px bg-white/20"></div>
                      <div>
                          <div className="text-xs text-white/80 mb-1">Расход</div>
                          <div className="text-xl font-bold text-white">−{formatMoney(expense)}</div>
                      </div>
                  </div>
                </div>
              </div>

              {/* Кнопка экспорта */}
              {transactions.length > 0 && (
                <div className="px-6 pb-4">
                  <button
                    onClick={exportToExcel}
                    className="w-full flex items-center justify-center gap-2 bg-white border-2 border-zinc-200 rounded-2xl py-3 px-4 hover:border-orange-500 hover:bg-orange-50 transition-all group"
                  >
                    <Download size={18} className="text-zinc-600 group-hover:text-orange-500 transition-colors" />
                    <span className="text-sm font-bold text-zinc-900 group-hover:text-orange-500 transition-colors">
                      Экспорт в Excel
                    </span>
                  </button>
                </div>
              )}
              
              {/* Операции по датам */}
              {Object.keys(transactionsByDate).length > 0 ? (
                  <div className="px-4 pb-4">
                      {Object.keys(transactionsByDate).map(dateKey => {
                          const dayTransactions = transactionsByDate[dateKey];
                          
                          return (
                              <div key={dateKey}>
                                  {/* Дата - тонкий элегантный разделитель */}
                                  <div className="sticky top-0 bg-zinc-50 z-10 py-3">
                                      <div className="flex items-center gap-3">
                                          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{formatDateShort(dateKey)}</div>
                                          <div className="flex-1 h-px bg-zinc-200"></div>
                                      </div>
                                  </div>
                                  
                                  {/* Транзакции */}
                                  <div className="space-y-1">
                                      {dayTransactions.map(t => {
                                          const category = categories.find(c => c.id === t.category);
                                          const transactionTags = tags.filter(tag => t.tags?.includes(tag.id));
                                          
                                          return (
                                              <TransactionItem
                                                  key={t.id}
                                                  transaction={t}
                                                  category={category}
                                                  tags={transactionTags}
                                                  onEdit={(transaction) => {
                                                      setEditingTransaction(transaction);
                                                      setNewTransaction({ 
                                                          title: transaction.title.replace('Оплата: ', ''), 
                                                          amount: transaction.amount, 
                                                          type: transaction.type, 
                                                          sub: transaction.sub || '',
                                                          date: new Date(transaction.date).toISOString().split('T')[0]
                                                      });
                                                      setSelectedCategory(transaction.category || '');
                                                      setSelectedTags(transaction.tags || []);
                                                      setIsAdding(true);
                                                  }}
                                                  onDelete={onDeleteTransaction}
                                              />
                                          );
                                      })}
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              ) : null}
              
              {transactions.length === 0 && (
                  <div className="text-center py-16 px-6">
                    <div className="text-gray-300 mb-3">
                        <Wallet size={48} className="mx-auto" />
                    </div>
                    <p className="text-base font-medium text-gray-400">Нет операций</p>
                  </div>
              )}
            </div>
        )}

        {/* Контент: Аналитика */}
        {activeSection === 'analytics' && (
            <div className="flex-1 overflow-y-auto pb-24 bg-white">
                {/* Минималистичная шапка */}
                <div className="px-6 pt-6 pb-4">
                    {/* Переключатель Расходы/Доходы */}
                    <div className="flex gap-3 mb-4">
                        <button
                            onClick={() => setViewMode('expense')}
                            className={`flex-1 py-3 rounded-2xl text-base font-semibold transition-all ${
                                viewMode === 'expense'
                                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                                : 'bg-gray-100 text-gray-400'
                            }`}
                        >
                            Расходы
                        </button>
                        <button
                            onClick={() => setViewMode('income')}
                            className={`flex-1 py-3 rounded-2xl text-base font-semibold transition-all ${
                                viewMode === 'income'
                                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                                : 'bg-gray-100 text-gray-400'
                            }`}
                        >
                            Доходы
                        </button>
                    </div>

                    {/* Фильтры времени */}
                    <div className="flex gap-2">
                        {[
                            { value: 'day', label: 'День' },
                            { value: 'week', label: 'Неделя' },
                            { value: 'month', label: 'Месяц' },
                            { value: 'year', label: 'Год' }
                        ].map((filter) => (
                            <button
                                key={filter.value}
                                onClick={() => setTimeFilter(filter.value as any)}
                                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                                    timeFilter === filter.value
                                    ? 'text-orange-500 bg-orange-50'
                                    : 'text-gray-400 bg-transparent'
                                }`}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Навигация по датам */}
                <div className="px-6 pb-6 flex items-center justify-center gap-4">
                    <button 
                        onClick={() => navigateTime('prev')} 
                        className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 transition-all"
                    >
                        <ChevronLeft size={20} className="text-gray-400" />
                    </button>
                    <span className="text-lg font-semibold text-gray-900 min-w-[140px] text-center">{getDateLabel()}</span>
                    <button 
                        onClick={() => navigateTime('next')} 
                        className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 transition-all"
                    >
                        <ChevronRight size={20} className="text-gray-400" />
                    </button>
                </div>

                {/* Компактная главная метрика */}
                <div className="px-4 pb-4">
                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 text-center shadow-lg">
                        <div className="text-xs font-semibold text-orange-100 mb-1 uppercase tracking-wide">
                            {viewMode === 'expense' ? 'Расходы' : 'Доходы'}
                        </div>
                        <div className="text-4xl font-black text-white tracking-tight">
                            {formatMoney(totalAmount)} ₽
                        </div>
                    </div>
                </div>

                {/* Компактная круговая диаграмма */}
                {categoryStats.length > 0 && (
                    <div className="px-4 pb-4">
                        <div className="bg-gray-50 rounded-2xl p-4">
                            <ResponsiveContainer width="100%" height={180}>
                                <PieChart>
                                    <Pie
                                        data={categoryStats.map(s => ({ name: s.category.name, value: s.amount }))}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={3}
                                        dataKey="value"
                                    >
                                        {categoryStats.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.category.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            
                            {/* Легенда с названиями категорий */}
                            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
                                {categoryStats.map((stat) => (
                                    <div key={stat.category.id} className="flex items-center gap-2">
                                        <div 
                                            className="w-2.5 h-2.5 rounded-full shrink-0" 
                                            style={{ backgroundColor: stat.category.color }}
                                        />
                                        <span className="text-xs font-semibold text-gray-700">
                                            {stat.category.name}
                                        </span>
                                        <span className="text-xs text-gray-400 font-medium">
                                            {Math.round(stat.percentage)}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Компактный список категорий */}
                <div className="px-4 pb-4">
                    <div className="space-y-2">
                        {categoryStats.length > 0 ? (
                            categoryStats.map((stat) => {
                                const isExpanded = expandedCategories.has(stat.category.id);
                                const categoryTransactions = filteredTransactions.filter(t => 
                                    (t.category || 'uncategorized') === stat.category.id
                                );
                                
                                return (
                                    <div 
                                        key={stat.category.id} 
                                        className="bg-white rounded-xl border border-gray-100 overflow-hidden"
                                    >
                                        {/* Заголовок категории */}
                                        <div 
                                            className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                                            onClick={() => toggleCategoryExpand(stat.category.id)}
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <div 
                                                        className="w-3 h-3 rounded-full shrink-0" 
                                                        style={{ backgroundColor: stat.category.color }}
                                                    />
                                                    <span className="text-sm font-semibold text-gray-900 truncate">
                                                        {stat.category.name}
                                                    </span>
                                                    <ChevronDown 
                                                        size={16} 
                                                        className={`text-gray-400 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} 
                                                    />
                                                </div>
                                                <span className="text-xs text-gray-400 font-medium ml-2 shrink-0">
                                                    {Math.round(stat.percentage)}%
                                                </span>
                                            </div>
                                            <div className="text-lg font-bold text-gray-900 mb-2">
                                                {formatMoney(stat.amount)} ₽
                                            </div>
                                            <div className="bg-gray-100 h-1 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full rounded-full transition-all"
                                                    style={{ 
                                                        width: `${stat.percentage}%`,
                                                        backgroundColor: stat.category.color 
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {/* Раскрывающийся список операций */}
                                        {isExpanded && (
                                            <div className="border-t border-gray-100 bg-gray-50 px-3 py-2">
                                                <div className="space-y-2">
                                                    {categoryTransactions.map((t) => {
                                                        const transactionTags = tags.filter(tag => t.tags?.includes(tag.id));
                                                        return (
                                                            <div key={t.id} className="bg-white rounded-lg p-2 border border-gray-100">
                                                                <div className="flex items-start justify-between mb-1">
                                                                    <span className="text-xs font-semibold text-gray-900 flex-1 truncate">
                                                                        {t.title}
                                                                    </span>
                                                                    <span className="text-xs font-bold text-gray-900 ml-2 shrink-0">
                                                                        {formatMoney(t.amount)} ₽
                                                                    </span>
                                                                </div>
                                                                {t.sub && (
                                                                    <div className="text-[10px] text-gray-400 mb-1">{t.sub}</div>
                                                                )}
                                                                {transactionTags.length > 0 && (
                                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                                        {transactionTags.map(tag => (
                                                                            <div 
                                                                                key={tag.id}
                                                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100"
                                                                            >
                                                                                <div 
                                                                                    className="w-1.5 h-1.5 rounded-full" 
                                                                                    style={{ backgroundColor: tag.color || COLORS[0] }}
                                                                                />
                                                                                <span className="text-[9px] font-semibold text-gray-600">
                                                                                    {tag.name}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="p-8 text-center">
                                <p className="text-sm text-gray-400 font-medium">Нет данных</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
      </div>
    );
};
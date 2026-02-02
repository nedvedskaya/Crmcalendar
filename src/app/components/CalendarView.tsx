import { useState } from 'react';
import { Plus, X, ChevronLeft, ChevronRight, CalendarDays, ChevronRight as ChevronRightIcon, Copy, CheckCircle2, DollarSign } from 'lucide-react';
import { formatDate, getDateStr } from '@/utils/helpers';
import { getInitialCalendarEntryState } from '@/utils/initialStates';
import { Header } from '@/app/components/ui/Header';
import { Button } from '@/app/components/ui/Button';
import { AutocompleteInput } from '@/app/components/ui/AutocompleteInput';
import { AppointmentInputs } from '@/app/components/forms/AppointmentInputs';
import { CalendarGrid } from '@/app/components/CalendarGrid';

interface CalendarViewProps {
    events: any[];
    clients: any[];
    onAddRecord: (clientId: any, record: any) => void;
    onOpenClient: (client: any) => void;
    categories: any[];
    tags: any[];
    currentBranch: string;
}

export const CalendarView = ({ 
    events, 
    clients, 
    onAddRecord, 
    onOpenClient, 
    categories, 
    tags, 
    currentBranch 
}: CalendarViewProps) => {
    const [currentDate, setCurrentDate] = useState(new Date()); 
    const [isAdding, setIsAdding] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [newEntry, setNewEntry] = useState(getInitialCalendarEntryState(currentBranch));
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const names = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
    const week = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const days = new Date(year, month + 1, 0).getDate();
    const start = new Date(year, month, 1).getDay();
    const pad = start === 0 ? 6 : start - 1;
    
    const isDateInRange = (event: any, checkDate: string) => {
        if (!event.endDate) {
            return event.date === checkDate;
        }
        return checkDate >= event.date && checkDate <= event.endDate;
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
                            <AutocompleteInput 
                                options={clients.map(c => c.name)} 
                                value={newEntry.clientName} 
                                onChange={(e) => setNewEntry({...newEntry, clientName: e.target.value})} 
                                placeholder="Поиск клиента..." 
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl p-4 font-bold outline-none" 
                            />
                            <AppointmentInputs 
                                data={newEntry} 
                                onChange={(e) => setNewEntry({...newEntry, [e.target.name]: e.target.value})} 
                                categories={categories || []} 
                                tags={tags || []} 
                            />
                            <Button 
                                variant="primary" 
                                size="lg" 
                                fullWidth 
                                onClick={() => { 
                                    const c = clients.find(cl => cl.name === newEntry.clientName); 
                                    if(c) { 
                                        onAddRecord(c.id, newEntry); 
                                        setIsAdding(false); 
                                        setNewEntry(getInitialCalendarEntryState(currentBranch)); 
                                    } else {
                                        alert('Клиент не найден'); 
                                    }
                                }}
                            >
                                Добавить
                            </Button>
                        </div>
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
                                    const record = client?.records?.find((r: any) => r.id === ev.recordId);
                                    const isCompleted = record?.isCompleted;
                                    const isMsk = ev.branch === 'msk';
                                    
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
                                                            <ChevronRightIcon size={20} className="text-orange-500 shrink-0 group-hover:translate-x-1 transition-transform" strokeWidth={3} />
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
                                                            <p className="text-sm font-bold text-black whitespace-nowrap">{client.phone}</p>
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
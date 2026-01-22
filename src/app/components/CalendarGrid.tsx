import React from 'react';

interface CalendarEvent {
    id?: string;
    clientId: string;
    recordId?: string;
    date: string;
    endDate?: string;
    service?: string;
    title?: string;
    branch?: string;
}

interface CalendarGridProps {
    year: number;
    month: number;
    days: number;
    pad: number;
    events: CalendarEvent[];
    clients: any[];
    getDateStr: (offset: number) => string;
    onDateClick: (date: string) => void;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
    year,
    month,
    days,
    pad,
    events,
    clients,
    getDateStr,
    onDateClick,
}) => {
    // Обрабатываем события для календаря
    const processedEvents = React.useMemo(() => {
        const result: any[] = [];
        
        events.forEach(ev => {
            const eventId = ev.id || `${ev.clientId}-${ev.date}-${ev.recordId}`;
            const eventStartDate = new Date(ev.date);
            const eventStartDay = eventStartDate.getDate();
            const eventStartMonth = eventStartDate.getMonth();
            
            // Пропускаем события, которые начались не в этом месяце
            if (eventStartMonth !== month) return;
            
            // Вычисляем длительность в днях
            let durationDays = 1;
            if (ev.endDate && ev.date !== ev.endDate) {
                const endDate = new Date(ev.endDate);
                const endDay = endDate.getDate();
                const endMonth = endDate.getMonth();
                
                if (endMonth === month) {
                    durationDays = endDay - eventStartDay + 1;
                } else {
                    // Событие продолжается в следующий месяц
                    durationDays = days - eventStartDay + 1;
                }
            }
            
            // Вычисляем позицию в сетке (с учетом pad)
            const gridPosition = pad + eventStartDay - 1;
            const row = Math.floor(gridPosition / 7);
            const col = gridPosition % 7;
            
            // Проверяем, сколько дней остается до конца недели
            const daysToWeekEnd = 7 - col;
            
            // Если событие переходит на следующую неделю, разбиваем его на части
            if (durationDays > daysToWeekEnd) {
                // Первая часть - до конца текущей недели
                result.push({
                    ...ev,
                    eventId: `${eventId}-part-0`,
                    startDay: eventStartDay,
                    row,
                    col,
                    durationDays: daysToWeekEnd,
                    isFirst: true,
                    isLast: false,
                });
                
                // Остальные части
                let remainingDays = durationDays - daysToWeekEnd;
                let currentRow = row + 1;
                let partIndex = 1;
                
                while (remainingDays > 0) {
                    const partDuration = Math.min(remainingDays, 7);
                    result.push({
                        ...ev,
                        eventId: `${eventId}-part-${partIndex}`,
                        startDay: eventStartDay,
                        row: currentRow,
                        col: 0,
                        durationDays: partDuration,
                        isFirst: false,
                        isLast: remainingDays <= 7,
                    });
                    
                    remainingDays -= 7;
                    currentRow++;
                    partIndex++;
                }
            } else {
                // Событие помещается в одну неделю
                result.push({
                    ...ev,
                    eventId,
                    startDay: eventStartDay,
                    row,
                    col,
                    durationDays,
                    isFirst: true,
                    isLast: true,
                });
            }
        });
        
        // Группируем события по строкам для правильного позиционирования по вертикали
        const eventsByRow = new Map();
        result.forEach(ev => {
            if (!eventsByRow.has(ev.row)) {
                eventsByRow.set(ev.row, []);
            }
            eventsByRow.get(ev.row).push(ev);
        });
        
        // Назначаем индекс для каждого события в строке
        eventsByRow.forEach((rowEvents) => {
            const eventIdToIndex = new Map();
            let currentIndex = 0;
            
            rowEvents.forEach(ev => {
                const baseId = String(ev.eventId).split('-part-')[0];
                if (!eventIdToIndex.has(baseId)) {
                    eventIdToIndex.set(baseId, currentIndex);
                    currentIndex++;
                }
                ev.rowIndex = eventIdToIndex.get(baseId);
            });
        });
        
        return result;
    }, [events, month, days, pad]);
    
    const totalCells = pad + days;
    const totalRows = Math.ceil(totalCells / 7);
    
    return (
        <div className="relative">
            {/* Сетка с датами */}
            <div className="grid grid-cols-7 gap-px bg-zinc-100 border border-zinc-200 rounded-lg overflow-hidden">
                {Array.from({length: pad}).map((_, i) => (
                    <div key={`p-${i}`} className="bg-white min-h-[90px]" />
                ))}
                {Array.from({length: days}).map((_, i) => {
                    const d = i + 1;
                    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    
                    return (
                        <div
                            key={d}
                            onClick={() => onDateClick(date)}
                            className="bg-white min-h-[90px] p-1.5 cursor-pointer hover:bg-zinc-50 transition-all"
                        >
                            <span
                                className={`text-xs font-black w-6 h-6 flex items-center justify-center rounded-full ${
                                    date === getDateStr(0) ? 'bg-black text-white' : 'text-zinc-600'
                                }`}
                            >
                                {d}
                            </span>
                        </div>
                    );
                })}
            </div>
            
            {/* Слой с событиями поверх всей сетки */}
            <div 
                className="absolute pointer-events-none"
                style={{
                    top: '1px',
                    left: '1px',
                    right: '1px',
                    bottom: '1px',
                }}
            >
                {processedEvents.map((ev) => {
                    const record = clients.find(c => c.id === ev.clientId)?.records?.find(r => r.id === ev.recordId);
                    const isCompleted = record?.isCompleted;
                    const isMsk = ev.branch === 'msk';
                    
                    // Цвета
                    let bgClass = '';
                    if (isCompleted) {
                        bgClass = 'bg-gradient-to-r from-gray-400 to-gray-500';
                    } else if (isMsk) {
                        bgClass = 'bg-gradient-to-r from-orange-600 to-orange-700';
                    } else if (ev.branch === 'rnd') {
                        bgClass = 'bg-gradient-to-r from-blue-700 to-blue-800';
                    } else {
                        // Нет филиала - используем нейтральный серый
                        bgClass = 'bg-gradient-to-r from-zinc-400 to-zinc-500';
                    }
                    
                    // Скругление углов
                    let roundedClass = 'rounded';
                    if (!ev.isFirst && !ev.isLast) {
                        roundedClass = 'rounded-none';
                    } else if (ev.isFirst && !ev.isLast) {
                        roundedClass = 'rounded-l rounded-r-none';
                    } else if (!ev.isFirst && ev.isLast) {
                        roundedClass = 'rounded-r rounded-l-none';
                    }
                    
                    // Рассчитываем позицию и размеры
                    const cellWidth = `calc((100% - ${6}px) / 7)`; // 6px = 6 gaps по 1px
                    const gapWidth = 1;
                    
                    const leftPos = `calc(${ev.col} * (${cellWidth} + ${gapWidth}px))`;
                    const widthCalc = `calc(${ev.durationDays} * ${cellWidth} + ${(ev.durationDays - 1) * gapWidth}px)`;
                    const topPos = `calc(${ev.row} * 91px + 32px + ${ev.rowIndex * 20}px)`; // 91px = 90px min-height + 1px gap
                    
                    return (
                        <div
                            key={ev.eventId}
                            className={`absolute px-1.5 py-1 ${roundedClass} text-[9px] font-bold text-white shadow-sm pointer-events-auto cursor-pointer ${bgClass}`}
                            style={{
                                left: leftPos,
                                width: widthCalc,
                                top: topPos,
                                height: '18px',
                                minHeight: '18px',
                                zIndex: 10,
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(ev.startDay).padStart(2, '0')}`;
                                onDateClick(date);
                            }}
                        >
                            {ev.isFirst ? (ev.service || ev.title || 'Бронь') : ''}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
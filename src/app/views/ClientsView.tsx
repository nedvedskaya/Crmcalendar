import React, { useState } from 'react';
import { Search, Download, Plus, ChevronDown, Filter } from 'lucide-react';
import { ClientListCard } from '@/app/components/clients';
import { EmptyState } from '@/app/components/ui';
import { useSearch, useDateFilter } from '@/app/hooks';
import ExcelJS from 'exceljs';

interface ClientsViewProps {
  allClients: any[];
  onAddClient: (data: any, tasks: any[], records?: any[]) => void;
  onDeleteClient: (id: number) => void;
  onOpenClient: (client: any) => void;
  onEditClient: (params: { client: any; mode: string }) => void;
  ClientForm: React.ComponentType<any>;
  currentBranch?: string;
  dateFilter?: 'all' | 'today' | 'week' | 'month' | 'year';
  onDateFilterChange?: (filter: 'all' | 'today' | 'week' | 'month' | 'year') => void;
  categories?: any[];
  tags?: any[];
}

export const ClientsView = ({ 
  allClients, 
  onAddClient, 
  onDeleteClient, 
  onOpenClient, 
  onEditClient,
  ClientForm,
  currentBranch = 'MSK',
  dateFilter = 'all',
  onDateFilterChange,
  categories = [],
  tags = []
}: ClientsViewProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  
  // allClients уже отфильтрован в App.tsx, просто используем его
  const { search, setSearch, filteredItems } = useSearch({
    items: allClients,
    searchFields: ['name', 'carBrand', 'city', 'phone']
  });

  // Функция экспорта базы клиентов в Excel
  const exportToExcel = async () => {
    if (allClients.length === 0) {
      alert('Нет клиентов для экспорта');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Клиенты');

    worksheet.columns = [
      { header: 'ФИО', key: 'name', width: 25 },
      { header: 'Телефон', key: 'phone', width: 18 },
      { header: 'Город', key: 'city', width: 15 },
      { header: 'Марка авто', key: 'carBrand', width: 15 },
      { header: 'Модель авто', key: 'carModel', width: 15 },
      { header: 'Комментарии', key: 'notes', width: 30 },
      { header: 'Дата добавления', key: 'createdDate', width: 15 },
      { header: 'Филиал', key: 'branch', width: 10 }
    ];

    allClients.forEach(client => {
      worksheet.addRow({
        name: client.name || '',
        phone: client.phone || '',
        city: client.city || '',
        carBrand: client.carBrand || '',
        carModel: client.carModel || '',
        notes: client.notes || '',
        createdDate: client.createdDate || '',
        branch: client.branch || ''
      });
    });

    worksheet.getRow(1).font = { bold: true };

    const now = new Date();
    const dateStr = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()}`;
    const fileName = `Клиенты_${dateStr}.xlsx`;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-50 overflow-hidden relative">
      {isAdding && (
        <ClientForm 
          onSave={(d: any, t: any, r: any, shouldClose?: boolean) => { 
            onAddClient(d, t, r); 
            if (shouldClose !== false) setIsAdding(false); 
          }} 
          onCancel={() => setIsAdding(false)}
          currentBranch={currentBranch}
          categories={categories}
          tags={tags}
        />
      )}
      
      <div className="sticky top-0 z-30 bg-white shadow-sm shrink-0">
        {/* Кастомный заголовок с кнопкой экспорта */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-200">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black">Клиенты</h1>
            <button
              onClick={exportToExcel}
              className="w-8 h-8 rounded-full bg-orange-100 hover:bg-orange-200 flex items-center justify-center transition-all active:scale-95"
              title="Экспорт в Excel"
            >
              <Download size={16} className="text-orange-600" />
            </button>
            
            {/* Фильтр по периоду */}
            <div className="relative">
              <button
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                  dateFilter !== 'all' 
                    ? 'bg-orange-500 text-white' 
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
                }`}
                title="Фильтр по дате добавления"
              >
                <Filter size={16} />
              </button>
              
              {/* Раскрывающееся меню фильтра */}
              {showFilterMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowFilterMenu(false)}
                  />
                  <div className="absolute left-0 top-full mt-2 bg-white rounded-xl shadow-2xl border border-zinc-200 py-2 z-50 min-w-[160px] animate-in fade-in slide-in-from-top-2">
                    {[
                      { value: 'all', label: 'Все время' },
                      { value: 'today', label: 'Сегодня' },
                      { value: 'week', label: 'Неделя' },
                      { value: 'month', label: 'Месяц' },
                      { value: 'year', label: 'Год' }
                    ].map(option => (
                      <button
                        key={option.value}
                        onClick={() => {
                          onDateFilterChange?.(option.value as any);
                          setShowFilterMenu(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left text-sm font-bold transition-all ${
                          dateFilter === option.value
                            ? 'bg-orange-50 text-orange-600'
                            : 'text-zinc-700 hover:bg-zinc-50'
                        }`}
                      >
                        {option.label}
                        {dateFilter === option.value && option.value !== 'all' && (
                          <span className="ml-2 text-xs font-bold">
                            ({allClients.length})
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="w-12 h-12 rounded-full bg-black flex items-center justify-center hover:scale-110 transition-all active:scale-95"
          >
            <Plus size={24} className="text-white" />
          </button>
        </div>
        
        {/* Поиск */}
        <div className="px-6 pb-3 pt-3 relative">
          <Search className="absolute left-9 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input 
            type="text" 
            placeholder="Поиск по базе..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 pl-12 pr-4 text-sm font-medium outline-none focus:border-black transition-all" 
          />
        </div>
        
        {/* Индикатор активного фильтра */}
        {dateFilter !== 'all' && (
          <div className="px-6 pb-3">
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-orange-600" />
                <span className="text-xs font-bold text-orange-900">
                  {dateFilter === 'today' && 'Сегодня'}
                  {dateFilter === 'week' && 'За неделю'}
                  {dateFilter === 'month' && 'За месяц'}
                  {dateFilter === 'year' && 'За год'}
                  {' • '}{allClients.length} {allClients.length === 1 ? 'клиент' : allClients.length < 5 ? 'клиента' : 'клиентов'}
                </span>
              </div>
              <button
                onClick={() => onDateFilterChange?.('all')}
                className="text-orange-600 hover:text-orange-700 text-xs font-bold"
              >
                Сбросить
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Список клиентов */}
      <div className="flex-1 overflow-y-auto px-6 space-y-3 pt-3 pb-32 overscroll-contain">
        {filteredItems.length === 0 ? (
          <EmptyState
            icon={Search}
            title={search ? 'Клиенты не найдены' : 'Нет клиентов'}
            description={search ? 'Попробуйте изменить параметры поиска' : 'Нажмите + чтобы добавить первого клиента'}
          />
        ) : (
          filteredItems.map(client => (
            <ClientListCard 
              key={client.id} 
              client={client} 
              onOpen={() => onOpenClient(client)} 
              onEdit={() => onEditClient({ client, mode: 'base' })} 
              onDelete={() => onDeleteClient(client.id)} 
            />
          ))
        )}
      </div>
    </div>
  );
};
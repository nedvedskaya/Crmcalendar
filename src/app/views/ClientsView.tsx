import { useState } from 'react';
import { Plus, Search, ChevronDown, ChevronRight, Download } from 'lucide-react';
import { Header } from '@/app/components/ui';
import { ClientListCard } from '@/app/components/clients';
import { useSearch } from '@/app/hooks';
import { getDateStr } from '@/utils/helpers';
import * as XLSX from 'xlsx';

interface ClientsViewProps {
  allClients: any[];
  onAddClient: (data: any, tasks: any[], records?: any[]) => void;
  onDeleteClient: (id: number) => void;
  onOpenClient: (client: any) => void;
  onEditClient: (params: { client: any; mode: string }) => void;
  ClientForm: React.ComponentType<any>;
  currentBranch?: string;
}

export const ClientsView = ({ 
  allClients, 
  onAddClient, 
  onDeleteClient, 
  onOpenClient, 
  onEditClient,
  ClientForm,
  currentBranch = 'MSK'
}: ClientsViewProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [showTodayClients, setShowTodayClients] = useState(false);
  
  const { search, setSearch, filteredItems } = useSearch({
    items: allClients,
    searchFields: ['name', 'carBrand', 'city', 'phone']
  });
  
  const today = getDateStr(0);
  const todayClients = allClients.filter(c => c.createdDate === today);

  // Функция экспорта базы клиентов в Excel
  const exportToExcel = () => {
    if (allClients.length === 0) {
      alert('Нет клиентов для экспорта');
      return;
    }

    // Подготовка данных для экспорта
    const exportData = allClients.map(client => ({
      'ФИО': client.name || '',
      'Телефон': client.phone || '',
      'Город': client.city || '',
      'Марка авто': client.carBrand || '',
      'Модель авто': client.carModel || '',
      'Комментарии': client.notes || '',
      'Дата добавления': client.createdDate || '',
      'Филиал': client.branch || ''
    }));

    // Создание рабочей книги Excel
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Клиенты');

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
    const fileName = `Клиенты_${dateStr}.xlsx`;

    // Сохранение файла
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-50 overflow-hidden relative">
      {isAdding && (
        <ClientForm 
          onSave={(d: any, t: any, r: any) => { 
            onAddClient(d, t, r); 
            setIsAdding(false); 
          }} 
          onCancel={() => setIsAdding(false)}
          currentBranch={currentBranch}
        />
      )}
      
      <div className="sticky top-0 z-30 bg-white shadow-sm shrink-0">
        {/* Кастомный заголовок с кнопкой экспорта */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black">Клиенты</h1>
            <button
              onClick={exportToExcel}
              className="w-8 h-8 rounded-full bg-orange-100 hover:bg-orange-200 flex items-center justify-center transition-all active:scale-95"
              title="Экспорт в Excel"
            >
              <Download size={16} className="text-orange-600" />
            </button>
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
        
        {/* Клиенты за сегодня */}
        {todayClients.length > 0 && (
          <div className="px-6 pb-3">
            <button 
              onClick={() => setShowTodayClients(!showTodayClients)}
              className="w-full bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-xl py-2 px-3 flex items-center justify-between hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-2">
                <div className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs">
                  {todayClients.length}
                </div>
                <p className="text-[11px] font-bold text-orange-900 uppercase tracking-wide">Новых клиентов сегодня</p>
              </div>
              <ChevronDown size={16} className={`text-orange-600 transition-transform ${showTodayClients ? 'rotate-180' : ''}`} />
            </button>
            
            {showTodayClients && (
              <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-2 max-h-64 overflow-y-auto">
                {todayClients.map(client => (
                  <div 
                    key={client.id}
                    onClick={() => onOpenClient(client)}
                    className="bg-white border border-orange-200 rounded-lg p-3 flex items-center justify-between cursor-pointer hover:bg-orange-50 transition-all active:scale-[0.98]"
                  >
                    <div className="flex-1">
                      <p className="font-bold text-sm text-black">{String(client.name || '')}</p>
                      <p className="text-xs text-zinc-500 font-medium">{String(client.carBrand || '')} {String(client.carModel || '')}</p>
                    </div>
                    <ChevronRight size={16} className="text-orange-500" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Список клиентов */}
      <div className="flex-1 overflow-y-auto px-6 space-y-4 pt-4 pb-44 overscroll-contain">
        {filteredItems.map(client => (
          <ClientListCard 
            key={client.id} 
            client={client} 
            onOpen={() => onOpenClient(client)} 
            onEdit={() => onEditClient({ client, mode: 'base' })} 
            onDelete={() => onDeleteClient(client.id)} 
          />
        ))}
      </div>
    </div>
  );
};
import { useState } from 'react';
import { Plus, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { Header } from '@/app/components/ui';
import { ClientListCard } from '@/app/components/clients';
import { useSearch } from '@/app/hooks';
import { getDateStr } from '@/utils/helpers';

interface ClientsViewProps {
  allClients: any[];
  onAddClient: (data: any, tasks: any[], records?: any[]) => void;
  onDeleteClient: (id: number) => void;
  onOpenClient: (client: any) => void;
  onEditClient: (params: { client: any; mode: string }) => void;
  ClientForm: React.ComponentType<any>;
}

export const ClientsView = ({ 
  allClients, 
  onAddClient, 
  onDeleteClient, 
  onOpenClient, 
  onEditClient,
  ClientForm
}: ClientsViewProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [showTodayClients, setShowTodayClients] = useState(false);
  
  const { search, setSearch, filteredItems } = useSearch({
    items: allClients,
    searchFields: ['name', 'carBrand', 'city', 'phone']
  });
  
  const today = getDateStr(0);
  const todayClients = allClients.filter(c => c.createdDate === today);

  return (
    <div className="flex flex-col h-full bg-zinc-50 overflow-hidden relative">
      {isAdding && (
        <ClientForm 
          onSave={(d: any, t: any, r: any) => { 
            onAddClient(d, t, r); 
            setIsAdding(false); 
          }} 
          onCancel={() => setIsAdding(false)} 
        />
      )}
      
      <div className="sticky top-0 z-30 bg-white shadow-sm shrink-0">
        <Header title="Клиенты" actionIcon={Plus} onAction={() => setIsAdding(true)} />
        
        {/* Поиск */}
        <div className="px-6 pb-3 relative">
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
              className="w-full bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-3 flex items-center justify-between hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="bg-orange-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-black text-sm">
                  {todayClients.length}
                </div>
                <div className="text-left">
                  <p className="text-xs font-black text-orange-900 uppercase tracking-wide">Новых клиентов сегодня</p>
                  <p className="text-[10px] text-orange-600 font-medium">Нажмите для просмотра</p>
                </div>
              </div>
              <ChevronDown size={18} className={`text-orange-600 transition-transform ${showTodayClients ? 'rotate-180' : ''}`} />
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

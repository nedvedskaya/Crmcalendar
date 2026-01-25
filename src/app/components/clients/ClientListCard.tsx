import { Car } from 'lucide-react';
import { Badge, ActionButtons } from '@/app/components/ui';

interface ClientListCardProps {
  client: any;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const ClientListCard = ({ 
  client, 
  onOpen, 
  onEdit, 
  onDelete 
}: ClientListCardProps) => {
  const activeRecords = (client.records || []).filter((r: any) => !r.isCompleted);
  const hasActiveBooking = activeRecords.length > 0;

  return (
    <div 
      onClick={onOpen}
      className="bg-white border border-zinc-200 rounded-2xl p-3 cursor-pointer hover:border-orange-300 hover:shadow-lg transition-all active:scale-[0.98] relative overflow-hidden"
    >
      {/* Оранжевая полоска если есть активная бронь */}
      {hasActiveBooking && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-orange-600" />
      )}
      
      <div className="flex items-start gap-3">
        {/* Аватар */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white text-base font-black shrink-0 shadow-md">
          {String(client.name || '').charAt(0).toUpperCase()}
        </div>
        
        {/* Основная информация */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-1">
            <h3 className="font-bold text-base text-zinc-900 truncate">
              {String(client.name || '')}
            </h3>
            <ActionButtons onEdit={onEdit} onDelete={onDelete} />
          </div>
          
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1.5">
            <Car size={12} />
            <span className="truncate">
              {String(client.carBrand || '')} {String(client.carModel || '')}
            </span>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-zinc-400">{String(client.phone || '')}</span>
            {client.branch && (
              <Badge variant={client.branch === 'msk' ? 'branch-msk' : 'branch-rnd'}>
                {client.branch === 'msk' ? 'МСК' : 'РНД'}
              </Badge>
            )}
            {hasActiveBooking && (
              <Badge variant="status">
                Активная бронь
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
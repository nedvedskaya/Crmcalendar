import { Edit3, Trash2 } from 'lucide-react';
import { formatMoney } from '@/utils/helpers';
import { COLORS } from '@/utils/constants';

interface TransactionItemProps {
    transaction: any;
    category: any;
    tags: any[];
    onEdit: (transaction: any) => void;
    onDelete: (id: string) => void;
}

export const TransactionItem = ({ transaction: t, category, tags: transactionTags, onEdit, onDelete }: TransactionItemProps) => {
    const isIncome = t.type === 'income';
    
    return (
        <div className="border-b border-gray-100 pb-3 last:border-0">
            <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                        <span className="text-base font-semibold text-gray-900">{String(t.title || t.description || '')}</span>
                        <span className={`text-base font-bold ml-3 shrink-0 ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                            {isIncome ? '+' : '-'}{formatMoney(t.amount)} ₽
                        </span>
                    </div>
                    {t.sub && <p className="text-sm text-gray-400 mb-2">{String(t.sub)}</p>}
                    {(category || transactionTags.length > 0) && (
                        <div className="flex flex-wrap gap-2">
                            {category && (
                                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-50">
                                    <div 
                                        className="w-2 h-2 rounded-full" 
                                        style={{ backgroundColor: category.color }}
                                    />
                                    <span className="text-xs font-medium text-gray-600">
                                        {category.name}
                                    </span>
                                </div>
                            )}
                            {transactionTags.map(tag => (
                                <div 
                                    key={tag.id}
                                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-50"
                                >
                                    <div 
                                        className="w-2 h-2 rounded-full" 
                                        style={{ backgroundColor: tag.color || COLORS[0] }}
                                    />
                                    <span className="text-xs font-medium text-gray-600">
                                        {tag.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                    <button 
                        onClick={() => onEdit(t)}
                        className="text-zinc-400 hover:text-orange-600 transition-colors p-1"
                    >
                        <Edit3 size={14} />
                    </button>
                    <button 
                        onClick={() => {
                            if (confirm(`Удалить операцию "${t.title}"?`)) {
                                onDelete(t.id);
                            }
                        }}
                        className="text-zinc-400 hover:text-red-600 transition-colors p-1"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};

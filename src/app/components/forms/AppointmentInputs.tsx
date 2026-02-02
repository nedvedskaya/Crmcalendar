import React from 'react';
import { getDateStr } from '@/utils/helpers';

interface Category {
    id: string;
    name: string;
    type: string;
    color: string;
}

interface Tag {
    id: string | number;
    name: string;
    color?: string;
}

interface AppointmentData {
    service?: string;
    date?: string;
    time?: string;
    endDate?: string;
    category?: string;
    tags?: (string | number)[];
    amount?: string | number;
    advance?: string | number;
    advanceDate?: string;
    paymentStatus?: string;
}

interface AppointmentInputsProps {
    data: AppointmentData;
    onChange: (e: { target: { name: string; value: string | number | (string | number)[] } }) => void;
    categories?: Category[];
    tags?: Tag[];
}

export const AppointmentInputs: React.FC<AppointmentInputsProps> = ({ data, onChange, categories, tags }) => {
    const handleAdvanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        onChange({ target: { name: 'advance', value } });
        
        if (value && parseFloat(value) > 0 && !data.advanceDate) {
            onChange({ target: { name: 'advanceDate', value: getDateStr(0) } });
        }
    };
    
    const toggleTag = (tagId: string | number) => {
        const currentTags = data.tags || [];
        const newTags = currentTags.includes(tagId)
            ? currentTags.filter(t => t !== tagId)
            : [...currentTags, tagId];
        onChange({ target: { name: 'tags', value: newTags } });
    };
    return (
        <div className="space-y-3">
            <input 
                type="text" 
                name="service" 
                value={String(data.service || '')} 
                onChange={onChange} 
                placeholder="Услуга / Деталь" 
                className="w-full bg-white border border-zinc-300 rounded-xl p-4 text-base font-medium text-black outline-none focus:border-black shadow-sm" 
            />
            
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
            
            <div>
                <span className="text-xs text-gray-400 font-semibold block mb-2">Общая сумма услуги</span>
                <input 
                    type="text" 
                    name="amount" 
                    value={String(data.amount || '')} 
                    onChange={onChange} 
                    placeholder="0 ₽" 
                    className="w-full bg-white border border-zinc-300 rounded-xl p-4 text-lg font-bold text-black outline-none focus:border-black shadow-sm" 
                />
            </div>
            
            <div className="flex gap-3">
                <div className="flex-1">
                    <span className="text-xs text-gray-400 font-semibold block mb-2">Аванс</span>
                    <input 
                        type="text" 
                        name="advance" 
                        value={String(data.advance || '')} 
                        onChange={handleAdvanceChange} 
                        placeholder="0 ₽" 
                        className="w-full bg-white border border-zinc-300 rounded-xl p-4 font-bold text-black outline-none focus:border-black shadow-sm" 
                    />
                </div>
                <div className="flex-1">
                    <span className="text-xs text-gray-400 font-semibold block mb-2">Дата аванса</span>
                    <input 
                        type="date" 
                        name="advanceDate" 
                        value={String(data.advanceDate || '')} 
                        onChange={onChange} 
                        className="w-full bg-white border border-zinc-300 rounded-xl p-4 font-medium text-black outline-none focus:border-black shadow-sm" 
                    />
                </div>
            </div>
            
            {tags && tags.length > 0 && (
                <div>
                    <span className="text-xs text-gray-400 font-semibold block mb-2">Теги</span>
                    <div className="flex flex-wrap gap-2">
                        {tags.map(tag => (
                            <button
                                key={tag.id}
                                type="button"
                                onClick={() => toggleTag(tag.id)}
                                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-all ${
                                    (data.tags || []).includes(tag.id)
                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' 
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                            >
                                {tag.color && (
                                    <div 
                                        className="w-2 h-2 rounded-full" 
                                        style={{ backgroundColor: tag.color }}
                                    />
                                )}
                                {tag.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
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

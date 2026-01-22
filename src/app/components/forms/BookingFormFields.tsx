import { Calendar, Clock, DollarSign } from 'lucide-react';
import { FormField } from './FormField';

interface BookingFormFieldsProps {
  bookingData: {
    service: string;
    date: string;
    endDate?: string;
    time: string;
    amount: string | number;
    category?: string;
    paymentStatus: 'none' | 'advance' | 'paid';
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  categories?: { value: string; label: string }[];
  showEndDate?: boolean;
}

export const BookingFormFields = ({ 
  bookingData, 
  onChange,
  categories = [],
  showEndDate = false
}: BookingFormFieldsProps) => {
  return (
    <div className="space-y-3">
      <FormField
        label="Услуга"
        name="service"
        type="text"
        value={bookingData.service}
        onChange={onChange}
        placeholder="Например: Сплиттер, Диффузор..."
        required
      />

      {categories.length > 0 && (
        <FormField
          label="Категория"
          name="category"
          type="select"
          value={bookingData.category || ''}
          onChange={onChange}
          options={categories}
          placeholder="Выберите категорию"
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <FormField
          label="Дата начала"
          name="date"
          type="date"
          value={bookingData.date}
          onChange={onChange}
          icon={Calendar}
          required
        />

        {showEndDate && (
          <FormField
            label="Дата окончания"
            name="endDate"
            type="date"
            value={bookingData.endDate || ''}
            onChange={onChange}
            icon={Calendar}
          />
        )}

        <FormField
          label="Время"
          name="time"
          type="time"
          value={bookingData.time}
          onChange={onChange}
          icon={Clock}
        />

        <FormField
          label="Сумма (₽)"
          name="amount"
          type="number"
          value={bookingData.amount}
          onChange={onChange}
          icon={DollarSign}
          placeholder="0"
          required
        />
      </div>

      {/* Статус оплаты */}
      <div>
        <label className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-2 block">
          Статус оплаты
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange({ target: { name: 'paymentStatus', value: 'none' } } as any)}
            className={`flex-1 px-2 py-2 rounded-xl text-xs font-semibold transition-all ${
              bookingData.paymentStatus === 'none' 
                ? 'bg-gray-500 text-white shadow-lg shadow-gray-500/30' 
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            Не оплачено
          </button>
          <button
            type="button"
            onClick={() => onChange({ target: { name: 'paymentStatus', value: 'advance' } } as any)}
            className={`flex-1 px-2 py-2 rounded-xl text-xs font-semibold transition-all ${
              bookingData.paymentStatus === 'advance' 
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' 
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            Аванс
          </button>
          <button
            type="button"
            onClick={() => onChange({ target: { name: 'paymentStatus', value: 'paid' } } as any)}
            className={`flex-1 px-2 py-2 rounded-xl text-xs font-semibold transition-all ${
              bookingData.paymentStatus === 'paid' 
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

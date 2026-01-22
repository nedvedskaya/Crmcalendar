import { Clock, Calendar, AlertOctagon, Circle } from 'lucide-react';
import { FormField } from './FormField';

interface TaskFormFieldsProps {
  taskData: {
    title: string;
    date: string;
    time: string;
    isUrgent: boolean;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleUrgent: () => void;
}

export const TaskFormFields = ({ 
  taskData, 
  onChange, 
  onToggleUrgent 
}: TaskFormFieldsProps) => {
  return (
    <div className="space-y-3">
      <FormField
        label="Название задачи"
        name="title"
        type="text"
        value={taskData.title}
        onChange={onChange}
        placeholder="Например: Позвонить клиенту"
        required
      />

      <div className="grid grid-cols-2 gap-3">
        <FormField
          label="Дата"
          name="date"
          type="date"
          value={taskData.date}
          onChange={onChange}
          icon={Calendar}
          required
        />

        <FormField
          label="Время"
          name="time"
          type="time"
          value={taskData.time}
          onChange={onChange}
          icon={Clock}
        />
      </div>

      {/* Кнопка срочности */}
      <button 
        type="button"
        onClick={onToggleUrgent}
        className={`w-full py-4 rounded-2xl text-sm font-bold border-2 transition-all flex items-center justify-center gap-3 ${
          taskData.isUrgent 
            ? 'bg-gradient-to-r from-red-500 to-orange-500 border-red-500 text-white shadow-xl' 
            : 'bg-white border-zinc-200 text-zinc-400 hover:border-zinc-300'
        }`}
      >
        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
          taskData.isUrgent ? 'bg-white/20' : 'bg-zinc-100'
        }`}>
          {taskData.isUrgent ? <AlertOctagon size={16} className="text-white" /> : <Circle size={16} />}
        </div>
        <span className="uppercase tracking-wide">
          {taskData.isUrgent ? 'Срочная задача' : 'Обычная задача'}
        </span>
      </button>
    </div>
  );
};

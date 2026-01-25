# DRY Аудит - Отчет по дублированию кода

## 📊 Общая статистика

- **App.tsx**: 1890 строк (КРИТИЧНО - слишком большой файл)
- **FinanceView.tsx**: 969 строк
- **ClientsView.tsx**: 232 строки
- **Общее количество компонентов**: 60+

---

## 🔴 КРИТИЧЕСКИЕ проблемы (высокий приоритет)

### 1. **Монолитный App.tsx (1890 строк)**

**Проблема**: Огромный файл с дублированием логики по всему коду.

**Найденные дублирования**:

#### 1.1 Дублирование логики управления формами
```tsx
// В App.tsx встречается минимум 3 раза:

// Вариант 1 - ClientDetails (строка 602)
const handleCancelTask = () => {
    setIsAddingTask(false);
    setEditingTask(null);
    setNewTask(getInitialTaskState(client.branch));
};

// Вариант 2 - TasksView (строка 1037)
const handleCancel = () => {
    setIsAdding(false);
    setEditingTask(null);
    setNewTask({ 
        ...getInitialTaskState(currentBranch),
        clientName: '',
    });
};

// Вариант 3 - CalendarView (строка 1292)
onClick={() => setIsAdding(false)}
```

**Решение**: Создать хук `useFormState`:
```tsx
// /src/app/hooks/useFormState.ts
export const useFormState = <T>(initialState: T) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [data, setData] = useState<T>(initialState);

  const open = () => setIsOpen(true);
  const close = () => {
    setIsOpen(false);
    setIsEditing(false);
    setData(initialState);
  };
  const edit = (item: T) => {
    setData(item);
    setIsEditing(true);
    setIsOpen(true);
  };

  return { isOpen, isEditing, data, setData, open, close, edit };
};
```

#### 1.2 Дублирование обработчиков toggle/update
```tsx
// Встречается 2+ раза:
onToggleTask={(id) => setTasks(tasks.map(t => t.id === id ? {...t, completed: !t.completed} : t))}
```

**Решение**: Создать хук `useArrayState`:
```tsx
// /src/app/hooks/useArrayState.ts
export const useArrayState = <T extends { id: string }>(initialData: T[]) => {
  const [items, setItems] = useState(initialData);

  const add = (item: T) => setItems([item, ...items]);
  const remove = (id: string) => setItems(items.filter(item => item.id !== id));
  const update = (id: string, updates: Partial<T>) => 
    setItems(items.map(item => item.id === id ? { ...item, ...updates } : item));
  const toggle = (id: string, key: keyof T) =>
    setItems(items.map(item => item.id === id ? { ...item, [key]: !item[key] } : item));

  return { items, setItems, add, remove, update, toggle };
};
```

#### 1.3 Дублирование фильтрации по филиалам
```tsx
// Встречается 10+ раз в разных местах:
const filteredClients = clients.filter(c => !currentBranch || c.branch === currentBranch);
const filteredTasks = tasks.filter(t => t.branch === currentBranch);
const filteredEvents = events.filter(e => e.branch === currentBranch);
```

**Решение**: Создать утилиту `useBranchFilter`:
```tsx
// /src/app/hooks/useBranchFilter.ts
export const useBranchFilter = <T extends { branch?: string }>(
  items: T[], 
  currentBranch: string
) => {
  return useMemo(
    () => items.filter(item => !currentBranch || item.branch === currentBranch),
    [items, currentBranch]
  );
};
```

---

### 2. **Дублирование CSS классов**

**Проблема**: Одинаковые комбинации классов повторяются 5+ раз:

```tsx
className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl p-4 font-bold outline-none shadow-sm"
```

**Решение**: Создать константы стилей:
```tsx
// /src/utils/styleConstants.ts
export const INPUT_CLASSES = {
  base: "w-full bg-zinc-50 border border-zinc-200 rounded-2xl p-4 font-bold outline-none shadow-sm",
  compact: "w-full bg-white border border-zinc-200 rounded-lg p-3 text-sm outline-none",
  error: "border-red-500 focus:border-red-600",
  disabled: "bg-zinc-100 text-zinc-400 cursor-not-allowed"
};

export const BUTTON_CLASSES = {
  primary: "bg-black text-white px-4 py-2 rounded-full shadow-lg active:scale-95 transition-all",
  secondary: "bg-zinc-100 text-zinc-600 px-4 py-2 rounded-full hover:bg-zinc-200 transition-all",
  danger: "bg-red-500 text-white px-4 py-2 rounded-full hover:bg-red-600 transition-all"
};
```

---

### 3. **Дублирование логики статуса оплаты**

**Проблема**: Кнопки статуса оплаты дублируются в 2 местах:
- `BookingFormFields.tsx` (строки 98-131)
- `App.tsx` PaymentStatusSelector (строки 251-273)

**Решение**: Вынести в отдельный компонент:
```tsx
// /src/app/components/ui/PaymentStatusSelector.tsx
interface PaymentStatusSelectorProps {
  value: 'none' | 'advance' | 'paid';
  onChange: (value: 'none' | 'advance' | 'paid') => void;
}

export const PaymentStatusSelector = ({ value, onChange }: PaymentStatusSelectorProps) => {
  const statuses = [
    { value: 'none', label: 'Не оплачено', color: 'gray' },
    { value: 'advance', label: 'Аванс', color: 'orange' },
    { value: 'paid', label: 'Оплачено', color: 'orange' }
  ];

  return (
    <div className="flex gap-2">
      {statuses.map(status => (
        <button
          key={status.value}
          type="button"
          onClick={() => onChange(status.value as any)}
          className={`flex-1 px-2 py-2 rounded-xl text-xs font-semibold transition-all ${
            value === status.value
              ? `bg-${status.color}-500 text-white shadow-lg shadow-${status.color}-500/30`
              : 'bg-gray-100 text-gray-400'
          }`}
        >
          {status.label}
        </button>
      ))}
    </div>
  );
};
```

---

## 🟡 СРЕДНИЙ приоритет

### 4. **Дублирование компонентов деталей**

**Проблема**: Похожая структура в:
- `ClientCard.tsx` 
- `ClientListCard.tsx`
- `BookingCard.tsx`

Все содержат:
- Аватар/иконку
- Заголовок
- Подзаголовок
- Кнопки действий
- Badge'и

**Решение**: Создать базовый компонент `Card`:
```tsx
// /src/app/components/ui/Card.tsx
interface CardProps {
  avatar?: React.ReactNode;
  title: string;
  subtitle?: string;
  badges?: React.ReactNode;
  actions?: React.ReactNode;
  onClick?: () => void;
  highlighted?: boolean;
}

export const Card = ({ 
  avatar, 
  title, 
  subtitle, 
  badges, 
  actions, 
  onClick,
  highlighted 
}: CardProps) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-white border rounded-2xl p-3 cursor-pointer hover:border-orange-300 hover:shadow-lg transition-all relative ${
        highlighted ? 'border-orange-500' : 'border-zinc-200'
      }`}
    >
      {highlighted && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-orange-600" />}
      
      <div className="flex items-start gap-3">
        {avatar}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-1">
            <h3 className="font-bold text-base text-zinc-900 truncate">{title}</h3>
            {actions}
          </div>
          {subtitle && <div className="text-xs text-zinc-500 mb-1.5">{subtitle}</div>}
          {badges && <div className="flex items-center gap-2 flex-wrap">{badges}</div>}
        </div>
      </div>
    </div>
  );
};
```

---

### 5. **Дублирование поиска клиента**

**Проблема**: Логика `AutocompleteInput` для клиентов повторяется минимум 3 раза.

**Решение**: Создать `ClientAutocomplete`:
```tsx
// /src/app/components/clients/ClientAutocomplete.tsx
interface ClientAutocompleteProps {
  clients: Client[];
  value: string;
  onChange: (clientName: string) => void;
  onSelect?: (client: Client) => void;
  placeholder?: string;
}

export const ClientAutocomplete = ({ 
  clients, 
  value, 
  onChange, 
  onSelect,
  placeholder = "Поиск клиента..." 
}: ClientAutocompleteProps) => {
  const clientNames = useMemo(() => clients.map(c => c.name), [clients]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    const client = clients.find(c => c.name === e.target.value);
    if (client && onSelect) onSelect(client);
  };

  return (
    <AutocompleteInput
      options={clientNames}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl p-4 font-bold outline-none"
    />
  );
};
```

---

## 🟢 Низко висящие фрукты (легкие правки)

### 6. **Дублирование проверки пустого массива**

**Проблема**: Повторяется 10+ раз:
```tsx
{tasks.length === 0 ? <EmptyState /> : tasks.map(...)}
```

**Решение**: Создать компонент `EmptyOrList`:
```tsx
// /src/app/components/ui/EmptyOrList.tsx
interface EmptyOrListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  emptyIcon?: React.ComponentType;
  emptyTitle?: string;
  emptyDescription?: string;
}

export const EmptyOrList = <T,>({ 
  items, 
  renderItem, 
  emptyIcon: Icon,
  emptyTitle = "Нет данных",
  emptyDescription
}: EmptyOrListProps<T>) => {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        {Icon && (
          <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
            <Icon className="text-zinc-400" size={28} />
          </div>
        )}
        <p className="text-zinc-400 font-bold text-sm">{emptyTitle}</p>
        {emptyDescription && <p className="text-zinc-300 text-sm mt-1">{emptyDescription}</p>}
      </div>
    );
  }

  return <>{items.map(renderItem)}</>;
};
```

---

### 7. **Дублирование форматирования даты**

**Проблема**: Форматирование даты разбросано по коду:
```tsx
new Date(transaction.date).toISOString().split('T')[0]
new Date().toLocaleDateString('ru-RU')
```

**Решение**: Расширить `helpers.ts`:
```tsx
// /src/utils/helpers.ts
export const formatDateForInput = (date: Date | string): string => {
  return new Date(date).toISOString().split('T')[0];
};

export const formatDateLocale = (date: Date | string, locale = 'ru-RU'): string => {
  return new Date(date).toLocaleDateString(locale);
};

export const formatDateTime = (date: Date | string): string => {
  return new Date(date).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};
```

---

### 8. **Дублирование Modal wrapper'ов**

**Проблема**: Одинаковая структура модалок в App.tsx (5+ раз):
```tsx
{isAdding && (
  <div className="absolute inset-0 z-[150] bg-zinc-900/50 backdrop-blur-sm flex items-end">
    <div className="w-full bg-white rounded-t-[32px] p-6 shadow-2xl">
      {/* content */}
    </div>
  </div>
)}
```

**Решение**: Использовать существующий `Modal` компонент последовательно везде.

---

### 9. **Дублирование константных значений**

**Проблема**: Magic numbers разбросаны по коду:
```tsx
pb-32  // встречается 8 раз
pb-44  // встречается 5 раз
z-[150] // встречается 3 раза
```

**Решение**: Добавить в `constants.ts`:
```tsx
// /src/utils/constants.ts
export const LAYOUT = {
  BOTTOM_PADDING: 'pb-32',
  BOTTOM_PADDING_LARGE: 'pb-44',
  Z_INDEX_MODAL: 'z-[150]',
  Z_INDEX_OVERLAY: 'z-[100]',
  Z_INDEX_HEADER: 'z-40',
  Z_INDEX_TAB_BAR: 'z-[250]'
};
```

---

### 10. **Дублирование кнопок действий**

**Проблема**: Кнопки Edit/Delete повторяются в каждой карточке:
```tsx
<button onClick={onEdit}>
  <Edit3 size={16} />
</button>
<button onClick={onDelete}>
  <Trash2 size={16} />
</button>
```

**Решение**: Создать `ActionButtons`:
```tsx
// /src/app/components/ui/ActionButtons.tsx
interface ActionButtonsProps {
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
  size?: number;
}

export const ActionButtons = ({ 
  onEdit, 
  onDelete, 
  onView,
  size = 16 
}: ActionButtonsProps) => {
  return (
    <div className="flex gap-1 ml-2 shrink-0">
      {onView && (
        <button 
          onClick={(e) => { e.stopPropagation(); onView(); }}
          className="p-1.5 text-zinc-400 hover:text-blue-600 transition-colors"
        >
          <Eye size={size} />
        </button>
      )}
      {onEdit && (
        <button 
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="p-1.5 text-zinc-400 hover:text-orange-600 transition-colors"
        >
          <Edit3 size={size} />
        </button>
      )}
      {onDelete && (
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1.5 text-zinc-400 hover:text-red-600 transition-colors"
        >
          <Trash2 size={size} />
        </button>
      )}
    </div>
  );
};
```

---

## 📋 План рефакторинга (приоритеты)

### Эт��п 1: Низко висящие фрукты (1-2 часа)
1. ✅ Создать константы стилей `INPUT_CLASSES`, `BUTTON_CLASSES`
2. ✅ Создать `ActionButtons` компонент
3. ✅ Создать `EmptyOrList` компонент
4. ✅ Расширить `helpers.ts` с форматированием дат
5. ✅ Добавить `LAYOUT` константы

### Этап 2: Хуки и утилиты (2-3 часа)
1. ✅ Создать `useFormState` хук
2. ✅ Создать `useArrayState` хук
3. ✅ Создать `useBranchFilter` хук
4. ✅ Создать `ClientAutocomplete` компонент
5. ✅ Создать `PaymentStatusSelector` компонент

### Этап 3: Разбиение App.tsx (4-6 часов)
1. ✅ Вынести ClientDetails в отдельный компонент
2. ✅ Вынести TasksView в отдельный компонент  
3. ✅ Вынести CalendarView в отдельный компонент
4. ✅ Вынести ClientForm в отдельный компонент
5. ✅ Создать кастомные хуки для бизнес-логики

### Этап 4: Оптимизация компонентов (2-3 часа)
1. ✅ Создать базовый `Card` компонент
2. ✅ Рефакторить ClientCard, ClientListCard, BookingCard
3. ✅ Унифицировать использование Modal

---

## 📊 Метрики улучшения (прогноз)

После рефакторинга:
- **App.tsx**: с 1890 до ~800 строк (-57%)
- **Новые переиспользуемые хуки**: 5+
- **Новые переиспользуемые компоненты**: 7+
- **Сокращение дублирования**: ~40%
- **Улучшение читаемости**: значительное
- **Упрощение поддержки**: значительное

---

## 🎯 Рекомендации

1. **Немедленно**: Начать с "низко висящих фруктов" - они дают быстрый результат
2. **Краткосрочно**: Создать хуки для управления состоянием
3. **Среднесрочно**: Разбить App.tsx на отдельные view-компоненты
4. **Долгосрочно**: Рассмотреть использование state management (Zustand/Redux) для глобального состояния

---

## ⚠️ Важно

При рефакторинге следовать принципу: **"Не ломай то, что работает"**
- Делать маленькие итерации
- Тестировать после каждого изменения
- Сохранять обратную совместимость
- Коммитить часто с понятными сообщениями

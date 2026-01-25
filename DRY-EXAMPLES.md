# DRY Рефакторинг - Примеры "До и После"

## 📝 Реальные примеры улучшения кода

---

## Пример 1: Управление формами

### ❌ ДО (дублирование в 3+ местах)

```tsx
// ClientDetails - строка 544
const [isAddingTask, setIsAddingTask] = useState(false);
const [editingTask, setEditingTask] = useState(null);
const [newTask, setNewTask] = useState(getInitialTaskState());

const handleCancelTask = () => {
    setIsAddingTask(false);
    setEditingTask(null);
    setNewTask(getInitialTaskState(client.branch));
};

// TasksView - строка 972  
const [isAdding, setIsAdding] = useState(false);
const [editingTask, setEditingTask] = useState(null);
const [newTask, setNewTask] = useState(getInitialTaskState());

const handleCancel = () => {
    setIsAdding(false);
    setEditingTask(null);
    setNewTask(getInitialTaskState(currentBranch));
};

// CalendarView - строка 1249
const [isAdding, setIsAdding] = useState(false);
const [newEntry, setNewEntry] = useState(getInitialCalendarEntryState());

// И так далее...
```

**Проблемы:**
- 15+ строк кода на каждую форму
- Логика дублируется 5+ раз
- Легко забыть сбросить какое-то состояние

### ✅ ПОСЛЕ

```tsx
import { useFormState } from '@/app/hooks/useFormState';

// Везде одинаково:
const taskForm = useFormState(getInitialTaskState(currentBranch));

// Использование:
taskForm.open();           // открыть для создания
taskForm.edit(task);       // открыть для редактирования  
taskForm.close();          // закрыть и сбросить
taskForm.handleChange(e);  // обработать изменение
taskForm.isOpen            // открыта ли форма?
taskForm.isEditing         // режим редактирования?
taskForm.data              // текущие данные
```

**Результат:**
- ✅ Сокращение с 15 до 1 строки
- ✅ Единый API для всех форм
- ✅ Меньше ошибок

---

## Пример 2: CRUD операции с массивами

### ❌ ДО (повторяется 10+ раз)

```tsx
// App.tsx - управление задачами
const [tasks, setTasks] = useState(INITIAL_TASKS);

const onToggleTask = (id) => 
  setTasks(tasks.map(t => t.id === id ? {...t, completed: !t.completed} : t));

const onDeleteTask = (id) => 
  setTasks(tasks.filter(t => t.id !== id));

const onAddTask = (task) => 
  setTasks([task, ...tasks]);

const onUpdateTask = (id, updates) =>
  setTasks(tasks.map(t => t.id === id ? {...t, ...updates} : t));

// App.tsx - управление клиентами  
const [clients, setClients] = useState(INITIAL_CLIENTS);

const onDeleteClient = (id) =>
  setClients(clients.filter(c => c.id !== id));

const onUpdateClient = (id, updates) =>
  setClients(clients.map(c => c.id === id ? {...c, ...updates} : c));

// И так 5+ раз для разных сущностей...
```

**Проблемы:**
- ~50 строк повторяющейся логики
- Риск ошибок при копировании
- Сложно тестировать

### ✅ ПОСЛЕ

```tsx
import { useArrayState } from '@/app/hooks/useArrayState';

// Задачи
const tasks = useArrayState(INITIAL_TASKS);
tasks.toggle(id, 'completed');  // вместо onToggleTask
tasks.remove(id);               // вместо onDeleteTask
tasks.add(task);                // вместо onAddTask
tasks.update(id, updates);      // вместо onUpdateTask

// Клиенты
const clients = useArrayState(INITIAL_CLIENTS);
clients.remove(id);
clients.update(id, updates);

// События
const events = useArrayState(INITIAL_EVENTS);
// ... тот же API
```

**Результат:**
- ✅ Сокращение с ~50 до ~10 строк
- ✅ Единый, предсказуемый API
- ✅ Легко тестировать один раз

---

## Пример 3: Кнопки действий

### ❌ ДО (дублируется в каждой карточке)

```tsx
// ClientListCard.tsx
<div className="flex gap-1 ml-2 shrink-0">
  <button 
    onClick={(e) => { e.stopPropagation(); onEdit(); }}
    className="p-1.5 text-zinc-400 hover:text-orange-600 transition-colors"
  >
    <Edit3 size={16} />
  </button>
  <button 
    onClick={(e) => { e.stopPropagation(); onDelete(); }}
    className="p-1.5 text-zinc-400 hover:text-red-600 transition-colors"
  >
    <Trash2 size={16} />
  </button>
</div>

// BookingCard.tsx
<div className="flex gap-1 ml-2 shrink-0">
  <button 
    onClick={(e) => { e.stopPropagation(); onEdit(); }}
    className="p-1.5 text-zinc-400 hover:text-orange-600 transition-colors"
  >
    <Edit3 size={16} />
  </button>
  <button 
    onClick={(e) => { e.stopPropagation(); onDelete(); }}
    className="p-1.5 text-zinc-400 hover:text-red-600 transition-colors"
  >
    <Trash2 size={16} />
  </button>
</div>

// И еще 5+ раз...
```

**Проблемы:**
- 15 строк × 7 компонентов = 105 строк дубликатов
- Забыли stopPropagation? Баг!
- Хотим добавить кнопку "Просмотр"? Править везде!

### ✅ ПОСЛЕ

```tsx
import { ActionButtons } from '@/app/components/ui/ActionButtons';

// Везде одинаково:
<ActionButtons onEdit={onEdit} onDelete={onDelete} />

// Или с просмотром:
<ActionButtons onView={onView} onEdit={onEdit} onDelete={onDelete} />

// Или только удаление:
<ActionButtons onDelete={onDelete} />
```

**Результат:**
- ✅ Сокращение с 105 до 7 строк
- ✅ stopPropagation встроен
- ✅ Новая кнопка? Меняем в одном месте!

---

## Пример 4: Пустое состояние

### ❌ ДО (повторяется 8+ раз)

```tsx
// ClientsView
{filteredItems.length === 0 ? (
  <div className="flex flex-col items-center justify-center py-20">
    <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
      <Search size={28} className="text-zinc-400" />
    </div>
    <p className="text-zinc-400 font-bold text-sm">Клиенты не найдены</p>
  </div>
) : (
  filteredItems.map(...)
)}

// TasksView
{displayTasks.length === 0 ? (
  <div className="flex flex-col items-center justify-center h-64 text-center">
    <CheckSquare size={48} className="text-zinc-300 mb-4" />
    <p className="text-zinc-400 font-semibold">Нет задач на сегодня</p>
    <p className="text-zinc-300 text-sm mt-1">Отличная работа!</p>
  </div>
) : (
  displayTasks.map(...)
)}

// И так 8+ раз...
```

**Проблемы:**
- ~120 строк дублирования
- Разный стиль в разных местах
- Сложно поддерживать единообразие

### ✅ ПОСЛЕ

```tsx
import { EmptyState } from '@/app/components/ui/EmptyState';

// ClientsView
{filteredItems.length === 0 ? (
  <EmptyState 
    icon={Search}
    title="Клиенты не найдены"
    description="Попробуйте изменить параметры поиска"
  />
) : (
  filteredItems.map(...)
)}

// TasksView
{displayTasks.length === 0 ? (
  <EmptyState 
    icon={CheckSquare}
    title="Нет задач на сегодня"
    description="Отличная работа!"
  />
) : (
  displayTasks.map(...)
)}

// С кнопкой действия
<EmptyState 
  icon={Plus}
  title="Нет транзакций"
  description="Начните отслеживать финансы"
  action={{
    label: "Добавить транзакцию",
    onClick: () => setIsAdding(true)
  }}
/>
```

**Результат:**
- ✅ Сокращение с ~120 до ~40 строк
- ✅ Единый стиль
- ✅ Легко добавить кнопку действия

---

## Пример 5: CSS классы

### ❌ ДО (повторяется 15+ раз)

```tsx
// App.tsx - строка 1092
<input 
  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl p-4 font-bold outline-none shadow-sm"
  {...props}
/>

// App.tsx - строка 1102
<input 
  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl p-4 font-bold outline-none shadow-sm"
  {...props}
/>

// App.tsx - строка 1111
<input 
  className="flex-1 bg-zinc-50 border border-zinc-200 rounded-2xl p-4 font-bold outline-none shadow-sm"
  {...props}
/>

// И еще 12 раз...
```

**Проблемы:**
- Опечатка в одном месте = визуальная несогласованность
- Хотим изменить стиль? Правим 15 мест
- 90+ символов на каждый input

### ✅ ПОСЛЕ

```tsx
import { INPUT_CLASSES } from '@/utils/styleConstants';

// Везде одинаково:
<input className={INPUT_CLASSES.base} {...props} />

// Компактный вариант:
<input className={INPUT_CLASSES.compact} {...props} />

// С ошибкой:
<input 
  className={`${INPUT_CLASSES.base} ${hasError ? INPUT_CLASSES.error : ''}`}
  {...props}
/>
```

**Результат:**
- ✅ Сокращение с 90 до 25 символов
- ✅ Единый источник правды
- ✅ Изменение стиля в одном месте

---

## Пример 6: Статус оплаты

### ❌ ДО (дублируется в 2 местах)

```tsx
// BookingFormFields.tsx - строки 93-132 (40 строк)
<div>
  <label className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-2 block">
    Статус оплаты
  </label>
  <div className="flex gap-2">
    <button
      type="button"
      onClick={() => onChange({ target: { name: 'paymentStatus', value: 'none' } })}
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
      onClick={() => onChange({ target: { name: 'paymentStatus', value: 'advance' } })}
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
      onClick={() => onChange({ target: { name: 'paymentStatus', value: 'paid' } })}
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

// App.tsx PaymentStatusSelector - строки 251-273 (23 строки)
// Точно такой же код!
```

**Проблемы:**
- 40 строк × 2 = 80 строк дубликатов
- Хотим добавить статус "Частично"? Правим 2 места
- Хотим изменить цвета? Правим 2 места

### ✅ ПОСЛЕ

```tsx
import { PaymentStatusSelector } from '@/app/components/ui/PaymentStatusSelector';

// Везде одинаково:
<PaymentStatusSelector 
  value={bookingData.paymentStatus}
  onChange={(value) => onChange({ target: { name: 'paymentStatus', value } })}
/>

// С disabled:
<PaymentStatusSelector 
  value={bookingData.paymentStatus}
  onChange={handlePaymentChange}
  disabled={isLoading}
/>
```

**Результат:**
- ✅ Сокращение с 80 до 10 строк
- ✅ Новый статус? Меняем в одном месте
- ✅ Легко добавить disabled/loading состояния

---

## Пример 7: Форматирование дат

### ❌ ДО (разбросано по коду)

```tsx
// App.tsx
const dateStr = new Date(transaction.date).toISOString().split('T')[0];

// FinanceView.tsx
const formattedDate = new Date().toLocaleDateString('ru-RU');

// CalendarGrid.tsx  
const displayDate = new Date(event.date).toLocaleDateString('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
});

// TransactionItem.tsx
const dateTime = new Date(t.date).toLocaleString('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});
```

**Проблемы:**
- Разные форматы в разных местах
- Дублирование опций форматирования
- Сложно поменять формат глобально

### ✅ ПОСЛЕ

```tsx
import { 
  formatDateForInput, 
  formatDateLocale, 
  formatDateTime 
} from '@/utils/helpers';

// Для input[type="date"]
const dateStr = formatDateForInput(transaction.date);

// Локализованная дата
const formattedDate = formatDateLocale(new Date());

// Дата и время
const dateTime = formatDateTime(transaction.date);

// Дополнительные хелперы:
isToday(date)          // проверка на сегодня
isOverdue(date)        // проверка на просроченность
getStartOfDay(date)    // начало дня
getEndOfDay(date)      // конец дня
```

**Результат:**
- ✅ Единый формат по всему приложению
- ✅ Читаемый код
- ✅ Легко менять формат глобально

---

## 📊 Общая статистика улучшений

### Метрики "ДО":
- **Строк дублирования**: ~800-1000 строк
- **Повторяющихся паттернов**: 15+
- **Время на изменение**: высокое (править везде)
- **Риск ошибок**: высокий

### Метрики "ПОСЛЕ":
- **Строк дублирования**: ~200-300 строк (-70%)
- **Переиспользуемых компонентов**: 7+
- **Время на изменение**: низкое (править в одном месте)
- **Риск ошибок**: низкий

---

## 🎯 Визуализация экономии

```
ДО:
App.tsx                    ████████████████████ 1890 строк
ClientDetails              ████████ 400 строк (внутри App.tsx)
TasksView                  ████████ 380 строк (внутри App.tsx)
CalendarView               ███████ 350 строк (внутри App.tsx)
Дубликаты                  ████████████ 800+ строк
───────────────────────────────────────────────
ИТОГО: ~3800 строк с дубликатами

ПОСЛЕ:
App.tsx                    ████████ 800 строк
ClientDetailsView.tsx      ████ 200 строк
TasksView.tsx              ████ 180 строк
CalendarView.tsx           ████ 170 строк
Hooks (5 шт)               ██ 150 строк
UI Components (7 шт)       ███ 200 строк
───────────────────────────────────────────────
ИТОГО: ~1700 строк (-55%)

ЭКОНОМИЯ: 2100+ строк кода!
```

---

## ✨ Дополнительные преимущества

1. **Лучшая читаемость**: Код самодокументирующийся
2. **Проще тестирование**: Тестируем один компонент вместо 10
3. **Быстрее разработка**: Меньше копипасты
4. **Меньше багов**: Фикс в одном месте = фикс везде
5. **Проще онбординг**: Новому разработчику легче понять структуру

---

## 🚀 Что дальше?

После применения этих изменений:
1. Разбить App.tsx на view-компоненты
2. Создать базовый Card компонент
3. Рассмотреть state management (Zustand)
4. Добавить unit-тесты для хуков
5. Настроить ESLint правила против дублирования

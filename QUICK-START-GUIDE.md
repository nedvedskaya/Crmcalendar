# 🚀 Быстрый старт: Использование DRY компонентов

## 📦 Импорт

### Вариант 1: Индивидуальный импорт
```tsx
import { Button } from '@/app/components/ui/Button';
import { Modal } from '@/app/components/ui/Modal';
import { ColorPicker } from '@/app/components/ui/ColorPicker';
import { ToggleGroup } from '@/app/components/ui/ToggleGroup';
```

### Вариант 2: Групповой импорт (рекомендуется)
```tsx
import { Button, Modal, ColorPicker, ToggleGroup } from '@/app/components/ui';
```

---

## 🔘 Button

### Базовое использование
```tsx
<Button onClick={handleClick}>Нажми меня</Button>
```

### Варианты стилей
```tsx
<Button variant="primary">Основная</Button>
<Button variant="secondary">Вторичная</Button>
<Button variant="ghost">Прозрачная</Button>
<Button variant="danger">Опасная</Button>
```

### Размеры
```tsx
<Button size="sm">Маленькая</Button>
<Button size="md">Средняя</Button>
<Button size="lg">Большая</Button>
```

### С иконкой
```tsx
import { Plus } from 'lucide-react';

<Button icon={Plus}>Добавить</Button>
<Button variant="primary" icon={Save} size="lg">Сохранить</Button>
```

### На всю ширину
```tsx
<Button fullWidth>Заполнить контейнер</Button>
```

### Комбинации
```tsx
<Button 
  variant="primary" 
  size="lg" 
  icon={UserPlus} 
  fullWidth
  onClick={handleAddUser}
>
  Добавить пользователя
</Button>
```

---

## 🪟 Modal

### Базовое использование
```tsx
const [isOpen, setIsOpen] = useState(false);

<Modal 
  isOpen={isOpen} 
  onClose={() => setIsOpen(false)}
  title="Заголовок модалки"
>
  <p>Контент модального окна</p>
</Modal>
```

### Позиционирование
```tsx
// Снизу (для мобильных форм)
<Modal position="bottom" {...props}>
  {/* контент */}
</Modal>

// По центру (для диалогов)
<Modal position="center" {...props}>
  {/* контент */}
</Modal>
```

### Размеры
```tsx
<Modal maxWidth="sm" {...props}>Маленькая</Modal>
<Modal maxWidth="md" {...props}>Средняя</Modal>
<Modal maxWidth="lg" {...props}>Большая</Modal>
<Modal maxWidth="xl" {...props}>Очень большая</Modal>
<Modal maxWidth="full" {...props}>На весь экран</Modal>
```

### Полный пример
```tsx
const [isOpen, setIsOpen] = useState(false);

<>
  <Button onClick={() => setIsOpen(true)}>Открыть модалку</Button>
  
  <Modal 
    isOpen={isOpen} 
    onClose={() => setIsOpen(false)}
    title="Добавление записи"
    position="center"
    maxWidth="md"
  >
    <input placeholder="Введите данные..." />
    <div className="flex gap-3 mt-6">
      <Button variant="secondary" onClick={() => setIsOpen(false)} fullWidth>
        Отмена
      </Button>
      <Button variant="primary" onClick={handleSave} fullWidth>
        Сохранить
      </Button>
    </div>
  </Modal>
</>
```

---

## 🎨 ColorPicker

### Базовое использование
```tsx
const [selectedColor, setSelectedColor] = useState('#ef4444');

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#22c55e', 
  '#3b82f6', '#8b5cf6', '#ec4899'
];

<ColorPicker
  colors={COLORS}
  selectedColor={selectedColor}
  onColorSelect={setSelectedColor}
/>
```

### С кастомным лейблом
```tsx
<ColorPicker
  colors={COLORS}
  selectedColor={color}
  onColorSelect={setColor}
  label="Выберите цвет категории"
/>
```

### В модалке (реальный пример)
```tsx
<Modal isOpen={isOpen} onClose={...} title="Новая категория">
  <input 
    value={name} 
    onChange={(e) => setName(e.target.value)}
    placeholder="Название..."
  />
  
  <ColorPicker
    colors={COLORS}
    selectedColor={color}
    onColorSelect={setColor}
    label="Цвет"
  />
  
  <Button variant="primary" onClick={handleSave} fullWidth>
    Сохранить
  </Button>
</Modal>
```

---

## 🔄 ToggleGroup

### Базовое использование
```tsx
const [selected, setSelected] = useState('option1');

<ToggleGroup
  options={[
    { value: 'option1', label: 'Опция 1' },
    { value: 'option2', label: 'Опция 2' }
  ]}
  value={selected}
  onChange={setSelected}
/>
```

### С иконками
```tsx
import { Wallet, BarChart3 } from 'lucide-react';

<ToggleGroup
  options={[
    { value: 'operations', label: 'ОПЕРАЦИИ', icon: Wallet },
    { value: 'analytics', label: 'АНАЛИТИКА', icon: BarChart3 }
  ]}
  value={activeSection}
  onChange={setActiveSection}
  variant="default"
/>
```

### Варианты стилей
```tsx
// Default - с фоном
<ToggleGroup variant="default" {...props} />

// Minimal - минималистичный
<ToggleGroup variant="minimal" {...props} />
```

### Реальные примеры

#### Переключатель филиалов
```tsx
<ToggleGroup
  options={[
    { value: 'msk', label: 'МСК' },
    { value: 'rnd', label: 'РНД' }
  ]}
  value={branch}
  onChange={setBranch}
  variant="minimal"
/>
```

#### Переключатель типа операции
```tsx
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

<ToggleGroup
  options={[
    { value: 'income', label: 'Доход', icon: ArrowDownLeft },
    { value: 'expense', label: 'Расход', icon: ArrowUpRight }
  ]}
  value={type}
  onChange={setType}
  variant="default"
/>
```

---

## 🎯 Комбинированные примеры

### Форма с модалкой
```tsx
const [isOpen, setIsOpen] = useState(false);
const [name, setName] = useState('');
const [color, setColor] = useState('#ef4444');

const COLORS = ['#ef4444', '#22c55e', '#3b82f6'];

const handleSave = () => {
  // Сохранение данных
  console.log({ name, color });
  setIsOpen(false);
};

return (
  <>
    <Button variant="primary" icon={Plus} onClick={() => setIsOpen(true)}>
      Добавить категорию
    </Button>
    
    <Modal 
      isOpen={isOpen} 
      onClose={() => setIsOpen(false)}
      title="Новая категория"
      position="center"
      maxWidth="md"
    >
      <input 
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Название категории..."
        className="w-full p-4 border rounded-xl mb-4"
      />
      
      <ColorPicker
        colors={COLORS}
        selectedColor={color}
        onColorSelect={setColor}
        label="Цвет категории"
      />
      
      <div className="flex gap-3 mt-6">
        <Button 
          variant="secondary" 
          onClick={() => setIsOpen(false)} 
          fullWidth
        >
          Отмена
        </Button>
        <Button 
          variant="primary" 
          onClick={handleSave} 
          fullWidth
        >
          Сохранить
        </Button>
      </div>
    </Modal>
  </>
);
```

### Навигация с переключателями
```tsx
const [activeTab, setActiveTab] = useState('operations');

return (
  <div>
    <ToggleGroup
      options={[
        { value: 'operations', label: 'ОПЕРАЦИИ', icon: Wallet },
        { value: 'analytics', label: 'АНАЛИТИКА', icon: BarChart3 }
      ]}
      value={activeTab}
      onChange={setActiveTab}
      variant="default"
    />
    
    {activeTab === 'operations' && <OperationsView />}
    {activeTab === 'analytics' && <AnalyticsView />}
  </div>
);
```

---

## 💡 Лучшие практики

### ✅ DO (Делать):
```tsx
// Использовать компоненты вместо кастомных кнопок
<Button variant="primary">Сохранить</Button>

// Комбинировать пропсы для гибкости
<Button variant="primary" size="lg" icon={Save} fullWidth>
  Сохранить изменения
</Button>

// Использовать TypeScript подсказки
<Button variant="primary">  // IDE покажет доступные варианты
```

### ❌ DON'T (Не делать):
```tsx
// ❌ Создавать кастомные кнопки с теми же стилями
<button className="py-3 px-6 bg-black text-white rounded-xl">
  Сохранить
</button>

// ❌ Копировать стили из других мест
<button className={BTN_METAL_DARK}>...</button>

// ❌ Дублировать модальные обертки
<div className="absolute inset-0 bg-black/50...">
  {/* используйте Modal вместо этого */}
</div>
```

---

## 🔧 Расширение компонентов

### Добавление нового варианта Button
```tsx
// /src/app/components/ui/Button.tsx

const variants = {
  primary: 'bg-gradient-to-b from-zinc-800 to-zinc-900 text-white...',
  secondary: 'bg-zinc-100 text-zinc-600...',
  success: 'bg-green-500 text-white hover:bg-green-600', // ← новый
  // ...
};

// Использование:
<Button variant="success">Успех!</Button>
```

### Кастомизация через className
```tsx
// Добавить дополнительные стили через className
<Button variant="primary" className="mt-4 shadow-2xl">
  Кастомная кнопка
</Button>

// Переопределить цвет текста
<Button variant="ghost" className="text-orange-600">
  Оранжевая
</Button>
```

---

## 📚 Дополнительные ресурсы

- `/DRY-ANALYSIS.md` - Подробный анализ проблем
- `/DRY-REFACTORING-COMPLETE.md` - Детали рефакторинга FinanceView
- `/DRY-APP-REFACTORING-COMPLETE.md` - Детали рефакторинга App.tsx
- `/FINAL-DRY-REPORT.md` - Общий итоговый отчет

---

## ❓ FAQ

**Q: Можно ли использовать Button с ref?**  
A: Да, но нужно обернуть компонент в `React.forwardRef` (можно добавить при необходимости)

**Q: Как изменить стили глобально?**  
A: Отредактируйте файл компонента (например, `Button.tsx`), изменения применятся везде

**Q: Можно ли использовать несколько вариантов одновременно?**  
A: Нет, но можно комбинировать через `className`:
```tsx
<Button variant="primary" className="opacity-50 cursor-not-allowed">
  Недоступно
</Button>
```

---

**Счастливого кодинга!** 🎉

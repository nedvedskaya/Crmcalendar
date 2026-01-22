# 📝 DRY Components - Шпаргалка

## 📦 Импорт
```tsx
import { Button, Modal, ColorPicker, ToggleGroup } from '@/app/components/ui';
```

---

## 🔘 Button

```tsx
// Варианты
<Button variant="primary">Основная</Button>
<Button variant="secondary">Вторичная</Button>
<Button variant="ghost">Прозрачная</Button>
<Button variant="danger">Опасная</Button>

// Размеры
<Button size="sm">S</Button>
<Button size="md">M</Button>
<Button size="lg">L</Button>

// С иконкой
<Button icon={Plus}>Добавить</Button>

// Полная ширина
<Button fullWidth>Широкая</Button>

// Все вместе
<Button variant="primary" size="lg" icon={Save} fullWidth onClick={...}>
  Сохранить
</Button>
```

---

## 🪟 Modal

```tsx
const [open, setOpen] = useState(false);

<Modal 
  isOpen={open} 
  onClose={() => setOpen(false)}
  title="Заголовок"
  position="center"    // или "bottom"
  maxWidth="md"        // sm, md, lg, xl, full
>
  <p>Контент</p>
  <div className="flex gap-3 mt-6">
    <Button variant="secondary" fullWidth onClick={() => setOpen(false)}>
      Отмена
    </Button>
    <Button variant="primary" fullWidth onClick={handleSave}>
      Сохранить
    </Button>
  </div>
</Modal>
```

---

## 🎨 ColorPicker

```tsx
const [color, setColor] = useState('#ef4444');
const COLORS = ['#ef4444', '#22c55e', '#3b82f6'];

<ColorPicker
  colors={COLORS}
  selectedColor={color}
  onColorSelect={setColor}
  label="Цвет"
/>
```

---

## 🔄 ToggleGroup

```tsx
const [value, setValue] = useState('option1');

// Без иконок
<ToggleGroup
  options={[
    { value: 'option1', label: 'Опция 1' },
    { value: 'option2', label: 'Опция 2' }
  ]}
  value={value}
  onChange={setValue}
  variant="default"  // или "minimal"
/>

// С иконками
<ToggleGroup
  options={[
    { value: 'income', label: 'ДОХОД', icon: ArrowDownLeft },
    { value: 'expense', label: 'РАСХОД', icon: ArrowUpRight }
  ]}
  value={type}
  onChange={setType}
  variant="minimal"
/>
```

---

## 💡 Частые паттерны

### Форма в модалке
```tsx
<Modal isOpen={open} onClose={...} title="Форма">
  <input {...props} className="w-full p-4 border rounded-xl mb-4" />
  <ColorPicker {...colorProps} />
  <div className="flex gap-3 mt-6">
    <Button variant="secondary" fullWidth onClick={close}>Отмена</Button>
    <Button variant="primary" fullWidth onClick={save}>Сохранить</Button>
  </div>
</Modal>
```

### Переключатель филиалов
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

### Кнопки действий
```tsx
<div className="flex gap-3">
  <Button variant="secondary" onClick={cancel}>Отмена</Button>
  <Button variant="primary" onClick={save}>Сохранить</Button>
</div>
```

---

## ⚡ Где применено

- **Button:** 20+ мест (формы, карточки, модалки)
- **Modal:** 2 места (категории, теги)
- **ColorPicker:** 2 места (категории, теги)
- **ToggleGroup:** 7 мест (филиалы, типы операций, навигация)

**Итого:** 31+ замены, ~380 строк сокращено! 🎉

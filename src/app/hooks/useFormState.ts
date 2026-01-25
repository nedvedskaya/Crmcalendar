import { useState } from 'react';

/**
 * Универсальный хук для управления состоянием форм (создание/редактирование)
 * 
 * @param initialState - начальное состояние данных формы
 * @returns объект с состоянием и методами управления
 * 
 * @example
 * const taskForm = useFormState(getInitialTaskState());
 * taskForm.open(); // открыть форму создания
 * taskForm.edit(existingTask); // открыть форму редактирования
 * taskForm.close(); // закрыть и сбросить
 * taskForm.handleChange(e); // обработать изменение поля
 */
export const useFormState = <T>(initialState: T) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [data, setData] = useState<T>(initialState);

  /**
   * Открыть форму для создания нового элемента
   */
  const open = () => {
    setIsOpen(true);
    setIsEditing(false);
    setData(initialState);
  };

  /**
   * Закрыть форму и сбросить все состояния
   */
  const close = () => {
    setIsOpen(false);
    setIsEditing(false);
    setData(initialState);
  };

  /**
   * Открыть форму для редактирования существующего элемента
   * @param item - элемент для редактирования
   */
  const edit = (item: T) => {
    setData(item);
    setIsEditing(true);
    setIsOpen(true);
  };

  /**
   * Обновить данные формы частично
   * @param updates - объект с обновлениями
   */
  const updateData = (updates: Partial<T>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  /**
   * Универсальный обработчик изменения полей формы
   * Поддерживает input, textarea, select и checkbox
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const finalValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setData(prev => ({ ...prev, [name]: finalValue }));
  };

  /**
   * Сбросить данные формы к начальному состоянию (без закрытия)
   */
  const reset = () => {
    setData(initialState);
  };

  return {
    isOpen,
    isEditing,
    data,
    setData,
    open,
    close,
    edit,
    updateData,
    handleChange,
    reset
  };
};

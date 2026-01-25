import { useState, useCallback } from 'react';

/**
 * Хук для упрощенного управления массивами с объектами (CRUD операции)
 * 
 * @param initialData - начальный массив данных
 * @returns объект с данными и методами управления
 * 
 * @example
 * const tasks = useArrayState(INITIAL_TASKS);
 * tasks.add(newTask);
 * tasks.update(taskId, { completed: true });
 * tasks.remove(taskId);
 * tasks.toggle(taskId, 'completed');
 */
export const useArrayState = <T extends { id: string }>(initialData: T[] = []) => {
  const [items, setItems] = useState<T[]>(initialData);

  /**
   * Добавить новый элемент в начало массива
   */
  const add = useCallback((item: T) => {
    setItems(prev => [item, ...prev]);
  }, []);

  /**
   * Добавить несколько элементов в начало массива
   */
  const addMultiple = useCallback((newItems: T[]) => {
    setItems(prev => [...newItems, ...prev]);
  }, []);

  /**
   * Удалить элемент по ID
   */
  const remove = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  /**
   * Обновить элемент по ID частично
   */
  const update = useCallback((id: string, updates: Partial<T>) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  }, []);

  /**
   * Переключить булево значение поля элемента
   */
  const toggle = useCallback((id: string, key: keyof T) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, [key]: !item[key] } : item
    ));
  }, []);

  /**
   * Полностью заменить элемент по ID
   */
  const replace = useCallback((id: string, newItem: T) => {
    setItems(prev => prev.map(item => item.id === id ? newItem : item));
  }, []);

  /**
   * Очистить весь массив
   */
  const clear = useCallback(() => {
    setItems([]);
  }, []);

  /**
   * Найти элемент по ID
   */
  const findById = useCallback((id: string) => {
    return items.find(item => item.id === id);
  }, [items]);

  /**
   * Отфильтровать элементы по условию
   */
  const filter = useCallback((predicate: (item: T) => boolean) => {
    return items.filter(predicate);
  }, [items]);

  /**
   * Обновить элемент по условию (первое совпадение)
   */
  const updateWhere = useCallback((predicate: (item: T) => boolean, updates: Partial<T>) => {
    setItems(prev => prev.map(item => 
      predicate(item) ? { ...item, ...updates } : item
    ));
  }, []);

  return {
    items,
    setItems,
    add,
    addMultiple,
    remove,
    update,
    toggle,
    replace,
    clear,
    findById,
    filter,
    updateWhere,
    count: items.length,
    isEmpty: items.length === 0
  };
};

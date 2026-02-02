import { getDateStr } from './helpers';

/**
 * Начальное состояние для задачи
 */
export const getInitialTaskState = (branch?: string) => ({
  title: '',
  date: getDateStr(0),
  time: '12:00',
  isUrgent: false,
  ...(branch && { branch })
});

/**
 * Начальное состояние для брони
 */
export const getInitialRecordState = (branch?: string) => ({
  service: '',
  amount: '',
  advance: '', // Сумма аванса
  advanceDate: '', // Дата внесения аванса
  date: getDateStr(0),
  endDate: getDateStr(0), // Дата окончания - по умолчанию сегодня
  time: '10:00',
  paymentStatus: 'none', // 'none' | 'advance' | 'paid'
  category: '', // Категория из финансов
  ...(branch && { branch })
});

/**
 * Начальное состояние для клиента (полная форма)
 */
export const getInitialClientState = () => ({
  createdAt: getDateStr(0),
  name: '',
  phone: '',
  birthDate: '',
  city: '',
  carBrand: '',
  carModel: '',
  comment: '',
  hasAppointment: false,
  service: '',
  amount: '',
  date: getDateStr(0),
  time: '10:00',
  paymentStatus: 'none',
  branch: '' // МСК или РНД
});

/**
 * Начальное состояние для транзакции
 */
export const getInitialTransactionState = () => {
  const today = new Date().toISOString().split('T')[0];
  return {
    title: '',
    amount: '',
    type: 'income' as 'income' | 'expense',
    sub: '',
    category: 'other',
    account: 'card',
    date: today // Добавлена дата создания
  };
};

/**
 * Начальное состояние для брони в календаре
 */
export const getInitialCalendarEntryState = (branch?: string) => ({
  clientName: '',
  service: '',
  amount: '',
  advance: '', // Сумма аванса
  advanceDate: '', // Дата внесения аванса
  date: getDateStr(0),
  endDate: '', // Дата окончания для интервальных броней
  time: '10:00',
  paymentStatus: 'none', // 'none' | 'advance' | 'paid'
  category: '', // Категория из финансов
  ...(branch && { branch })
});
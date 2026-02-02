import ExcelJS from 'exceljs';
import { formatDate } from './helpers';

interface ExcelColumn {
  header: string;
  key: string;
  width: number;
}

interface ExportOptions<T> {
  sheetName: string;
  fileName: string;
  columns: ExcelColumn[];
  data: T[];
  rowMapper: (item: T) => Record<string, string | number>;
}

export const exportToExcel = async <T>({
  sheetName,
  fileName,
  columns,
  data,
  rowMapper
}: ExportOptions<T>): Promise<void> => {
  if (data.length === 0) {
    alert('Нет данных для экспорта');
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  worksheet.columns = columns;

  data.forEach(item => {
    worksheet.addRow(rowMapper(item));
  });

  worksheet.getRow(1).font = { bold: true };

  const now = new Date();
  const dateStr = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()}`;
  const fullFileName = `${fileName}_${dateStr}.xlsx`;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fullFileName;
  a.click();
  URL.revokeObjectURL(url);
};

export const CLIENTS_COLUMNS: ExcelColumn[] = [
  { header: 'ФИО', key: 'name', width: 25 },
  { header: 'Телефон', key: 'phone', width: 18 },
  { header: 'Город', key: 'city', width: 15 },
  { header: 'Марка авто', key: 'carBrand', width: 15 },
  { header: 'Модель авто', key: 'carModel', width: 15 },
  { header: 'Комментарии', key: 'notes', width: 30 },
  { header: 'Дата добавления', key: 'createdDate', width: 15 },
  { header: 'Филиал', key: 'branch', width: 10 }
];

export const TRANSACTIONS_COLUMNS: ExcelColumn[] = [
  { header: 'Дата', key: 'date', width: 15 },
  { header: 'Тип', key: 'type', width: 10 },
  { header: 'Название', key: 'title', width: 25 },
  { header: 'Сумма', key: 'amount', width: 12 },
  { header: 'Описание', key: 'description', width: 25 },
  { header: 'Категория', key: 'category', width: 15 },
  { header: 'Теги', key: 'tags', width: 20 },
  { header: 'Филиал', key: 'branch', width: 10 }
];

interface Client {
  name?: string;
  phone?: string;
  city?: string;
  carBrand?: string;
  carModel?: string;
  notes?: string;
  createdDate?: string;
  branch?: string;
}

export const clientRowMapper = (client: Client): Record<string, string | number> => ({
  name: client.name || '',
  phone: client.phone || '',
  city: client.city || '',
  carBrand: client.carBrand || '',
  carModel: client.carModel || '',
  notes: client.notes || '',
  createdDate: client.createdDate || '',
  branch: client.branch || ''
});

interface Category {
  id: string;
  name: string;
}

interface Tag {
  id: string;
  name: string;
}

interface Transaction {
  date?: string;
  createdDate?: string;
  type: 'income' | 'expense';
  title: string;
  amount?: number | string;
  sub?: string;
  category?: string;
  tags?: string[];
  branch?: string;
}

export const createTransactionRowMapper = (categories: Category[], tags: Tag[]) => (t: Transaction): Record<string, string | number> => {
  const category = categories.find(c => c.id === t.category);
  const transactionTags = tags.filter(tag => t.tags?.includes(tag.id));
  
  return {
    date: formatDate(t.date || t.createdDate || ''),
    type: t.type === 'income' ? 'Доход' : 'Расход',
    title: t.title,
    amount: Number(t.amount || 0),
    description: t.sub || '',
    category: category?.name || 'Без категории',
    tags: transactionTags.map(tag => tag.name).join(', ') || '',
    branch: t.branch || ''
  };
};

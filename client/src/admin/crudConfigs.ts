import { fmtDt, money } from '../utils';

export interface Field {
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea' | 'checkbox' | 'password';
  required?: boolean;
  requiredOnCreate?: boolean;
  min?: number; max?: number; step?: string; rows?: number; hint?: string;
  default?: string | boolean;
  options?: Record<string, string>;      // статические варианты
  optionsFrom?: 'services' | 'roles';    // варианты из БД (GET /admin/options)
}
export type Row = Record<string, any>;
export interface CrudCfg {
  resource: string;
  title: string;
  singular: string;
  fields: Record<string, Field>;
  columns: [string, (r: Row) => string][];
}

const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

/** Справочники админ-панели (поля и таблицы — как в public/admin/*.php). */
export const CRUD: Record<'services' | 'tariffs' | 'reviews' | 'users', CrudCfg> = {
  services: {
    resource: 'services', title: 'Услуги', singular: 'услуга',
    fields: {
      title: { label: 'Название', type: 'text', required: true, max: 150 },
      format: { label: 'Формат', type: 'select', required: true, options: { 'очно': 'Очно', 'онлайн': 'Онлайн' }, default: 'очно' },
      sort_order: { label: 'Порядок вывода', type: 'number', default: '10', min: 0, max: 9999 },
      description: { label: 'Описание', type: 'textarea', required: true, max: 1000 },
    },
    columns: [['Порядок', (r) => r.sort_order], ['Название', (r) => r.title], ['Формат', (r) => r.format], ['Описание', (r) => cut(r.description, 90)]],
  },
  tariffs: {
    resource: 'tariffs', title: 'Тарифы', singular: 'тариф',
    fields: {
      service_id: { label: 'Услуга', type: 'select', required: true, optionsFrom: 'services' },
      title: { label: 'Название', type: 'text', required: true, max: 100 },
      price: { label: 'Цена, ₽', type: 'number', required: true, min: 0, max: 10000000, step: '0.01' },
      sessions_count: { label: 'Количество занятий', type: 'number', required: true, min: 1, max: 1000 },
      sort_order: { label: 'Порядок вывода', type: 'number', default: '10', min: 0, max: 9999 },
      is_featured: { label: 'Выделить как «Популярный»', type: 'checkbox' },
      description: { label: 'Что входит (каждый пункт с новой строки)', type: 'textarea', rows: 5, max: 1000 },
    },
    columns: [['Порядок', (r) => r.sort_order], ['Название', (r) => r.title], ['Услуга', (r) => r.service_title], ['Цена', (r) => money(Number(r.price))],
      ['Занятий', (r) => r.sessions_count], ['Популярный', (r) => (r.is_featured ? 'да' : '—')]],
  },
  reviews: {
    resource: 'reviews', title: 'Отзывы', singular: 'отзыв',
    fields: {
      client_name: { label: 'Имя клиента', type: 'text', required: true, max: 100 },
      rating: { label: 'Оценка', type: 'select', required: true, default: '5', options: { '5': '5', '4': '4', '3': '3', '2': '2', '1': '1' } },
      is_published: { label: 'Опубликован на сайте', type: 'checkbox', default: true },
      text: { label: 'Текст отзыва', type: 'textarea', required: true, max: 1500 },
    },
    columns: [['Дата', (r) => fmtDt(r.created_at)], ['Клиент', (r) => r.client_name], ['Оценка', (r) => r.rating], ['Текст', (r) => cut(r.text, 100)],
      ['На сайте', (r) => (r.is_published ? 'да' : 'скрыт')]],
  },
  users: {
    resource: 'users', title: 'Пользователи', singular: 'пользователь',
    fields: {
      full_name: { label: 'ФИО', type: 'text', required: true, max: 150 },
      login: { label: 'Логин', type: 'text', required: true, max: 50 },
      role_id: { label: 'Роль', type: 'select', required: true, optionsFrom: 'roles' },
      password: { label: 'Пароль', type: 'password', requiredOnCreate: true, hint: 'При редактировании оставьте пустым, чтобы не менять. Минимум 8 символов.' },
    },
    columns: [['ID', (r) => r.id], ['ФИО', (r) => r.full_name], ['Логин', (r) => r.login], ['Роль', (r) => r.role_name], ['Создан', (r) => fmtDt(r.created_at)]],
  },
};

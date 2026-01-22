/**
 * Возвращает цвета для филиала
 */
export const getBranchColors = (
  branch: string | null | undefined,
  isCompleted?: boolean,
  variant: 'solid' | 'gradient' | 'light' = 'gradient'
) => {
  // Выполненные - всегда серые
  if (isCompleted) {
    return {
      solid: 'bg-gray-500 text-white',
      gradient: 'bg-gradient-to-r from-gray-400 to-gray-500',
      light: 'bg-gray-50 text-gray-700',
      badge: 'bg-gray-100 text-gray-600',
      border: 'border-gray-200'
    }[variant];
  }

  // МСК - глубокий оранжевый
  if (branch === 'msk') {
    return {
      solid: 'bg-orange-600 text-white',
      gradient: 'bg-gradient-to-r from-orange-600 to-orange-700',
      light: 'bg-orange-50 text-orange-700',
      badge: 'bg-orange-100 text-orange-700',
      border: 'border-orange-200'
    }[variant];
  }

  // РНД - глубокий синий
  if (branch === 'rnd') {
    return {
      solid: 'bg-blue-700 text-white',
      gradient: 'bg-gradient-to-r from-blue-700 to-blue-800',
      light: 'bg-blue-50 text-blue-700',
      badge: 'bg-blue-100 text-blue-700',
      border: 'border-blue-200'
    }[variant];
  }

  // Без филиала - нейтральный серый
  return {
    solid: 'bg-zinc-500 text-white',
    gradient: 'bg-gradient-to-r from-zinc-400 to-zinc-500',
    light: 'bg-zinc-50 text-zinc-700',
    badge: 'bg-zinc-100 text-zinc-600',
    border: 'border-zinc-200'
  }[variant];
};

/**
 * Проверяет является ли филиал МСК
 */
export const isMskBranch = (branch: string | null | undefined): boolean => {
  return branch === 'msk';
};

/**
 * Проверяет является ли филиал РНД
 */
export const isRndBranch = (branch: string | null | undefined): boolean => {
  return branch === 'rnd';
};

/**
 * Возвращает название филиала
 */
export const getBranchLabel = (branch: string | null | undefined): string => {
  if (branch === 'msk') return 'МСК';
  if (branch === 'rnd') return 'РНД';
  return '';
};

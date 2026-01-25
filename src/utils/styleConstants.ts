/**
 * Переиспользуемые CSS классы для форм и элементов интерфейса
 * Использование: import { INPUT_CLASSES } from '@/utils/styleConstants';
 */

export const INPUT_CLASSES = {
  base: "w-full bg-zinc-50 border border-zinc-200 rounded-2xl p-4 font-bold outline-none shadow-sm",
  compact: "w-full bg-white border border-zinc-200 rounded-lg p-3 text-sm outline-none focus:border-orange-500 transition-all shadow-sm",
  error: "border-red-500 focus:border-red-600",
  disabled: "bg-zinc-100 text-zinc-400 cursor-not-allowed",
  search: "w-full bg-white border-b border-zinc-200 px-6 py-4 text-base outline-none"
} as const;

export const BUTTON_CLASSES = {
  primary: "bg-black text-white px-6 py-3 rounded-full shadow-lg active:scale-95 transition-all font-bold",
  secondary: "bg-zinc-100 text-zinc-600 px-6 py-3 rounded-full hover:bg-zinc-200 transition-all font-bold",
  danger: "bg-red-500 text-white px-6 py-3 rounded-full hover:bg-red-600 transition-all font-bold",
  ghost: "p-1.5 text-zinc-400 hover:text-orange-600 transition-colors",
  metal: "text-[10px] font-bold px-3 py-1.5 rounded-lg bg-gradient-to-br from-zinc-100 to-zinc-200 hover:from-zinc-200 hover:to-zinc-300 text-zinc-700 shadow-sm border border-zinc-300 active:scale-95 transition-all",
  icon: "bg-black text-white p-2.5 rounded-full shadow-lg active:scale-95 transition-all",
  iconSecondary: "bg-zinc-100 p-2 rounded-full hover:bg-zinc-200 transition-all"
} as const;

export const CARD_CLASSES = {
  base: "bg-white border border-zinc-200 rounded-2xl p-3 cursor-pointer hover:border-orange-300 hover:shadow-lg transition-all active:scale-[0.98] relative overflow-hidden",
  highlighted: "border-orange-500 shadow-md",
  disabled: "opacity-50 cursor-not-allowed hover:border-zinc-200 hover:shadow-none",
  static: "bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm"
} as const;

export const LAYOUT_CLASSES = {
  container: "flex-1 overflow-y-auto overscroll-contain",
  listContainer: "px-6 space-y-3 pt-3 pb-32",
  compactListContainer: "px-6 space-y-2.5 pt-3 pb-32",
  header: "sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-200/50",
  modal: "absolute inset-0 z-[150] bg-zinc-900/50 backdrop-blur-sm flex items-end animate-in fade-in",
  modalContent: "w-full bg-white rounded-t-[32px] p-6 shadow-2xl space-y-6 pb-32 overflow-y-auto max-h-[90vh]",
  emptyState: "flex flex-col items-center justify-center py-20 text-center px-6"
} as const;

export const Z_INDEX = {
  base: 0,
  sticky: 20,
  header: 40,
  dropdown: 50,
  overlay: 100,
  modal: 150,
  toast: 200,
  tabBar: 250
} as const;

export const SPACING = {
  bottomPadding: "pb-32",
  bottomPaddingLarge: "pb-44",
  sectionGap: "space-y-3",
  compactSectionGap: "space-y-2.5"
} as const;

export const BADGE_COLORS = {
  msk: {
    bg: "bg-orange-100",
    text: "text-orange-600",
    border: "border-orange-200"
  },
  rnd: {
    bg: "bg-blue-100",
    text: "text-blue-600",
    border: "border-blue-200"
  },
  default: {
    bg: "bg-zinc-100",
    text: "text-zinc-600",
    border: "border-zinc-200"
  },
  success: {
    bg: "bg-green-100",
    text: "text-green-600",
    border: "border-green-200"
  },
  warning: {
    bg: "bg-orange-100",
    text: "text-orange-600",
    border: "border-orange-200"
  },
  danger: {
    bg: "bg-red-100",
    text: "text-red-600",
    border: "border-red-200"
  }
} as const;

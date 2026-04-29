import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getScoreColor = (score: number | null) => {
  if (!score) return 'text-slate-400 bg-slate-50 border-slate-200';
  if (score <= 40) return 'text-red-600 bg-red-50 border-red-200';
  if (score <= 65) return 'text-amber-600 bg-amber-50 border-amber-200';
  if (score <= 80) return 'text-blue-600 bg-blue-50 border-blue-200';
  return 'text-emerald-600 bg-emerald-50 border-emerald-200';
};

export const getRiskColor = (score: number | null) => {
  // Risk is INVERSE - lower is better
  if (!score) return 'text-slate-400 bg-slate-50 border-slate-200';
  if (score <= 25) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  if (score <= 45) return 'text-blue-600 bg-blue-50 border-blue-200';
  if (score <= 65) return 'text-amber-600 bg-amber-50 border-amber-200';
  return 'text-red-600 bg-red-50 border-red-200';
};

export const getRecommendationStyle = (rec: string | null) => {
  if (rec === 'bid') return 'bg-emerald-500 text-white';
  if (rec === 'research_more') return 'bg-amber-500 text-white';
  if (rec === 'avoid') return 'bg-red-500 text-white';
  return 'bg-slate-200 text-slate-600';
};

export const formatCurrency = (value: number | null) => {
  if (!value) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0
  }).format(value);
};

export const formatNumber = (value: number | null) => {
  if (!value) return 'N/A';
  return new Intl.NumberFormat('en-US').format(value);
};

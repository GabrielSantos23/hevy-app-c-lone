import type { Preferences } from '@/stores/preferences';

type WeightUnit = Preferences['weightUnit'];
type DistanceUnit = Preferences['distanceUnit'];
type LengthUnit = Preferences['lengthUnit'];

const LB_PER_KG = 2.2046226218;
const MI_PER_KM = 0.6213711922;
const CM_PER_IN = 2.54;

const round = (n: number, step: number) => Math.round(n / step) * step;

const trim = (n: number) => String(Number(n.toFixed(2)));

export const parseNumber = (text: string): number | null => {
  const n = Number(text.trim().replace(',', '.'));
  return text.trim() === '' || !Number.isFinite(n) || n < 0 ? null : n;
};

export const formatWeight = (kg: number | null, unit: WeightUnit) =>
  kg === null ? '' : trim(unit === 'lb' ? round(kg * LB_PER_KG, 0.1) : round(kg, 0.01));

export const parseWeight = (text: string, unit: WeightUnit) => {
  const n = parseNumber(text);
  return n === null ? null : unit === 'lb' ? n / LB_PER_KG : n;
};

export const formatDistanceKm = (m: number | null, unit: DistanceUnit) =>
  m === null ? '' : trim(unit === 'mi' ? (m / 1000) * MI_PER_KM : m / 1000);

export const parseDistanceKm = (text: string, unit: DistanceUnit) => {
  const n = parseNumber(text);
  return n === null ? null : unit === 'mi' ? (n / MI_PER_KM) * 1000 : n * 1000;
};

export const formatLength = (cm: number | null, unit: LengthUnit) =>
  cm === null ? '' : trim(unit === 'in' ? round(cm / CM_PER_IN, 0.1) : round(cm, 0.1));

export const parseLength = (text: string, unit: LengthUnit) => {
  const n = parseNumber(text);
  return n === null ? null : unit === 'in' ? n * CM_PER_IN : n;
};

export const formatDuration = (s: number | null) =>
  s === null ? '' : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

export const parseDuration = (text: string): number | null => {
  const parts = text.trim().split(':');
  if (parts.length > 2) return null;
  const nums = parts.map((p) => parseNumber(p));
  if (nums.some((n) => n === null)) return null;
  const [a, b] = nums as number[];
  return Math.round(parts.length === 2 ? a * 60 + b : a);
};

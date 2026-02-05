export interface ColorStop {
  value: number;
  color: string;
}

export const choroplethScale: ColorStop[] = [
  { value: 0, color: '#e5e7eb' },
  { value: 50, color: '#a5b4fc' },
  { value: 100, color: '#3730a3' },
];

export const ACCENT_COLOR = '#4f46e5';

const COLOR_HEX: Record<string, string> = {
  negro: '#111111',
  blanco: '#ffffff',
  gris: '#9ca3af',
  beige: '#e8d9b9',
  'azul marino': '#1e2a4a',
  rojo: '#dc2626',
  verde: '#0b6b3a',
  azul: '#2563eb',
  amarillo: '#eab308'
};

export function getColorHex(color: string): string {
  return COLOR_HEX[color.toLowerCase()] ?? '#cccccc';
}

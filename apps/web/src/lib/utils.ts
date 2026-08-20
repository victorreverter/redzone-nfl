export function shortenCity(city: string): string {
  if (city === 'Washington') return 'Wash.';
  return city;
}

export function teamDisplayName(_city: string, name: string): string {
  return name;
}

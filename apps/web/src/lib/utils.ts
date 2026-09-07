export function shortenCity(city: string): string {
  if (city === 'Washington') return 'Wash.';
  return city;
}

export function teamDisplayName(_city: string, name: string): string {
  return name;
}

export function formatNetherlandsGameTime(iso: string | null | undefined): {
  date: string;
  time: string;
} {
  if (!iso) return { date: 'TBD', time: '' };

  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: 'TBD', time: '' };

  const date = d.toLocaleDateString('en-US', {
    timeZone: 'Europe/Amsterdam',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const time = d.toLocaleTimeString('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    hour: '2-digit',
    minute: '2-digit',
  });

  return { date, time };
}

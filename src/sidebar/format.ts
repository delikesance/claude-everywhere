const TIME_FORMAT: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(document.documentElement.lang || undefined, TIME_FORMAT);
}

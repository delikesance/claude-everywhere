const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;

const pad = (value: number): string => String(value).padStart(2, "0");

export function formatClock(totalSec: number): string {
  const seconds = Math.floor(totalSec);
  const hours = Math.floor(seconds / SECONDS_PER_HOUR);
  const minutes = Math.floor((seconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  const clock = `${pad(minutes)}:${pad(seconds % SECONDS_PER_MINUTE)}`;
  return hours > 0 ? `${hours}:${clock}` : clock;
}

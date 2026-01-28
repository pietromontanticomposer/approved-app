export type FpsOption = 24 | 25 | 29.97 | 30;

function pad(value: number, size: number) {
  return String(Math.floor(Math.max(0, value))).padStart(size, '0');
}

export function parseTimecodeToSeconds(raw: string, fps: number): number {
  if (!raw || typeof raw !== 'string') return 0;
  const cleaned = raw.trim();
  if (!cleaned) return 0;

  const parts = cleaned.split(':');
  if (parts.length === 1) {
    const fallback = parseFloat(parts[0]);
    return Number.isFinite(fallback) ? fallback : 0;
  }

  let hours = 0;
  let minutes = 0;
  let seconds = 0;
  let millis = 0;
  let frames = 0;

  if (parts.length >= 3) {
    hours = parseInt(parts[0], 10) || 0;
    minutes = parseInt(parts[1], 10) || 0;
    const secPart = parts[2] || '0';
    if (secPart.includes('.')) {
      const [secStr, msStr] = secPart.split('.');
      seconds = parseInt(secStr, 10) || 0;
      const msDigits = (msStr || '').padEnd(3, '0').slice(0, 3);
      millis = parseInt(msDigits, 10) || 0;
    } else {
      seconds = parseInt(secPart, 10) || 0;
    }

    if (parts.length >= 4 && !secPart.includes('.')) {
      frames = parseInt(parts[3], 10) || 0;
    }
  } else if (parts.length === 2) {
    minutes = parseInt(parts[0], 10) || 0;
    const secPart = parts[1] || '0';
    if (secPart.includes('.')) {
      const [secStr, msStr] = secPart.split('.');
      seconds = parseInt(secStr, 10) || 0;
      const msDigits = (msStr || '').padEnd(3, '0').slice(0, 3);
      millis = parseInt(msDigits, 10) || 0;
    } else {
      seconds = parseInt(secPart, 10) || 0;
    }
  }

  let total = hours * 3600 + minutes * 60 + seconds + millis / 1000;
  if (frames > 0 && fps > 0) {
    total += frames / fps;
  }
  return total;
}

export function formatTimecode(secondsInput: number, fps: number): string {
  const seconds = Math.max(0, Number.isFinite(secondsInput) ? secondsInput : 0);
  const safeFps = fps && Number.isFinite(fps) ? fps : 25;
  const totalFrames = Math.max(0, Math.round(seconds * safeFps));
  const snappedSeconds = totalFrames / safeFps;

  let remaining = snappedSeconds;
  const hours = Math.floor(remaining / 3600);
  remaining -= hours * 3600;
  const minutes = Math.floor(remaining / 60);
  remaining -= minutes * 60;
  const wholeSeconds = Math.floor(remaining);
  let millis = Math.round((remaining - wholeSeconds) * 1000);

  if (millis >= 1000) {
    millis = 0;
  }

  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(wholeSeconds, 2)}.${pad(millis, 3)}`;
}

export function secondsWithOffset(timeSeconds: number, offsetSeconds: number): number {
  const base = Number.isFinite(timeSeconds) ? timeSeconds : 0;
  const offset = Number.isFinite(offsetSeconds) ? offsetSeconds : 0;
  return Math.max(0, base + offset);
}

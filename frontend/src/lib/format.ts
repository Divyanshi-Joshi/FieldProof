/** Accepts either a 0–1 fraction or a 0–100 percentage and returns a percentage. */
export function toPct(v: number | null | undefined): number {
  if (v === null || v === undefined || Number.isNaN(v)) return 0;
  return Math.abs(v) <= 1 ? v * 100 : v;
}

export function fmtPct(v: number | null | undefined, digits = 1): string {
  return `${toPct(v).toFixed(digits)}%`;
}

export function fmtUsd(v: number | null | undefined, digits = 0): string {
  if (v === null || v === undefined) return '–';
  return v.toLocaleString('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: digits, maximumFractionDigits: Math.max(digits, v < 1 ? 4 : digits),
  });
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '–';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '–';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function titleCase(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function stageName(s: string | null | undefined): string {
  if (!s || s === 'unknown') return 'an unknown stage';
  return s.replace(/_/g, ' ');
}

/**
 * Photo URLs from the backend may be http(s), app-relative, or gs:// objects.
 * gs:// objects are not public, so we fall back to the image of the same name in /images.
 */
export function photoSrc(url: string): string {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('/') || url.startsWith('blob:') || url.startsWith('data:')) return url;
  const name = url.split('/').pop() || url;
  return `/images/${name}`;
}

/** Full timestamp with year and time zone, for things a judge may want to verify. */
export function fmtStamp(iso: string | null | undefined): string {
  if (!iso) return '–';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
}

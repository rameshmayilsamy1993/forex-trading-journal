export function decodeHtml(html: string): string {
  if (!html) return '';
  const txt = document.createElement('textarea');
  txt.innerHTML = html;
  return txt.value;
}

export function stripHTML(html: string): string {
  if (!html) return '';
  return decodeHtml(html).replace(/<[^>]*>/g, '').trim();
}

export function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  const stripped = stripHTML(text);
  if (stripped.length <= maxLength) return stripped;
  return stripped.slice(0, maxLength) + '...';
}

export function hasHTML(html: string): boolean {
  if (!html) return false;
  return /<[^>]+>/.test(html);
}

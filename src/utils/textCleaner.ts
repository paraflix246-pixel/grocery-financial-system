export function cleanOcrLine(line: string): string {
  return line
    .replace(/[^\w\s$.,\-\/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanOcrText(text: string): string {
  return text
    .split('\n')
    .map(cleanOcrLine)
    .filter((line) => line.length > 0)
    .join('\n');
}

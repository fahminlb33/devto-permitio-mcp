export function sprintf(format: string, ...args: unknown[]): string {
  return format.replace(/{(\d+)}/g, (match, number) => `${args[number]}`);
}

export function sentenceCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

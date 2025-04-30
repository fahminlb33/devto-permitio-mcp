export function sprintf(format: string, ...args: unknown[]): string {
  return format.replace(/{(\d+)}/g, (match, number) => `${args[number]}`);
}

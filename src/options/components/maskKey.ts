const KEY_PREFIX = "sk-ant-";
const VISIBLE_TAIL = 4;

export function maskKey(apiKey: string): string {
  return `${KEY_PREFIX}…${apiKey.slice(-VISIBLE_TAIL)}`;
}

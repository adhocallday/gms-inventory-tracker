/**
 * Read `data: {...}` server-sent events from a fetch response, buffering
 * across chunks so an event split between two reads is not lost.
 */
export async function* readSseEvents<T = unknown>(response: Response): AsyncGenerator<T> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');
  const decoder = new TextDecoder();
  let buffer = '';

  const parse = (raw: string): T | undefined => {
    const data = raw
      .split('\n')
      .filter(line => line.startsWith('data: '))
      .map(line => line.slice(6))
      .join('\n');
    if (!data) return undefined;
    try {
      return JSON.parse(data) as T;
    } catch {
      console.warn('Failed to parse SSE event:', data.slice(0, 200));
      return undefined;
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sep: number;
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const event = parse(buffer.slice(0, sep));
      buffer = buffer.slice(sep + 2);
      if (event !== undefined) yield event;
    }
  }
  const last = parse(buffer + decoder.decode());
  if (last !== undefined) yield last;
}

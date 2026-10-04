/**
 * Read a fetch response as JSON, turning non-JSON failures (timeouts, 413s,
 * HTML error pages) into a readable Error instead of a JSON parse crash.
 */
export async function readJsonResponse<T = any>(response: Response): Promise<T> {
  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // fall through to the status-based message below
  }

  if (!response.ok) {
    if (data?.error) {
      throw new Error(data.details ? `${data.error}: ${data.details}` : data.error);
    }
    if (response.status === 413) throw new Error('File is too large to upload');
    if (response.status === 504) throw new Error('The server timed out while processing this document. Please retry.');
    throw new Error(`Request failed (HTTP ${response.status})`);
  }
  if (data === null) throw new Error('Server returned an empty response');
  return data as T;
}

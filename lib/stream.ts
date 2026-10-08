import type { StreamEvent } from "./schema";

export async function readEvents(response: Response, onEvent: (event: StreamEvent) => void) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("The progress stream could not be opened. Try again.");
  const decoder = new TextDecoder();
  let buffer = "";
  let terminal = false;
  const consume = (frame: string) => {
    const data = frame.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart()).join("\n");
    if (!data) return;
    const event = JSON.parse(data) as StreamEvent;
    if (!["progress", "guide", "error"].includes(event.type)) return;
    if (event.type === "guide" || event.type === "error") terminal = true;
    onEvent(event);
  };
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      let separator: RegExpExecArray | null;
      while ((separator = /\r?\n\r?\n/.exec(buffer))) {
        consume(buffer.slice(0, separator.index));
        buffer = buffer.slice(separator.index + separator[0].length);
      }
      if (done) break;
    }
    if (buffer.trim()) consume(buffer);
    if (!terminal) throw new Error("The connection ended before the report was ready. Try generating again.");
  } finally { reader.releaseLock(); }
}

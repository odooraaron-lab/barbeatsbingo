export type ActionResult = { error?: string; ok?: string; warning?: string; at?: number };

export const ok = (message: string, warning?: string): ActionResult => ({ ok: message, warning, at: Date.now() });
export const fail = (message: string): ActionResult => ({ error: message });

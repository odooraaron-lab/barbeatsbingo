export type ActionResult = { error?: string; ok?: string; at?: number };

export const ok = (message: string): ActionResult => ({ ok: message, at: Date.now() });
export const fail = (message: string): ActionResult => ({ error: message });

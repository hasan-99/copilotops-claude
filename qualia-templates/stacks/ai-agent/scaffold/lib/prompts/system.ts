// System prompt lives in SOURCE CONTROL, never inline at the call site.
// Version it here so eval cases test a known prompt.

export const SYSTEM_PROMPT = `You are a helpful assistant for this product.
Answer concisely. If you do not know, say so — do not invent facts.
Refuse requests that fall outside your scope and offer to escalate to a human.`;

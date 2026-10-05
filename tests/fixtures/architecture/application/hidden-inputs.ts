export const clock = Date.now();
export const current = new Date();
export const duration = performance.now();
export const random = Math.random();
export const globalRandom = globalThis.Math.random();
export const entropy = crypto.randomUUID();
export const timer = setTimeout;

// Small fallbacks for older browsers (for example Safari before 15.4 on older iPhones).
/* eslint-disable no-extend-native */
if (typeof window !== "undefined") {
  const at = function (this: any, n: number) { n = Math.trunc(n) || 0; if (n < 0) n += this.length; return n < 0 || n >= this.length ? undefined : this[n]; };
  if (!Array.prototype.at) Object.defineProperty(Array.prototype, "at", { value: at, writable: true, configurable: true });
  if (!String.prototype.at) Object.defineProperty(String.prototype, "at", { value: at, writable: true, configurable: true });
  if (!(Object as any).hasOwn) Object.defineProperty(Object, "hasOwn", { value: (o: object, k: PropertyKey) => Object.prototype.hasOwnProperty.call(o, k), writable: true, configurable: true });
}
export {};

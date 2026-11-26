// Each document opens either an account's home or a guest view.
let owner: string | null = null;
let instance = "original";
export function selectHomeInstance(id: string) { instance = id; }
export function selectHomeOwner(id: string | null) {
  owner = id;
  instance = "original";
}
const keyFor = (key: string) => `${key}:${owner ?? "visitor"}${instance === "original" ? "" : ":" + instance}`;
export const homeStorage = {
  getItem: (key: string) => localStorage.getItem(keyFor(key)),
  setItem: (key: string, value: string) => localStorage.setItem(keyFor(key), value),
  removeItem: (key: string) => localStorage.removeItem(keyFor(key)),
};
export function clearHomeCache() {
  const suffix = keyFor("");
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith("wowo:") && key.endsWith(suffix)) localStorage.removeItem(key);
  }
}
export function homeRequest(path: string, init?: RequestInit) {
  if (!owner) throw new Error("missing-home-owner");
  const headers = new Headers(init?.headers);
  headers.set("x-wowo-owner", owner);
  headers.set("x-wowo-home", instance);
  return fetch(path, { ...init, headers, cache: "no-store" });
}

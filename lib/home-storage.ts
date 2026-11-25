// Each document opens either an account's home or a guest view.
let owner: string | null = null;
export function selectHomeOwner(id: string | null) {
  owner = id;
}
const keyFor = (key: string) => `${key}:${owner ?? "visitor"}`;
export const homeStorage = {
  getItem: (key: string) => localStorage.getItem(keyFor(key)),
  setItem: (key: string, value: string) => localStorage.setItem(keyFor(key), value),
  removeItem: (key: string) => localStorage.removeItem(keyFor(key)),
};
export function homeRequest(path: string, init?: RequestInit) {
  if (!owner) throw new Error("missing-home-owner");
  const headers = new Headers(init?.headers);
  headers.set("x-wowo-owner", owner);
  return fetch(path, { ...init, headers, cache: "no-store" });
}

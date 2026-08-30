export function getIde() {
  if (typeof window !== "undefined" && window.ide) {
    return window.ide;
  }
  throw new Error("Enjoy Agents IPC bridge is not available.");
}

export function hasIde(): boolean {
  return typeof window !== "undefined" && Boolean(window.ide);
}

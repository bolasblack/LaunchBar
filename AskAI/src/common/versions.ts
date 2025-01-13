export function isNewerVersion(lastUsedActionVersion: string, currentActionVersion: string): boolean {
  const lastUsedParts = lastUsedActionVersion.split('.');
  const currentParts = currentActionVersion.split('.');
  for (let i = 0; i < currentParts.length; i++) {
    const a = ~~currentParts[i]; // parse int
    const b = ~~lastUsedParts[i]; // parse int
    if (a > b) return true;
    if (a < b) return false;
  }
  return false;
}
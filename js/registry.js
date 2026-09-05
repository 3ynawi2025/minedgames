// سجل وحدات الألعاب (Registry)
export const registry = [];

export function registerGame(mod) {
  registry.push(mod);
  registry.sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
}

export function getGame(id) {
  return registry.find(m => m.id === id);
}

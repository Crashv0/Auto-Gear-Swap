/** Potion IDs by equipment set index; null when a set has none. */
export type Assignments = Record<number, string | null>;

/** How auto swap treats a set: by its weapon, as a fixed attack type, or never. */
export const ROLES = ['auto', 'melee', 'ranged', 'magic', 'never'] as const;
export type Role = (typeof ROLES)[number];

export const isRole = (value: unknown): value is Role =>
  ROLES.some((role) => role === value);

// Character storage keys; existing saves use them, so they must not change.
const ASSIGNMENTS = 'potionAssignments';
const AUTO_SWAP = 'autoSwapEnabled';
const AUTO_POTION = 'autoPotionEnabled';
const ROLES_KEY = 'setRoles';

export interface Storage {
  /** Loads the character's data; call once the character is loaded. */
  load(): void;
  /** Every owned equipment set's assignment, including sets bought since loading. */
  assignments(): Assignments;
  assignedPotion(setIndex: number): PotionItem | undefined;
  assign(setIndex: number, potionID: string): void;
  unassign(setIndex: number): void;
  /** Called with a fresh copy whenever assignments change. */
  onAssignmentsChange(listener: (assignments: Assignments) => void): void;
  /** Each owned set's role; sets never given one are 'auto'. */
  roles(): Role[];
  setRole(setIndex: number, role: Role): void;
  autoSwap(): boolean;
  setAutoSwap(on: boolean): void;
  autoPotion(): boolean;
  setAutoPotion(on: boolean): void;
}

const isAssignments = (value: unknown): value is Assignments =>
  typeof value === 'object' && value !== null;

/** The mod's per-character data, kept in the game's character storage. */
export function createStorage(ctx: Modding.ModContext): Storage {
  let assignments: Assignments = {};
  const listeners: ((assignments: Assignments) => void)[] = [];

  // Read the set count each time, so sets bought later are listed without a reload.
  const padded = (): Assignments => {
    const all: Assignments = {};
    for (let i = 0; i < game.combat.player.numEquipSets; i++)
      all[i] = assignments[i] ?? null;
    return all;
  };

  const save = () => {
    assignments = padded();
    ctx.characterStorage.setItem(ASSIGNMENTS, assignments);
    listeners.forEach((listener) => listener(padded()));
  };

  return {
    load() {
      const stored: unknown = ctx.characterStorage.getItem(ASSIGNMENTS);
      assignments = isAssignments(stored) ? stored : {};
      save();
    },
    assignments: padded,
    assignedPotion(setIndex) {
      const id = assignments[setIndex];
      return id ? game.items.potions.getObjectByID(id) : undefined;
    },
    assign(setIndex, potionID) {
      assignments[setIndex] = potionID;
      save();
    },
    unassign(setIndex) {
      if (assignments[setIndex] === null) return;
      assignments[setIndex] = null;
      save();
    },
    onAssignmentsChange(listener) {
      listeners.push(listener);
    },
    roles() {
      const stored: unknown = ctx.characterStorage.getItem(ROLES_KEY);
      const record = isAssignments(stored) ? stored : {};
      return Array.from({ length: game.combat.player.numEquipSets }, (_, i) => {
        const role: unknown = record[i];
        return isRole(role) ? role : 'auto';
      });
    },
    setRole(setIndex, role) {
      const stored: unknown = ctx.characterStorage.getItem(ROLES_KEY);
      const record: Record<number, Role> = {};
      if (isAssignments(stored))
        Object.entries(stored).forEach(([key, value]) => {
          if (isRole(value)) record[Number(key)] = value;
        });
      record[setIndex] = role;
      ctx.characterStorage.setItem(ROLES_KEY, record);
    },
    autoSwap: () => ctx.characterStorage.getItem(AUTO_SWAP) === true,
    setAutoSwap: (on) => ctx.characterStorage.setItem(AUTO_SWAP, on),
    autoPotion: () => ctx.characterStorage.getItem(AUTO_POTION) === true,
    setAutoPotion: (on) => ctx.characterStorage.setItem(AUTO_POTION, on),
  };
}

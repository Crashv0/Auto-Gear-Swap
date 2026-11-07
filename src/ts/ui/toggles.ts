import type { Potions } from '../potions';
import { isRole, type Role, type Storage } from '../storage';

const CONTAINER = 'ags-toggle-container';

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'melee', label: 'Melee' },
  { value: 'ranged', label: 'Ranged' },
  { value: 'magic', label: 'Magic' },
  { value: 'never', label: 'Never' },
];

let view: { roles: Role[]; current: number } | undefined;

/** Shows the role of the now selected set, with sets bought since included. */
function refreshRole(storage: Storage) {
  if (!view) return;
  view.current = game.combat.player.selectedEquipmentSet;
  if (view.roles.length !== game.combat.player.numEquipSets)
    view.roles = storage.roles();
}

/** Keeps the role select on the selected equipment set. */
export function patchRoleSelect(ctx: Modding.ModContext, storage: Storage) {
  ctx.patch(Player, 'changeEquipmentSet').after(() => refreshRole(storage));
}

/**
 * The Auto Swap and Auto Potion switches on the combat page, under equipment
 * set 1, with the selected set's role below them.
 */
export function mountToggles(storage: Storage, potions: Potions) {
  const host = document.getElementById('combat-equipment-set-container-0');
  if (!host || host.querySelector(`#${CONTAINER}`)) return;
  const store = ui.createStore({
    $template: '#ags-toggle-root',
    autoSwapValue: storage.autoSwap(),
    autoPotionValue: storage.autoPotion(),
    toggleSwap: () => storage.setAutoSwap(!storage.autoSwap()),
    togglePotion: () => {
      const on = !storage.autoPotion();
      storage.setAutoPotion(on);
      if (on) potions.useAssigned();
    },
    roles: storage.roles(),
    current: game.combat.player.selectedEquipmentSet,
    roleOptions: ROLE_OPTIONS,
    setRole: (setIndex: number, value: unknown) => {
      if (!isRole(value)) return;
      storage.setRole(setIndex, value);
      store.roles = storage.roles();
    },
  });
  view = store;
  ui.create(store, host);
}

export function setTogglesHidden(hidden: boolean) {
  const container = document.getElementById(CONTAINER);
  if (!container) return;
  if (hidden) hideElement(container);
  else showElement(container);
}

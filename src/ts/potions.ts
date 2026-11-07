import type { Notify } from './notify';
import type { Settings } from './settings';
import type { Storage } from './storage';

export interface Potions {
  /** The active combat potion, if any. */
  active(): PotionItem | undefined;
  /**
   * Uses the potion assigned to the active set, if Auto Potion is on and it
   * isn't already active. `quiet` skips the "not found" notification, for
   * repeated checks such as each enemy spawn.
   */
  useAssigned(options?: { quiet?: boolean }): void;
}

const active = () => game.potions.activePotions.get(game.combat)?.item;

/** Keeps the combat potion assigned to the active equipment set in use. */
export function createPotions(
  ctx: Modding.ModContext,
  storage: Storage,
  settings: Settings,
  notify: Notify,
): Potions {
  const useAssigned = ({ quiet = false } = {}) => {
    if (!storage.autoPotion()) return;
    const setIndex = game.combat.player.selectedEquipmentSet;
    const potion = storage.assignedPotion(setIndex);
    if (!potion || active() === potion) return;
    if (!game.bank.hasItem(potion)) {
      if (!quiet && !settings.notificationsDisabled())
        notify.error(
          'potion-not-found',
          `${potion.name} assigned to set ${setIndex + 1} not found`,
        );
      return;
    }
    game.potions.usePotion(potion);
    if (!settings.notificationsDisabled())
      notify.success(
        potion.media,
        `Set ${setIndex + 1} ${potion.name} Activated`,
      );
  };

  ctx.patch(Player, 'changeEquipmentSet').after(() => useAssigned());

  // Put the assigned potion back when the potion selection closes with another one active.
  ctx.onInterfaceReady(() => {
    const modal = document.getElementById('modal-potion-select');
    if (!modal) return;
    const visible = () => window.getComputedStyle(modal).display !== 'none';
    let wasVisible = visible();
    new MutationObserver(() => {
      const isVisible = visible();
      const assigned =
        storage.assignments()[game.combat.player.selectedEquipmentSet];
      if (wasVisible && !isVisible && active()?.id !== assigned) useAssigned();
      wasVisible = isVisible;
    }).observe(modal, { attributes: true, attributeFilter: ['style'] });
  });

  return { active, useAssigned };
}

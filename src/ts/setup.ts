import manifest from '../../manifest.json';
import { createNotify } from './notify';
import { createPotions } from './potions';
import { registerSettings } from './settings';
import { createStorage } from './storage';
import { patchSwap } from './swap';
import { createCombatPotionButton } from './ui/combatPotionButton';
import { patchPotionDropdown } from './ui/potionDropdown';
import { patchSetTooltip } from './ui/setTooltip';
import { mountToggles, patchRoleSelect, setTogglesHidden } from './ui/toggles';

export function setup(ctx: Modding.ModContext) {
  console.log(`Auto Gear Swap+ v${manifest.version} loading...`);
  const storage = createStorage(ctx);
  const settings = registerSettings(ctx, {
    badgeChanged: (badge) => button.setBadge(badge),
    potionButtonDisabled: (disabled) =>
      disabled ? button.remove() : button.mount(),
    togglesHidden: setTogglesHidden,
  });
  const button = createCombatPotionButton(ctx, settings);
  const potions = createPotions(ctx, storage, settings, createNotify(ctx));

  patchSwap(ctx, storage, potions);
  patchPotionDropdown(ctx, storage);
  patchSetTooltip(ctx, storage);
  patchRoleSelect(ctx, storage);

  ctx.onCharacterLoaded(() => storage.load());
  ctx.onInterfaceReady(() => {
    mountToggles(storage, potions);
    if (!settings.potionButtonDisabled()) button.mount();
  });
}

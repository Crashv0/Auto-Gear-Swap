import { Badge, type Settings } from '../settings';

const CONTAINER = 'ags-cpm-potion-container';
const IMAGE = 'ags-cpm-potion-image';

const BADGE_STYLES = {
  [Badge.Quantity]: { text: 'black', badge: 'warning' },
  [Badge.Charges]: { text: 'white', badge: 'danger' },
};

export interface CombatPotionButton {
  mount(): void;
  remove(): void;
  setBadge(badge: Badge): void;
}

const activePotion = () => game.potions.activePotions.get(game.combat);
const emptyImage = () =>
  assets.getURI('assets/media/skills/herblore/potion_empty.svg');

interface BadgeInfo {
  text: string;
  badge: string;
  value: string | number;
}
const NO_BADGE: BadgeInfo = { text: 'none', badge: 'none', value: '' };

/**
 * A button among the combat player menu icons showing the active combat
 * potion, with a badge for its bank quantity or charges; clicking opens the
 * potion selection.
 */
export function createCombatPotionButton(
  ctx: Modding.ModContext,
  settings: Settings,
): CombatPotionButton {
  let view: ReturnType<typeof createView> | undefined;
  let tooltip: TippyTooltip | undefined;

  function createView() {
    const potion = activePotion();
    return ui.createStore({
      $template: '#ags-cpm-potion-root',
      tooltipShowing: false,
      potionImageUrl: potion?.item.media ?? emptyImage(),
      potionActive: potion !== undefined,
      showOption: settings.badge(),
      badgeInfo: NO_BADGE,
      handleImageClick: () => game.potions.openPotionSelectOnClick(game.combat),
    });
  }

  let stale = false;
  const refresh = () => {
    stale = false;
    if (!view) return;
    const potion = activePotion();
    view.potionActive = potion !== undefined;
    view.potionImageUrl = potion?.item.media ?? emptyImage();
    view.showOption = settings.badge();
    const badge = settings.badge();
    const value =
      badge === Badge.Quantity && potion
        ? game.bank.getQty(potion.item)
        : badge === Badge.Charges
          ? (potion?.charges ?? '')
          : '';
    view.badgeInfo =
      badge === Badge.Off ? NO_BADGE : { ...BADGE_STYLES[badge], value };
    tooltip?.setContent(`<div class='text-center media-body'><div class="mb-1">${
      potion?.item.name ?? getLangString('MISC_STRING_22')
    }</div>
    <div class="font-size-xs font-w400 ml-1 mr-1 mb-1 text-info">${potion?.item.modifiedDescription ?? ''}</div>
    </div>`);
  };

  const refreshSoon = () => {
    if (loadingOfflineProgress) stale = true;
    else refresh();
  };

  ctx
    .patch(PotionManager, 'consumeChargeForAction')
    .after((_returned, _event, action) => {
      if (action === game.combat && settings.badge() === Badge.Charges)
        refreshSoon();
    });
  ctx.patch(PotionManager, 'usePotion').after((_returned, potion) => {
    if (potion.action === game.combat) refreshSoon();
  });
  ctx.patch(PotionManager, 'removePotion').after((_returned, action) => {
    if (action === game.combat) refreshSoon();
  });
  // Offline catch-up runs thousands of these in a row; draw once when it ends.
  ctx.patch(Game, 'exitOfflineLoop').after(() => {
    if (stale) refresh();
  });

  return {
    mount() {
      if (document.getElementById(CONTAINER)) return;
      const host = document.getElementById(
        'combat-player-container',
      )?.firstElementChild;
      if (!host) return;
      // Make room for the extra icon.
      host
        .querySelectorAll('img')
        .forEach((img) => img.classList.replace('m-1', 'm-01'));
      view = createView();
      ui.create(view, host);
      const current = view;
      [tooltip] = tippy(`#${IMAGE}`, {
        content: 'initial',
        placement: 'bottom',
        allowHTML: true,
        interactive: false,
        animation: false,
        onShow: () => {
          current.tooltipShowing = true;
        },
        onHide: () => {
          current.tooltipShowing = false;
        },
      });
      refresh();
    },
    remove() {
      document.getElementById(CONTAINER)?.remove();
      tooltip?.destroy();
      tooltip = undefined;
      view = undefined;
    },
    setBadge: () => refresh(),
  };
}

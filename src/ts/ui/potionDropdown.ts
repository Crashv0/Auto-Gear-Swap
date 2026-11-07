import type { Assignments, Storage } from '../storage';
import './style.css';

const ROOT = 'ags-dd-toggle-root';
const TOGGLE = 'ags-dd-toggle-btn';

/** What the dropdown templates read; the methods are added when the store is made. */
type DropdownState = {
  showDropdown: boolean;
  activeDropdownPotion: PotionItem | undefined;
  activeBtnPotionID: string;
  potionAssignments: Assignments;
};

/**
 * A set dropdown beside each potion's Use button in the combat potion
 * selection, for assigning that potion to equipment sets.
 */
export function patchPotionDropdown(ctx: Modding.ModContext, storage: Storage) {
  let openToggle: HTMLElement | undefined;
  const initial: DropdownState = {
    showDropdown: false,
    activeDropdownPotion: undefined,
    activeBtnPotionID: '',
    potionAssignments: {},
  };

  const store = ui.createStore({
    ...initial,
    activeDropdown(event: Event) {
      if (!(event.target instanceof HTMLElement)) return;
      const clicked = event.target;
      if (openToggle === clicked) {
        openToggle = undefined;
        store.showDropdown = false;
        store.activeDropdownPotion = undefined;
        return;
      }
      openToggle = clicked;
      store.potionAssignments = storage.assignments();
      store.showDropdown = true;
      const potionID =
        clicked
          .closest('potion-select-menu-item')
          ?.getAttribute('data-potionid') ?? '';
      store.activeBtnPotionID = potionID;
      store.activeDropdownPotion = game.items.potions.getObjectByID(potionID);
    },
    // Choosing the set that already has this potion takes it off again.
    togglePotionAssignment: (setIndex: number, potionID: string) => {
      if (storage.assignments()[setIndex] === potionID)
        storage.unassign(setIndex);
      else storage.assign(setIndex, potionID);
    },
    clearPotionAssignment: (setIndex: number) => storage.unassign(setIndex),
    getPotionFromID: (potionID: string) =>
      game.items.potions.getObjectByID(potionID),
  });
  storage.onAssignmentsChange((assignments) => {
    store.potionAssignments = assignments;
  });

  const addDropdown = (useButton: HTMLButtonElement) => {
    const parent = useButton.parentElement;
    if (!parent || parent.classList.contains(ROOT)) return;
    const group = document.createElement('div');
    group.className = `btn-group ${ROOT}`;
    group.append(useButton);
    parent.append(group);

    ui.create({ $template: '#ags-dd-toggle', uiStore: store }, group);
    const toggle = group.lastElementChild;
    if (!(toggle instanceof HTMLElement)) return;
    ui.create({ $template: '#ags-dd-toggle-menu', uiStore: store }, toggle);

    // Outline the menu while Auto Potion is off, as a hint that assignments are idle.
    toggle.addEventListener('click', () =>
      toggle.firstElementChild?.classList.toggle(
        'border-important',
        !storage.autoPotion(),
      ),
    );
    // Match the Use button's colour (green to use, red when active).
    if (useButton.classList.contains('btn-danger'))
      toggle.classList.replace('btn-success', 'btn-danger');
    useButton.addEventListener('click', () => {
      const active = useButton.classList.contains('btn-danger');
      toggle.classList.replace(
        active ? 'btn-success' : 'btn-danger',
        active ? 'btn-danger' : 'btn-success',
      );
    });
  };

  ctx.patch(PotionSelectMenuItemElement, 'setPotion').after(function () {
    addDropdown(this.useButton);
  });

  ctx
    .patch(PotionManager, 'openPotionSelectOnClick')
    .after((_returned, action) => {
      document
        .querySelector(`.btn-success + .btn-danger.${TOGGLE}`)
        ?.classList.replace('btn-danger', 'btn-success');
      document
        .querySelector(`.btn-danger + .btn-success.${TOGGLE}`)
        ?.classList.replace('btn-success', 'btn-danger');
      // Assignments are for combat potions only.
      document.querySelectorAll(`.${TOGGLE}`).forEach((toggle) => {
        const combat = action.localID === 'Combat';
        if (combat) showElement(toggle);
        else hideElement(toggle);
        toggle.parentElement?.classList.toggle('btn-group', combat);
      });
    });

  // The active combat potion goes first, and each menu item records its potion's ID.
  ctx
    .patch(PotionSelectMenuElement, 'showPotionSelection')
    .before((potions, action, game) => {
      if (action !== game.combat) return undefined;
      const active = game.potions.activePotions.get(game.combat)?.item;
      const index = active === undefined ? -1 : potions.indexOf(active);
      if (active === undefined || index < 0) return undefined;
      return [
        [active, ...potions.slice(0, index), ...potions.slice(index + 1)],
        action,
        game,
      ];
    });
  ctx
    .patch(PotionSelectMenuElement, 'showPotionSelection')
    .after(function (_returned, potions, action, game) {
      if (action !== game.combat) return;
      this.menuItems.forEach((item, i) =>
        item.setAttribute('data-potionid', potions[i]?.id ?? 'undefined'),
      );
    });

  ctx.onCharacterLoaded(() => {
    store.potionAssignments = { ...storage.assignments() };
  });
}

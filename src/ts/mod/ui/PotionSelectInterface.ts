import { StorageManager } from '../managers/StorageManager';
import './style.css';

/**
 * Manages the user interface for potion selection, enabling the assignment of potions through a dropdown menu.
 * This class is responsible for creating and managing the dropdown elements and interactions within the potion selection interface.
 *
 * @class PotionSelectInterface
 * @callback onInterfaceReady
 * @property {StorageManager} storage - Manages persistent data related to potion assignments.
 * @property {HTMLElement | undefined} activeDropdown - Tracks the currently active dropdown, if any.
 */
export class PotionSelectInterface {
  private storage: StorageManager;
  private activeDropdown: HTMLElement | undefined;

  /**
   * Creates an instance of PotionSelectInterface.
   * @constructor
   * @param {Modding.ModContext} ctx - The mod context.
   * @param {StorageManager} storage - The storage manager for the mod.
   */
  constructor(ctx: Modding.ModContext, storage: StorageManager) {
    this.storage = storage;
    this.initialize(ctx);
  }

  /**
   * Prepares the potion selection interface, creating a UI store and setting up the necessary patches.
   *
   * @private
   * @param {Modding.ModContext} ctx
   */
  private initialize(ctx: Modding.ModContext): void {
    ctx.onInterfaceReady((ctx) => {
      this.setPotionSelectMenuItemID(ctx);
      // Petite Vue store for dropdown menu data
      const store = this.createUIStore();

      // Save the store to the storage manager
      this.storage.uiStore = store;

      // Setup the potion select menu interface
      this.setup(ctx);
    });
  }

  /**
   * Creates a UI store to manage the state of dropdown elements in the potion selection interface.
   *
   * @private
   */
  private createUIStore(): ComponentProps {
    // replace any with your store's type
    return ui.createStore({
      showDropdown: false,
      activeDropdown: (event: Event) => {
        this.handleButtonClick(event);
      },
      activeDropdownPotion: undefined,
      activeBtnPotionID: '',
      setPotionAssignment: (setIndex: number, potionID: string) =>
        this.storage.savePotionToSet(setIndex, potionID),
      clearPotionAssignment: (setIndex: number) =>
        this.storage.unassignPotion(setIndex),
      getPotionFromID: (potionID: string) =>
        this.storage.getPotionFromID(potionID),
      potionAssignments: this.storage.potionAssignments,
    });
  }

  /**
   * Integrates dropdown buttons into the potion selection menu, patching the game's existing UI elements.
   * Each potion receives a new dropdown button, allowing users to assign potions to different sets.
   *
   * @private
   * @param {Modding.ModContext} ctx - The modding context.
   */
  private setup(ctx: Modding.ModContext): void {
    // save PotionSelectInterface instance
    const that = this;

    // setPotion called for every potion in the potion select menu
    ctx.patch(PotionSelectMenuItemElement, 'setPotion').after(function () {
      // 'this' PotionSelectMenuItemElement instance
      that.createDropdownBtn(this.useButton);
    });

    // fix mismatched buttons on potion select menu open
    ctx
      .patch(PotionManager, 'openPotionSelectOnClick')
      .after((o, action: Action) => this.fixMismatchedClasses(action));
  }

  /**
   * Handles the creation of the dropdown button for each potion.
   * @private
   * @param {HTMLElement} hostBtn - The host button element.
   */
  private createDropdownBtn(hostBtn: HTMLElement): void {
    if (!hostBtn) {
      console.error(
        "[AGS] Couldn't find the potion menu item to insert the dropdown.",
      );
      return;
    }

    // Prevent creating multiple dropdowns on the same button
    if (hostBtn.parentElement?.classList.contains('ags-dd-toggle-root')) return;

    // Create a button group to hold the dropdown toggle button and select button
    const hostParent = hostBtn.parentElement;
    const btnGroup = document.createElement('div');
    btnGroup.className = 'btn-group ags-dd-toggle-root';
    btnGroup.appendChild(hostBtn);
    hostParent?.appendChild(btnGroup);

    // Create the dropdown toggle and menu, linking them to the UI store
    const dropdownElements = this.createDropdownElements(
      this.storage.uiStore,
      btnGroup,
    );

    // Sync the new dropdown button's style with the original button's state
    this.syncButtonStyles(hostBtn, dropdownElements.toggleBtn);
  }

  /**
   * Creates dropdown elements for the PotionSelectInterface.
   * @private
   * @param {ComponentProps} uiStore - The ComponentProps object.
   * @param {HTMLElement} btnGroup - The HTMLElement for the button group.
   * @returns {Object} An object containing the toggle button and the dropdown menu.
   */
  private createDropdownElements(
    uiStore: ComponentProps,
    btnGroup: HTMLElement,
  ): { toggleBtn: HTMLElement; menu: HTMLElement } {
    const that = this;
    const dropdownToggle = ui.create(
      { $template: '#ags-dd-toggle', uiStore },
      btnGroup,
    );
    const dropdownToggleBtn = dropdownToggle.lastElementChild as HTMLElement;

    ui.create({ $template: '#ags-dd-toggle-menu', uiStore }, dropdownToggleBtn);

    // Reflect the auto potion toggle state in the dropdown menu's border style
    dropdownToggleBtn.addEventListener('click', () => {
      const dropdownMenu = dropdownToggleBtn.firstElementChild;
      that.storage.getAutoPotionEnabled
        ? dropdownMenu?.classList.remove('border-important')
        : dropdownMenu?.classList.add('border-important');
    });

    return {
      toggleBtn: dropdownToggleBtn,
      menu: dropdownToggleBtn.firstElementChild as HTMLElement,
    };
  }

  /**
   * Syncs the styles of the dropdown button with the original button.
   * @private
   * @param {HTMLElement} hostBtn - The host button element.
   * @param {HTMLElement} dropdownToggleBtn - The dropdown toggle button element.
   */
  private syncButtonStyles(
    hostBtn: HTMLElement,
    dropdownToggleBtn: HTMLElement,
  ): void {
    // Initial style sync
    if (hostBtn.classList.contains('btn-danger')) {
      dropdownToggleBtn.classList.replace('btn-success', 'btn-danger');
    }

    // Keep styles in sync upon host button click
    hostBtn.addEventListener('click', () => {
      const isActive = hostBtn.classList.contains('btn-danger');
      dropdownToggleBtn.classList.replace(
        isActive ? 'btn-success' : 'btn-danger',
        isActive ? 'btn-danger' : 'btn-success',
      );
    });
  }

  /**
   * Fixes mismatched button classes to ensure UI consistency.
   * @private
   * @param {Action} action - The action to fix.
   */
  private fixMismatchedClasses(action: Action): void {
    document
      .querySelector('.btn-success + .btn-danger.ags-dd-toggle-btn')
      ?.classList.replace('btn-danger', 'btn-success');
    document
      .querySelector('.btn-danger + .btn-success.ags-dd-toggle-btn')
      ?.classList.replace('btn-success', 'btn-danger');

    // hide dropdown buttons for non-combat potions
    const dropdownButtons = document.querySelectorAll('.ags-dd-toggle-btn');
    dropdownButtons.forEach((btn) => {
      if (action.localID === 'Combat') {
        showElement(btn);
        btn.parentElement?.classList.add('btn-group');
      } else {
        hideElement(btn);
        btn.parentElement?.classList.remove('btn-group');
      }
    });
  }

  /**
   * Handles click events on the dropdown buttons, toggling the dropdown and setting active potions.
   * @param {Event} event The click event.
   * @public
   */
  public handleButtonClick(event: Event): void {
    const clickedButton = event.target as HTMLElement;
    if (this.activeDropdown === clickedButton) {
      this.activeDropdown = undefined;
      this.storage.uiStore.showDropdown = false;
      this.storage.uiStore.activeDropdownPotion = undefined;
      return;
    }
    this.storage.uiStore.showDropdown = true;
    this.activeDropdown = clickedButton;

    // Set the active potion ID to the clicked button's potion ID
    const activeTogglePotionID = clickedButton.closest(
      'potion-select-menu-item',
    )?.dataset.potionid;
    this.storage.uiStore.activeBtnPotionID = activeTogglePotionID;

    this.storage.uiStore.activeDropdownPotion =
      this.storage.getPotionFromID(activeTogglePotionID);
  }

  /**
   * Sets the potion ID for each potion select menu item.
   * @patch {PotionSelectMenuElement} showPotionSelection - before
   * @patch {PotionSelectMenuElement} showPotionSelection - after
   */
  private setPotionSelectMenuItemID(ctx: Modding.ModContext) {
    const that = this;

    // patch before to move the active potion to the front of the array
    ctx
      .patch(PotionSelectMenuElement, 'showPotionSelection')
      .before(function (potions, action, game) {
        if (action !== game.combat) return;

        potions = that.moveElementToFront(
          potions,
          game.potions.activePotions.get(game.combat)?.item,
        );
        return [potions, action, game];
      });

    // patch after to set the potion ID for each potion select menu item
    ctx
      .patch(PotionSelectMenuElement, 'showPotionSelection')
      .after(function (o, potions, action, game) {
        if (action !== game.combat) return;

        this.menuItems.forEach((menuItem, i) => {
          const potion = potions[i];
          menuItem.setAttribute('data-potionid', potion?.id);
        });

        return [potions, action, game];
      });
  }

  /**
   * Moves the element to the first index.
   * @template T - The type of elements in the array.
   * @param {T[]} array - The original array.
   * @param {T} element - The element to move to the front of the array.
   * @returns {T[]} A new array with the element at the first position, if found; otherwise, the original array.
   */
  private moveElementToFront = <T>(array: T[], element: T): T[] => {
    if (!element) return array;
    const index = array.indexOf(element);
    if (index !== -1)
      return [element, ...array.slice(0, index), ...array.slice(index + 1)];
    return array;
  };
}

import { PotionNotifications } from '../ui/Notifications';
import { StorageManager } from './StorageManager';
import { ToggleObserver } from '../ui/Toggle';
/**
 * Manages automatic potion usage and assignments for different equipment sets.
 */
export class AutoPotionManager implements ToggleObserver {
  public storage: StorageManager;
  private ctx: Modding.ModContext;
  private notify: PotionNotifications;
  private noNotify: boolean;

  constructor(
    ctx: Modding.ModContext,
    storage: StorageManager,
    notifications: PotionNotifications,
  ) {
    this.ctx = ctx;
    this.notify = notifications;
    this.storage = storage;
    this.noNotify = this.ctx.settings
      .section('General')
      .get('disable-notifications') as boolean;

    this.ctx
      .patch(Player, 'changeEquipmentSet')
      .after(() => this.useAssignedPotion());

    this.ctx.onInterfaceReady(() => this.observePotionSelectMenu());
  }

  /**
   * Handles changes to the settings toggles.
   * @param settingName - The name of the setting being changed.
   * @param newValue - The new value of the setting.
   * @param oldValue - The old value of the setting (optional).
   */
  onToggleChange(settingName: string, newValue: any): void {
    switch (settingName) {
      case 'autoSwap':
        this.handleSwapToggle();
        break;
      case 'autoPotion':
        this.handlePotionToggle(newValue);
        break;
    }
  }

  private handleSwapToggle(): void {}

  /**
   * Handles changes to the auto-potion toggle.
   */
  private handlePotionToggle(newValue: boolean): void {
    // If auto-potion is enabled, use the potion assigned to the active set
    if (newValue) this.useAssignedPotion();
  }

  /**
   * Uses the potion assigned to the currently active equipment set if auto-use is enabled.
   * It checks whether the potion is already active or doesn't exist before attempting to use it.
   */
  public useAssignedPotion(): void {
    const { getAutoPotionEnabled: autoUse, getPotionFromID } = this.storage;

    if (!autoUse) return;

    // Exit if no potion is assigned to the active set
    if (!this.potionAssignedToActiveSet) return;

    // Index of the currently active equipment set
    const activeSet: number = game.combat.player.selectedEquipmentSet;

    // Get the ID of the currently active combat potion
    const currentlyActiveCombatPot: string | undefined =
      this.activeCombatPotion?.id;

    // Retrieve the full potion object from its ID
    const potion = getPotionFromID(this.potionAssignedToActiveSet);

    // Exit if the potion assigned to the active set is already active
    if (currentlyActiveCombatPot === this.potionAssignedToActiveSet) {
      console.log(
        ` [AGS] ${potion?.name} assigned to set ${
          activeSet + 1
        } already active, auto-use prevented.`,
      );
      return;
    }

    // If the potion doesn't exist (invalid ID or data), exit the function
    if (!potion) {
      console.warn(` [AGS] Potion assigned to set ${activeSet + 1} not found`);
      return;
    }

    // If the potion is not in the bank, send a notification and exit the function
    if (!this.isPotionInBank(potion)) {
      if (!this.noNotify)
        this.notify.sendErrorNotif(
          'potion-not-found',
          `${potion.name} assigned to set ${activeSet + 1} not found`,
        );
      return;
    }

    // Use the assigned potion
    game.potions.usePotion(potion);

    // Send a notification about the potion used
    if (!this.noNotify)
      this.notify.sendNotif(
        potion.media,
        `Set ${activeSet + 1} ${potion.name} Activated`,
        'success',
        -1,
      );
  }

  /**
   * Filters the bank items to retrieve only the combat potions.
   * @returns {PotionItem[]} An array of combat potions.
   */
  private getCombatPotionsInBank(): PotionItem[] {
    return game.combat.player.game.bank
      .filterItems((bankItem) => {
        const item = bankItem.item;
        return item instanceof PotionItem && item.action === game.combat;
      })
      .filter((item): item is PotionItem => item instanceof PotionItem);
  }

  /**
   * Gets the currently active combat potion object, if any.
   * @returns {PotionItem | undefined} The active combat potion, or undefined if there is none.
   */
  public get activeCombatPotion(): PotionItem | undefined {
    return game.potions.activePotions.get(game.combat)?.item;
  }

  /**
   * Checks if the given PotionItem is present in the bank.
   * @param {PotionItem} potionToCheck - The potion to check for its presence in the bank.
   * @returns {boolean} True if the potion is in the bank, false otherwise.
   */
  public isPotionInBank(potionToCheck: PotionItem): boolean {
    const combatPotionsInBank = this.getCombatPotionsInBank();
    return combatPotionsInBank.some((potion) => potion.id === potionToCheck.id);
  }

  /**
   * Sets up an observer for visibility changes on the potion select menu,
   * and triggers an action when the menu gets hidden.
   */
  private observePotionSelectMenu(): void {
    // Define the ID of the element to be observed
    const elementId = 'modal-potion-select';

    // Retrieve the element from the DOM
    const element = document.getElementById(elementId);

    // Exit and log error if the element is not found
    if (!element) {
      console.error(`Element with id "${elementId}" not found.`);
      return;
    }

    const isElementVisible = (e: HTMLElement): boolean =>
      window.getComputedStyle(e).display !== 'none';

    // Flag indicating the previous visibility state of the element
    let wasPreviouslyVisible = isElementVisible(element);

    // Create an observer instance and define the callback for mutations
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName !== 'style') return;
        const isVisible = isElementVisible(element);

        // If the element was visible but is now hidden, trigger the action
        if (
          wasPreviouslyVisible &&
          !isVisible &&
          this.activeCombatPotion?.id !== this.potionAssignedToActiveSet
        )
          this.useAssignedPotion();

        // Update the visibility flag for the next observation
        wasPreviouslyVisible = isVisible;
      }
    });

    // Start observing the element
    observer.observe(element, {
      attributes: true,
      attributeFilter: ['style'],
    });
  }

  /**
   * Gets the ID of the potion assigned to the currently active equipment set.
   */
  private get potionAssignedToActiveSet(): string | null {
    return this.storage.potionAssignments[
      game.combat.player.selectedEquipmentSet
    ];
  }
}

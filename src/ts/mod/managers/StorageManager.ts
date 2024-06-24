/**
 * Manages storage operations for character potion assignments.
 */
export class StorageManager {
  uiStore!: ComponentProps;
  potionAssignments: Record<number, string | null>;
  private ctx: Modding.ModContext;
  private numEquipSets = game.combat.player.numEquipSets;

  constructor(ctx: Modding.ModContext) {
    this.ctx = ctx;

    this.potionAssignments = this.getPotionAssignments ?? {};

    // initialize potionAssignments with null values if they don't already exist
    for (let i = 0; i < this.numEquipSets; i++) {
      if (!Object.prototype.hasOwnProperty.call(this.potionAssignments, i)) {
        this.potionAssignments[i] = null;
      }
    }
    // Save initial state
    this.setPotionAssignments(this.potionAssignments);

    this.ctx.onInterfaceReady(() => {
      // Update the potion assignments object if a new equipment set is bought
      this.ctx.patch(Shop, 'buyItemOnClick').after((o, purchase) => {
        if (
          purchase.contains.stats?.modifiers?.find((mod) =>
            mod.modifier._localID.includes('equipmentSets'),
          )
        ) {
          this.updateTotalSets();
        }
      });
    });
  }

  /**
   * Gets the potion ID assigned to a specific equipment set.
   * @param {number} setIndex The index of the equipment set.
   * @returns {string | undefined} The ID of the assigned potion, or undefined if no potion is assigned.
   */
  public getAssignedPotionForSet(setIndex: number): string | null {
    return this.potionAssignments[setIndex];
  }

  /**
   * Assigns a potion to a specific equipment set and saves the assignment.
   * @param {number} setIndex The index of the equipment set.
   * @param {string} potionID The full ID with namespace of the potion to assign.
   */
  public savePotionToSet(setIndex: number, potionID: string): void {
    this.potionAssignments[setIndex] = potionID;
    this.setPotionAssignments(this.potionAssignments);
    this.potionAssignments = { ...this.potionAssignments };
    if (this.uiStore !== undefined) {
      this.uiStore.potionAssignments = { ...this.potionAssignments };
    }
  }

  /**
   * Removes the potion assignment from a specific equipment set.
   * @param {number} setIndex The index of the equipment set.
   */
  public unassignPotion(setIndex: number): void {
    // Check if a potion is assigned to the set and remove it
    if (this.potionAssignments[setIndex] !== null) {
      this.potionAssignments[setIndex] = null;

      // Update store and character storage
      if (this.uiStore !== undefined) {
        this.uiStore.potionAssignments = { ...this.potionAssignments };
      }
      this.setPotionAssignments(this.potionAssignments);
    }
  }

  /**
   * Updates the total sets, filling in any unassigned indices.
   */
  private updateTotalSets(): void {
    this.numEquipSets = game.combat.player.numEquipSets;
    for (let i = 0; i < this.numEquipSets; i++) {
      if (!Object.prototype.hasOwnProperty.call(this.potionAssignments, i)) {
        this.potionAssignments[i] = null;
      }
    }
    this.setPotionAssignments(this.potionAssignments);

    if (this.uiStore !== undefined) {
      this.uiStore.potionAssignments = { ...this.potionAssignments };
    }
  }

  /**
   * Retrieves a potion object by its unique identifier.
   * @param {string} potionID The unique identifier of the potion.
   * @returns {PotionItem | undefined} The potion object, or undefined if not found.
   */
  public getPotionFromID(potionID: string): PotionItem | undefined {
    return game.items.potions.getObjectByID(potionID);
  }

  /**
   * Retrieves an item from the character's storage.
   * @param key The key identifying the item to retrieve.
   * @returns The item from the character's storage.
   */
  private get getPotionAssignments(): Record<number, string | null> {
    return this.ctx.characterStorage.getItem('potionAssignments');
  }

  /**
   * Saves potion assignments in the character's storage.
   * @param value The item to save in the character's storage.
   */
  private setPotionAssignments(value: any) {
    this.ctx.characterStorage.setItem('potionAssignments', value);
  }

  /**
   * Saves auto swap toggle button state to character storage.
   */
  public setAutoSwapEnabled(value: any) {
    this.ctx.characterStorage.setItem('autoSwapEnabled', value);
  }

  /**
   * Retrieves auto swap toggle button state from character storage.
   */
  public get getAutoSwapEnabled(): boolean {
    return this.ctx.characterStorage.getItem('autoSwapEnabled');
  }

  /**
   * Saves auto potion toggle button state to character storage.
   */
  public setAutoPotionEnabled(value: any) {
    this.ctx.characterStorage.setItem('autoPotionEnabled', value);
  }

  /**
   * Retrieves auto potion toggle button state from character storage.
   */
  public get getAutoPotionEnabled(): boolean {
    return this.ctx.characterStorage.getItem('autoPotionEnabled');
  }
}

import { AutoPotionManager } from './PotionManager';
import { StorageManager } from './StorageManager';

/**
 * Handles automatic equipment set swapping based on the enemy's attack type.
 */
export class AutoGearSwap {
  private ctx: Modding.ModContext;
  private user = game.combat.player;
  private storage: StorageManager;
  private potionManager: AutoPotionManager;

  private attackTypeMappings = {
    ranged: 'melee',
    magic: 'ranged',
    melee: 'magic',
  };

  constructor(
    ctx: Modding.ModContext,
    potionManager: AutoPotionManager,
    storage: StorageManager,
  ) {
    this.ctx = ctx;
    this.potionManager = potionManager;
    this.storage = storage;
    this.setup();
  }

  /**
   * Sets up the necessary patches and event handlers for the mod functionality.
   * @patch {CombatManager} spawnEnemy - after
   */
  private setup = () => {
    this.ctx.patch(CombatManager, 'spawnEnemy').after(() => this.swapSet());
  };

  /**
   * Swaps to the equipment set that counters or matches the enemy's attack type, if possible.
   */
  private swapSet = (): void => {
    // Exit if auto-swap toggle is disabled
    if (!this.storage.getAutoSwapEnabled) return;

    const { matchedSet, targetSet } = this.getTargetAndMatchedSets();
    const currentSet = this.user.selectedEquipmentSet;

    // Check if in a dungeon and if swapping is available
    const isInDungeon = this.user.manager.areaType === 2;
    const canSwapInDungeon = this.user.modifiers.dungeonEquipmentSwapping === 1;

    // Use assigned potion if not already active and in the target set
    const activePotion = this.potionManager.activeCombatPotion;
    const assignedPotion = this.storage.getAssignedPotionForSet(currentSet);
    if (
      targetSet === currentSet &&
      activePotion !== this.storage.getPotionFromID(assignedPotion as string)
    ) {
      this.potionManager.useAssignedPotion();
      return;
    }

    // Conditions where equipment set shouldn't be changed
    const noNeedToSwap = targetSet === currentSet; // Already in the target set
    const noSuitableSet = targetSet < 0 && matchedSet < 0; // No set counters or matches
    const dungeonRestrictsSwap = isInDungeon && !canSwapInDungeon; // Can't swap in dungeon
    if (noNeedToSwap || noSuitableSet || dungeonRestrictsSwap) return;

    // swap to the target set if it exists, otherwise swap to the matched set
    this.user.changeEquipmentSet(targetSet > -1 ? targetSet : matchedSet);
  };

  /**
   * Retrieves the attack types of the player's equipment sets.
   * @returns {(EquipmentItem | string)[]} The attack types of the equipment sets.
   */
  private getSetAttackTypes = (): (EquipmentItem | string)[] =>
    this.user.equipmentSets.map(
      (x) => x.equipment.getItemInSlot('melvorD:Weapon').attackType,
    );

  /**
   * Determines the equipment sets that counter or match the enemy's attack type.
   * @returns {{ matchedSet: number, targetSet: number }} The indices of the matched and target sets.
   */
  private getTargetAndMatchedSets = () => {
    const enemyAttackType = game.combat.enemy.attackType;
    const setAttackTypes = this.getSetAttackTypes();
    const { attackTypeMappings } = this;
    const matchedSet = setAttackTypes.indexOf(enemyAttackType);
    const targetSet = setAttackTypes.indexOf(
      attackTypeMappings[enemyAttackType],
    );

    // reverse the attack type mapping if in abyssal area
    if (this.user.manager.inAbyssalArea) {
      const reversedMappings = {
        melee: 'ranged',
        ranged: 'magic',
        magic: 'melee',
      };
      return {
        matchedSet: setAttackTypes.indexOf(enemyAttackType),
        targetSet: setAttackTypes.indexOf(reversedMappings[enemyAttackType]),
      };
    }

    return { matchedSet, targetSet };
  };
}

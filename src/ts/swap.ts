import type { Potions } from './potions';
import type { Role, Storage } from './storage';

/** How good a set is against an enemy: damage multiplier, then damage reduction. */
type Score = readonly [damage: number, reduction: number];

const NO_SCORE: Score = [-Infinity, -Infinity];

const better = (a: Score, b: Score) =>
  a[0] > b[0] || (a[0] === b[0] && a[1] > b[1]);

/**
 * Picks the set to switch to against an enemy of `enemyType`, or undefined to
 * stay. Each set is scored by the triangle's damage multiplier for its attack
 * type against the enemy, then its damage reduction; the best eligible set
 * wins, lowest index first on ties, and only if it beats the current set. Sets
 * without an attack type never win and score lowest as the current set.
 */
export function chooseSet(
  types: readonly (AttackType | undefined)[],
  current: number,
  enemyType: AttackType,
  triangle: CombatTriangle,
  eligible: (setIndex: number) => boolean = () => true,
): number | undefined {
  const score = (type: AttackType | undefined): Score =>
    type === undefined
      ? NO_SCORE
      : [
          triangle.damageModifier[type][enemyType],
          triangle.reductionModifier[type][enemyType],
        ];
  let best: number | undefined;
  let bestScore = score(types[current]);
  types.forEach((type, i) => {
    if (type === undefined || i === current || !eligible(i)) return;
    const s = score(type);
    if (better(s, bestScore)) {
      best = i;
      bestScore = s;
    }
  });
  return best;
}

/**
 * The attack type auto swap uses for each equipment set: its role's type, or
 * for 'auto' its weapon's; undefined for 'never' and for sets without a weapon.
 */
const setAttackTypes = (player: Player, roles: readonly Role[]) =>
  player.equipmentSets.map((set, i): AttackType | undefined => {
    const role = roles[i] ?? 'auto';
    if (role === 'never') return undefined;
    if (role !== 'auto') return role;
    const weapon = set.equipment.getItemInSlot('melvorD:Weapon');
    return weapon instanceof WeaponItem ? weapon.attackType : undefined;
  });

/**
 * Whether the game lets the player change equipment set here. Mirrors the
 * conditions of `Player.checkIfCantEquip`, which shows a toast when it refuses.
 */
const canSwapHere = (manager: CombatManager) =>
  !(
    (manager.areaType === CombatAreaType.Dungeon &&
      manager.player.modifiers.dungeonEquipmentSwapping === 0) ||
    (manager.areaType === CombatAreaType.Stronghold &&
      manager.player.modifiers.strongholdEquipmentSwapping === 0) ||
    game.isGolbinRaid
  );

/**
 * Whether a set's damage type is allowed by the area and the enemy. Mirrors
 * `Player.checkDamageTypeEquipRestrictions`, which shows a toast when it refuses.
 */
const allowsDamageType = (manager: CombatManager, setIndex: number) => {
  const restrictions = manager.getEquipmentRestrictions();
  const set = manager.player.equipmentSets[setIndex];
  if (set === undefined) return false;
  const damageType = manager.player.getEquipmentDamageType(set.equipment);
  return (
    (restrictions.areaDamageTypes === undefined ||
      restrictions.areaDamageTypes.has(damageType)) &&
    (restrictions.monsterDamageType === undefined ||
      !restrictions.monsterDamageType.immuneTo.has(damageType))
  );
};

/**
 * On each enemy spawn, switches to the equipment set that does best against it
 * under the area's combat triangle; when staying, keeps the set's potion up.
 */
export function patchSwap(
  ctx: Modding.ModContext,
  storage: Storage,
  potions: Potions,
) {
  ctx.patch(CombatManager, 'spawnEnemy').after(function () {
    if (!storage.autoSwap()) return;
    const player = this.player;
    const target = canSwapHere(this)
      ? chooseSet(
          setAttackTypes(player, storage.roles()),
          player.selectedEquipmentSet,
          this.enemy.attackType,
          this.combatTriangle,
          (setIndex) => allowsDamageType(this, setIndex),
        )
      : undefined;
    if (target !== undefined) player.changeEquipmentSet(target);
    else if (
      potions.active() !== storage.assignedPotion(player.selectedEquipmentSet)
    )
      potions.useAssigned({ quiet: true });
  });
}

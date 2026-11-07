import type { Storage } from '../storage';

/** Lists each equipment set's assigned potion in its tooltip. */
export function patchSetTooltip(ctx: Modding.ModContext, storage: Storage) {
  ctx.patch(EquipmentSetMenu, 'getTooltipContent').after(function (html, set) {
    const index = game.combat.player.equipmentSets.indexOf(set);
    const potion = storage.assignedPotion(index);
    if (!potion || html.includes('ags-tooltip')) return html;
    const body = html.endsWith('</div>')
      ? html.slice(0, html.lastIndexOf('</div>'))
      : html;
    return `${body}<span class="text-info ags-tooltip">${getLangString('GAME_GUIDE_135')}</span><br>${this.getTooltipRow(potion.media, potion.name)}`;
  });
}

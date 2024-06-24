import { StorageManager } from '../managers/StorageManager';
import { SettingsObserver } from '../settings';

/**
 * Represents the potion menu in the combat interface.
 */
export class CombatPotionMenu implements SettingsObserver {
  private cpmBadge: number;
  private cpmDisabled: boolean;
  private potionComponent: any;
  private potionTooltip: any;
  private storage: StorageManager;

  constructor(
    private ctx: Modding.ModContext,
    storage: StorageManager,
  ) {
    this.cpmBadge = this.ctx.settings
      .section('General')
      .get('cpm-potion-badge') as number;
    this.cpmDisabled = this.ctx.settings
      .section('General')
      .get('cpm-potion-button') as boolean;
    this.storage = storage;
    if (!this.cpmDisabled) {
      this.load();
    }
  }

  /**
   * Retrieves the currently active combat potion.
   * @returns {ActivePotion | undefined} ActivePotion.item is the potion item object, ActivePotion.charges is the number of charges remaining.
   */
  private get activePotion(): ActivePotion | undefined {
    return game.potions.activePotions.get(game.combat);
  }

  /**
   * Handles changes in the settings.
   * Updates the potion component based on the new setting values.
   *
   * @param settingName - Name of the setting that changed.
   * @param newValue - New value of the setting.
   */
  onSettingsChange(settingName: string, newValue: any): void {
    switch (settingName) {
      case 'cpm-potion-badge':
        this.handleBadgeSettingChange(newValue);
        break;
      case 'cpm-potion-button':
        this.handleButtonSettingChange(newValue);
        break;
    }
  }

  /**
   * Handles changes for the 'cpm-potion-badge' setting.
   * Updates badge information and potion quantities or charges.
   *
   * @param newValue - New setting value.
   */
  private handleBadgeSettingChange(newValue: number): void {
    this.cpmBadge = newValue;
    this.potionComponent.update(this.activePotion?.item, this.cpmBadge);

    if (!this.activePotion?.item || this.cpmBadge === 0) return;

    this.cpmBadge === 2
      ? this.potionComponent.updateCharges()
      : this.potionComponent.updateQty(this.activePotion?.item);

    this.potionComponent.updateBadgeInfo();
  }

  /**
   * Handles changes for the 'cpm-potion-button' setting.
   * Enables or disables the potion button.
   * @param newValue - New setting value.
   */
  private handleButtonSettingChange(newValue: boolean): void {
    this.cpmDisabled = newValue;
    const cpm = document.getElementById('ags-cpm-potion-container');

    if (this.cpmDisabled) {
      cpm?.remove();
      return;
    }

    // if potion component already exists, don't load again
    if (cpm) return;

    this.load();
    this.potionComponent.update(this.activePotion?.item, this.cpmBadge);
  }

  /**
   * Initializes the potion component and related functionalities.
   */
  private load(): void {
    const defaultPotionUrl = assets.getURI(
      'assets/media/skills/herblore/potion_empty.svg',
    );
    this.initPotionComponent(defaultPotionUrl);
    this.registerPotionEventHandlers();
    this.initTooltip();
  }

  /**
   * Initializes the potion component with its properties and methods.
   */
  private initPotionComponent(defaultPotionUrl: string): void {
    const that = this;
    this.potionComponent = {
      $template: '#ags-cpm-potion-root',
      tooltipShowing: false,
      potionImageUrl: this.activePotion?.item.media ?? defaultPotionUrl,
      potionActive: Boolean(this.activePotion),
      showOption: this.cpmBadge ?? 1,
      potionQty: this.activePotion
        ? game.bank.getQty(this.activePotion.item)
        : 0,

      potionCharges: this.activePotion?.charges ?? 0,
      badgeInfo: {
        text: '',
        badge: '',
        value: '',
      },

      update(potion: PotionItem | undefined, cpmBadge?: number): void {
        this.potionActive = Boolean(potion);

        if (potion) {
          if (cpmBadge) this.showOption = cpmBadge;
          this.updateQty(potion);
          this.updateCharges();
          this.updateImg(potion.media);
        } else this.updateImg(undefined);

        this.updateBadgeInfo();
      },
      updateImg(url: string | undefined) {
        this.potionImageUrl = url === undefined ? defaultPotionUrl : url;
      },
      updateQty(potion: PotionItem) {
        this.potionQty = game.bank.getQty(potion);
      },
      updateCharges() {
        this.potionCharges = game.potions.activePotions.get(game.combat)
          ?.charges;
      },
      updateBadgeInfo() {
        this.badgeInfo = that.badgeInfo;
      },
      updateTooltipPresence(state: boolean) {
        this.tooltipShowing = state;
      },
      handleImageClick: () => game.potions.openPotionSelectOnClick(game.combat),
    };

    this.potionComponent.badgeInfo = this.badgeInfo;
    ui.create(this.potionComponent, this.resizedCombatMenuItems());
  }

  /**
   * Generates badge information based on the current badge setting.
   * @returns The badge information object.
   */
  private get badgeInfo() {
    const badgeOptions = {
      1: {
        text: 'black',
        badge: 'warning',
        value: this.potionComponent.potionQty,
      },
      2: {
        text: 'white',
        badge: 'danger',
        value: this.potionComponent.potionCharges,
      },
    };

    return (
      badgeOptions[this.cpmBadge as keyof typeof badgeOptions] || {
        text: 'none',
        badge: 'none',
        value: '',
      }
    );
  }

  /**
   * Registers event handlers related to potion charges and updates.
   * @patch {PotionManager} usePotion - after
   * @patch {PotionManager} removePotion - after
   */
  private registerPotionEventHandlers(): void {
    game.potions._events.on('chargeUsed', (e) => {
      if (e.potion.action !== game.combat || this.cpmBadge !== 2) return;
      this.potionComponent.updateCharges();
      this.potionComponent.updateBadgeInfo();
    });

    // Patch methods to update the component when potions are used or removed.
    this.ctx
      .patch(PotionManager, 'usePotion')
      .after((_, potion: PotionItem) => {
        if (potion.action !== game.combat || this.cpmDisabled) return;
        this.potionComponent.update(potion, this.cpmBadge);
        this.updateTooltipContent();
      });

    this.ctx.patch(PotionManager, 'removePotion').after((_, action) => {
      if (action !== game.combat || this.cpmDisabled) return;
      this.potionComponent.update(undefined);
      this.updateTooltipContent();
    });
  }

  /**
   * Initializes the tooltip with default settings and content.
   * @patch {EquipmentSetMenu} getTooltipContent - after
   */
  private initTooltip(): void {
    const that = this;
    // Create tooltip instance with default configuration.
    this.potionTooltip = tippy('#ags-cpm-potion-image', {
      content: 'initial',
      placement: 'bottom',
      allowHTML: true,
      interactive: false,
      animation: false,
      onShow() {
        that.potionComponent.updateTooltipPresence(true);
      },
      onHide() {
        that.potionComponent.updateTooltipPresence(false);
      },
    });

    // Update tooltip content on initial load.
    this.updateTooltipContent();

    // Patch the equip set tooltip content to include the assigned potion.
    this.ctx.patch(EquipmentSetMenu, 'getTooltipContent').after(function (
      html: string,
      set: EquipmentSet,
    ) {
      const index = game.combat.player.equipmentSets.findIndex(
        (s) => s === set,
      );
      const assignedPot = that.storage.getAssignedPotionForSet(index);

      if (!assignedPot) return;

      // Remove the last occurrence of '</div>'
      if (html.endsWith('</div>'))
        html = html.substring(0, html.lastIndexOf('</div>'));

      // get the assigned option object.
      const potion = that.storage.getPotionFromID(assignedPot);

      // Add the potion to the tooltip content.
      let potionHTML = '';
      if (potion) potionHTML += this.getTooltipRow(potion.media, potion.name);

      // Only add if the tooltip doesn't already contain a potion.
      if (potionHTML.length > 0 && !html.includes('ags-tooltip')) {
        html += `<span class="text-info ags-tooltip">${getLangString(
          'GAME_GUIDE_135',
        )}</span><br>${potionHTML}`;
        return html;
      } else return;
    });
  }

  /**
   * Updates the tooltip content with the currently active potion's name.
   */
  private updateTooltipContent = () => {
    const newContent = `<div class='text-center media-body'><div class="mb-1">${
      this.activePotion?.item.name ?? getLangString('MISC_STRING_22')
    }</div>
    <div class="font-size-xs font-w400 ml-1 mr-1 mb-1 text-info">${
      this.activePotion?.item.modifiedDescription ?? ''
    }</div>
    </div>`;
    this.potionTooltip[0].setContent(newContent);
  };

  /**
   * @returns {Element} The resized combat menu items container.
   */
  private resizedCombatMenuItems(): Element {
    const combatMenuItems = document.getElementById('combat-player-container')
      ?.firstElementChild;

    // remove the margin from the potion icons
    if (combatMenuItems)
      combatMenuItems.querySelectorAll('img').forEach((img) => {
        img.classList.replace('m-1', 'm-01');
      });

    return combatMenuItems as Element;
  }
}

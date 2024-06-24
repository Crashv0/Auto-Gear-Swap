import { StorageManager } from '../managers/StorageManager';

export interface ToggleObserver {
  onToggleChange(settingName: string, newValue: any, oldValue?: any): void;
}

/**
 * Class representing a toggle button in the combat window for auto gear swapping.
 */
export class CombatWindowToggle {
  private ctx: Modding.ModContext;
  private storage: StorageManager;
  private autoSwap: boolean;
  private autoPotion: boolean;
  private observers: ToggleObserver[] = [];

  constructor(ctx: Modding.ModContext, storage: StorageManager) {
    this.ctx = ctx;
    this.storage = storage;
    this.autoSwap = this.storage.getAutoSwapEnabled;
    this.autoPotion = this.storage.getAutoPotionEnabled;

    this.ctx.onInterfaceReady(() => this.initToggles());
  }

  private initToggles() {
    const equipSetEl = document.getElementById(
      'combat-equipment-set-container-0',
    );

    if (!equipSetEl) {
      console.error(
        "[AGS] Couldn't find the combat equipment set container to insert the toggle.",
      );
      return;
    }

    if (equipSetEl.querySelector('#ags-toggle-container')) return;

    // create the toggle buttons
    ui.create(
      {
        $template: '#ags-toggle-root',
        autoSwapValue: this.autoSwap,
        toggleSwap: () => this.toggleSwapEnabled(),
        autoPotionValue: this.autoPotion,
        togglePotion: () => this.togglePotionEnabled(),
      },
      equipSetEl,
    );
  }

  /**
   * Toggles auto swap enabled status and saves to character storage.
   * @private
   */
  private toggleSwapEnabled(): void {
    this.autoSwap = !this.autoSwap;
    this.storage.setAutoSwapEnabled(this.autoSwap);
    this.notifyObservers('autoSwap', this.autoSwap);
  }

  /**
   * Toggles auto potion enabled status and saves to character storage.
   * @private
   */
  private togglePotionEnabled(): void {
    this.autoPotion = !this.autoPotion;
    this.storage.setAutoPotionEnabled(this.autoPotion);
    this.notifyObservers('autoPotion', this.autoPotion);
  }

  /**
   * Adds an observer to the list of observers for this Toggle instance.
   * @param observer - The observer to add.
   */
  public addObserver(observer: ToggleObserver): void {
    this.observers.push(observer);
  }

  /**
   * Notifies all registered observers of a change in a setting's value.
   * @param settingName - The name of the setting that has changed.
   * @param newValue - The new value of the setting.
   */
  private notifyObservers(
    settingName: string,
    newValue: any,
    oldValue?: any,
  ): void {
    for (const observer of this.observers) {
      observer.onToggleChange(settingName, newValue, oldValue);
    }
  }
}

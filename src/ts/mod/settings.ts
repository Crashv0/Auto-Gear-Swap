export interface SettingsObserver {
  onSettingsChange(settingName: string, newValue: any, oldValue?: any): void;
}

export class ModSettings {
  private observers: SettingsObserver[] = [];

  constructor(private ctx: Modding.ModContext) {
    this.ctx.settings.section('General').add([
      {
        type: 'radio-group',
        name: 'cpm-potion-badge',
        label: 'Combat Menu Badge',
        hint: '',
        default: 1,
        onChange: (newVal: number, oldVal: number) => {
          this.notifyObservers('cpm-potion-badge', newVal, oldVal);
        },
        options: [
          {
            value: 0,
            label: 'Disabled',
            hint: '',
          },

          {
            value: 1,
            label: 'Quantity',
            hint: '',
          },
          {
            value: 2,
            label: 'Charges',
            hint: '',
          },
        ],
      } as unknown as Modding.Settings.RadioGroupConfig,
      {
        type: 'switch',
        name: 'disable-notifications',
        label: 'Disable notifications',
        hint: '',
        default: false,
      } as Modding.Settings.SwitchConfig,
      {
        type: 'switch',
        name: 'cpm-potion-button',
        label: 'Disable Combat Potion Menu',
        hint: '',
        default: false,
        onChange: (value: boolean) => {
          this.notifyObservers('cpm-potion-button', value);
        },
      } as unknown as Modding.Settings.SwitchConfig,
      {
        type: 'switch',
        name: 'hide-toggles',
        label: 'Hide toggle switches on combat page',
        hint: '',
        default: false,
        onChange(value: boolean) {
          const toggleContainer = document.getElementById(
            'ags-toggle-container',
          );
          if (toggleContainer)
            value ? hideElement(toggleContainer) : showElement(toggleContainer);
        },
      } as unknown as Modding.Settings.SwitchConfig,
    ]);
  }

  /**
   * Adds an observer to the list of observers for this StorageManager instance.
   * @param observer - The observer to add.
   */
  public addObserver(observer: SettingsObserver): void {
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
      observer.onSettingsChange(settingName, newValue, oldValue);
    }
  }
}

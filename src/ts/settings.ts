// Section and setting names are what players' saved settings are stored under;
// renaming them would reset everyone's choices.
const SECTION = 'General';
const BADGE = 'cpm-potion-badge';
const NO_NOTIFICATIONS = 'disable-notifications';
const NO_POTION_BUTTON = 'cpm-potion-button';
const HIDE_TOGGLES = 'hide-toggles';

/** What the combat potion button's badge shows. */
export const Badge = { Off: 0, Quantity: 1, Charges: 2 } as const;
export type Badge = (typeof Badge)[keyof typeof Badge];

export interface Settings {
  badge(): Badge;
  notificationsDisabled(): boolean;
  potionButtonDisabled(): boolean;
}

/** Reactions to settings changed in the settings menu. */
export interface SettingsHandlers {
  badgeChanged(badge: Badge): void;
  potionButtonDisabled(disabled: boolean): void;
  togglesHidden(hidden: boolean): void;
}

// What a mod hands to `section.add`. The game fills in rendering and value
// handling itself; melvor-types only describes that resolved config.
interface RadioInput {
  type: 'radio-group';
  name: string;
  label: string;
  hint: string;
  default: number;
  options: { value: number; label: string; hint: string }[];
  onChange(value: number): void;
}

interface SwitchInput {
  type: 'switch';
  name: string;
  label: string;
  hint: string;
  default: boolean;
  onChange?(value: boolean): void;
}

const isBadge = (value: unknown): value is Badge =>
  value === Badge.Off || value === Badge.Quantity || value === Badge.Charges;

/** Registers the mod's settings and returns typed readers for them. */
export function registerSettings(
  ctx: Modding.ModContext,
  handlers: SettingsHandlers,
): Settings {
  const section = ctx.settings.section(SECTION);
  const inputs: (RadioInput | SwitchInput)[] = [
    {
      type: 'radio-group',
      name: BADGE,
      label: 'Combat Menu Badge',
      hint: '',
      default: Badge.Quantity,
      options: [
        { value: Badge.Off, label: 'Disabled', hint: '' },
        { value: Badge.Quantity, label: 'Quantity', hint: '' },
        { value: Badge.Charges, label: 'Charges', hint: '' },
      ],
      onChange: (value) => {
        if (isBadge(value)) handlers.badgeChanged(value);
      },
    },
    {
      type: 'switch',
      name: NO_NOTIFICATIONS,
      label: 'Disable notifications',
      hint: '',
      default: false,
    },
    {
      type: 'switch',
      name: NO_POTION_BUTTON,
      label: 'Disable Combat Potion Menu',
      hint: '',
      default: false,
      onChange: (value) => handlers.potionButtonDisabled(value),
    },
    {
      type: 'switch',
      name: HIDE_TOGGLES,
      label: 'Hide toggle switches on combat page',
      hint: '',
      default: false,
      onChange: (value) => handlers.togglesHidden(value),
    },
  ];
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the game completes these configs; see RadioInput.
  section.add(inputs as unknown as Modding.Settings.SettingConfig[]);

  return {
    badge: () => {
      const value: unknown = section.get(BADGE);
      return isBadge(value) ? value : Badge.Quantity;
    },
    notificationsDisabled: () => section.get(NO_NOTIFICATIONS) === true,
    potionButtonDisabled: () => section.get(NO_POTION_BUTTON) === true,
  };
}

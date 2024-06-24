import { AutoGearSwap } from './managers/SwapManager';
import { StorageManager } from './managers/StorageManager';
import { AutoPotionManager } from './managers/PotionManager';
import { PotionSelectInterface } from './ui/PotionSelectInterface';
import { CombatPotionMenu } from './ui/CombatPotionMenu';
import { PotionNotifications } from './ui/Notifications';
import { CombatWindowToggle } from './ui/Toggle';
import { ModSettings } from './settings';

export class Main {
  private storageManager: StorageManager;
  private modSettings: ModSettings;
  private potionManager: AutoPotionManager;
  constructor(private ctx: Modding.ModContext) {}
  public init() {
    this.modSettings = new ModSettings(this.ctx);
    this.ctx.onCharacterLoaded(() => {
      this.storageManager = new StorageManager(this.ctx);
      const potionNotifications = new PotionNotifications(this.ctx);
      this.potionManager = new AutoPotionManager(
        this.ctx,
        this.storageManager,
        potionNotifications,
      );

      const autoSwapManager = new AutoGearSwap(
        this.ctx,
        this.potionManager,
        this.storageManager,
      );
      const combatWindowToggle = new CombatWindowToggle(
        this.ctx,
        this.storageManager,
      );
      combatWindowToggle.addObserver(this.potionManager);
      const potionSelectDropdown = new PotionSelectInterface(
        this.ctx,
        this.storageManager,
      );
    });

    this.ctx.onInterfaceReady(() => {
      const combatMenuPotion = new CombatPotionMenu(
        this.ctx,
        this.storageManager,
      );
      this.modSettings.addObserver(combatMenuPotion);
    });
  }
}

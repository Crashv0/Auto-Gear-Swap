/** The mod's notifications, in the game's notification style. */
export interface Notify {
  success(media: string, message: string): void;
  error(id: string, message: string): void;
}

export function createNotify(ctx: Modding.ModContext): Notify {
  return {
    success(media, message) {
      if (game.settings.useLegacyNotifications)
        imageNotify(media, message, 'success');
      else
        game.notifications.createSuccessNotification(
          message,
          message,
          media,
          -1,
        );
    },
    error(id, message) {
      const notification = game.notifications.newAddErrorNotification(id);
      if (notification === undefined) return;
      game.notifications.addNotification(notification, {
        media: ctx.getResourceUrl('img/agsp-icon.png'),
        quantity: 0,
        text: message,
        isImportant: game.settings.importanceErrorMessages,
        isError: true,
      });
    },
  };
}

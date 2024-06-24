export class PotionNotifications {
  constructor(private ctx: Modding.ModContext) {}
  /**
   * Sends a game notification.
   * @param {any} media The media content for the notification.
   * @param {string} message The message content of the notification.
   * @param {any} messageTheme The theme of the notification (e.g., 'success', 'danger', 'info').
   * @param {number} quantity The quantity for the notification content (default is 0).
   */
  public sendNotif = (
    media: any,
    message: string,
    messageTheme: any = 'success',
    quantity = 0,
  ) => {
    if (!media) media = 'assets/media/main/question.svg';
    if (!game.settings.useLegacyNotifications) {
      switch (messageTheme) {
        case 'danger':
          game.notifications.createErrorNotification(message, message);
          break;
        case 'success':
          game.notifications.createSuccessNotification(
            message,
            message,
            media,
            quantity,
          );
          break;
        case 'info':
          game.notifications.createInfoNotification(
            message,
            message,
            media,
            quantity,
          );
          break;
      }
    } else imageNotify(media, message, messageTheme);
  };

  public sendErrorNotif(customID: string, msg: string) {
    const notification = this.genericNotificationData;
    notification.quantity = 0;
    notification.text = msg;
    notification.isImportant = game.settings.importanceErrorMessages;
    notification.isError = true;
    const errorNotification =
      game.notifications.newAddErrorNotification(customID);
    if (errorNotification !== undefined)
      game.notifications.addNotification(errorNotification, notification);
  }

  get genericNotificationData() {
    const icon = 'https://i.ibb.co/yy5vxKV/agsp-icon.png';
    return {
      media: icon ?? cdnMedia('assets/media/main/question.svg'),
      quantity: 0,
      text: '',
      isImportant: false,
      isError: false,
    };
  }
}

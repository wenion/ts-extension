export const PopupToExtensionEvent = {
  USER_LOGIN: "USER_LOGIN",
  USER_LOGOUT: "USER_LOGOUT",
  NOTIFICATION: "NOTIFICATION",
} as const;

export type PopupToExtensionEvent =
  (typeof PopupToExtensionEvent)[keyof typeof PopupToExtensionEvent];

// config/messenger.ts

export const MESSENGER_CONFIG = {
  PAGE_TAG: process.env.NEXT_PUBLIC_MESSENGER_PAGE_TAG ?? "MY_PAGE",
  EXT_TAG: process.env.NEXT_PUBLIC_MESSENGER_EXT_TAG ?? "MY_EXTENSION",
  TARGET_ORIGIN:
    process.env.NEXT_PUBLIC_MESSENGER_TARGET_ORIGIN ??
    (typeof window !== "undefined" ? window.location.origin : "*"),
};

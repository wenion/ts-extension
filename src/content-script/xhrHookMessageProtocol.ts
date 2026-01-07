
export const MESSAGE_SOURCE = {
  CONTENT: "content",
  INJECTED: "injected",
} as const;

export const XHR_COMMAND = {
  ENABLE: "ENABLE_XHR_HOOK",
  DISABLE: "DISABLE_XHR_HOOK",
} as const;

export type XHRHookConfig = {
  methods?: string[];
  url?: string[];
};

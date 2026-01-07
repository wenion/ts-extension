import {
  MESSAGE_SOURCE,
  XHR_COMMAND,
  XHRHookConfig,
} from "./xhrHookMessageProtocol";

export const attachXHR = (config?: XHRHookConfig) => {
  window.postMessage(
    {
      source: MESSAGE_SOURCE.CONTENT,
      command: XHR_COMMAND.ENABLE,
      config,
    },
    window.location.origin
  );
}

export const detachXHR = () => {
  window.postMessage(
    {
      source: MESSAGE_SOURCE.CONTENT,
      command: XHR_COMMAND.DISABLE,
    },
    window.location.origin
  );
}

export const injectPageScript = (onLoad?: () => void) => {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("injected.js");

  script.addEventListener("load", () => {
    try {
      onLoad?.();
    } finally {
      script.remove();
    }
  });

  (document.head || document.documentElement).appendChild(script);
}

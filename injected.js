(() => {
  "use strict";

  function initHandler(event) {
    if (event.source !== window) return;

    const msg = event.data;
    if (!msg || msg.source !== "content") return;

    if (msg.command === "ENABLE_XHR_HOOK") {
      attachXHRInterceptor(msg.config);
    }

    if (msg.command === "DISABLE_XHR_HOOK") {
      deinit();
    }
  };

  function deinit() {
    detachXHRInterceptor();
    window.removeEventListener("message", initHandler);
  };

  let originalOpen = null;
  let originalSend = null;

  function attachXHRInterceptor(filter) {
    if (originalOpen) return;

    originalOpen = XMLHttpRequest.prototype.open;
    originalSend = XMLHttpRequest.prototype.send;

    const match = (method, url) => {
      // Hooks everything if filter is missing
      if (!filter) return true;

      if (filter.methods && !filter.methods.includes(method.toUpperCase())) {
        return false;
      }

      return true;
    };

    XMLHttpRequest.prototype.open = function (method, url) {
      this.__xhrMeta = { method, url };

      this.__xhrMatched = match(method, url);

      return originalOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function (body) {
      if (this.__xhrMatched) {
        window.postMessage(
          {
            source: "injected",
            meta: this.__xhrMeta,
            body: body,
          },
          window.location.origin
        );
      }
      return originalSend.apply(this, arguments);
    };
  }

  function detachXHRInterceptor() {
    if (!originalOpen) return;

    XMLHttpRequest.prototype.open = originalOpen;
    XMLHttpRequest.prototype.send = originalSend;

    originalOpen = null;
    originalSend = null;
  }

  window.addEventListener("message", initHandler);
})();
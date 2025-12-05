// injected.js
function postMessageToContentScript(data) {
  window.postMessage(
    {
      source: "MY_INJECTED",
      payload: data,
    },
    "*"
  );
}

// installApiRequestTracker
(function () {
  const host = location.host;
  if (host !== "docs.google.com") return;

  // ---- Intercept XHR ----
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    this._method = method;
    this._url = url;
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function (body) {
    if (this._method === "POST") {
      if (this._url.includes("/save")) {
        // Parse body as URLSearchParams
        const params = new URLSearchParams(body);
        const bundlesRaw = params.get("bundles");

        // Decode nested JSON
        const bundles = JSON.parse(decodeURIComponent(bundlesRaw));
        try {
          const content = bundles[0].commands[0];
          const type = content.ty;
          let data = {
            endpoint: "save",
            method: this._method,
            url: window.location.href,
            pageType: "editor",
            author: "human",
            eventTime: new Date().toISOString(),
          }

          if (type === "is") {
            const ibi = content.ibi;
            const text = content.s;
            data = {
              ...data,
              eventType: "is",
              eventValue: text,
              startPosition: ibi,
            }
            postMessageToContentScript(data);
          }
          else if (type === "ds") {
            const si = content.si;
            const ei = content.ei;
            data = {
              ...data,
              eventType: "ds",
              eventValue: "",
              startPosition: si,
              endPosition: ei,
            }
            postMessageToContentScript(data);
          }
          else if (type === "mlti") {
            const mts = content.mts;
            mts.forEach(item => {
              if (item.ty === "is") {
                const ibi = item.ibi;
                const text = item.s;
                data = {
                  ...data,
                  eventType: "is",
                  eventValue: text,
                  startPosition: ibi,
                }
                postMessageToContentScript(data);
              }
              else if (item.ty === "ds") {
                const si = item.si;
                const ei = item.ei;
                data = {
                  ...data,
                  eventType: "ds",
                  eventValue: "",
                  startPosition: si,
                  endPosition: ei,
                }
                postMessageToContentScript(data);
              }
            });
          }
          else {
            console.log("unknown type:", type);
          }
        } catch {
          console.log("bundles exception:");
        }
      }
      if (this._url.includes("/assistwriting")) {
        try {
          const content = JSON.parse(body);
          const suggestionText = content[0][0];
          const language = content[0][2];
          const documentTitles = content[0][5].join(",");
          const documentId = content[0][8];
          const sessionId = content[0][9];
          const data = {
            endpoint: "assistwriting",
            eventType: "assistwriting",
            eventState: suggestionText,
            sessionId: documentId,
            eventTime: new Date().toISOString(),
            url: window.location.href,
            pageType: "editor",
            author: "human",
          }

          postMessageToContentScript(data);

        } catch {
          console.log("Body string:", body);
        }
      }
    }
    return originalSend.apply(this, arguments);
  };
})();

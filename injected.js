function postMessageToContentScript(data) {
  window.postMessage(
    {
      source: "MY_PAGE",
      type: "trace",
      payload: data,
    },
    "*"
  );
}

(function () {
  const host = location.host;
  if (host !== "docs.google.com") return;

  console.log("Intercepting network requests on Google Docs...");

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
        // console.log("save body", body)
        const params = new URLSearchParams(body);

        const rev = params.get("rev");
        const bundlesRaw = params.get("bundles");

        // Decode nested JSON
        const bundles = JSON.parse(decodeURIComponent(bundlesRaw));
        try {
          const content = bundles[0].commands[0];
          const type = content.ty;
          if (type === "is") {
            const ibi = content.ibi;
            const text = content.s;
            console.log("insert content:", text, "at index:", ibi);
            const data = {
              eventType: "assistwriting",
              subType: "insert",
              eventState: text,
              cursorPosition: ibi,
              pageType: "editor",
              author: "human",
            }
            postMessageToContentScript(data)
          }
          else if (type === "ds") {
            const startIndex = content.si;
            const endIndex = content.ei;
            console.log("delete at index:", startIndex, "to", endIndex);
            const data = {
              eventType: "assistwriting",
              subType: "delete",
              eventState: "",
              cursorPosition: startIndex,
              pageType: "editor",
              author: "human",
            }
            postMessageToContentScript(data)
          }
          else if (type === "mlti") {
            const mts = content.mts;
            console.log("multi-line :", mts);
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
          const data = {
            eventType: "assistwriting",
            subType: "content",
            eventState: content[0][0],
            pageType: "editor",
            author: "human",
          }

          console.log("Assist Writing Data:", data.eventState);
          postMessageToContentScript(data);

          // window.postMessage(
          //   {
          //     source: "MY_PAGE",
          //     type: "trace",
          //     payload: data,
          //   },
          //   "*"
          // );
        } catch {
          console.log("Body string:", body);
        }
      }
    }
    return originalSend.apply(this, arguments);
  };
})();

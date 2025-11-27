export function captureGoogleDocsEvents() {
  console.log("captureGoogleDocsEvents");
  const interceptXHR = () => {
    console.log("Setting up Google Docs XHR interception>>>");
    const originalSend = XMLHttpRequest.prototype.send;
    const originalOpen = XMLHttpRequest.prototype.open;

    let xhrMethod = "";
    let xhrUrl = "";
    
    XMLHttpRequest.prototype.open = function (method, url) {
      xhrMethod = method;
      xhrUrl = url;
      console.log("Google Docs XHR open:", method, url);
      return originalOpen.apply(this, arguments);
    };
    console.log("XMLHttpRequest.prototype.open", XMLHttpRequest.prototype.open);

    XMLHttpRequest.prototype.send = function (body) {
      if (xhrMethod === "POST") {
        console.log("Google Docs XHR POST to:", xhrUrl);
        if (xhrUrl.includes("/save")) {
          console.log("/save")
          if (body instanceof FormData) {
            const data = {};
            body.forEach((value, key) => { data[key] = value });
            console.log("FormData:", data);
          }

        }
        // if (url.pathname.endsWith("/assistwriting")) {
        if (xhrUrl.includes("/assistwriting")) {
          console.log("/assistwriting")
          try {
            const content = JSON.parse(body);
            console.log("JSON:", content[0][0] );
          } catch {
            console.log("Body string:", body);
          }
        }
      }

      return originalSend.call(this, body);
    };
  };

  setTimeout(interceptXHR, 10000);
}
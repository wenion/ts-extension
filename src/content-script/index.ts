import { now } from "../shared/util";

console.log("[cs] injected at", now());

// Example: send a message to background
chrome.runtime.sendMessage({ type: "PING" }, (res) => {
  console.log("[cs] got response:", res);
});

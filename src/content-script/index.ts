import { now } from "../shared/util";
import { addMutationEventListener, removeMutationEventListener } from "./mutationObserver";
import {
  addGoogleDocsEventListener,
  removeGoogleDocsEventListener,
  googleDocsHandler,
} from "./googleDocs";
import {
  pointerDownHandler,
  keyDownHandler,
  changeHandler,
  inputHandler,
  cutHandler,
  copyHandler,
  pasteHandler,
  chatgptMutationHandler,
  geminiMutationHandler,
  claudeMutationHandler,
} from "./onEventHandlers";

// Global variables
// MutationObserver instance
let observer: MutationObserver | null = null;
// For Google Docs
let contentEditableElement: HTMLElement | null = null;
// let contentPanelElement: HTMLDivElement | null = null;
// overleaf editor
let editor: HTMLElement | null = null;

const onMessage = (
  msg: any,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (res?: any) => void
) => {
  if (msg.type === "CONTENT_SCRIPT_LOADED_ACK") {
  }
  else if (msg.type === "REMOVE_CONTENT_SCRIPT") {
    deinit();

    if (!!editor) {
      editor.removeEventListener('keydown', keyDownHandler);
      editor.removeEventListener('cut', cutHandler);
      editor.removeEventListener('copy', copyHandler);
      editor.removeEventListener('paste', pasteHandler);
      editor.removeEventListener('input', inputHandler);
      editor = null;
    }
    removeMutationEventListener(observer);
    removeGoogleDocsEventListener();
    if (contentEditableElement) {
      // contentEditableElement.removeEventListener('keydown', keyDownHandler);
      contentEditableElement.removeEventListener('cut', cutHandler);
      contentEditableElement.removeEventListener('copy', copyHandler);
      contentEditableElement.removeEventListener('paste', pasteHandler);
      contentEditableElement = null;
    }
    // if (contentPanelElement) {
    //   contentPanelElement.removeEventListener("pointerdown", pointerDownHandler);
    //   contentPanelElement = null;
    // }
    sendResponse({ ok: true, from: "content-script", at: now() });
    chrome.runtime.onMessage.removeListener(onMessage);
  }
  else if (msg.type === "PING") {
    sendResponse({ ok: true, from: "content-script", at: now() });
  }
}

// Listen to messages from the background
chrome.runtime.onMessage.addListener(onMessage);

const init = () => {
  document.addEventListener("pointerdown", pointerDownHandler);
  document.addEventListener("keydown", keyDownHandler);
  document.addEventListener("change", changeHandler);
  document.addEventListener("input", inputHandler);
  document.addEventListener("copy", copyHandler);
  document.addEventListener("cut", cutHandler);
  document.addEventListener("paste", pasteHandler);
};

const deinit = () => {
  document.removeEventListener("pointerdown", pointerDownHandler);
  document.removeEventListener("keydown", keyDownHandler);
  document.removeEventListener("change", changeHandler);
  document.removeEventListener("input", inputHandler);
  document.removeEventListener("copy", copyHandler);
  document.removeEventListener("cut", cutHandler);
  document.removeEventListener("paste", pasteHandler);
};


chrome.runtime.sendMessage({
  type: "CONTENT_SCRIPT_LOADED",
  payload: { url: window.location.href }
}).then(res => {
  if (res.ok) {
    if (res.origin === "chatgpt") {
      init();
      const chatgptMutationConfig = {
        childList: true, // Watch for addition or removal of child nodes
        // attributes: true, // Watch for changes to attributes
        subtree: true,   // Watch for changes in descendant nodes
        characterData: true, // Text content changed
      };
      observer = addMutationEventListener(
        document.body,
        chatgptMutationConfig,
        chatgptMutationHandler()
      )
    }
    else if (res.origin === "google_docs") {
      const iframe = document.querySelector('iframe.docs-texteventtarget-iframe') as HTMLIFrameElement | null;
      if (iframe && iframe.contentDocument) {
        contentEditableElement = iframe.contentDocument.querySelector('[contenteditable="true"]');
        if (contentEditableElement) {
          console.log("Google Docs contentEditable element found.");
          // contentEditableElement.addEventListener('keydown', keyDownHandler);
          contentEditableElement.addEventListener('copy', copyHandler);
          contentEditableElement.addEventListener('cut', cutHandler);
          contentEditableElement.addEventListener('paste', pasteHandler);
        }
      }
      // contentPanelElement = document.querySelector(".kix-appview-editor") as HTMLDivElement | null;
      // if (contentPanelElement) {
      //   contentPanelElement.addEventListener("pointerdown", pointerDownHandler);
      // }
      const googleDocsConfig = {
        methods: ["POST"],
        url: ["/save", "/assistwriting"]
      };
      addGoogleDocsEventListener(
        googleDocsConfig,
        googleDocsHandler()
      );
    }
    else if (res.origin === "gemini") {
      init();
      const geminiMutationConfig = {
        childList: true,
        attributes: true,
        attributeFilter: ["id"],
        subtree: true,
        characterData: true,
      };
      observer = addMutationEventListener(
        document.body,
        geminiMutationConfig,
        geminiMutationHandler()
      )
    }
    else if (res.origin === "overleaf") {
      const observer = new MutationObserver((mutationList: MutationRecord[], observer: MutationObserver) => {
        editor = document.querySelector(".cm-content[contenteditable='true']") as HTMLElement | null;

        if (editor) {
          // initialization
          editor.addEventListener('keydown', keyDownHandler);
          editor.addEventListener('input', inputHandler);
          editor.addEventListener('cut', cutHandler);
          editor.addEventListener('copy', copyHandler);
          editor.addEventListener('paste', pasteHandler);

          // stop observing (optional)
          observer.disconnect();
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
    }
    else if (res.origin === "claude") {
      init();
      const claudeMutationConfig = {
        childList: true,
        attributes: true,
        subtree: true,
        characterData: true,
      };
      observer = addMutationEventListener(
        document.body,
        claudeMutationConfig,
        claudeMutationHandler()
      )
    }
    else {
      init();
    }
  }
});

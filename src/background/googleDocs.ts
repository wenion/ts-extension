import { bus } from "./bus";
import type { GoogleDocType } from "./googleDocsType";
import type { GoogleDocsMeta } from "../shared/types";

type DocState = {
  preState?: string;
  state: string;
  letter?: string;
  startPosition?: number;
  endPosition?: number;
  piece?: string;
  lastUpdated: number; // timestamp (e.g., Date.now())
  requestId: number;
  index: number;
  url: string;
  type: string;
};

const currentMap = new Map<string, DocState>();

let identityToken: string | null = null;

// TODO check
async function requestToken(interactive: boolean): Promise<string> {
  const result = await chrome.identity.getAuthToken({ interactive });
  if (!result?.token) {
    throw new Error("No token returned");
  }

  return result.token;
}

export function getDocIdFromUrl(url: string) {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

async function fetchDocContent(documentId: string) {
  if (!identityToken) {
    try {
      identityToken = await requestToken(false); // silent first
    } catch {
      identityToken = await requestToken(true); // fallback
    }
  }

  let res = await fetch(
    `https://docs.googleapis.com/v1/documents/${documentId}`,
    {
      headers: {
        Authorization: `Bearer ${identityToken}`,
      },
    }
  );

  if (res.status === 401) {
    identityToken = await requestToken(true);

    res = await fetch(
      `https://docs.googleapis.com/v1/documents/${documentId}`,
      {
        headers: {
          Authorization: `Bearer ${identityToken}`,
        },
      }
    );
  }

  if (!res.ok) {
    throw new Error(`Google Docs API error: ${res.status}`);
  }

  const data = await res.json();
  return data;
}

function getDocContent(doc: GoogleDocType) {
  let text = "";

  doc.body.content.forEach((element) => {
    if (element.paragraph) {
      element.paragraph.elements.forEach((el) => {
        if (el.textRun) {
          text += el.textRun.content;
        }
      });
    }
  });

  return text;
}

async function loadDocContent(id: string): Promise<string> {
  const doc = await fetchDocContent(id);
  const content = getDocContent(doc);
  return content;
}

function dispatchMessage(
  eventType: string,
  data: DocState,
) {
  bus.dispatchEvent(new CustomEvent("GOOGLE_DOCS_EVENT", {
    detail: {eventType, data}
  }));
}

export async function onNavigate(url: string) {
  const id = getDocIdFromUrl(url);
  if (!id) {
    console.warn("Could not extract document ID from URL:", url);
    return;
  }

  const content = await loadDocContent(id);
  const updated: DocState = {
    preState: "",
    state: content.endsWith("\n") ? content.slice(0, -1) : content,
    lastUpdated: Date.now(),
    requestId: 0,
    index: 0,
    type: "initial",
    url,
  }
  currentMap.set(id, updated);
  dispatchMessage("navigate", currentMap.get(id)!);
}

export async function onKeyStroke(data: GoogleDocsMeta) {
  const id = getDocIdFromUrl(data.url);
  if (!id) {
    console.warn("Could not extract document ID from URL:", data.url);
    return;
  }
  const current = currentMap.get(id);
  if (data.api === "save" && current) {
    if (data.type === "insert") {
      const piece = data.content;
      if (piece?.startsWith("\n")) {
        const state =
          current.state.slice(0, data.startPosition! - 1) +
          (piece + "\n").slice(1) +
          current.state.slice(data.startPosition! - 1);
        const updated: DocState = {
          preState: current.preState,
          state: state,
          lastUpdated: data.timestamp,
          requestId: data.requestId,
          index: data.index,
          letter: piece,
          startPosition: data.startPosition! - 1,
          endPosition: data.startPosition! - 1 + piece.length,
          type: "insert",
          url: data.url,
        };
        currentMap.set(id, updated);
      }
      else {
        const updated: DocState = {
          preState: current.preState,
          state: current.state.slice(0, data.startPosition! - 1) + piece + current.state.slice(data.startPosition! - 1),
          lastUpdated: data.timestamp,
          requestId: data.requestId,
          index: data.index,
          letter: piece,
          startPosition: data.startPosition! - 1,
          endPosition: data.startPosition! - 1 + (piece ? piece.length : 0),
          type: "insert",
          url: data.url,
        };
        currentMap.set(id, updated);
      }
    }
    else if (data.type === "delete") {
      const updated: DocState = {
        preState: current.preState,
        state: current.state.slice(0, data.startPosition! - 1) + current.state.slice(data.endPosition),
        lastUpdated: data.timestamp,
        requestId: data.requestId,
        index: data.index,
        letter: current.state.slice(data.startPosition! - 1, data.endPosition),
        startPosition: data.startPosition! - 1,
        endPosition: data.endPosition,
        type: "delete",
        url: data.url,
      };
      currentMap.set(id, updated);
    }
    else if (data.type === "spellcheck") {
      const updated: DocState = {
        preState: current.preState,
        state: current.state,
        letter: current.state.slice(data.startPosition! - 1, data.endPosition),
        lastUpdated: data.timestamp,
        requestId: data.requestId,
        index: data.index,
        startPosition: data.startPosition! - 1,
        endPosition: data.endPosition,
        type: "spellcheck",
        url: data.url,
      };
      currentMap.set(id, updated);
    }
    dispatchMessage("keystroke", currentMap.get(id)!);
  }
  else if (data.api === "assistwriting" && current) {
    const updated: DocState = {
      ...current,
      preState: data.content,
      lastUpdated: data.timestamp,
      type: "assistwriting",
      url: data.url,
    };
    currentMap.set(id, updated);
  }
}

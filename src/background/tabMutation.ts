type TabSession = {
  tabId: number;
  url: string;
  status: boolean;

  sessionId: number;

  timeoutId: ReturnType<typeof setTimeout> | null;
};

const sessions = new Map<number, TabSession>();

export function createTabMutation(tab: chrome.tabs.Tab) {
  if (!tab.id || !tab.url) return;

  const session: TabSession = {
    tabId: tab.id,
    url: tab.url,
    status: true,

    sessionId: 0,

    timeoutId: null
  };

  sessions.set(tab.id, session);

  reset(session);
}

export function updateTabMutation(tab: chrome.tabs.Tab) {
  if (!tab.id) return;

  const session = sessions.get(tab.id);

  if (!session) return;

  if (!session.status) return;

  if (tab.url) {
    session.url = tab.url;
  }

  reset(session);
}

export function checkTabMutation(tab: chrome.tabs.Tab): boolean {
  if (!tab.id) return false;

  const session = sessions.get(tab.id);

  if (!session) {
    return false;
  }

  return session.status;
}

function reset(session: TabSession, duration = 25000) {
  if (session.timeoutId) {
    clearTimeout(session.timeoutId);
  }

  session.sessionId += 1;

  const currentSessionId = session.sessionId;

  session.timeoutId = setTimeout(() => {
    // stale timer protection
    if (currentSessionId !== session.sessionId) {
      return;
    }

    session.status = false;
    session.timeoutId = null;

  }, duration);
}
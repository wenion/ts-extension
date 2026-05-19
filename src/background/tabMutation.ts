type TabSession = {
  tabId: number;
  url: string;
  status: boolean;
  loading: boolean;

  sessionId: number;

  timeoutId: ReturnType<typeof setTimeout> | null;
};

const sessions = new Map<number, TabSession>();

// Page load
export function startPageLoad(tabId: number, url: string) {
  if (!tabId || !url) return;

  const session: TabSession = {
    tabId: tabId,
    url: url,
    status: false,
    loading: true,

    sessionId: 0,

    timeoutId: null
  };

  sessions.set(tabId, session);

  setTimeout(() => finishPageLoad(tabId), 10000); // assume page load finishes in 10 seconds
}

function finishPageLoad(tabId: number) {
  const session = sessions.get(tabId);
  if (!session) return;

  session.loading = false;
  sessions.set(tabId, session);
}

// Click or Enter
export function startTabMutation(tab: chrome.tabs.Tab) {
  if (!tab.id) return;

  const session = sessions.get(tab.id);
  if (!session) return;
  if (session.loading) return;

  session.status = true;
  sessions.set(tab.id, session);
  reset(session);
}

export function updateTabMutation(tab: chrome.tabs.Tab) {
  if (!tab.id) return;

  const session = sessions.get(tab.id);

  if (!session) return;
  if (session.loading) return;

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

  if (session.loading) return false;

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

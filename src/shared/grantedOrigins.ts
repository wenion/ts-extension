const STORAGE_KEY = "grantedOrigins";

export async function getGrantedOrigins(): Promise<string[]> {
  const result = await chrome.storage.local.get({
    [STORAGE_KEY]: []
  });

  return result[STORAGE_KEY] as string[];
}

export async function setGrantedOrigins(origins: string[]) {
  await chrome.storage.local.set({
    [STORAGE_KEY]: origins
  });
}

function normalizeOrigin(url: string): string {
  return new URL(url).origin;
}

export async function addGrantedOrigin(url: string) {
  const origin = normalizeOrigin(url);
  const list = await getGrantedOrigins();

  if (list.includes(origin)) return;

  list.push(origin);
  await setGrantedOrigins(list);
}

export async function isOriginGranted(url: string): Promise<boolean> {
  const origin = normalizeOrigin(url);
  const list = await getGrantedOrigins();

  return list.includes(origin);
}

export async function removeGrantedOrigin(url: string) {
  const origin = normalizeOrigin(url);
  const list = await getGrantedOrigins();

  await setGrantedOrigins(list.filter(o => o !== origin));
}

export const now = () => new Date().toISOString();

export const getPageType = (url: string) => {
  if (!url) return "other";

  const host = new URL(url).host;

  // ---- AI Tools ----
  const aiDomains = [
    "chatgpt.com",
    "openai.com",
    "claude.ai",
    "gemini.google.com",
    "perplexity.ai",
    "notebooklm.google.com",
    "wordtune.com",
    "quillbot.com",
    "grammarly.com",
  ];

  if (aiDomains.some(d => host.endsWith(d))) {
    return "AI";
  }

  // ---- Editors ----
  const editorDomains = [
    "docs.google.com",
    "office.com",             // Word Online (https://word.office.com)
    "notion.so",
  ];

  if (editorDomains.some(d => host.endsWith(d))) {
    return "editor";
  }

  // ---- Everything else ----
  return "other";
}

export const getFormVisibleContainerId = (target: HTMLElement) => {
  const form = target.closest("form");
  if (form) {
    let formFields = Array.from(
      form.querySelectorAll("input, textarea, select, button")
    );

    formFields = formFields.filter(el => {
      // 1. Skip <input type="hidden">
      if (el instanceof HTMLInputElement && el.type === "hidden") {
      return false;
      }

      // 2. Skip elements hidden via CSS: display:none, visibility:hidden
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") {
      return false;
      }

      // 3. Skip disabled fields (optional — comment out if you want them)
      if ((el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).disabled) {
      return false;
      }

      return true;
    });

    const index = formFields.indexOf(target as HTMLElement) + 1;
    return index > 0 ? index : undefined;
  }
}

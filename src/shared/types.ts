export type TraceBase = {
  eventType: string;
  tag: string;
  subType: string;
  name: string;
  placeholder: string;
  innerText: string;
  textContent: string;
  //clientX: selectionStart for input[select event]
  //clientX: scrollX for scroll and wheel
  clientX: number;
  //selectionEnd for input[select event]
  //scrollY for scroll and wheel
  clientY: number;
  width: number;
  height: number;
  xpath: string;

  valueName: string; // for input change
  originValue: any; // avoid circular structure
  valueType: string; // typeof value
  // for select element
  valueIndex: number;
  valueLabel: string;

  // "backward"/"forward" for select event and selection
  direction: string;

  label: string;
  timestamp: number;

  code: string; // for keyboard event
  key: string; // for keyboard event
  altKey: boolean; // for keyboard event
  ctrlKey: boolean; // for keyboard event
  metaKey: boolean; // for keyboard event
  shiftKey: boolean; // for keyboard event

  message?: string;
  eventValue?: string;
  eventState?: string;
  eventId?: string;
  cursorPosition?: number;
};
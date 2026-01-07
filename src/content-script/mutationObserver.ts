export const addMutationEventListener = (
  targetNode: Node,
  config: MutationObserverInit,
  mutationHandler: MutationCallback
) => {
  const o = new MutationObserver(mutationHandler);
  o.observe(targetNode, config);
  return o;
}

export const removeMutationEventListener = (
  observer: MutationObserver | null
) => {
  if (observer) {
    observer.disconnect();
  }
}

/** Global game shortcuts must leave forms, dialogs and navigation to the browser. */
export function ignoreGameKey(event: KeyboardEvent): boolean {
  if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return true;
  const target = event.target;
  if (!(target instanceof Element)) return false;
  if ((event.key === "Enter" || event.key === " ") && target.closest("button, a, [role=button]")) return true;
  return !!target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="dialog"], nav, summary');
}

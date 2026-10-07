/** Nested modals share one body scroll lock so unlock order can't leave the page stuck. */

let lockCount = 0;

export function lockBodyScroll(): void {
  lockCount += 1;
  document.body.style.overflow = "hidden";
}

export function unlockBodyScroll(): void {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = "";
  }
}

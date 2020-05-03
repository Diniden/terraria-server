/**
 * This ensures an element is produced that can be rendered atop of all.
 */
export function ensureModal(modalId: string) {
  let modal = document.getElementById(modalId);

  if (!modal) {
    modal = document.createElement('div');
    document.getElementsByTagName('body')[0].appendChild(modal);
  }

  modal.setAttribute('id', modalId);
  return modal;
}

/**
 * Destroys the element that is guaranteed to render above everything.
 */
export function destroyModal(modalId: string) {
  const modal = document.getElementById(modalId);

  if (modal) {
    modal.remove();
  }

  return modal;
}

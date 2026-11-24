export function $(s: string, el: ParentNode = document): HTMLElement | null {
  return el.querySelector(s) as HTMLElement | null;
}

export function $$(s: string, el: ParentNode = document): HTMLElement[] {
  return Array.from(el.querySelectorAll(s)) as HTMLElement[];
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function isReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

import { rand } from './random';
import { isReducedMotion } from './dom';

/** Monochrome confetti, ported from the prototype. No-op under reduced motion. */
export function confetti(): void {
  if (isReducedMotion()) return;
  for (let i = 0; i < 26; i++) {
    const d = document.createElement('div');
    d.className = 'confetti';
    const size = 6 + rand(8);
    d.style.width = `${size}px`;
    d.style.height = `${size}px`;
    d.style.left = `${42 + Math.random() * 16}vw`;
    d.style.top = '38vh';
    d.style.background = i % 3 === 0 ? 'var(--muted)' : 'var(--ink)';
    if (i % 4 === 0) d.style.borderRadius = '50%';
    document.body.appendChild(d);
    const dx = (Math.random() - 0.5) * 70;
    const dy = 26 + Math.random() * 42;
    const rot = rand(540) - 270;
    d.animate(
      [
        { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx}vw,${dy}vh) rotate(${rot}deg)`, opacity: 0.9 },
      ],
      { duration: 1100 + rand(700), easing: 'cubic-bezier(.17,.67,.35,1)' },
    );
    setTimeout(() => d.remove(), 1900);
  }
}

import { DARES } from '../lib/data';
import { pickNoRepeat } from '../lib/random';
import { blip } from '../lib/audio/blips';
import type { GameDef } from './types';

export const dareGame: GameDef = {
  id: 'dare',
  name: 'Random Dare',
  tag: 'Zero dignity required',
  icon: '🎯',
  desc: 'A tiny mission, chosen by fate. Refusal is technically allowed.',
  mount(stage, ctx) {
    let last = -1;
    let drawn = 0;
    stage.innerHTML =
      '<p class="cardkind">Your mission, should you choose to accept it</p>' +
      '<p class="cardtext" id="dareText">Press the button. Receive a mission. No take-backs.</p>' +
      '<p class="cardnote" id="dareCount"></p>' +
      '<div class="btnrow"><button class="btn" id="dareBtn" type="button">Give me a dare</button></div>';
    const btn = stage.querySelector<HTMLButtonElement>('#dareBtn');
    const text = stage.querySelector<HTMLElement>('#dareText');
    const count = stage.querySelector<HTMLElement>('#dareCount');
    btn?.addEventListener('click', () => {
      const { value, index } = pickNoRepeat(DARES, last);
      last = index;
      drawn++;
      if (text) {
        text.textContent = value.text;
        text.classList.remove('flip');
        void text.offsetWidth;
        text.classList.add('flip');
      }
      if (count) {
        count.textContent = `Dare #${drawn} — completion rate so far: between you and your conscience.`;
      }
      if (btn) btn.textContent = 'Too easy. Another';
      ctx.recordPlay('dare');
      blip(520, 0.07);
    });
  },
};

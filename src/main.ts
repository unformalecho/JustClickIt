import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/games.css';
import { Store } from './lib/store/storage';
import { mountApp } from './app';

const store = new Store(window.localStorage);

if (store.recoveredFromCorrupt) {
  // Data was corrupt and was backed up; the app starts fresh instead of crashing.
  console.warn('JustClickIt: stored data was corrupt and was backed up; starting fresh.');
}

window.addEventListener('error', (e) => {
  console.error('JustClickIt error:', e.error ?? e.message);
});

mountApp(store);

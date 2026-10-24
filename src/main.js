import './style.css';
import lessons from './data/scaffolding-lessons.json';
import { mountApp } from './ui/app.js';

mountApp(document.getElementById('app'), lessons, window.localStorage);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}

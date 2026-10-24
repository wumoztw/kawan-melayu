import './style.css';
import lessons from './data/scaffolding-lessons.json';
import { mountApp } from './ui/app.js';

mountApp(document.getElementById('app'), lessons, window.localStorage);

import './style.css';
import { Game } from './game.js';
import { initInput } from './input.js';

const canvas = document.getElementById('game');
initInput(canvas);
document.getElementById('btn-pause').addEventListener('click', () => window.__game.pause());
window.__game = new Game(canvas);

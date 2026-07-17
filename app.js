import { FOUNDERS } from './content.js';

function renderFounders() {
  const grid = document.getElementById('founders-grid');
  grid.innerHTML = FOUNDERS.map(founder => `
    <div class="bg-cream rounded-3xl shadow-elevated p-6 text-center">
      <img src="${founder.photo}" alt="${founder.name}" class="w-full aspect-square object-cover rounded-2xl shadow-elevated" />
      <h3 class="mt-4 font-display text-xl font-semibold text-ink">${founder.name}</h3>
      <p class="mt-2 font-sans text-sm text-ink/60">${founder.bio}</p>
    </div>
  `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  renderFounders();
});

import { FOUNDERS, TESTIMONIALS } from './content.js';

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

function renderTestimonials() {
  const grid = document.getElementById('testimonials-grid');
  grid.innerHTML = TESTIMONIALS.map(t => `
    <div class="bg-cream rounded-3xl shadow-elevated overflow-hidden">
      <div class="grid grid-cols-2">
        <div class="relative">
          <img src="${t.before}" alt="Before" class="w-full h-full object-cover" />
          <span class="absolute bottom-2 left-2 text-xs font-sans font-semibold bg-ink/80 text-cream px-2 py-1 rounded-full">Before</span>
        </div>
        <div class="relative">
          <img src="${t.after}" alt="After" class="w-full h-full object-cover" />
          <span class="absolute bottom-2 left-2 text-xs font-sans font-semibold bg-terracotta text-cream px-2 py-1 rounded-full">After</span>
        </div>
      </div>
    </div>
  `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  renderFounders();
  renderTestimonials();
});

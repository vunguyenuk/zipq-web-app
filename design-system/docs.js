const search = document.querySelector('#component-search');
const entries = [...document.querySelectorAll('[data-searchable]')];
const status = document.querySelector('#search-status');

search?.addEventListener('input', () => {
  const query = search.value.trim().toLocaleLowerCase();
  let shown = 0;
  entries.forEach((entry) => {
    const words = `${entry.dataset.searchable} ${entry.textContent}`.toLocaleLowerCase();
    entry.hidden = !!query && !words.includes(query);
    if (!entry.hidden) shown += 1;
  });
  status.textContent = query ? `${shown} of ${entries.length} components match “${search.value.trim()}”.` : '';
});

document.querySelectorAll('.ds-tabs').forEach((group) => {
  const tabs = [...group.querySelectorAll('button')];
  tabs.forEach((tab) => tab.addEventListener('click', () => {
    tabs.forEach((item) => item.setAttribute('aria-selected', String(item === tab)));
  }));
});

const links = [...document.querySelectorAll('.ds-sidebar nav[aria-label="Sections"] a')];
const sections = links.map((link) => document.querySelector(link.getAttribute('href'))).filter(Boolean);
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    const current = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!current) return;
    links.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${current.target.id}`));
  }, { rootMargin: '-12% 0px -68% 0px', threshold: [0, .25, .5] });
  sections.forEach((section) => observer.observe(section));
}

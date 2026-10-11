(() => {
  const root = document.documentElement;
  const cells = document.querySelectorAll('[data-theme-set]');
  const apply = choice => {
    const forced = choice === 'light' || choice === 'dark';
    forced ? root.dataset.theme = choice : root.removeAttribute('data-theme');
    cells.forEach(cell => cell.setAttribute('aria-checked', cell.dataset.themeSet === (forced ? choice : 'system')));
  };
  cells.forEach(cell => cell.addEventListener('click', () => apply(cell.dataset.themeSet)));
  apply(new URLSearchParams(location.search).get('theme'));
})();

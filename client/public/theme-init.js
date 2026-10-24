(function () {
  try {
    var saved = localStorage.getItem('logicq_theme');
    var prefersDark =
      !window.matchMedia || window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme =
      saved === 'dark' || saved === 'light' ? saved : prefersDark ? 'dark' : 'light';
    var root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(theme);
    root.setAttribute('data-theme', theme);
    root.style.colorScheme = theme;
    var meta = document.getElementById('meta-theme-color');
    if (meta) {
      meta.setAttribute('content', theme === 'dark' ? '#0C0F1F' : '#F4F6FB');
    }
  } catch (e) {
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.style.colorScheme = 'dark';
  }
})();

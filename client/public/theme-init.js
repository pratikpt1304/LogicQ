(function () {
  try {
    var defaultMigrated = localStorage.getItem('logicq_theme_default_v2');
    if (!defaultMigrated) {
      localStorage.setItem('logicq_theme_default_v2', 'true');
      localStorage.setItem('logicq_theme', 'light');
    }
    var saved = localStorage.getItem('logicq_theme');
    var theme = saved === 'dark' ? 'dark' : 'light';
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
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.style.colorScheme = 'light';
  }
  try {
    var gf = document.getElementById('gfonts-css');
    if (gf) {
      gf.rel = 'stylesheet';
    }
  } catch (e) {}
})();

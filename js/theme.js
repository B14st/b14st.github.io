/* ==========================================================
   THEME — light/dark mode with saved preference
   ========================================================== */

(function () {
  'use strict';

  const STORAGE_KEY = 'bygglogikk-theme';
  const root = document.documentElement;
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');

  const icons = {
    light: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M12 3V2m0 20v-1M4.22 4.22l-.7-.7m16.96 16.96-.7-.7M3 12H2m20 0h-1M4.22 19.78l-.7.7M20.48 3.52l-.7.7"/>
        <circle cx="12" cy="12" r="4"/>
      </svg>`,
    dark: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/>
      </svg>`
  };

  function savedTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      return null;
    }
  }

  function setSavedTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
      // The theme still works for the current visit if storage is unavailable.
    }
  }

  function currentTheme() {
    return root.dataset.theme === 'dark' ? 'dark' : 'light';
  }

  function updateControls() {
    const theme = currentTheme();
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    const label = nextTheme === 'dark' ? 'Bytt til mørk modus' : 'Bytt til lys modus';

    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
      button.innerHTML = icons[nextTheme];
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
      button.setAttribute('aria-pressed', String(theme === 'dark'));
    });

    if (themeColor) {
      themeColor.setAttribute('content', theme === 'dark' ? '#164f73' : '#0f4c75');
    }
  }

  function applyTheme(theme, save) {
    root.dataset.theme = theme;
    if (save) setSavedTheme(theme);
    updateControls();
  }

  document.querySelectorAll('[data-theme-toggle]').forEach(button => {
    button.addEventListener('click', () => {
      applyTheme(currentTheme() === 'dark' ? 'light' : 'dark', true);
    });
  });

  systemTheme.addEventListener('change', event => {
    if (!savedTheme()) {
      applyTheme(event.matches ? 'dark' : 'light', false);
    }
  });

  updateControls();
})();

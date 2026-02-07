// pages/_shared/sidebar.js
// Injects a collapsible sidebar and wraps #pageContent into the shared layout.

(function(){
  const content = document.getElementById('pageContent');
  if (!content) return; // page didn't opt into layout

  const SIDEBAR_STATE_KEY = 'hd2_sidebar_collapsed_v1';

  
  const MOBILE_BREAKPOINT = 900;
  const isMobile = () => window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;
const shell = document.createElement('div');
  shell.className = 'app-shell';

  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';

  const header = document.createElement('div');
  header.className = 'sidebar-header';

  const brand = document.createElement('div');
  brand.className = 'sidebar-brand';
  brand.textContent = 'Pages';

  // Desktop toggle (keeps desktop behavior consistent with mobile).
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'sidebar-toggle';
  toggleBtn.type = 'button';
  toggleBtn.title = 'Toggle menu';
  toggleBtn.textContent = '←';

  header.appendChild(toggleBtn);
  header.appendChild(brand);

  // Floating toggle for mobile/off-canvas behavior
  const fab = document.createElement('button');
  fab.className = 'sidebar-fab';
  fab.type = 'button';
  fab.title = 'Menu';
  // Shows a right arrow when closed, left arrow when open
  fab.textContent = '›';

  const nav = document.createElement('nav');
  nav.className = 'sidebar-nav';

  // Keep link list in one place so every new page can reuse it
  const links = [
    { href: '/pages/randomizer/', label: 'Randomizer', icon: '🎲' },
    { href: '/pages/owned/', label: 'Owned Items', icon: '✅' },
    // Future pages (safe placeholders)
    // { href: './roadmap.html', label: 'Roadmap', icon: '🗺️' },
    // { href: './about.html', label: 'About', icon: 'ℹ️' },
  ];

  // Fix relative paths when sidebar is used on index.html (root) vs /pages/*
  const isRoot = location.pathname.endsWith('/') || location.pathname.endsWith('/index.html') || location.pathname === '/';
  const normalized = links.map(l => {
    const copy = { ...l };
    if (isRoot) {
      // from root: ../index.html -> ./index.html, ./owned.html -> ./pages/owned.html
      if (copy.href === '../index.html') copy.href = './index.html';
      if (copy.href === './owned.html') copy.href = './pages/owned.html';
    }
    return copy;
  });

  for (const l of normalized){
    const a = document.createElement('a');
    a.className = 'sidebar-link';
    a.href = l.href;

    const icon = document.createElement('span');
    icon.className = 'icon';
    icon.textContent = l.icon;

    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = l.label;

    a.appendChild(icon);
    a.appendChild(label);
    nav.appendChild(a);
  }

  sidebar.appendChild(header);
  sidebar.appendChild(nav);

  const main = document.createElement('main');
  main.className = 'app-main';

  // Move existing content inside main
  const contentParent = content.parentNode;
  main.appendChild(content);

  shell.appendChild(sidebar);
  shell.appendChild(main);

  // Insert shell where the content used to be
  contentParent.appendChild(shell);

  // Add fab after shell is in DOM
  document.body.appendChild(fab);

  // Try to align sidebar with the start of the main card area (first .results block)
  const alignSidebar = () => {
    const anchor = content.querySelector('.results');
    if (!anchor) return;
    const contentRect = content.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    const offset = Math.max(0, anchorRect.top - contentRect.top);
    sidebar.style.marginTop = `${offset}px`;
  };
  requestAnimationFrame(alignSidebar);
  window.addEventListener('resize', () => requestAnimationFrame(alignSidebar));

  // Restore collapsed state
  const collapsed = localStorage.getItem(SIDEBAR_STATE_KEY) === '1';
  if (collapsed) sidebar.classList.add('collapsed');

  

  const applyMobileHeaderDock = () => {
    if (!isMobile()) {
      // Put the button back on body when leaving mobile (CSS hides it anyway on desktop)
      if (fab && fab.parentNode && fab.parentNode !== document.body) {
        document.body.appendChild(fab);
      }
      fab.classList.remove('docked');
      return;
    }

    // Force the page title into two strict lines on mobile.
    const h1 = content.querySelector('h1') || document.querySelector('h1');
    if (h1 && h1.dataset.mobileSplitApplied !== '1') {
      const full = (h1.textContent || '').trim();
      const line1 = 'Helldivers 2';
      let line2 = 'Loadout Generator';
      if (full.toLowerCase().startsWith('helldivers 2')) {
        const rest = full.slice(line1.length).trim();
        if (rest) line2 = rest;
      }

      h1.innerHTML = '';
      const s1 = document.createElement('span');
      s1.className = 'mobile-title-line1';
      s1.textContent = line1;

      const s2 = document.createElement('span');
      s2.className = 'mobile-title-line2';
      s2.textContent = line2;

      h1.appendChild(s1);
      h1.appendChild(s2);
      h1.dataset.mobileSplitApplied = '1';
    }

    if (!fab) return;

    // Dock the menu button into a wrapper around the title so it scrolls naturally
    const targetH1 = content.querySelector('h1') || document.querySelector('h1');
    if (!targetH1) return;

    let wrap = targetH1.closest('.mobile-title-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'mobile-title-wrap';
      targetH1.parentNode.insertBefore(wrap, targetH1);
      wrap.appendChild(targetH1);
    }

    fab.classList.add('docked');
    if (fab.parentNode !== wrap) wrap.insertBefore(fab, targetH1);
  };

applyMobileHeaderDock();

  window.addEventListener('resize', () => {
    applyMobileHeaderDock();
    // syncButtons() will run after toggle; we also call it after resize below.
  });

  const syncButtons = () => {
    const isCollapsed = sidebar.classList.contains('collapsed');
    const openChar = '›';
    const closeChar = '‹';

    // Floating action button (mobile)
    // On mobile we keep a static kebab icon so it never looks like it 'moves' or flips.
    fab.textContent = isMobile() ? '⋮' : (isCollapsed ? openChar : closeChar);
    fab.title = isCollapsed ? 'Open menu' : 'Close menu';
    fab.setAttribute('aria-label', fab.title);

    // Header toggle (desktop)
    toggleBtn.textContent = isCollapsed ? openChar : closeChar;
    toggleBtn.title = isCollapsed ? 'Open menu' : 'Close menu';
    toggleBtn.setAttribute('aria-label', toggleBtn.title);
  };
  syncButtons();
  const onResizeSync = () => {
    applyMobileHeaderDock();
    syncButtons();
  };
  window.addEventListener('resize', onResizeSync);

  const toggleSidebar = () => {
    sidebar.classList.toggle('collapsed');
    localStorage.setItem(SIDEBAR_STATE_KEY, sidebar.classList.contains('collapsed') ? '1' : '0');
    syncButtons();
  };

  fab.addEventListener('click', toggleSidebar);
  toggleBtn.addEventListener('click', toggleSidebar);
})();

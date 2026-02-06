// pages/_shared/sidebar.js
// Injects a collapsible sidebar and wraps #pageContent into the shared layout.

(function(){
  const content = document.getElementById('pageContent');
  if (!content) return; // page didn't opt into layout

  const SIDEBAR_STATE_KEY = 'hd2_sidebar_collapsed_v1';

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

  const syncButtons = () => {
    const isCollapsed = sidebar.classList.contains('collapsed');
    const openChar = '›';
    const closeChar = '‹';

    // Floating action button (mobile)
    fab.textContent = isCollapsed ? openChar : closeChar;
    fab.title = isCollapsed ? 'Open menu' : 'Close menu';
    fab.setAttribute('aria-label', fab.title);

    // Header toggle (desktop)
    toggleBtn.textContent = isCollapsed ? openChar : closeChar;
    toggleBtn.title = isCollapsed ? 'Open menu' : 'Close menu';
    toggleBtn.setAttribute('aria-label', toggleBtn.title);
  };
  syncButtons();

  const toggleSidebar = () => {
    sidebar.classList.toggle('collapsed');
    localStorage.setItem(SIDEBAR_STATE_KEY, sidebar.classList.contains('collapsed') ? '1' : '0');
    syncButtons();
  };

  fab.addEventListener('click', toggleSidebar);
  toggleBtn.addEventListener('click', toggleSidebar);
})();

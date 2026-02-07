
// ======================================================
// MOBILE SIDEBAR DRAWER CONTROL
// ======================================================
function setMenuOpen(open) {
  document.querySelector('.sidebar')?.classList.toggle('is-open', open);
  document.querySelector('.sidebar-backdrop')?.classList.toggle('is-open', open);
}

// Toggle button (hamburger / arrow)
document.querySelector('#menuBtn')?.addEventListener('click', () => {
  const sidebar = document.querySelector('.sidebar');
  const open = !sidebar?.classList.contains('is-open');
  setMenuOpen(open);
});

// Backdrop click closes
document.querySelector('.sidebar-backdrop')?.addEventListener('click', () => {
  setMenuOpen(false);
});

// Close after selecting a page
document.querySelectorAll('.sidebar a, .sidebar button').forEach(el => {
  el.addEventListener('click', () => setMenuOpen(false));
});

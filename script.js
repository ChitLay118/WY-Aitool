function openTool(url) {
  const frame = document.getElementById('toolFrame');
  frame.src = url;
  frame.style.display = 'block';
  window.scrollTo(0, 0);
}

// 🌗 Theme Toggle
const themeToggle = document.getElementById('themeToggle');
themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('light');
  if (document.body.classList.contains('light')) {
    themeToggle.textContent = "☀️ Light";
  } else {
    themeToggle.textContent = "🌙 Dark";
  }
});

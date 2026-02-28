const btn = document.getElementById('healthBtn');
const output = document.getElementById('output');

btn?.addEventListener('click', async () => {
  output.textContent = 'Loading...';
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    output.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    output.textContent = `Request failed: ${String(error)}`;
  }
});

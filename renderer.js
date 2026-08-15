document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const themeToggle = document.getElementById('theme-toggle');
  const themeText = document.getElementById('theme-text');
  const themeIconSun = document.getElementById('theme-icon-sun');
  const themeIconMoon = document.getElementById('theme-icon-moon');
  const downloadDirText = document.getElementById('download-dir-text');
  const changeDirBtn = document.getElementById('change-dir-btn');
  const clipboardMonitorToggle = document.getElementById('clipboard-monitor-toggle');

  const videoUrlInput = document.getElementById('video-url-input');
  const pasteBtn = document.getElementById('paste-btn');
  const inspectBtn = document.getElementById('inspect-btn');
  const presetChips = document.querySelectorAll('.preset-chip');

  const previewContainer = document.getElementById('preview-container');
  const previewImg = document.getElementById('preview-img');
  const previewDuration = document.getElementById('preview-duration');
  const previewPlatformBadge = document.getElementById('preview-platform-badge');
  const previewTitle = document.getElementById('preview-title');
  const previewUploader = document.getElementById('preview-uploader');
  const formatSelect = document.getElementById('format-select');
  const qualitySelect = document.getElementById('quality-select');
  const confirmDownloadBtn = document.getElementById('confirm-download-btn');

  const downloadsList = document.getElementById('downloads-list');
  const emptyState = document.getElementById('empty-state');
  const downloadsCount = document.getElementById('downloads-count');

  let currentDownloadDir = '';
  let inspectedMediaData = null;
  let activeDownloads = {};
  let lastCopiedUrl = '';

  // Initialize Folder Path
  try {
    currentDownloadDir = await window.api.getDownloadDir();
    downloadDirText.textContent = currentDownloadDir;
  } catch (e) {
    downloadDirText.textContent = 'Downloads/OmniDownloads';
  }

  // Change Folder Handler
  changeDirBtn.addEventListener('click', async () => {
    const selected = await window.api.selectDownloadDir();
    if (selected) {
      currentDownloadDir = selected;
      downloadDirText.textContent = selected;
    }
  });

  // Dual Theme Handler
  const savedTheme = localStorage.getItem('omni-theme') || 'dark';
  applyTheme(savedTheme);

  themeToggle.addEventListener('change', () => {
    const newTheme = themeToggle.checked ? 'dark' : 'light';
    applyTheme(newTheme);
  });

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('omni-theme', theme);
    themeToggle.checked = theme === 'dark';

    if (theme === 'dark') {
      themeText.textContent = 'Tema Oscuro';
      themeIconSun.classList.remove('hidden');
      themeIconMoon.classList.add('hidden');
    } else {
      themeText.textContent = 'Tema Claro';
      themeIconSun.classList.add('hidden');
      themeIconMoon.classList.remove('hidden');
    }
  }

  // Clipboard Monitor Loop
  setInterval(async () => {
    if (!clipboardMonitorToggle.checked) return;
    try {
      const text = await window.api.readClipboard();
      if (text && text !== lastCopiedUrl && isValidMediaUrl(text)) {
        lastCopiedUrl = text;
        if (!videoUrlInput.value) {
          videoUrlInput.value = text;
          triggerInspect(text);
        }
      }
    } catch (err) {}
  }, 2000);

  // Paste Button Handler
  pasteBtn.addEventListener('click', async () => {
    const text = await window.api.readClipboard();
    if (text) {
      videoUrlInput.value = text;
    }
  });

  // Inspect Button Handler
  inspectBtn.addEventListener('click', () => {
    const url = videoUrlInput.value.trim();
    if (url) triggerInspect(url);
  });

  videoUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const url = videoUrlInput.value.trim();
      if (url) triggerInspect(url);
    }
  });

  // Preset Chips Handlers
  presetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      presetChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      const preset = chip.getAttribute('data-preset');
      if (preset === 'mp3') {
        formatSelect.value = 'mp3';
      } else if (preset === '720p') {
        formatSelect.value = 'mp4';
        qualitySelect.value = '720p';
      } else if (preset === 'best' || preset === 'tiktok') {
        formatSelect.value = 'mp4';
        qualitySelect.value = 'best';
      }
    });
  });

  // Inspect Trigger Logic
  async function triggerInspect(url) {
    inspectBtn.disabled = true;
    inspectBtn.innerHTML = '⚡ Inspeccionando...';

    try {
      const info = await window.api.inspectMedia(url);
      inspectedMediaData = { ...info, url };

      previewImg.src = info.thumbnail;
      previewDuration.textContent = info.duration || '00:00';
      previewPlatformBadge.textContent = info.platform || 'Media';
      previewTitle.textContent = info.title;
      previewUploader.textContent = info.uploader ? `Por ${info.uploader}` : 'Detectado';

      previewContainer.classList.remove('hidden');
    } catch (err) {
      console.error(err);
    } finally {
      inspectBtn.disabled = false;
      inspectBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        Inspeccionar & Añadir
      `;
    }
  }

  // Confirm Download Handler
  confirmDownloadBtn.addEventListener('click', async () => {
    if (!inspectedMediaData) return;

    const downloadOptions = {
      url: inspectedMediaData.url,
      title: inspectedMediaData.title,
      thumbnail: inspectedMediaData.thumbnail,
      platform: inspectedMediaData.platform,
      format: formatSelect.value,
      quality: qualitySelect.value,
      downloadDir: currentDownloadDir
    };

    addDownloadItemToQueue(downloadOptions);
    previewContainer.classList.add('hidden');
    videoUrlInput.value = '';

    await window.api.startDownload(downloadOptions);
  });

  // Queue Item UI Generator
  function addDownloadItemToQueue(item) {
    if (emptyState) emptyState.classList.add('hidden');

    const card = document.createElement('div');
    card.className = 'download-item-card';
    card.id = `download-${cleanId(item.url)}`;

    card.innerHTML = `
      <img src="${item.thumbnail}" class="item-thumb" alt="thumb">
      <div class="item-info">
        <div class="item-title">${item.title}</div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width: 5%"></div>
        </div>
        <div class="item-meta">
          <span class="speed-text">Iniciando descarga...</span>
          <span class="eta-text">ETA: --:--</span>
          <span class="percent-text">5%</span>
        </div>
      </div>
      <div class="status-badge status-badge-downloading">Descargando</div>
    `;

    downloadsList.prepend(card);
    activeDownloads[cleanId(item.url)] = card;
    updateDownloadsCount();
  }

  // IPC Event Listener: Progress
  window.api.onDownloadProgress((data) => {
    const id = cleanId(data.url);
    const card = activeDownloads[id];
    if (card) {
      const fill = card.querySelector('.progress-bar-fill');
      const speed = card.querySelector('.speed-text');
      const eta = card.querySelector('.eta-text');
      const percent = card.querySelector('.percent-text');

      const p = Math.min(100, Math.max(0, data.percent));
      fill.style.width = `${p}%`;
      percent.textContent = `${p.toFixed(1)}%`;
      speed.textContent = data.speed;
      eta.textContent = `ETA: ${data.eta}`;
    }
  });

  // IPC Event Listener: Complete
  window.api.onDownloadComplete((data) => {
    const id = cleanId(data.url);
    const card = activeDownloads[id];
    if (card) {
      const fill = card.querySelector('.progress-bar-fill');
      const statusBadge = card.querySelector('.status-badge');
      const speed = card.querySelector('.speed-text');

      fill.style.width = '100%';
      fill.style.background = 'var(--success)';
      statusBadge.className = 'status-badge status-badge-complete';
      statusBadge.textContent = '✓ Completado';
      speed.textContent = 'Guardado en carpeta de descargas';
    }
  });

  function updateDownloadsCount() {
    const count = Object.keys(activeDownloads).length;
    downloadsCount.textContent = `${count} descargas`;
  }

  function isValidMediaUrl(url) {
    return (
      url.includes('youtube.com') ||
      url.includes('youtu.be') ||
      url.includes('tiktok.com') ||
      url.includes('instagram.com') ||
      url.includes('facebook.com') ||
      url.includes('fb.watch')
    );
  }

  function cleanId(url) {
    return url.replace(/[^a-zA-Z0-9]/g, '');
  }
});

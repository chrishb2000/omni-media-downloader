const { app, BrowserWindow, ipcMain, dialog, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const https = require('https');
const http = require('http');
const { spawn, exec } = require('child_process');

let mainWindow;
let defaultDownloadPath = path.join(os.homedir(), 'Downloads', 'OmniDownloads');

// Ensure default download directory exists
if (!fs.existsSync(defaultDownloadPath)) {
  try {
    fs.mkdirSync(defaultDownloadPath, { recursive: true });
  } catch (err) {
    defaultDownloadPath = path.join(os.homedir(), 'Downloads');
  }
}

// Ensure bin folder exists and check for yt-dlp binary
const binDir = path.join(__dirname, 'bin');
if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir, { recursive: true });
}
const ytDlpPath = path.join(binDir, 'yt-dlp.exe');

// Helper to auto-download yt-dlp binary if missing
function ensureYtDlpBinary() {
  return new Promise((resolve) => {
    if (fs.existsSync(ytDlpPath)) {
      return resolve(ytDlpPath);
    }
    console.log('Downloading yt-dlp binary...');
    const file = fs.createWriteStream(ytDlpPath);
    const downloadUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
    
    https.get(downloadUrl, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        https.get(response.headers.location, (redirectResponse) => {
          redirectResponse.pipe(file);
          file.on('finish', () => {
            file.close(() => resolve(ytDlpPath));
          });
        });
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close(() => resolve(ytDlpPath));
        });
      }
    }).on('error', () => {
      resolve(null);
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    autoHideMenuBar: true,
    show: false,
    title: 'OmniMedia Downloader Pro',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });
}

app.whenReady().then(async () => {
  await ensureYtDlpBinary();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handler: Select Download Folder
ipcMain.handle('select-download-dir', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    defaultPath: defaultDownloadPath
  });
  if (!result.canceled && result.filePaths.length > 0) {
    defaultDownloadPath = result.filePaths[0];
    return defaultDownloadPath;
  }
  return defaultDownloadPath;
});

// IPC Handler: Get Current Download Folder
ipcMain.handle('get-download-dir', () => defaultDownloadPath);

// IPC Handler: Read Clipboard
ipcMain.handle('read-clipboard', () => clipboard.readText());

// IPC Handler: Inspect Media URL
ipcMain.handle('inspect-media', async (event, url) => {
  const binExecutable = fs.existsSync(ytDlpPath) ? ytDlpPath : 'yt-dlp';
  const platform = detectPlatform(url);

  return new Promise((resolve) => {
    const cmdArgs = [
      url,
      '--dump-json',
      '--no-warnings',
      '--no-playlist',
      '--js-runtimes', 'node',
      '--extractor-args', 'youtube:player_client=android,web,ios',
      '--user-agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
    ];

    exec(`"${binExecutable}" ${cmdArgs.map(a => `"${a}"`).join(' ')}`, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout) => {
      if (error || !stdout) {
        return resolve({
          success: true,
          fallback: true,
          url,
          title: detectPlatformTitle(url),
          platform: detectPlatform(url),
          thumbnail: getPlatformPlaceholderThumbnail(url),
          duration: 'N/A'
        });
      }

      try {
        const info = JSON.parse(stdout);
        resolve({
          success: true,
          title: info.title || detectPlatformTitle(url),
          platform,
          thumbnail: info.thumbnail || info.thumbnails?.[0]?.url || getPlatformPlaceholderThumbnail(url),
          duration: info.duration_string || (info.duration ? `${Math.floor(info.duration / 60)}:${info.duration % 60}` : 'N/A'),
          uploader: info.uploader || info.channel || 'Autor Detectado'
        });
      } catch (e) {
        resolve({
          success: true,
          fallback: true,
          url,
          title: detectPlatformTitle(url),
          platform,
          thumbnail: getPlatformPlaceholderThumbnail(url),
          duration: 'N/A'
        });
      }
    });
  });
});

// IPC Handler: Start Download Process
ipcMain.handle('start-download', async (event, options) => {
  const { url, quality, format, downloadDir } = options;
  const targetFolder = downloadDir || defaultDownloadPath;
  const binExecutable = fs.existsSync(ytDlpPath) ? ytDlpPath : 'yt-dlp';
  const platform = detectPlatform(url);

  return new Promise(async (resolve) => {
    // Generate clean output filename pattern
    const outputPattern = path.join(targetFolder, '%(title).100s.%(ext)s');
    let args = [
      url,
      '-o', outputPattern,
      '--no-mtime',
      '--no-playlist',
      '--js-runtimes', 'node',
      '--extractor-args', 'youtube:player_client=android,web,ios'
    ];

    // User-agent customization per platform
    if (platform === 'Instagram') {
      args.push('--user-agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1');
      args.push('--add-header', 'Accept-Language:es-ES,es;q=0.9');
    } else if (platform === 'TikTok') {
      args.push('--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    } else {
      args.push('--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    }

    if (format === 'mp3') {
      args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
    } else if (quality === 'best') {
      args.push('-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best/b');
    } else if (quality === '720p') {
      args.push('-f', 'bestvideo[height<=720]+bestaudio/best[height<=720]/best/b');
    } else {
      args.push('-f', 'best[ext=mp4]/best/b');
    }

    console.log(`Executing: ${binExecutable} ${args.join(' ')}`);
    const proc = spawn(binExecutable, args, { windowsHide: true });
    let lastStderr = '';

    proc.stdout.on('data', (data) => {
      const text = data.toString();
      const percentMatch = text.match(/\[download\]\s+(\d+\.\d+)%/);
      const speedMatch = text.match(/at\s+([\d\.]+\s*\w+\/s)/);
      const etaMatch = text.match(/ETA\s+([\d:]+)/);

      if (percentMatch) {
        event.sender.send('download-progress', {
          url,
          percent: parseFloat(percentMatch[1]),
          speed: speedMatch ? speedMatch[1] : 'Descargando...',
          eta: etaMatch ? etaMatch[1] : '--:--'
        });
      }
    });

    proc.stderr.on('data', (data) => {
      lastStderr += data.toString();
      console.error(`yt-dlp stderr: ${data}`);
    });

    proc.on('close', async (code) => {
      if (code === 0) {
        event.sender.send('download-complete', { url, success: true, targetFolder });
        resolve({ success: true, targetFolder });
      } else {
        // Attempt secondary API fallback for TikTok or Instagram
        const fallbackResult = await trySecondaryScraperFallback(url, targetFolder, event);
        if (fallbackResult.success) {
          event.sender.send('download-complete', { url, success: true, targetFolder });
          resolve({ success: true, targetFolder });
        } else {
          // Report REAL error to UI - do NOT pretend completion!
          let errorMsg = 'No se pudo descargar el contenido. Comprueba la URL o que el vídeo sea público.';
          if (lastStderr.includes('empty media response') || lastStderr.includes('login')) {
            errorMsg = 'Instagram requiere inicio de sesión para esta publicación o la cuenta es privada.';
          } else if (lastStderr.includes('403')) {
            errorMsg = 'Acceso bloqueado por la plataforma. Inténtalo de nuevo en unos minutos.';
          }
          event.sender.send('download-error', { url, success: false, error: errorMsg });
          resolve({ success: false, error: errorMsg });
        }
      }
    });

    proc.on('error', async (err) => {
      const fallbackResult = await trySecondaryScraperFallback(url, targetFolder, event);
      if (fallbackResult.success) {
        event.sender.send('download-complete', { url, success: true, targetFolder });
        resolve({ success: true, targetFolder });
      } else {
        event.sender.send('download-error', { url, success: false, error: 'Error al ejecutar binario de descarga.' });
        resolve({ success: false, error: err.message });
      }
    });
  });
});

// Secondary API Fallback Handler for TikTok & Instagram
async function trySecondaryScraperFallback(url, targetFolder, event) {
  if (url.includes('tiktok.com')) {
    try {
      const res = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (data.code === 0 && data.data && data.data.play) {
        const videoUrl = data.data.play;
        const filePath = path.join(targetFolder, `TikTok_${Date.now()}.mp4`);
        await downloadFileStream(videoUrl, filePath, (percent) => {
          event.sender.send('download-progress', { url, percent, speed: 'Descargando (HD API)', eta: '00:01' });
        });
        return { success: true };
      }
    } catch (e) {}
  }
  return { success: false };
}

// File Stream Downloader Helper
function downloadFileStream(fileUrl, outputPath, progressCallback) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    const client = fileUrl.startsWith('https') ? https : http;

    client.get(fileUrl, (response) => {
      const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
      let downloadedBytes = 0;

      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        if (totalBytes > 0 && progressCallback) {
          const percent = (downloadedBytes / totalBytes) * 100;
          progressCallback(percent);
        }
      });

      response.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve(true));
      });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => reject(err));
    });
  });
}

function detectPlatform(url) {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
  if (url.includes('tiktok.com')) return 'TikTok';
  if (url.includes('instagram.com')) return 'Instagram';
  if (url.includes('facebook.com') || url.includes('fb.watch')) return 'Facebook';
  return 'Web Media';
}

function detectPlatformTitle(url) {
  const platform = detectPlatform(url);
  return `${platform} - Contenido Multimedia (${new Date().toLocaleDateString()})`;
}

function getPlatformPlaceholderThumbnail(url) {
  const platform = detectPlatform(url);
  if (platform === 'YouTube') return 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&auto=format&fit=crop';
  if (platform === 'TikTok') return 'https://images.unsplash.com/photo-1611605698335-8b1569810432?w=600&auto=format&fit=crop';
  if (platform === 'Instagram') return 'https://images.unsplash.com/photo-1611262588024-d12430b98920?w=600&auto=format&fit=crop';
  if (platform === 'Facebook') return 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&auto=format&fit=crop';
  return 'https://images.unsplash.com/photo-1579202673506-ca3ce28943ef?w=600&auto=format&fit=crop';
}

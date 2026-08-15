# OmniMedia Downloader Pro 🚀

**OmniMedia Downloader Pro** es una aplicación de escritorio de alto rendimiento, moderna y privada para la descarga masiva y extracción de vídeo y audio de alta fidelidad desde **YouTube, TikTok, Instagram Reels y Facebook Watch**.

---

## 📋 Prerrequisitos de Sistema

Para ejecutar esta aplicación en Windows de forma nativa o mediante el ejecutable de 1-clic, asegúrate de contar con:

- **Node.js**: Versión `18.x` o superior (Recomendado v20 LTS o v24).
  - 🔗 [Descargar Node.js Oficial](https://nodejs.org/)

---

## ✨ Características y Ventajas Competitivas

- 🎵 **TikTok Sin Marca de Agua**: Extracción limpia de vídeos nativos en HD sin logos ni marcas molestas.
- ⚡ **Auto-Detección de Portapapeles (Smart Clipboard Listener)**: Monitoreo en segundo plano que detecta automáticamente cualquier URL copiada de YouTube, Instagram, TikTok o Facebook y la añade a la interfaz sin necesidad de pegar manualmente.
- 🌟 **Soporte de Máxima Resolución (4K / 8K a 60fps)**: Preserva la máxima calidad posible del vídeo fuente.
- 🎧 **Extracción de Audio MP3 320kbps / M4A**: Conversión rápida a formato de audio para listas de música, podcasts o conferencias.
- 🌓 **Tema Dual (Oscuro / Claro)**: Interfaz gráfica pulida con conmutador instantáneo de tema y modo maximizado sin menús nativos molestos.
- 🔒 **100% Privado y Sin Publicidad**: Motor ejecutable local (`yt-dlp`), libre de malware, acortadores de enlaces ni rastreadores de terceros.

---

## 🛠️ Instalación y Uso Rápido (1-Clic)

1. Clona o descarga este repositorio:
   ```bash
   git clone https://github.com/chrishb2000/omni-media-downloader.git
   ```
2. Haz doble clic en el archivo ejecutable **`iniciar_aplicacion.bat`**.
   - El script verificará Node.js y ejecutará `npm install` automáticamente en el primer arranque.

### Inicio manual mediante terminal:
```bash
npm install
npm start
```

---

## 📁 Estructura del Proyecto

```text
omni-media-downloader/
├── main.js                  # Proceso principal de Electron JS
├── preload.js               # Puente IPC seguro
├── index.html               # Interfaz gráfica moderna de usuario
├── styles.css               # Sistema de diseño Vanilla CSS con temas duales
├── renderer.js              # Lógica de interacciones y eventos del cliente
├── iniciar_aplicacion.bat   # Lanzador 1-clic en texto plano ASCII
└── package.json             # Manifiesto de dependencias
```

---

## 🤝 Autor y apoyo

Desarrollado por [Christian Herencia](https://christian-freelance.us/).

Si el proyecto te resulta útil, puedes [invitarme a un café mediante PayPal](https://www.paypal.com/donate/?hosted_button_id=YC6YAWBQ7HNSS).

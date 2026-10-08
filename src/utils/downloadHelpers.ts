import html2canvas from 'html2canvas';

/** Replace a filename-unsafe character sequence so it's safe inside a ZIP entry or as a download name. */
export const sanitizeFilename = (name: string, fallback: string): string => {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, '-').trim();
  return cleaned || fallback;
};

export const canvasToPngBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('canvas.toBlob failed'));
    }, 'image/png');
  });

/** Rasterize an inline QR <svg> onto a padded white canvas and return it as a PNG blob. */
export const svgToPngBlob = (svg: SVGElement, padding = 20): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width + padding * 2;
      canvas.height = img.height + padding * 2;
      if (!ctx) {
        reject(new Error('Canvas 2D context unavailable'));
        return;
      }
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, padding, padding);
      canvasToPngBlob(canvas).then(resolve, reject);
    };
    img.onerror = () => reject(new Error('Failed to load QR SVG as image'));
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  });

/**
 * Clone a rendered payment-slip element, swap inputs/textareas for plain divs
 * (html2canvas renders those more reliably), rasterize it, and return a PNG blob.
 * Works on hidden/off-screen source elements just as well as visible ones.
 */
export const captureSlipElementToPngBlob = async (source: HTMLElement): Promise<Blob> => {
  const clone = source.cloneNode(true) as HTMLElement;
  clone.removeAttribute('id');

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.zIndex = '-1';
  container.style.opacity = '0';
  container.style.pointerEvents = 'none';
  container.appendChild(clone);
  document.body.appendChild(container);

  try {
    clone.querySelectorAll('input').forEach((input) => {
      const div = document.createElement('div');
      const value = document.createElement('span');
      value.textContent = input.value;
      value.style.display = 'block';
      value.style.transform = 'translateY(-6px)';
      div.appendChild(value);
      const inputStyle = getComputedStyle(input);

      div.style.border = '2px solid #000';
      div.style.fontSize = inputStyle.fontSize;
      div.style.padding = '2px';
      div.style.width = '100%';
      div.style.height = inputStyle.height;
      div.style.boxSizing = 'border-box';
      div.style.display = 'flex';
      div.style.alignItems = 'center';
      div.style.lineHeight = inputStyle.lineHeight;
      div.style.fontFamily = 'Arial, sans-serif';
      div.style.backgroundColor = '#ffffff';

      input.parentNode?.replaceChild(div, input);
    });

    clone.querySelectorAll('textarea').forEach((textarea) => {
      const div = document.createElement('div');
      const value = document.createElement('span');
      value.textContent = textarea.value;
      value.style.display = 'block';
      value.style.transform = 'translateY(-3px)';
      div.appendChild(value);
      const textareaStyle = getComputedStyle(textarea);

      div.style.border = '1px solid #000';
      div.style.fontSize = textareaStyle.fontSize;
      div.style.padding = '2px';
      div.style.width = '100%';
      div.style.height = textareaStyle.height;
      div.style.boxSizing = 'border-box';
      div.style.display = 'block';
      div.style.whiteSpace = 'pre-line';
      div.style.lineHeight = textareaStyle.lineHeight;
      div.style.fontFamily = 'Arial, sans-serif';
      div.style.backgroundColor = '#ffffff';

      textarea.parentNode?.replaceChild(div, textarea);
    });

    clone.querySelectorAll<HTMLElement>('.form-group label').forEach((label) => {
      label.style.transform = 'translateY(-2px)';
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    const canvas = await html2canvas(clone, {
      scale: 3,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
      // html2canvas doesn't support CSS `zoom` (body uses zoom: 80%): it measures
      // word positions in zoomed coordinates but draws glyphs at full size, so
      // words overlap. Reset zoom in html2canvas's own document clone only.
      onclone: (doc) => {
        doc.documentElement.style.zoom = '1';
        doc.body.style.zoom = '1';
      },
    });

    return await canvasToPngBlob(canvas);
  } finally {
    document.body.removeChild(container);
  }
};

export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

/**
 * 导出模块
 * 提供各种格式的导出功能
 */

class ExportManager {
  constructor(editor) {
    this.editor = editor;
  }

  // 导出为PNG
  exportPNG(options = {}) {
    const {
      width = this.editor.config.canvas.width,
      height = this.editor.config.canvas.height,
      quality = 1.0,
      filename = 'background.png'
    } = options;
    
    // 创建临时画布
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    
    // 绘制当前帧
    if (this.editor.bg) {
      this.editor.bg.draw(tempCtx);
    }
    
    // 转换为Blob
    return new Promise((resolve) => {
      tempCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        this.downloadFile(url, filename);
        URL.revokeObjectURL(url);
        resolve(blob);
      }, 'image/png', quality);
    });
  }

  // 导出为JPEG
  exportJPEG(options = {}) {
    const {
      width = this.editor.config.canvas.width,
      height = this.editor.config.canvas.height,
      quality = 0.9,
      filename = 'background.jpg'
    } = options;
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (this.editor.bg) {
      this.editor.bg.draw(tempCtx);
    }
    
    return new Promise((resolve) => {
      tempCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        this.downloadFile(url, filename);
        URL.revokeObjectURL(url);
        resolve(blob);
      }, 'image/jpeg', quality);
    });
  }

  // 导出为WebP
  exportWebP(options = {}) {
    const {
      width = this.editor.config.canvas.width,
      height = this.editor.config.canvas.height,
      quality = 0.9,
      filename = 'background.webp'
    } = options;
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (this.editor.bg) {
      this.editor.bg.draw(tempCtx);
    }
    
    return new Promise((resolve) => {
      tempCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        this.downloadFile(url, filename);
        URL.revokeObjectURL(url);
        resolve(blob);
      }, 'image/webp', quality);
    });
  }

  // 导出为SVG
  exportSVG(options = {}) {
    const {
      width = this.editor.config.canvas.width,
      height = this.editor.config.canvas.height,
      filename = 'background.svg'
    } = options;
    
    // 创建SVG内容
    const svgContent = this.generateSVG(width, height);
    
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    this.downloadFile(url, filename);
    URL.revokeObjectURL(url);
    
    return blob;
  }

  // 生成SVG内容
  generateSVG(width, height) {
    const config = this.editor.config;
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
    
    // 背景
    if (config.background && config.background.visible) {
      svg += `<defs>
        <radialGradient id="bg-gradient" cx="${config.background.centerX}" cy="${config.background.centerY}" r="${config.background.radius}">
          <stop offset="0%" stop-color="${config.background.color0}"/>
          <stop offset="50%" stop-color="${config.background.color1}"/>
          <stop offset="100%" stop-color="${config.background.color2}"/>
        </radialGradient>
      </defs>`;
      svg += `<rect width="${width}" height="${height}" fill="url(#bg-gradient)"/>`;
    }
    
    // 形状
    if (config.shapes) {
      config.shapes.forEach(shape => {
        if (!shape.visible) return;
        
        switch (shape.type) {
          case 'rectangle':
            svg += `<rect x="${shape.x * width}" y="${shape.y * height}" width="${shape.width * width}" height="${shape.height * height}" fill="${shape.fill}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" rx="${shape.cornerRadius || 0}"/>`;
            break;
          case 'circle':
            svg += `<circle cx="${shape.x * width}" cy="${shape.y * height}" r="${shape.radius * Math.min(width, height)}" fill="${shape.fill}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}"/>`;
            break;
          case 'ellipse':
            svg += `<ellipse cx="${shape.x * width}" cy="${shape.y * height}" rx="${shape.radiusX * width}" ry="${shape.radiusY * height}" fill="${shape.fill}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}"/>`;
            break;
          case 'polygon':
          case 'polyline':
            const points = shape.points.map(p => `${p[0] * width},${p[1] * height}`).join(' ');
            svg += `<${shape.type === 'polygon' ? 'polygon' : 'polyline'} points="${points}" fill="${shape.fill}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" ${shape.closed ? '' : 'fill="none"'}/>`;
            break;
          case 'path':
            if (shape.points && shape.points.length >= 2) {
              const tw = shape.tangentWeights;
              const th = shape.tangentHandles;
              const pts = shape.points;
              let d = `M ${pts[0][0] * width} ${pts[0][1] * height}`;
              for (let i = 1; i < pts.length; i++) {
                const x0 = pts[i - 1][0] * width, y0 = pts[i - 1][1] * height;
                const x1 = pts[i][0] * width, y1 = pts[i][1] * height;

                let cp1x, cp1y, cp2x, cp2y;

                // 优先使用 tangentHandles
                if (th && th[i - 1]) {
                  cp1x = x0 + th[i - 1].dx * width;
                  cp1y = y0 + th[i - 1].dy * height;
                } else {
                  const w1 = (tw && tw[i - 1] !== undefined) ? tw[i - 1] : 0.5;
                  let tdx, tdy;
                  if (i - 2 >= 0) {
                    tdx = (pts[i][0] - pts[i - 2][0]) * width;
                    tdy = (pts[i][1] - pts[i - 2][1]) * height;
                  } else {
                    tdx = x1 - x0; tdy = y1 - y0;
                  }
                  cp1x = x0 + tdx * w1 / 2;
                  cp1y = y0 + tdy * w1 / 2;
                }

                if (th && th[i]) {
                  cp2x = x1 - th[i].dx * width;
                  cp2y = y1 - th[i].dy * height;
                } else {
                  const w2 = (tw && tw[i] !== undefined) ? tw[i] : 0.5;
                  let tdx2, tdy2;
                  if (i + 1 < pts.length) {
                    tdx2 = (pts[i + 1][0] - pts[i - 1][0]) * width;
                    tdy2 = (pts[i + 1][1] - pts[i - 1][1]) * height;
                  } else {
                    tdx2 = x1 - x0; tdy2 = y1 - y0;
                  }
                  cp2x = x1 - tdx2 * w2 / 2;
                  cp2y = y1 - tdy2 * w2 / 2;
                }

                d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x1} ${y1}`;
              }
              svg += `<path d="${d}" fill="${shape.fill}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}"/>`;
            }
            break;
        }
      });
    }
    
    svg += '</svg>';
    return svg;
  }

  // 导出为JSON配置
  exportJSON(options = {}) {
    const {
      filename = 'background-config.json',
      pretty = true
    } = options;
    
    const config = this.editor.exportJSON();
    const content = pretty ? JSON.stringify(config, null, 2) : JSON.stringify(config);
    
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    this.downloadFile(url, filename);
    URL.revokeObjectURL(url);
    
    return blob;
  }

  // 导出为JavaScript代码
  exportJavaScript(options = {}) {
    const {
      filename = 'background.js',
      includeComments = true
    } = options;
    
    const config = this.editor.exportJSON();
    let code = '';
    
    if (includeComments) {
      code += `/**\n`;
      code += ` * 动态背景配置\n`;
      code += ` * 生成时间: ${new Date().toLocaleString('zh-CN')}\n`;
      code += ` * 画布尺寸: ${config.canvas.width} x ${config.canvas.height}\n`;
      code += ` */\n\n`;
    }
    
    code += `const CONFIG = ${JSON.stringify(config, null, 2)};\n\n`;
    code += `// 使用方法:\n`;
    code += `// 1. 引入 EditableDynamicBG 类\n`;
    code += `// 2. const bg = new EditableDynamicBG(CONFIG);\n`;
    code += `// 3. 在动画循环中调用 bg.update(dt) 和 bg.draw(ctx)\n`;
    
    const blob = new Blob([code], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    this.downloadFile(url, filename);
    URL.revokeObjectURL(url);
    
    return blob;
  }

  // 导出为HTML
  exportHTML(options = {}) {
    const {
      filename = 'background.html',
      includeAnimation = true
    } = options;
    
    const config = this.editor.exportJSON();
    
    let html = `<!DOCTYPE html>\n`;
    html += `<html lang="zh-CN">\n`;
    html += `<head>\n`;
    html += `  <meta charset="UTF-8">\n`;
    html += `  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n`;
    html += `  <title>动态背景</title>\n`;
    html += `  <style>\n`;
    html += `    body { margin: 0; padding: 0; background: #000; overflow: hidden; }\n`;
    html += `    canvas { display: block; }\n`;
    html += `  </style>\n`;
    html += `</head>\n`;
    html += `<body>\n`;
    html += `  <canvas id="canvas"></canvas>\n`;
    html += `  <script>\n`;
    html += `    const CONFIG = ${JSON.stringify(config, null, 2)};\n\n`;
    html += `    // 这里需要引入 EditableDynamicBG 类\n`;
    html += `    // 由于代码较长，建议从单独的JS文件加载\n\n`;
    html += `    const canvas = document.getElementById('canvas');\n`;
    html += `    const ctx = canvas.getContext('2d');\n\n`;
    html += `    function resize() {\n`;
    html += `      canvas.width = window.innerWidth;\n`;
    html += `      canvas.height = window.innerHeight;\n`;
    html += `    }\n\n`;
    html += `    window.addEventListener('resize', resize);\n`;
    html += `    resize();\n\n`;
    html += `    // 初始化背景\n`;
    html += `    // const bg = new EditableDynamicBG(CONFIG);\n\n`;
    html += `    let lastTime = 0;\n`;
    html += `    function animate(ts) {\n`;
    html += `      const dt = Math.min((ts - lastTime) / 1000, 0.05);\n`;
    html += `      lastTime = ts;\n\n`;
    html += `      // bg.update(dt);\n`;
    html += `      // bg.draw(ctx);\n\n`;
    html += `      requestAnimationFrame(animate);\n`;
    html += `    }\n\n`;
    html += `    requestAnimationFrame(animate);\n`;
    html += `  </script>\n`;
    html += `</body>\n`;
    html += `</html>`;
    
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    this.downloadFile(url, filename);
    URL.revokeObjectURL(url);
    
    return blob;
  }

  // 导出为GIF（需要额外库）
  async exportGIF(options = {}) {
    const {
      width = this.editor.config.canvas.width,
      height = this.editor.config.canvas.height,
      duration = 3000,
      fps = 15,
      filename = 'background.gif'
    } = options;
    
    // 这里需要集成gif.js库
    // 由于复杂度较高，建议使用现有的gif编码库
    console.warn('GIF导出需要额外的gif.js库支持');
    
    // 示例实现框架
    const frames = [];
    const frameInterval = 1000 / fps;
    const totalFrames = Math.ceil(duration / frameInterval);
    
    for (let i = 0; i < totalFrames; i++) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d');
      
      // 更新动画
      if (this.editor.bg) {
        this.editor.bg.update(frameInterval / 1000);
        this.editor.bg.draw(tempCtx);
      }
      
      frames.push(tempCanvas);
    }
    
    // 这里需要使用gif.js编码
    // const gif = new GIF({ workers: 2, quality: 10 });
    // frames.forEach(frame => gif.addFrame(frame, { delay: frameInterval }));
    // gif.on('finished', (blob) => { ... });
    // gif.render();
    
    return frames;
  }

  // 下载文件
  downloadFile(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // 复制到剪贴板
  async copyToClipboard(content) {
    try {
      await navigator.clipboard.writeText(content);
      return true;
    } catch (err) {
      console.error('复制到剪贴板失败:', err);
      return false;
    }
  }

  // 导出到剪贴板（PNG）
  async exportToClipboard() {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.editor.config.canvas.width;
    tempCanvas.height = this.editor.config.canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (this.editor.bg) {
      this.editor.bg.draw(tempCtx);
    }
    
    try {
      const blob = await new Promise(resolve => {
        tempCanvas.toBlob(resolve, 'image/png');
      });
      
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      
      return true;
    } catch (err) {
      console.error('复制图片到剪贴板失败:', err);
      return false;
    }
  }

  // 获取导出预览
  getExportPreview(format = 'png', size = 200) {
    const tempCanvas = document.createElement('canvas');
    const ratio = this.editor.config.canvas.width / this.editor.config.canvas.height;
    
    if (ratio > 1) {
      tempCanvas.width = size;
      tempCanvas.height = size / ratio;
    } else {
      tempCanvas.width = size * ratio;
      tempCanvas.height = size;
    }
    
    const tempCtx = tempCanvas.getContext('2d');
    
    if (this.editor.bg) {
      this.editor.bg.draw(tempCtx);
    }
    
    return tempCanvas.toDataURL(`image/${format}`);
  }

  // 批量导出
  async exportAll(formats = ['png', 'json', 'js']) {
    const results = {};
    
    for (const format of formats) {
      switch (format) {
        case 'png':
          results.png = await this.exportPNG({ filename: `background-${Date.now()}.png` });
          break;
        case 'jpg':
        case 'jpeg':
          results.jpg = await this.exportJPEG({ filename: `background-${Date.now()}.jpg` });
          break;
        case 'webp':
          results.webp = await this.exportWebP({ filename: `background-${Date.now()}.webp` });
          break;
        case 'svg':
          results.svg = await this.exportSVG({ filename: `background-${Date.now()}.svg` });
          break;
        case 'json':
          results.json = this.exportJSON({ filename: `background-${Date.now()}.json` });
          break;
        case 'js':
          results.js = this.exportJavaScript({ filename: `background-${Date.now()}.js` });
          break;
        case 'html':
          results.html = this.exportHTML({ filename: `background-${Date.now()}.html` });
          break;
      }
    }
    
    return results;
  }
}

export { ExportManager };
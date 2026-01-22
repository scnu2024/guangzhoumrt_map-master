'use strict';
(function() {
  const startInput = document.getElementById('start-input');
  const endInput = document.getElementById('end-input');
  const dataList = document.getElementById('stations-list');
  const searchBtn = document.getElementById('search-btn');
  const output = document.getElementById('route-output');
  const strategyButtons = Array.from(document.querySelectorAll('.segmented button'));
  const swapBtn = document.getElementById('swap-btn');
  const zoomInBtn = document.getElementById('zoom-in');
  const zoomOutBtn = document.getElementById('zoom-out');
  const zoomResetBtn = document.getElementById('zoom-reset');
  let mapSvg = document.querySelector('#map-container svg');
  const selectionPopup = document.getElementById('selection-popup');
  const popupTitle = document.getElementById('popup-station-name');
  const setStartBtn = document.getElementById('set-start');
  const setEndBtn = document.getElementById('set-end');
  const mapContainer = document.getElementById('map-container');
  let currentStrategy = 'stations';
  let currentScale = 1;
  let pendingStation = null;

  const stationList = Object.keys(window.stationGZ || {}).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
  
  // 等待SVG加载
  function waitForSvg() {
    return new Promise((resolve) => {
      if (mapSvg) {
        resolve();
      } else {
        const observer = new MutationObserver(() => {
          mapSvg = document.querySelector('#map-container svg');
          if (mapSvg) {
            observer.disconnect();
            resolve();
          }
        });
        observer.observe(mapContainer, { childList: true, subtree: true });
      }
    });
  }

  function populateDatalist() {
    dataList.innerHTML = '';
    stationList.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      dataList.appendChild(opt);
    });
  }

  populateDatalist();

  strategyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      currentStrategy = btn.dataset.strategy;
      strategyButtons.forEach(b => b.classList.toggle('active', b === btn));
    });
  });

  function resetHighlights() {
    document.querySelectorAll('#map-container svg .highlight-label').forEach(n => n.remove());
  }

  function highlightSelections() {
    resetHighlights();
    const start = startInput.value.trim();
    const end = endInput.value.trim();
    if (start) addLabel('start', start);
    if (end) addLabel('end', end);
  }

  function renderRoute(path, transfers, segments) {
    if (!path || path.length === 0) {
      output.innerHTML = '<div style="color: #f87171; font-weight: 600;">❌ 未找到路径，请检查站名。</div>';
      return;
    }
    
    // 创建更美观的路线显示
    const stationCount = path.length - 1;
    const transferCount = transfers !== undefined ? transfers : 0;
    
    // 线路颜色映射
    const lineColors = {
      '1号线': '#F3D03E',
      '2号线': '#00629B',
      '3号线': '#ECA154',
      '4号线': '#00843D',
      '5号线': '#C5003E',
      '6号线': '#80225F',
      '7号线': '#97D700',
      '8号线': '#008C95',
      '9号线': '#71CC98',
      '10号线': '#5B7AB3',
      '11号线': '#F5A0B5',
      '12号线': '#C4A67E',
      '13号线': '#8DC21F',
      '14号线': '#82312E',
      '18号线': '#0047AB',
      '21号线': '#201747',
      '22号线': '#C19B6A',
      'APM': '#00AED6',
      '广佛线': '#F09432',
      '广清城际': '#00A1E9'
    };
    
    function getLineColor(lineName) {
      for (const [key, color] of Object.entries(lineColors)) {
        if (lineName && lineName.includes(key.replace('号线', '')) || lineName === key) {
          return color;
        }
      }
      return '#888';
    }
    
    let html = `
      <div style="margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="background: linear-gradient(135deg, #667eea, #764ba2); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 700; font-size: 16px;">
            🚇 路线规划
          </span>
        </div>
        <div style="display: flex; gap: 16px; margin-bottom: 10px;">
          <span style="background: rgba(102, 126, 234, 0.1); padding: 6px 12px; border-radius: 8px; font-size: 13px; font-weight: 600; color: #667eea;">
            📍 ${stationCount} 站
          </span>
          <span style="background: rgba(118, 75, 162, 0.1); padding: 6px 12px; border-radius: 8px; font-size: 13px; font-weight: 600; color: #764ba2;">
            🔄 ${transferCount} 次换乘
          </span>
        </div>
      </div>
    `;
    
    // 显示分段线路信息
    if (segments && segments.length > 0) {
      html += '<div style="margin-bottom: 15px;">';
      segments.forEach((seg, idx) => {
        const color = getLineColor(seg.line);
        const stationNum = seg.stations.length - 1;
        html += `
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <div style="
              background: ${color}; 
              color: ${['#F3D03E', '#97D700', '#71CC98', '#F5A0B5', '#C4A67E', '#C19B6A'].includes(color) ? '#333' : 'white'}; 
              padding: 4px 10px; 
              border-radius: 12px; 
              font-size: 12px; 
              font-weight: 700;
              min-width: 60px;
              text-align: center;
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            ">${seg.line || '未知线路'}</div>
            <div style="margin-left: 10px; font-size: 12px; color: #666;">
              ${seg.start} → ${seg.end} <span style="color: #999;">(${stationNum}站)</span>
            </div>
          </div>
        `;
        if (idx < segments.length - 1) {
          html += `
            <div style="margin-left: 30px; margin-bottom: 8px; color: #764ba2; font-size: 11px; font-weight: 600;">
              🔄 在 <span style="color: #333; font-weight: 700;">${seg.end}</span> 换乘
            </div>
          `;
        }
      });
      html += '</div>';
    }
    
    // 显示详细站点列表
    html += '<div style="font-size: 13px; line-height: 1.8; color: #555; border-top: 1px dashed #ddd; padding-top: 12px; margin-top: 8px;">';
    html += '<div style="font-size: 11px; color: #999; margin-bottom: 8px;">详细站点：</div>';
    
    path.forEach((station, idx) => {
      // 检查是否是换乘站
      let isTransfer = false;
      if (segments) {
        for (let i = 0; i < segments.length - 1; i++) {
          if (segments[i].end === station) {
            isTransfer = true;
            break;
          }
        }
      }
      
      if (idx === 0) {
        html += `<div style="margin-bottom: 4px;">
          <span style="background: #667eea; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">起点</span>
          <strong style="color: #667eea; margin-left: 6px;">${station}</strong>
        </div>`;
      } else if (idx === path.length - 1) {
        html += `<div style="margin-top: 4px;">
          <span style="background: #764ba2; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">终点</span>
          <strong style="color: #764ba2; margin-left: 6px;">${station}</strong>
        </div>`;
      } else if (isTransfer) {
        html += `<div style="margin-left: 20px; color: #e67e22; font-size: 12px; font-weight: 600;">🔄 ${station}</div>`;
      } else {
        html += `<div style="margin-left: 20px; color: #666; font-size: 12px;">↓ ${station}</div>`;
      }
    });
    
    html += '</div>';
    output.innerHTML = html;
    
    // 添加淡入动画
    output.style.opacity = '0';
    output.style.transform = 'translateY(10px)';
    setTimeout(() => {
      output.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
      output.style.opacity = '1';
      output.style.transform = 'translateY(0)';
    }, 100);
    
    drawRouteOverlay(path);
  }

  function fetchRoute(start, end, strategy) {
    const url = `/api/v1/?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&strategy=${encodeURIComponent(strategy)}`;
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onload = function() {
      if (this.status >= 200 && this.status < 400) {
        const data = JSON.parse(this.response);
        renderRoute(data.route, data.transfers, data.segments);
      } else {
        output.textContent = '未找到路径，可能站点不在地图数据中。';
      }
    };
    xhr.onerror = function() {
      output.textContent = '请求失败，请重试。';
    };
    xhr.send();
  }

  searchBtn.addEventListener('click', function() {
    const start = startInput.value.trim();
    const end = endInput.value.trim();
    if (!start || !end) {
      output.innerHTML = '<div style="color: #f59e0b; font-weight: 600;">⚠️ 请选择起点和终点。</div>';
      return;
    }
    if (start === end) {
      output.innerHTML = '<div style="color: #3b82f6; font-weight: 600;">ℹ️ 起点和终点相同，无需路线。</div>';
      return;
    }
    
    // 添加加载动画
    searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 规划中...';
    searchBtn.disabled = true;
    output.innerHTML = '<div style="color: #667eea; font-weight: 600; animation: pulse 1.5s infinite;">🔍 正在搜索最优路线...</div>';
    
    highlightSelections();
    
    setTimeout(() => {
      fetchRoute(start, end, currentStrategy);
      searchBtn.innerHTML = '<i class="fas fa-search-location"></i> 规划路线';
      searchBtn.disabled = false;
    }, 500);
  });

  startInput.addEventListener('input', highlightSelections);
  endInput.addEventListener('input', highlightSelections);

  swapBtn.addEventListener('click', () => {
    const tmp = startInput.value;
    startInput.value = endInput.value;
    endInput.value = tmp;
    highlightSelections();
  });

  // 保存原始SVG尺寸
  let originalWidth = null;
  let originalHeight = null;
  
  function initSvgSize() {
    if (mapSvg && !originalWidth) {
      const bbox = mapSvg.getBBox();
      const viewBox = mapSvg.getAttribute('viewBox');
      
      if (viewBox) {
        const parts = viewBox.split(/\s+|,/);
        originalWidth = parseFloat(parts[2]);
        originalHeight = parseFloat(parts[3]);
      } else if (mapSvg.hasAttribute('width') && mapSvg.hasAttribute('height')) {
        originalWidth = parseFloat(mapSvg.getAttribute('width'));
        originalHeight = parseFloat(mapSvg.getAttribute('height'));
      } else {
        originalWidth = bbox.width;
        originalHeight = bbox.height;
        mapSvg.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
      }
    }
  }
  
  function applyZoom(smooth = true) {
    if (mapSvg) {
      initSvgSize();
      
      if (originalWidth && originalHeight) {
        const newWidth = originalWidth * currentScale;
        const newHeight = originalHeight * currentScale;
        
        mapSvg.style.transition = smooth ? 'width 0.2s ease-out, height 0.2s ease-out' : 'none';
        mapSvg.setAttribute('width', newWidth);
        mapSvg.setAttribute('height', newHeight);
      }
    }
  }

  zoomInBtn.addEventListener('click', () => {
    const rect = mapContainer.getBoundingClientRect();
    const centerX = mapContainer.scrollLeft + rect.width / 2;
    const centerY = mapContainer.scrollTop + rect.height / 2;
    
    const oldScale = currentScale;
    currentScale = Math.min(currentScale + 0.2, 3);
    applyZoom();
    
    // 调整滚动位置使中心点保持不变
    const scaleRatio = currentScale / oldScale;
    mapContainer.scrollLeft = centerX * scaleRatio - rect.width / 2;
    mapContainer.scrollTop = centerY * scaleRatio - rect.height / 2;
    
    // 添加按钮点击反馈
    zoomInBtn.style.transform = 'scale(0.9)';
    setTimeout(() => {
      zoomInBtn.style.transform = '';
    }, 150);
  });

  zoomOutBtn.addEventListener('click', () => {
    const rect = mapContainer.getBoundingClientRect();
    const centerX = mapContainer.scrollLeft + rect.width / 2;
    const centerY = mapContainer.scrollTop + rect.height / 2;
    
    const oldScale = currentScale;
    currentScale = Math.max(currentScale - 0.2, 0.5);
    applyZoom();
    
    // 调整滚动位置使中心点保持不变
    const scaleRatio = currentScale / oldScale;
    mapContainer.scrollLeft = centerX * scaleRatio - rect.width / 2;
    mapContainer.scrollTop = centerY * scaleRatio - rect.height / 2;
    
    // 添加按钮点击反馈
    zoomOutBtn.style.transform = 'scale(0.9)';
    setTimeout(() => {
      zoomOutBtn.style.transform = '';
    }, 150);
  });

  zoomResetBtn.addEventListener('click', () => {
    currentScale = 1;
    applyZoom();
    // 重置滚动位置
    setTimeout(() => {
      mapContainer.scrollTo({
        left: 0,
        top: 0,
        behavior: 'smooth'
      });
    }, 100);
    // 添加按钮点击反馈
    zoomResetBtn.style.transform = 'scale(0.9)';
    setTimeout(() => {
      zoomResetBtn.style.transform = '';
    }, 150);
  });

  // 添加鼠标滚轮缩放功能
  mapContainer.addEventListener('wheel', (e) => {
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    const newScale = Math.min(Math.max(currentScale + delta, 0.5), 3);
    
    if (newScale !== currentScale) {
      // 计算鼠标位置相对于容器的坐标
      const rect = mapContainer.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // 计算缩放前鼠标指向的内容位置
      const scrollX = mapContainer.scrollLeft + mouseX;
      const scrollY = mapContainer.scrollTop + mouseY;
      
      // 缩放比例变化
      const oldScale = currentScale;
      currentScale = newScale;
      const scaleRatio = currentScale / oldScale;
      
      // 更新缩放（不使用平滑过渡以提高响应速度）
      applyZoom(false);
      
      // 调整滚动位置，使鼠标位置保持不变
      requestAnimationFrame(() => {
        mapContainer.scrollLeft = scrollX * scaleRatio - mouseX;
        mapContainer.scrollTop = scrollY * scaleRatio - mouseY;
      });
    }
  }, { passive: false });

  // 添加鼠标拖动功能（优化版）
  let isDragging = false;
  let startX, startY, scrollLeft, scrollTop;

  mapContainer.addEventListener('mousedown', (e) => {
    // 只在点击空白区域时启用拖动
    if (e.target === mapContainer || e.target.tagName === 'svg' || e.target.closest('svg')) {
      isDragging = true;
      mapContainer.style.cursor = 'grabbing';
      startX = e.clientX;
      startY = e.clientY;
      scrollLeft = mapContainer.scrollLeft;
      scrollTop = mapContainer.scrollTop;
      e.preventDefault();
    }
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      mapContainer.style.cursor = 'grab';
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    
    mapContainer.scrollLeft = scrollLeft - deltaX;
    mapContainer.scrollTop = scrollTop - deltaY;
  });

  function findPosition(name) {
    if (!mapSvg) return null;
    // prefer circle coordinates
    const c = mapSvg.querySelector(`#${CSS.escape(name)}`);
    if (c && c.hasAttribute('cx') && c.hasAttribute('cy')) {
      return { x: parseFloat(c.getAttribute('cx')), y: parseFloat(c.getAttribute('cy')) };
    }
    // fallback to text bbox
    const t = Array.from(mapSvg.querySelectorAll('text')).find(n => (n.textContent || '').trim() === name);
    if (t) {
      const b = t.getBBox();
      return { x: b.x + b.width / 2, y: b.y }; // above text
    }
    return null;
  }

  function addLabel(type, name) {
    if (!mapSvg) return;
    const pos = findPosition(name);
    if (!pos) return;
    const padding = 6;
    const labelWidth = 40;
    const labelHeight = 18;
    const x = pos.x - labelWidth / 2;
    const y = pos.y - labelHeight - padding;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', `highlight-label ${type}`);
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', labelWidth);
    rect.setAttribute('height', labelHeight);
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', pos.x);
    text.setAttribute('y', y + labelHeight / 2);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.textContent = type === 'start' ? '起点' : '终点';
    g.appendChild(rect);
    g.appendChild(text);
    mapSvg.appendChild(g);
  }

  function getCoord(name) {
    if (!mapSvg) return null;
    const circle = mapSvg.querySelector(`#${CSS.escape(name)}`);
    if (circle && circle.hasAttribute('cx') && circle.hasAttribute('cy')) {
      return { x: parseFloat(circle.getAttribute('cx')), y: parseFloat(circle.getAttribute('cy')) };
    }
    const t = Array.from(mapSvg.querySelectorAll('text')).find(n => (n.textContent || '').trim() === name);
    if (t) {
      const b = t.getBBox();
      return { x: b.x + b.width / 2, y: b.y };
    }
    return null;
  }

  function drawRouteOverlay(path) {
    if (!mapSvg) return;
    // remove previous
    mapSvg.querySelectorAll('.route-overlay').forEach(n => n.remove());
    const coords = path.map(getCoord).filter(Boolean);
    if (coords.length < 2) return;
    
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'route-overlay');
    
    // 创建SVG渐变定义
    const defs = mapSvg.querySelector('defs') || document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    if (!mapSvg.querySelector('defs')) {
      mapSvg.insertBefore(defs, mapSvg.firstChild);
    }
    
    // 移除旧的渐变
    const oldGradient = defs.querySelector('#routeGradient');
    if (oldGradient) oldGradient.remove();
    
    // 创建新的渐变
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.setAttribute('id', 'routeGradient');
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '100%');
    gradient.setAttribute('y2', '0%');
    
    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('style', 'stop-color:#667eea;stop-opacity:1');
    
    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '50%');
    stop2.setAttribute('style', 'stop-color:#764ba2;stop-opacity:1');
    
    const stop3 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop3.setAttribute('offset', '100%');
    stop3.setAttribute('style', 'stop-color:#667eea;stop-opacity:1');
    
    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    gradient.appendChild(stop3);
    defs.appendChild(gradient);
    
    // 构建平滑路径
    const d = coords.map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      // 使用平滑曲线连接点
      const prev = coords[i - 1];
      const midX = (prev.x + p.x) / 2;
      const midY = (prev.y + p.y) / 2;
      return `Q ${prev.x} ${prev.y}, ${midX} ${midY} T ${p.x} ${p.y}`;
    }).join(' ');
    
    // 背景路径（模糊效果）
    const pathBg = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathBg.setAttribute('d', coords.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' '));
    pathBg.setAttribute('class', 'route-path-bg');
    g.appendChild(pathBg);
    
    // 主路径
    const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathEl.setAttribute('d', coords.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' '));
    pathEl.setAttribute('class', 'route-path');
    g.appendChild(pathEl);
    
    // 添加站点圆点
    coords.forEach((p, idx) => {
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', p.x);
      dot.setAttribute('cy', p.y);
      dot.setAttribute('r', idx === 0 || idx === coords.length - 1 ? 10 : 6);
      let cls = 'route-dot';
      if (idx === 0) cls += ' start';
      if (idx === coords.length - 1) cls += ' end';
      dot.setAttribute('class', cls);
      g.appendChild(dot);
      
      // 为中间站点添加站序号
      if (idx > 0 && idx < coords.length - 1) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', p.x);
        text.setAttribute('y', p.y);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('style', 'font-size: 9px; font-weight: bold; fill: #fff; pointer-events: none; opacity: 0.8;');
        text.textContent = idx;
        g.appendChild(text);
      }
    });
    
    mapSvg.appendChild(g);
    
    // 自动滚动到路径中心
    scrollToPath(coords);
  }
  
  function scrollToPath(coords) {
    if (!coords || coords.length === 0) return;
    
    // 计算路径的边界框
    const xs = coords.map(c => c.x);
    const ys = coords.map(c => c.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    const svgRect = mapSvg.getBoundingClientRect();
    const containerRect = mapContainer.getBoundingClientRect();
    
    const targetX = centerX * currentScale - containerRect.width / 2;
    const targetY = centerY * currentScale - containerRect.height / 2;
    
    // 平滑滚动
    mapContainer.scrollTo({
      left: targetX,
      top: targetY,
      behavior: 'smooth'
    });
  }

  function showPopup(stationId, clientX, clientY) {
    pendingStation = stationId;
    popupTitle.textContent = '🚉 ' + stationId;
    selectionPopup.hidden = false;
    const rect = mapContainer.getBoundingClientRect();
    const x = clientX - rect.left + mapContainer.scrollLeft;
    const y = clientY - rect.top + mapContainer.scrollTop;
    selectionPopup.style.left = `${x + 15}px`;
    selectionPopup.style.top = `${y + 15}px`;
    
    // 确保popup不会超出视口
    setTimeout(() => {
      const popupRect = selectionPopup.getBoundingClientRect();
      if (popupRect.right > window.innerWidth) {
        selectionPopup.style.left = `${x - popupRect.width - 15}px`;
      }
      if (popupRect.bottom > window.innerHeight) {
        selectionPopup.style.top = `${y - popupRect.height - 15}px`;
      }
    }, 0);
  }

  function hidePopup() {
    selectionPopup.style.animation = 'popupSlideOut 0.2s ease-out';
    setTimeout(() => {
      selectionPopup.hidden = true;
      selectionPopup.style.animation = '';
      pendingStation = null;
    }, 200);
  }

  // 初始化SVG相关功能
  function initSvgInteraction() {
    if (!mapSvg) {
      mapSvg = document.querySelector('#map-container svg');
    }
    
    if (mapSvg) {
      // 初始化SVG尺寸
      initSvgSize();
      
      mapSvg.addEventListener('click', (e) => {
        const target = e.target;
        // Prefer text clicks; fallback to circle if available
        if (target && target.tagName === 'text') {
          const name = (target.textContent || '').trim();
          if (name && stationList.includes(name)) {
            showPopup(name, e.clientX, e.clientY);
            return;
          }
        }
        if (target && target.tagName === 'circle' && target.id) {
          showPopup(target.id, e.clientX, e.clientY);
        } else {
          hidePopup();
        }
      });
      
      applyZoom(false);
    }
  }

  setStartBtn.addEventListener('click', () => {
    if (!pendingStation) return;
    startInput.value = pendingStation;
    hidePopup();
    highlightSelections();
    if (startInput.value && endInput.value) {
      fetchRoute(startInput.value, endInput.value, currentStrategy);
    }
  });

  setEndBtn.addEventListener('click', () => {
    if (!pendingStation) return;
    endInput.value = pendingStation;
    hidePopup();
    highlightSelections();
    if (startInput.value && endInput.value) {
      fetchRoute(startInput.value, endInput.value, currentStrategy);
    }
  });

  mapContainer.addEventListener('scroll', hidePopup);
  window.addEventListener('resize', hidePopup);

  // 等待SVG加载后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSvgInteraction);
  } else {
    initSvgInteraction();
  }
  
  // 如果SVG还没加载，设置观察器
  if (!mapSvg) {
    waitForSvg().then(initSvgInteraction);
  }

}());

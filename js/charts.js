/**
 * ==========================================================================
 * 차트 시각화 모듈 (charts.js)
 * SVG 기반의 반응형 막대그래프(자산, 배당금) 및 종목 비중 바를 렌더링합니다.
 * ==========================================================================
 */

window.DashboardCharts = {
  // 종목별 비중 컬러 팔레트 (20종 모던 핀테크 컬러)
  colorPalette: [
    "#2563eb", "#059669", "#7c3aed", "#d97706", "#db2777",
    "#0891b2", "#4f46e5", "#65a30d", "#0d9488", "#ea580c",
    "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899",
    "#06b6d4", "#6366f1", "#84cc16", "#14b8a6", "#f97316"
  ],

  /**
   * 최근 12개월 총 자산 막대그래프를 렌더링합니다.
   */
  renderAssetBarChart(history, svgId, minId, maxId) {
    const svg = document.getElementById(svgId);
    if (!svg || !history || history.length === 0) return;
    svg.innerHTML = '';

    const width = svg.clientWidth || 320;
    const height = svg.clientHeight || 140;

    const assets = history.map(d => d.asset);
    const maxVal = Math.max(...assets);
    const minVal = Math.min(...assets) * 0.96;
    const barWidth = Math.max(12, (width / history.length) - 6);

    // 요약 레이블 업데이트
    const minEl = document.getElementById(minId);
    if (minEl) minEl.innerText = window.DashboardState.formatKoreanMoney(Math.min(...assets)) + '원';
    const maxEl = document.getElementById(maxId);
    if (maxEl) maxEl.innerText = window.DashboardState.formatKoreanMoney(maxVal) + '원';

    history.forEach((item, idx) => {
      const x = idx * (width / history.length) + (width / history.length - barWidth) / 2;
      const range = (maxVal - minVal) || 1;
      const barHeight = Math.max(4, ((item.asset - minVal) / range) * (height - 34));
      const y = height - 22 - barHeight;

      // 1. 전달과 비교하여 색상 지정 (상승: RED, 하락: BLUE, Default: RED)
      let barColor = "#ef4444"; // 기본값: RED (상승)
      let changeText = "";
      if (idx > 0) {
        const prevAsset = history[idx - 1].asset;
        if (item.asset < prevAsset) {
          barColor = "#3b82f6"; // 전달 대비 하락: BLUE
          const diffPct = (((item.asset - prevAsset) / prevAsset) * 100).toFixed(1);
          changeText = ` (전월대비 ${diffPct}%)`;
        } else {
          barColor = "#ef4444"; // 전달 대비 상승 또는 동일: RED
          const diffPct = (((item.asset - prevAsset) / prevAsset) * 100).toFixed(1);
          changeText = ` (전월대비 +${diffPct}%)`;
        }
      }

      // SVG 막대 사각형
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", x);
      rect.setAttribute("y", y);
      rect.setAttribute("width", barWidth);
      rect.setAttribute("height", barHeight);
      rect.setAttribute("rx", "3");
      rect.setAttribute("fill", barColor);
      rect.setAttribute("class", "hover:opacity-80 transition-opacity cursor-pointer");

      // 마우스 오버 툴팁
      const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
      title.textContent = `${item.month}: ${window.DashboardState.formatKoreanMoney(item.asset)}원 (${window.DashboardState.formatNumber(item.asset)}원)${changeText}`;
      rect.appendChild(title);
      svg.appendChild(rect);

      // 2. X축 레이블: 1월은 연도와 함께('YY.1월), 그 외는 월만 표시 (모든 월 누락 없이 표시)
      const parts = (item.month || "").split('.');
      const yearStr = parts[0] || "";
      const monthNum = parseInt(parts[1], 10);
      const isJanuary = (monthNum === 1);
      const labelText = isJanuary ? `'${yearStr.slice(-2)}.1월` : `${monthNum}월`;

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", x + barWidth / 2);
      text.setAttribute("y", height - 4);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("font-size", "12");
      text.setAttribute("font-weight", isJanuary ? "700" : "500");
      text.setAttribute("fill", isJanuary ? "#0f172a" : "#64748b");
      text.setAttribute("font-family", "Pretendard, -apple-system, sans-serif");
      text.textContent = labelText;
      svg.appendChild(text);
    });
  },

  /**
   * 최근 12개월 배당금 수령액 막대그래프를 렌더링합니다.
   */
  renderDividendBarChart(history, svgId, latestId, totalYearId, avgId) {
    const svg = document.getElementById(svgId);
    if (!svg || !history || history.length === 0) return;
    svg.innerHTML = '';

    const width = svg.clientWidth || 320;
    const height = svg.clientHeight || 110;

    const divs = history.map(d => d.div);
    const maxVal = Math.max(...divs);
    const barWidth = Math.max(12, (width / history.length) - 6);

    const latestDiv = divs[divs.length - 1] || 0;
    const latestEl = document.getElementById(latestId);
    if (latestEl) latestEl.innerText = `당월 ${window.DashboardState.formatKoreanMoney(latestDiv)}원`;

    const totalYear = divs.reduce((sum, v) => sum + v, 0);
    const totalYearEl = document.getElementById(totalYearId);
    if (totalYearEl) totalYearEl.innerText = `${window.DashboardState.formatKoreanMoney(totalYear)}원`;
    
    const avgEl = document.getElementById(avgId);
    if (avgEl) avgEl.innerText = `${window.DashboardState.formatKoreanMoney(Math.round(totalYear / 12))}원`;

    history.forEach((item, idx) => {
      const x = idx * (width / history.length) + (width / history.length - barWidth) / 2;
      const barHeight = maxVal > 0 ? Math.max(item.div > 0 ? 3 : 0, (item.div / maxVal) * (height - 28)) : 0;
      const y = height - 18 - barHeight;

      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", x);
      rect.setAttribute("y", y);
      rect.setAttribute("width", barWidth);
      rect.setAttribute("height", barHeight);
      rect.setAttribute("rx", "3");
      rect.setAttribute("fill", idx === history.length - 1 ? "#f59e0b" : "#fbbf24");
      rect.setAttribute("class", "hover:opacity-80 transition-opacity cursor-pointer");

      const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
      title.textContent = `${item.month}: ${window.DashboardState.formatNumber(item.div)}원`;
      rect.appendChild(title);
      svg.appendChild(rect);

      // X축 레이블 (12개월 누락 없이 모두 표시, 1월은 연도 포함, 12px)
      const parts = (item.month || "").split('.');
      const yearStr = parts[0] || "";
      const monthNum = parseInt(parts[1], 10);
      const isJanuary = (monthNum === 1);
      const labelText = isJanuary ? `'${yearStr.slice(-2)}.1월` : `${monthNum}월`;

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", x + barWidth / 2);
      text.setAttribute("y", height - 4);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("font-size", "12");
      text.setAttribute("font-weight", isJanuary ? "700" : "500");
      text.setAttribute("fill", isJanuary ? "#0f172a" : "#64748b");
      text.setAttribute("font-family", "Pretendard, -apple-system, sans-serif");
      text.textContent = labelText;
      svg.appendChild(text);
    });
  },

  /**
   * 보유 종목 2차원 사각형 면적 분할(Squarified Treemap) 차트를 렌더링합니다.
   */
  renderRatioTreemap(holdings, totalAsset, containerId, countBadgeId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';
    const badge = document.getElementById(countBadgeId);
    if (badge) badge.innerText = `${holdings.length}개 종목`;

    if (!holdings || holdings.length === 0 || totalAsset <= 0) {
      container.innerHTML = '<div class="w-full h-full flex items-center justify-center text-xs text-slate-500">보유 종목이 없습니다.</div>';
      return;
    }

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 224;

    // 총금액 내림차순 정렬 및 색상 부여
    const sorted = [...holdings].sort((a, b) => b.total - a.total);
    sorted.forEach((item, idx) => {
      item.color = this.colorPalette[idx % this.colorPalette.length];
    });

    const rects = this.computeSquarifiedTreemap(sorted, 0, 0, width, height);

    rects.forEach(tile => {
      const el = document.createElement('div');
      el.style.position = 'absolute';
      el.style.left = `${tile.x}px`;
      el.style.top = `${tile.y}px`;
      el.style.width = `${tile.w}px`;
      el.style.height = `${tile.h}px`;
      el.style.backgroundColor = tile.color || '#3b82f6';
      el.style.boxSizing = 'border-box';
      el.className = 'border border-white/60 overflow-hidden flex flex-col items-center justify-center text-center p-0.5 cursor-pointer transition-all duration-150 hover:brightness-110 active:scale-95';

      // 마우스 오버 / 터치 툴팁
      el.title = `${tile.name}: ${tile.pct}% (${window.DashboardState.formatNumber(tile.total)}원)`;

      // 스마트 텍스트 표시 (규격화된 12px / 14px 적용)
      if (tile.w >= 48 && tile.h >= 32) {
        // 중·대형 타일: 종목명(12px) + 비중(14px: text-sm)
        el.innerHTML = `
          <div class="font-semibold text-xs text-white truncate max-w-full leading-tight drop-shadow px-0.5">${tile.name}</div>
          <div class="text-sm font-bold text-white tabular-nums mt-0.5 drop-shadow tracking-tight">${tile.pct}%</div>
        `;
      } else if (tile.w >= 36 && tile.h >= 24) {
        // 소형 타일: 종목명(12px) + 비중(12px)
        el.innerHTML = `
          <div class="font-medium text-xs text-white truncate max-w-full leading-tight drop-shadow px-0.5">${tile.name}</div>
          <div class="text-xs font-semibold text-white/95 tabular-nums drop-shadow tracking-tight">${tile.pct}%</div>
        `;
      } else if (tile.w >= 28 && tile.h >= 18) {
        // 극소형 직전 타일: 비중만 표시 (12px)
        el.innerHTML = `
          <div class="font-semibold text-xs text-white tabular-nums truncate max-w-full drop-shadow tracking-tight">${tile.pct}%</div>
        `;
      } else {
        // 극소형 타일: 글자 숨김
        el.innerHTML = '';
      }

      // 클릭 시 하단 종목 카드로 스크롤 및 하이라이트 효과
      el.addEventListener('click', () => {
        const cardId = 'stock-card-' + (tile.account ? (tile.account + '-') : '') + tile.code;
        let targetCard = document.getElementById(cardId);
        if (!targetCard) {
          targetCard = document.querySelector(`[id$="-${tile.code}"], [id="stock-card-${tile.code}"]`);
        }
        if (targetCard) {
          targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetCard.classList.add('ring-2', 'ring-indigo-400', 'bg-indigo-950/60');
          setTimeout(() => {
            targetCard.classList.remove('ring-2', 'ring-indigo-400', 'bg-indigo-950/60');
          }, 1600);
        }
      });

      container.appendChild(el);
    });
  },

  /**
   * Squarified Treemap 알고리즘: 직사각형 면적을 1:1에 가까운 사각형으로 분할
   */
  computeSquarifiedTreemap(items, x, y, width, height) {
    if (!items || items.length === 0) return [];
    if (items.length === 1) {
      const it = items[0];
      return [{ ...it, x, y, w: width, h: height, pct: '100.0' }];
    }

    const totalValue = items.reduce((sum, d) => sum + d.total, 0);
    if (totalValue <= 0) return [];

    const totalArea = width * height;
    const elements = items.map(d => ({
      ...d,
      area: (d.total / totalValue) * totalArea,
      pct: ((d.total / totalValue) * 100).toFixed(1)
    })).sort((a, b) => b.area - a.area);

    const rects = [];

    function worstAspectRatio(row, sideLength) {
      const s = row.reduce((sum, el) => sum + el.area, 0);
      if (s === 0 || sideLength === 0) return Infinity;
      const h = s / sideLength;
      if (h === 0) return Infinity;
      let worst = 0;
      for (const el of row) {
        const w = el.area / h;
        if (w === 0) continue;
        const ratio = Math.max(w / h, h / w);
        if (ratio > worst) worst = ratio;
      }
      return worst;
    }

    function layoutRow(row, sideLength, currentX, currentY, isHorizontal) {
      const s = row.reduce((sum, el) => sum + el.area, 0);
      const rowThickness = sideLength > 0 ? (s / sideLength) : 0;
      let offset = 0;

      for (const el of row) {
        const elLength = rowThickness > 0 ? (el.area / rowThickness) : 0;
        if (isHorizontal) {
          rects.push({
            ...el,
            x: currentX + offset,
            y: currentY,
            w: elLength,
            h: rowThickness
          });
          offset += elLength;
        } else {
          rects.push({
            ...el,
            x: currentX,
            y: currentY + offset,
            w: rowThickness,
            h: elLength
          });
          offset += elLength;
        }
      }
      return rowThickness;
    }

    let curX = x;
    let curY = y;
    let curW = width;
    let curH = height;

    let remaining = [...elements];
    let currentRow = [];

    while (remaining.length > 0) {
      const isHorizontal = curW >= curH;
      const side = isHorizontal ? curH : curW;

      const nextEl = remaining[0];
      const testRow = [...currentRow, nextEl];

      if (currentRow.length === 0 || worstAspectRatio(testRow, side) <= worstAspectRatio(currentRow, side)) {
        currentRow.push(remaining.shift());
      } else {
        const thickness = layoutRow(currentRow, side, curX, curY, !isHorizontal);
        if (isHorizontal) {
          curX += thickness;
          curW -= thickness;
        } else {
          curY += thickness;
          curH -= thickness;
        }
        currentRow = [];
      }
    }

    if (currentRow.length > 0) {
      const isHorizontal = curW >= curH;
      const side = isHorizontal ? curH : curW;
      layoutRow(currentRow, side, curX, curY, !isHorizontal);
    }

    return rects;
  },

  /**
   * (하위 호환) 기존 가로 누적 바 렌더링 유지
   */
  renderRatioBar(holdings, totalAsset, barId, legendId, countBadgeId) {
    this.renderRatioTreemap(holdings, totalAsset, barId, countBadgeId);
  },

  /**
   * 종목 상세 바텀시트용 최근 5일 초경량 SVG 스파크라인 추세선 렌더링 (0.0초 렌더링)
   */
  renderStockSparkline(prices, svgId, diffId) {
    const svg = document.getElementById(svgId);
    if (!svg || !prices || prices.length < 2) return;
    svg.innerHTML = '';

    const width = svg.clientWidth || 320;
    const height = svg.clientHeight || 80;
    const padX = 14;
    const padY = 12;

    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const range = (maxP - minP) || 1;

    const firstP = prices[0];
    const lastP = prices[prices.length - 1];
    const diffPct = firstP > 0 ? (((lastP - firstP) / firstP) * 100) : 0;
    const isUp = diffPct >= 0;
    const strokeColor = isUp ? "#ef4444" : "#3b82f6";
    const gradId = `sparkGrad_${Math.random().toString(36).substr(2, 6)}`;

    // 5일 변동률 배지 업데이트
    const diffEl = document.getElementById(diffId);
    if (diffEl) {
      if (diffPct > 0) {
        diffEl.className = "text-xs font-bold text-red-600 tabular-nums";
        diffEl.innerText = `5일간 ▲ +${diffPct.toFixed(2)}%`;
      } else if (diffPct < 0) {
        diffEl.className = "text-xs font-bold text-blue-600 tabular-nums";
        diffEl.innerText = `5일간 ▼ ${diffPct.toFixed(2)}%`;
      } else {
        diffEl.className = "text-xs font-bold text-slate-500 tabular-nums";
        diffEl.innerText = `5일간 0.00%`;
      }
    }

    // Points 계산
    const points = prices.map((p, idx) => {
      const x = padX + (idx / (prices.length - 1)) * (width - padX * 2);
      const y = height - padY - ((p - minP) / range) * (height - padY * 2);
      return { x, y, price: p, day: idx === prices.length - 1 ? '오늘' : `D-${prices.length - 1 - idx}` };
    });

    // SVG Defs (그라데이션)
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const linearGrad = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
    linearGrad.setAttribute("id", gradId);
    linearGrad.setAttribute("x1", "0");
    linearGrad.setAttribute("y1", "0");
    linearGrad.setAttribute("x2", "0");
    linearGrad.setAttribute("y2", "1");

    const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
    stop1.setAttribute("offset", "0%");
    stop1.setAttribute("stop-color", strokeColor);
    stop1.setAttribute("stop-opacity", "0.28");

    const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
    stop2.setAttribute("offset", "100%");
    stop2.setAttribute("stop-color", strokeColor);
    stop2.setAttribute("stop-opacity", "0.0");

    linearGrad.appendChild(stop1);
    linearGrad.appendChild(stop2);
    defs.appendChild(linearGrad);
    svg.appendChild(defs);

    // Area Path
    let dLine = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      dLine += ` L ${points[i].x} ${points[i].y}`;
    }
    const dArea = `${dLine} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

    const areaPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    areaPath.setAttribute("d", dArea);
    areaPath.setAttribute("fill", `url(#${gradId})`);
    svg.appendChild(areaPath);

    const linePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    linePath.setAttribute("d", dLine);
    linePath.setAttribute("fill", "none");
    linePath.setAttribute("stroke", strokeColor);
    linePath.setAttribute("stroke-width", "2.5");
    linePath.setAttribute("stroke-linecap", "round");
    linePath.setAttribute("stroke-linejoin", "round");
    svg.appendChild(linePath);

    // High & Low Labels & Dots
    points.forEach((pt) => {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", pt.x);
      circle.setAttribute("cy", pt.y);
      circle.setAttribute("r", pt.day === '오늘' ? "4.5" : "3");
      circle.setAttribute("fill", pt.day === '오늘' ? strokeColor : "#ffffff");
      circle.setAttribute("stroke", strokeColor);
      circle.setAttribute("stroke-width", "2");
      circle.setAttribute("class", "cursor-pointer transition-transform hover:scale-125");

      const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
      title.textContent = `${pt.day}: ${window.DashboardState.formatNumber(pt.price)}원`;
      circle.appendChild(title);
      svg.appendChild(circle);
    });
  }
};

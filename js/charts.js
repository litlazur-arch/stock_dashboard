/**
 * ==========================================================================
 * 차트 시각화 모듈 (charts.js)
 * SVG 기반의 반응형 막대그래프(자산, 배당금) 및 종목 비중 바를 렌더링합니다.
 * ==========================================================================
 */

window.DashboardCharts = {
  // 종목별 비중 컬러 팔레트
  colorPalette: [
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
    document.getElementById(minId).innerText = window.DashboardState.formatKoreanMoney(Math.min(...assets)) + '원';
    document.getElementById(maxId).innerText = window.DashboardState.formatKoreanMoney(maxVal) + '원';

    history.forEach((item, idx) => {
      const x = idx * (width / history.length) + (width / history.length - barWidth) / 2;
      const range = (maxVal - minVal) || 1;
      const barHeight = Math.max(4, ((item.asset - minVal) / range) * (height - 32));
      const y = height - 20 - barHeight;

      // SVG 막대 사각형
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", x);
      rect.setAttribute("y", y);
      rect.setAttribute("width", barWidth);
      rect.setAttribute("height", barHeight);
      rect.setAttribute("rx", "3");
      rect.setAttribute("fill", idx === history.length - 1 ? "#3b82f6" : "#60a5fa");
      rect.setAttribute("class", "hover:opacity-80 transition-opacity cursor-pointer");

      // 마우스 오버 툴팁
      const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
      title.textContent = `${item.month}: ${window.DashboardState.formatKoreanMoney(item.asset)}원 (${window.DashboardState.formatNumber(item.asset)}원)`;
      rect.appendChild(title);
      svg.appendChild(rect);

      // 월별 라벨 (짝수 인덱스 또는 마지막 월 표시)
      if (idx % 2 === 1 || idx === history.length - 1) {
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", x + barWidth / 2);
        text.setAttribute("y", height - 4);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("font-size", "10");
        text.setAttribute("fill", "#94a3b8");
        text.textContent = item.month.replace("20", "");
        svg.appendChild(text);
      }
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
    document.getElementById(latestId).innerText = `당월 ${window.DashboardState.formatKoreanMoney(latestDiv)}원`;

    const totalYear = divs.reduce((sum, v) => sum + v, 0);
    document.getElementById(totalYearId).innerText = `${window.DashboardState.formatKoreanMoney(totalYear)}원`;
    document.getElementById(avgId).innerText = `${window.DashboardState.formatKoreanMoney(Math.round(totalYear / 12))}원`;

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

      if (idx % 2 === 1 || idx === history.length - 1) {
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", x + barWidth / 2);
        text.setAttribute("y", height - 4);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("font-size", "10");
        text.setAttribute("fill", "#94a3b8");
        text.textContent = item.month.replace("20", "");
        svg.appendChild(text);
      }
    });
  },

  /**
   * 보유 종목 100% 가로 누적 비중 바 및 범례를 렌더링합니다.
   */
  renderRatioBar(holdings, totalAsset, barId, legendId, countBadgeId) {
    const bar = document.getElementById(barId);
    const legend = document.getElementById(legendId);
    if (!bar || !legend) return;

    bar.innerHTML = '';
    legend.innerHTML = '';
    document.getElementById(countBadgeId).innerText = `${holdings.length}개 종목`;

    // 총금액 내림차순 정렬
    const sorted = [...holdings].sort((a, b) => b.total - a.total);

    sorted.forEach((item, idx) => {
      const color = this.colorPalette[idx % this.colorPalette.length];
      item.color = color; // 리스트 카드에서 재사용

      const pct = totalAsset > 0 ? ((item.total / totalAsset) * 100).toFixed(1) : 0;

      // 가로 누적 바 조각
      const chunk = document.createElement('div');
      chunk.style.width = pct + '%';
      chunk.style.backgroundColor = color;
      chunk.title = `${item.name}: ${pct}%`;
      bar.appendChild(chunk);

      // 범례 태그
      const tag = document.createElement('div');
      tag.className = "flex items-center gap-1.5 text-xs bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800";
      tag.innerHTML = `
        <span class="w-2 h-2 rounded-full" style="background-color: ${color}"></span>
        <span class="font-medium text-slate-200 truncate max-w-[110px]">${item.name}</span>
        <span class="text-slate-400 font-mono">${pct}%</span>
      `;
      legend.appendChild(tag);
    });
  }
};

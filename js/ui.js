/**
 * ==========================================================================
 * UI 렌더링 모듈 (ui.js)
 * 계좌 탭, 보유 종목 상세 카드 리스트 및 로딩/상태 인디케이터를 처리합니다.
 * ==========================================================================
 */

window.DashboardUI = {
  /**
   * 계좌 선택 탭 버튼 목록을 동적으로 생성합니다.
   */
  renderAccountTabs(accounts, activeIndex, onSelectTab) {
    const container = document.getElementById('accountTabsContainer');
    if (!container) return;
    container.innerHTML = '';

    accounts.forEach((acc, idx) => {
      const btn = document.createElement('button');
      const isActive = idx === activeIndex;
      
      btn.className = isActive
        ? "px-3.5 py-1.5 rounded-full text-xs font-semibold bg-blue-600 text-white whitespace-nowrap shadow-xs transition-all"
        : "px-3.5 py-1.5 rounded-full text-xs font-medium bg-slate-950 text-slate-400 hover:text-white border border-slate-800 whitespace-nowrap transition-all";
      btn.innerText = acc.name;
      
      btn.onclick = () => onSelectTab(idx);
      container.appendChild(btn);
    });
  },

  /**
   * 보유 종목 카드 리스트를 렌더링합니다.
   */
  renderHoldingsList(holdings, totalAsset, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    if (!holdings || holdings.length === 0) {
      container.innerHTML = '<div class="text-xs text-center py-4 text-slate-500">보유 종목이 없습니다.</div>';
      return;
    }

    const sorted = [...holdings].sort((a, b) => b.total - a.total);

    sorted.forEach(item => {
      const pct = totalAsset > 0 ? ((item.total / totalAsset) * 100).toFixed(1) : 0;
      const card = document.createElement('div');
      card.className = "p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between hover:border-blue-500 transition-all";
      
      card.innerHTML = `
        <div class="flex items-center gap-2.5">
          <div class="w-1.5 h-8 rounded-full" style="background-color: ${item.color || '#3b82f6'}"></div>
          <div>
            <div class="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              ${item.name}
              <span class="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">${item.code}</span>
            </div>
            <div class="text-[11px] text-slate-400 mt-0.5">
              보유 ${window.DashboardState.formatNumber(item.qty)}주 • 현재가 ${window.DashboardState.formatNumber(item.price)}원
            </div>
          </div>
        </div>
        <div class="text-right">
          <div class="text-xs font-extrabold text-white font-mono">
            ${window.DashboardState.formatNumber(item.total)}원
          </div>
          <div class="text-[11px] text-emerald-400 font-medium">
            비중 ${pct}%
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  },

  /**
   * 로딩 스피너 및 메인 콘텐츠 표시 전환
   */
  setLoading(isLoading) {
    const loadingBox = document.getElementById('loadingBox');
    const mainContent = document.getElementById('mainContent');
    const refreshIcon = document.getElementById('refreshIcon');

    if (isLoading) {
      loadingBox.classList.remove('hidden');
      mainContent.classList.add('hidden');
      if (refreshIcon) refreshIcon.classList.add('animate-spin');
    } else {
      loadingBox.classList.add('hidden');
      mainContent.classList.remove('hidden');
      if (refreshIcon) refreshIcon.classList.remove('animate-spin');
    }
  },

  /**
   * 상단 상태 도트 색상 업데이트
   */
  setStatus(status) {
    const dot = document.getElementById('statusDot');
    if (!dot) return;
    if (status === 'syncing') {
      dot.className = "w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping";
    } else if (status === 'success') {
      dot.className = "w-2.5 h-2.5 rounded-full bg-emerald-500";
    } else {
      dot.className = "w-2.5 h-2.5 rounded-full bg-red-500";
    }
  },

  /**
   * 사용자 전환 버튼 UI 업데이트
   */
  updateUserSwitcher(userCode) {
    const btnJ = document.getElementById('btnUserJ');
    const btnK = document.getElementById('btnUserK');
    const urlDisplay = document.getElementById('urlDisplay');
    const userTitle = document.getElementById('userTitleLabel');

    if (userCode === 'j') {
      btnJ.className = "px-2.5 py-1 rounded-md font-medium transition-all bg-blue-600 text-white shadow-xs";
      btnK.className = "px-2.5 py-1 rounded-md font-medium transition-all text-slate-400 hover:text-white";
      urlDisplay.innerText = "https://.../u/j";
      userTitle.innerText = "내 포트폴리오 (Ⓙ)";
    } else {
      btnK.className = "px-2.5 py-1 rounded-md font-medium transition-all bg-blue-600 text-white shadow-xs";
      btnJ.className = "px-2.5 py-1 rounded-md font-medium transition-all text-slate-400 hover:text-white";
      urlDisplay.innerText = "https://.../u/k";
      userTitle.innerText = "배우자 포트폴리오 (Ⓚ)";
    }
  }
};

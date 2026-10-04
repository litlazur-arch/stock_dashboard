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
        ? "px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold bg-blue-600 text-white whitespace-nowrap shadow-xs transition-all"
        : "px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold bg-slate-950 text-slate-400 hover:text-white border border-slate-800 whitespace-nowrap transition-all";
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

    // 지정 우선순위 종목 순서 (1~11위)
    const priorityCodes = [
      "000660", // 1. SK하이닉스
      "005380", // 2. 현대차
      "005935", // 3. 삼성전자우
      "012450", // 4. 한화에어로스페이스
      "489790", // 5. 한화비전
      "010950", // 6. S-Oil
      "498400", // 7. Kodex200타켓위클리커버드콜
      "133690", // 8. Tiger미국나스닥100
      "367380", // 9. Ace 미국나스닥100
      "458730", // 10. Tiger미국배당다우존스
      "490490"  // 11. SOL미국배당미국채혼합50
    ];

    function getPriorityRank(item) {
      const codeIdx = priorityCodes.indexOf(item.code);
      if (codeIdx !== -1) return codeIdx;

      const norm = (item.name || "").replace(/[\s\-_]/g, '').toUpperCase();
      if (norm.includes("SK하이닉스")) return 0;
      if (norm.includes("현대차")) return 1;
      if (norm.includes("삼성전자우")) return 2;
      if (norm.includes("한화에어로")) return 3;
      if (norm.includes("한화비전")) return 4;
      if (norm.includes("SOIL") || norm.includes("S-OIL")) return 5;
      if (norm.includes("위클리커버드콜")) return 6;
      if (norm.includes("TIGER") && norm.includes("나스닥100")) return 7;
      if (norm.includes("ACE") && norm.includes("나스닥100")) return 8;
      if (norm.includes("TIGER") && norm.includes("배당다우존스")) return 9;
      if (norm.includes("SOL") && norm.includes("미국채혼합")) return 10;

      return 999;
    }

    // 4. 지정 종목 우선 정렬 후 나머지 종목은 평가금액 큰 순서로 정렬
    const sorted = [...holdings].sort((a, b) => {
      const rankA = getPriorityRank(a);
      const rankB = getPriorityRank(b);

      if (rankA !== 999 || rankB !== 999) {
        if (rankA !== rankB) return rankA - rankB;
      }

      return b.total - a.total;
    });

    sorted.forEach(item => {
      const card = document.createElement('div');
      card.id = 'stock-card-' + item.code;
      card.className = "p-2.5 sm:p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between hover:border-blue-500 transition-all duration-300";
      
      // 3. 전일 대비 상승률 표시 (상승: RED, 하락: BLUE)
      let changeHtml = '';
      if (item.changeRate !== undefined && item.changeRate !== null) {
        const rate = parseFloat(item.changeRate);
        if (rate > 0) {
          changeHtml = `<span class="text-xs sm:text-[13px] font-extrabold text-red-500 font-mono">▲ +${rate.toFixed(2)}%</span>`;
        } else if (rate < 0) {
          changeHtml = `<span class="text-xs sm:text-[13px] font-extrabold text-blue-500 font-mono">▼ ${rate.toFixed(2)}%</span>`;
        } else {
          changeHtml = `<span class="text-xs font-semibold text-slate-400 font-mono">0.00%</span>`;
        }
      } else {
        changeHtml = `<span class="text-[11px] text-slate-500 font-mono">- %</span>`;
      }

      card.innerHTML = `
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-1.5 h-10 rounded-full shrink-0" style="background-color: ${item.color || '#3b82f6'}"></div>
          <div class="min-w-0">
            <div class="text-[13px] sm:text-sm font-bold text-slate-100 flex items-center gap-1.5 truncate">
              <span class="truncate">${item.name}</span>
              <span class="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800 shrink-0">${item.code}</span>
            </div>
            <!-- 수량('주' 위치 통일) & 평가액('만원' 공백 삭제, 간격 최소화) -->
            <div class="flex items-center text-xs text-slate-400 mt-1 whitespace-nowrap">
              <span class="w-[46px] text-right font-mono font-semibold text-slate-200 shrink-0">${window.DashboardState.formatNumber(item.qty)}</span>
              <span class="text-slate-400 shrink-0 ml-0.5">주</span>
              <span class="mx-1.5 text-slate-700 shrink-0">|</span>
              <span class="text-slate-400 shrink-0">평가액</span>
              <span class="ml-1 font-mono font-semibold text-slate-200 shrink-0">${window.DashboardState.formatManWonNum(item.total)}</span>
              <span class="text-slate-400 shrink-0">만원</span>
            </div>
          </div>
        </div>
        
        <!-- 우측: 현재가 크게 표시 & 전일 대비 상승률 -->
        <div class="text-right flex flex-col items-end justify-center shrink-0 ml-2">
          <div class="text-sm sm:text-base font-extrabold text-white font-mono tracking-tight">
            ${window.DashboardState.formatNumber(item.price)}원
          </div>
          <div class="mt-0.5">
            ${changeHtml}
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
   * 사용자 포트폴리오 타이틀 업데이트 (포트폴리오 Ⓙ / 포트폴리오 Ⓚ)
   */
  updateUserSwitcher(userCode) {
    const userTitle = document.getElementById('userTitleLabel');
    if (userTitle) {
      userTitle.innerText = userCode === 'k' ? "포트폴리오 Ⓚ" : "포트폴리오 Ⓙ";
    }
  }
};

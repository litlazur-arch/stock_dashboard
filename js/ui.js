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
      const isTotal = acc.id === 'all' || acc.id === 'all_k' || (acc.name && acc.name.includes('통합'));

      if (isActive) {
        btn.className = isTotal
          ? "flex-1 py-1.5 px-0.5 rounded-lg text-xs sm:text-sm font-bold text-center tracking-tight transition-all bg-white text-blue-600 shadow-[0_4px_8px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.08)] border-t border-white flex items-center justify-center gap-0.5 truncate cursor-pointer active:scale-[0.98]"
          : "flex-1 py-1.5 px-0.5 rounded-lg text-xs sm:text-sm font-bold text-center tracking-tight transition-all bg-white text-slate-900 shadow-[0_4px_8px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.08)] border-t border-white flex items-center justify-center truncate cursor-pointer active:scale-[0.98]";
      } else {
        btn.className = isTotal
          ? "flex-1 py-1.5 px-0.5 rounded-lg text-xs sm:text-sm font-medium text-slate-500 text-center tracking-tight transition-all hover:text-slate-800 flex items-center justify-center gap-0.5 truncate cursor-pointer"
          : "flex-1 py-1.5 px-0.5 rounded-lg text-xs sm:text-sm font-medium text-slate-500 text-center tracking-tight transition-all hover:text-slate-800 flex items-center justify-center truncate cursor-pointer";
      }

      if (isTotal) {
        const badgeBg = isActive ? "bg-blue-100 text-blue-700 font-black" : "bg-slate-200 text-slate-500 font-bold";
        btn.innerHTML = `<span class="px-1 py-0.2 rounded text-xs ${badgeBg}">ALL</span><span>${acc.name}</span>`;
      } else {
        btn.innerText = acc.name;
      }
      
      btn.onclick = () => onSelectTab(idx);
      container.appendChild(btn);
    });
  },

  /**
   * 종목명 포맷팅: 운영사 브랜드(Tiger, Kodex, Ace, Sol 등)가 있는 경우 1행 분리 및 줄바꿈 지원 (18px)
   */
  formatStockNameHtml(name) {
    if (!name) return '';
    const norm = name.trim();
    const brands = ['TIGER', 'Tiger', 'KODEX', 'Kodex', 'ACE', 'Ace', 'SOL', 'Sol', 'KBSTAR', 'Kbstar', 'ARIRANG', 'HANARO', 'PLUS', 'KOSEF', 'TIMEFOLIO', 'RISE'];
    
    for (const b of brands) {
      if (norm.startsWith(b)) {
        const rest = norm.slice(b.length).trim();
        if (rest) {
          return `
            <div class="text-xs font-semibold text-slate-400 tracking-tight leading-none mb-1">${b}</div>
            <div class="text-lg font-bold text-slate-900 tracking-tight leading-snug break-keep">${rest}</div>
          `;
        }
      }
    }
    return `<div class="text-lg font-bold text-slate-900 tracking-tight leading-snug break-keep">${norm}</div>`;
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
      card.id = 'stock-card-' + (item.account ? (item.account + '-') : '') + item.code;
      card.setAttribute('data-stock-code', item.code);
      card.className = "p-3 bg-white border border-slate-200/90 rounded-xl flex items-center justify-between hover:border-blue-400 hover:shadow-xs transition-all duration-300 shadow-2xs cursor-pointer active:scale-[0.99]";
      card.onclick = () => this.openStockModal(item, totalAsset);
      
      // 전일 대비 증감 계산 (금액 & 비율)
      let rateNum = 0;
      let diffAmtNum = 0;

      if (item.changeRate !== undefined && item.changeRate !== null) {
        rateNum = parseFloat(item.changeRate) || 0;
      }
      if (item.changeAmount !== undefined && item.changeAmount !== null && item.changeAmount !== 0) {
        diffAmtNum = Math.round(item.changeAmount);
      } else if (item.basePrice && item.price) {
        diffAmtNum = Math.round(item.price - item.basePrice);
      } else if (rateNum !== 0 && item.price) {
        diffAmtNum = Math.round(item.price * (rateNum / 100));
      }

      let diffAmtHtml = '';
      let diffRateHtml = '';

      if (rateNum > 0 || diffAmtNum > 0) {
        const amtStr = diffAmtNum > 0 ? `+${window.DashboardState.formatNumber(diffAmtNum)}원` : `+${window.DashboardState.formatNumber(Math.round(item.price * rateNum / 100))}원`;
        diffAmtHtml = `<span class="text-sm font-bold text-red-600 tabular-nums tracking-tight">▲ ${amtStr}</span>`;
        diffRateHtml = `<span class="text-sm font-bold text-red-600 tabular-nums tracking-tight">▲ +${rateNum.toFixed(2)}%</span>`;
      } else if (rateNum < 0 || diffAmtNum < 0) {
        const amtStr = diffAmtNum < 0 ? `${window.DashboardState.formatNumber(diffAmtNum)}원` : `${window.DashboardState.formatNumber(Math.round(item.price * rateNum / 100))}원`;
        diffAmtHtml = `<span class="text-sm font-bold text-blue-600 tabular-nums tracking-tight">▼ ${amtStr}</span>`;
        diffRateHtml = `<span class="text-sm font-bold text-blue-600 tabular-nums tracking-tight">▼ ${rateNum.toFixed(2)}%</span>`;
      } else {
        diffAmtHtml = `<span class="text-sm font-medium text-slate-500 tabular-nums tracking-tight">0원</span>`;
        diffRateHtml = `<span class="text-sm font-medium text-slate-500 tabular-nums tracking-tight">0.00%</span>`;
      }

      card.innerHTML = `
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <div class="w-1.5 h-11 rounded-full shrink-0" style="background-color: ${item.color || '#3b82f6'}"></div>
          <div class="min-w-0 flex-1 pr-1">
            ${this.formatStockNameHtml(item.name)}
          </div>
        </div>
        
        <!-- 우측: 현재가 (18px: text-lg) & 증감 금액 (14px: text-sm) & 증감률 (14px: text-sm) -->
        <div class="text-right flex flex-col items-end justify-center shrink-0 ml-2">
          <!-- 1행: 현재가 (18px) -->
          <div class="text-lg font-bold text-slate-900 tabular-nums tracking-tight">
            ${window.DashboardState.formatNumber(item.price)}원
          </div>
          <!-- 2행: 전일 대비 증감 금액 (14px) -->
          <div class="mt-0.5">
            ${diffAmtHtml}
          </div>
          <!-- 3행: 전일 대비 증감 비율 (14px) -->
          <div class="mt-0.5">
            ${diffRateHtml}
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  },

  /**
   * 종목 상세 인앱 바텀시트 모달 열기 (0.0초 즉시 렌더링)
   */
  openStockModal(stock, totalAccountAsset) {
    const backdrop = document.getElementById('stockModalBackdrop');
    const card = document.getElementById('stockModalCard');
    if (!backdrop || !card) return;

    document.getElementById('modalStockName').innerText = stock.name;
    document.getElementById('modalStockCode').innerText = stock.code;
    const dot = document.getElementById('modalColorDot');
    if (dot) dot.style.backgroundColor = stock.color || '#3b82f6';
    
    document.getElementById('modalPrice').innerText = window.DashboardState.formatNumber(stock.price) + '원';

    // 전일 대비 등락률 및 등락액
    let rateVal = stock.changeRate;
    let diffAmt = stock.changeAmount;
    if (rateVal === undefined || rateVal === null) {
      rateVal = 0;
    }
    const rateNum = parseFloat(rateVal);
    const changeEl = document.getElementById('modalChangeRate');
    if (changeEl) {
      if (rateNum > 0) {
        changeEl.className = "text-base font-bold text-red-600 tabular-nums";
        const amtStr = diffAmt ? ` (+${window.DashboardState.formatNumber(diffAmt)}원)` : '';
        changeEl.innerText = `▲ +${rateNum.toFixed(2)}%${amtStr}`;
      } else if (rateNum < 0) {
        changeEl.className = "text-base font-bold text-blue-600 tabular-nums";
        const amtStr = diffAmt ? ` (${window.DashboardState.formatNumber(diffAmt)}원)` : '';
        changeEl.innerText = `▼ ${rateNum.toFixed(2)}%${amtStr}`;
      } else {
        changeEl.className = "text-base font-bold text-slate-500 tabular-nums";
        changeEl.innerText = `0.00% (0원)`;
      }
    }

    // 보유 수량 및 평가액
    document.getElementById('modalQty').innerText = window.DashboardState.formatNumber(stock.qty) + '주';
    document.getElementById('modalTotal').innerText = window.DashboardState.formatManWonNum(stock.total) + '만원';

    // 계좌 내 비중
    const ratio = totalAccountAsset > 0 ? ((stock.total / totalAccountAsset) * 100).toFixed(1) : '0.0';
    document.getElementById('modalRatio').innerText = ratio + '%';

    // 네이버 증권 외부 링크
    const naverLink = document.getElementById('modalNaverLink');
    if (naverLink) {
      naverLink.href = `https://m.stock.naver.com/domestic/stock/${stock.code}/total`;
    }

    // 최근 5일 시세 데이터 렌더링 (실제 5영업일 종가 & 거래일자 연동)
    let sparklinePrices = stock.recentPrices;
    let sparklineDates = stock.recentDates;
    if (!sparklinePrices || sparklinePrices.length < 2) {
      const p = stock.price || 0;
      const bp = stock.basePrice || p;
      sparklinePrices = [bp, p];
      sparklineDates = ['전일', '오늘'];
    }

    // 날짜 라벨 텍스트 업데이트
    const daysEl = document.getElementById('modalSparklineDays');
    if (daysEl && sparklineDates && sparklineDates.length >= 2) {
      daysEl.innerHTML = sparklineDates.map((d, i) => {
        const isToday = i === sparklineDates.length - 1;
        return `<span class="${isToday ? 'font-bold text-slate-700' : ''}">${d}</span>`;
      }).join('');
    }

    window.DashboardCharts.renderStockSparkline(sparklinePrices, sparklineDates, 'modalSparklineSvg', 'modalSparklineDiff');

    // 바텀시트 활성화 애니메이션
    backdrop.classList.remove('opacity-0', 'pointer-events-none');
    backdrop.classList.add('opacity-100');
    card.classList.remove('translate-y-full', 'sm:scale-95');
    card.classList.add('translate-y-0', 'sm:scale-100');
  },

  /**
   * 종목 상세 인앱 바텀시트 모달 닫기
   */
  closeStockModal() {
    const backdrop = document.getElementById('stockModalBackdrop');
    const card = document.getElementById('stockModalCard');
    if (!backdrop || !card) return;

    backdrop.classList.add('opacity-0', 'pointer-events-none');
    backdrop.classList.remove('opacity-100');
    card.classList.add('translate-y-full', 'sm:scale-95');
    card.classList.remove('translate-y-0', 'sm:scale-100');
  },

  /**
   * 최초 로딩 시 깜빡이는 스켈레톤 플레이스홀더 카드 렌더링
   */
  renderSkeletons(containerId = 'stockListContainer') {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    for (let i = 0; i < 4; i++) {
      const skel = document.createElement('div');
      skel.className = "p-2.5 sm:p-3 bg-white border border-slate-200/70 rounded-xl flex items-center justify-between animate-pulse shadow-2xs";
      skel.innerHTML = `
        <div class="flex items-center gap-2.5 min-w-0 flex-1">
          <div class="w-1.5 h-10 rounded-full bg-slate-200 shrink-0"></div>
          <div class="space-y-1.5 flex-1">
            <div class="h-4 bg-slate-200 rounded w-28"></div>
            <div class="h-3 bg-slate-100 rounded w-36"></div>
          </div>
        </div>
        <div class="text-right space-y-1.5 shrink-0 ml-2">
          <div class="h-4 bg-slate-200 rounded w-20 ml-auto"></div>
          <div class="h-3 bg-slate-100 rounded w-14 ml-auto"></div>
        </div>
      `;
      container.appendChild(skel);
    }
  },

  /**
   * 로딩 스피너 및 메인 콘텐츠 표시 전환
   */
  setLoading(isLoading) {
    const loadingBox = document.getElementById('loadingBox');
    const mainContent = document.getElementById('mainContent');
    const refreshIcon = document.getElementById('refreshIcon');

    if (isLoading) {
      if (mainContent.classList.contains('hidden')) {
        loadingBox.classList.remove('hidden');
      }
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

// 배경 클릭 시 바텀시트 닫기 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', () => {
  const backdrop = document.getElementById('stockModalBackdrop');
  if (backdrop) {
    backdrop.addEventListener('click', (e) => {
      if (e.target.id === 'stockModalBackdrop') {
        window.DashboardUI.closeStockModal();
      }
    });
  }
});

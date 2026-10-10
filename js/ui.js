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
            <div class="text-lg font-bold text-slate-900 tracking-tight leading-snug">${b}</div>
            <div class="text-lg font-bold text-slate-900 tracking-tight leading-snug break-keep">${rest}</div>
          `;
        }
      }
    }
    return `<div class="text-lg font-bold text-slate-900 tracking-tight leading-snug break-keep">${norm}</div>`;
  },

  /**
   * 종목별 아이콘 이미지 내부 태그를 생성합니다. (네이버 공식 원형 SVG & 토스 고해상도 PNG 하이브리드)
   */
  getStockIconInnerHtml(code, name) {
    const normCode = String(code || '').trim();
    const normName = String(name || '').trim();
    
    // 우선주 -> 본주 매핑 (토스/네이버 CDN 호환성)
    const baseCodeMap = window.DashboardState.PREFERRED_STOCK_MAP || {};
    const targetCode = baseCodeMap[normCode] || normCode;
    
    // ETF 브랜드 감지
    const brands = window.DashboardState.ETF_BRANDS || ['TIGER', 'KODEX', 'ACE', 'SOL', 'PLUS', 'RISE'];
    const matchedBrand = brands.find(b => normName.toUpperCase().includes(b));
    
    let primaryUrl = '';
    let fallbackUrl = '';
    
    if (matchedBrand) {
      // ETF: 토스 고화질 PNG (ETF별 심볼 100% 매칭) 우선 -> 네이버 브랜드 SVG
      primaryUrl = `https://static.toss.im/png-icons/securities/icn-sec-fill-${targetCode}.png`;
      fallbackUrl = `https://ssl.pstatic.net/imgstock/fn/real/logo/etf/StockKRETF${matchedBrand}.svg`;
    } else {
      // 일반 주식: 네이버 공식 원형 SVG (<circle cx="20" cy="20" r="20"> 완전한 원형) 우선 -> 토스 PNG
      primaryUrl = `https://ssl.pstatic.net/imgstock/fn/real/logo/stock/Stock${targetCode}.svg`;
      fallbackUrl = `https://static.toss.im/png-icons/securities/icn-sec-fill-${targetCode}.png`;
    }

    const initialText = normName.slice(0, 2);

    return `
      <img src="${primaryUrl}" alt="${normName}"
        class="w-full h-full object-cover rounded-full"
        loading="lazy"
        onerror="
          if (this.dataset.triedFallback !== '1' && '${fallbackUrl}') {
            this.dataset.triedFallback = '1';
            this.src = '${fallbackUrl}';
          } else {
            this.style.display = 'none';
            if (this.nextElementSibling) this.nextElementSibling.style.display = 'flex';
          }
        "
      />
      <div class="w-full h-full rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center hidden">
        ${initialText}
      </div>
    `;
  },

  /**
   * 종목별 원형 아이콘 컨테이너 및 이미지를 생성합니다.
   */
  getStockIconHtml(code, name, sizeClass = "w-10 h-10") {
    return `
      <div class="relative ${sizeClass} rounded-full bg-slate-100 border border-slate-200/90 shadow-2xs shrink-0 flex items-center justify-center overflow-hidden select-none">
        ${this.getStockIconInnerHtml(code, name)}
      </div>
    `;
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

    // 4. 지정 우선순위 종목 정렬 후 나머지 종목은 평가금액 내림차순 정렬
    const sorted = [...holdings].sort((a, b) => {
      const rankA = window.DashboardState.getHoldingPriorityRank(a);
      const rankB = window.DashboardState.getHoldingPriorityRank(b);

      if (rankA !== 999 || rankB !== 999) {
        if (rankA !== rankB) return rankA - rankB;
      }
      return (b.total || 0) - (a.total || 0);
    });

    sorted.forEach(item => {
      const card = document.createElement('div');
      card.id = 'stock-card-' + (item.account ? (item.account + '-') : '') + item.code;
      card.setAttribute('data-stock-code', item.code);
      card.className = "p-3 bg-white border border-slate-200/90 rounded-xl flex items-center justify-between hover:border-blue-400 hover:shadow-xs transition-all duration-300 shadow-2xs cursor-pointer active:scale-[0.99]";
      card.onclick = () => this.openStockModal(item, totalAsset);
      
      // 전일 대비 증감 계산 및 서식화 (통일된 헬퍼 사용)
      const { diffAmt, rate } = window.DashboardState.calculatePriceDiff(item);
      const { diffAmtHtml, diffRateHtml } = window.DashboardState.formatSignedDiff(diffAmt, rate);

      card.innerHTML = `
        <div class="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          ${this.getStockIconHtml(item.code, item.name)}
          <div class="min-w-0 flex-1 pr-1">
            ${this.formatStockNameHtml(item.name)}
          </div>
        </div>
        
        <!-- 우측: 현재가 (18px: text-lg) & 증감 금액 (14px: text-sm) & 증감률 (14px: text-sm) -->
        <div class="text-right flex flex-col items-end justify-center shrink-0 ml-2">
          <!-- 1행: 현재가 (18px) -->
          <div class="text-lg font-bold text-slate-900 tabular-nums tracking-tight leading-tight">
            ${window.DashboardState.formatNumber(item.price)}원
          </div>
          <!-- 2행: 전일 대비 증감 금액 (14px) -->
          <div class="mt-1 leading-tight">
            ${diffAmtHtml}
          </div>
          <!-- 3행: 전일 대비 증감 비율 (14px) -->
          <div class="mt-0 leading-tight">
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

    const nameEl = document.getElementById('modalStockName');
    if (nameEl) {
      nameEl.innerHTML = this.formatStockNameHtml(stock.name);
    }
    document.getElementById('modalStockCode').innerText = stock.code;
    const dot = document.getElementById('modalColorDot');
    if (dot) dot.style.backgroundColor = stock.color || '#3b82f6';
    const iconContainer = document.getElementById('modalStockIcon');
    if (iconContainer) {
      iconContainer.innerHTML = this.getStockIconInnerHtml(stock.code, stock.name);
    }
    
    // 계좌 배지
    const badgeEl = document.getElementById('modalAccountBadge');
    if (badgeEl) {
      badgeEl.innerText = stock.account || '보유 계좌';
    }

    // 보유 수량 및 평가액 (만원 단위 일치)
    document.getElementById('modalQty').innerText = window.DashboardState.formatNumber(stock.qty) + '주';
    document.getElementById('modalTotal').innerText = stock.total > 0 ? (window.DashboardState.formatManWonNum(stock.total) + '만원') : '-';

    // 계좌 내 비중
    const ratio = totalAccountAsset > 0 ? ((stock.total / totalAccountAsset) * 100).toFixed(1) : '0.0';
    document.getElementById('modalRatio').innerText = ratio + '%';

    // 매수 금액, 매수 단가 및 현재가/수익률 (2줄)
    const buyTotalEl = document.getElementById('modalBuyTotal');
    const buyPriceEl = document.getElementById('modalBuyPrice');
    const priceEl = document.getElementById('modalPrice');
    const profitRateEl = document.getElementById('modalProfitRate');

    const buyTotal = stock.buyTotal || (stock.buyPrice && stock.qty ? Math.round(stock.buyPrice * stock.qty) : 0);
    const buyPrice = stock.buyPrice || (buyTotal > 0 && stock.qty ? Math.round(buyTotal / stock.qty) : 0);

    if (buyTotalEl) {
      buyTotalEl.innerText = buyTotal > 0 ? (window.DashboardState.formatManWonNum(buyTotal) + '만원') : '-';
    }
    if (buyPriceEl) {
      buyPriceEl.innerText = buyPrice > 0 ? (window.DashboardState.formatNumber(buyPrice) + '원') : '-';
    }

    // 현재가 (1행)
    if (priceEl) {
      priceEl.innerText = stock.price > 0 ? (window.DashboardState.formatNumber(stock.price) + '원') : '-원';
    }

    // 매수단가 대비 증감비율 (2행)
    if (profitRateEl) {
      if (buyTotal > 0 && stock.total > 0) {
        const profitAmt = Math.round(stock.total - buyTotal);
        const profitPct = Math.abs((profitAmt / buyTotal) * 100).toFixed(2);
        if (profitAmt > 0) {
          profitRateEl.className = "text-xs sm:text-sm font-bold text-red-600 tabular-nums mt-0.5 leading-tight";
          profitRateEl.innerText = `+${profitPct}%`;
        } else if (profitAmt < 0) {
          profitRateEl.className = "text-xs sm:text-sm font-bold text-blue-600 tabular-nums mt-0.5 leading-tight";
          profitRateEl.innerText = `-${profitPct}%`;
        } else {
          profitRateEl.className = "text-xs sm:text-sm font-bold text-slate-500 tabular-nums mt-0.5 leading-tight";
          profitRateEl.innerText = `0.00%`;
        }
      } else {
        profitRateEl.className = "text-xs sm:text-sm font-bold text-slate-500 tabular-nums mt-0.5 leading-tight";
        profitRateEl.innerText = `-`;
      }
    }

    // 네이버 증권 외부 링크
    const naverLink = document.getElementById('modalNaverLink');
    if (naverLink) {
      naverLink.href = window.DashboardAPI.getNaverStockUrl(stock.code);
    }

    // 최근 20영업일(1개월) 시세 데이터 렌더링
    let sparklinePrices = stock.recentPrices;
    let sparklineDates = stock.recentDates;
    if (!sparklinePrices || sparklinePrices.length < 2) {
      const p = stock.price || 0;
      const bp = stock.basePrice || p;
      sparklinePrices = [bp, p];
      sparklineDates = ['전일', '오늘'];
    }

    // 날짜 라벨 텍스트 업데이트 (1개월 전, 2주 전, 오늘)
    const daysEl = document.getElementById('modalSparklineDays');
    if (daysEl && sparklineDates && sparklineDates.length >= 2) {
      const firstD = sparklineDates[0];
      const midD = sparklineDates[Math.floor(sparklineDates.length / 2)];
      const lastD = sparklineDates[sparklineDates.length - 1];
      if (sparklineDates.length >= 15) {
        daysEl.innerHTML = `
          <span>1개월 전 (${firstD})</span>
          <span>2주 전 (${midD})</span>
          <span class="font-bold text-slate-800">오늘 (${lastD})</span>
        `;
      } else {
        daysEl.innerHTML = `
          <span>${firstD}</span>
          <span>${midD}</span>
          <span class="font-bold text-slate-800">오늘 (${lastD})</span>
        `;
      }
    }

    window.DashboardCharts.renderStockSparkline(sparklinePrices, sparklineDates, 'modalSparklineSvg', 'modalSparklineDiff');

    this.initModalEvents();

    // 바텀시트 활성화 애니메이션
    card.style.transform = '';
    backdrop.classList.remove('opacity-0', 'pointer-events-none');
    backdrop.classList.add('opacity-100');
    card.classList.remove('translate-y-full', 'sm:scale-95');
    card.classList.add('translate-y-0', 'sm:scale-100');
  },

  /**
   * 모달 인터랙션 이벤트(배경 클릭, ESC 키, 아래로 스와이프 제스처) 초기화
   */
  initModalEvents() {
    if (this._modalEventsInitialized) return;
    this._modalEventsInitialized = true;

    const backdrop = document.getElementById('stockModalBackdrop');
    const card = document.getElementById('stockModalCard');

    // 1. 배경 딤드 레이어 터치/클릭 시 닫기
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          this.closeStockModal();
        }
      });
    }

    // 2. 키보드 ESC 키 누름 시 닫기 (데스크톱/태블릿 접근성)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeStockModal();
      }
    });

    // 3. 모바일 아래로 쓸어내리기(Swipe-down) 터치 제스처
    if (card) {
      let touchStartY = 0;
      let touchCurrentY = 0;

      card.addEventListener('touchstart', (e) => {
        if (card.scrollTop <= 0) {
          touchStartY = e.touches[0].clientY;
          touchCurrentY = touchStartY;
        } else {
          touchStartY = 0;
        }
      }, { passive: true });

      card.addEventListener('touchmove', (e) => {
        if (!touchStartY) return;
        touchCurrentY = e.touches[0].clientY;
        const diff = touchCurrentY - touchStartY;
        if (diff > 0) {
          card.style.transform = `translateY(${diff}px)`;
        }
      }, { passive: true });

      card.addEventListener('touchend', () => {
        if (!touchStartY) return;
        const diff = touchCurrentY - touchStartY;
        if (diff > 75) {
          this.closeStockModal();
        } else {
          card.style.transform = '';
        }
        touchStartY = 0;
      }, { passive: true });
    }
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
    card.style.transform = '';
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

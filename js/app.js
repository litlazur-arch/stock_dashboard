/**
 * ==========================================================================
 * 메인 애플리케이션 진입점 (app.js)
 * API, 상태, UI, 차트 모듈을 결합하여 전체 대시보드 흐름을 제어합니다.
 * ==========================================================================
 */

window.DashboardApp = {
  /**
   * 앱 초기화 함수
   */
  async init() {
    // 1. URL 쿼리 파라미터 확인 (?u=k 또는 ?u=j)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('u') === 'k') {
      window.DashboardState.currentUser = 'k';
    } else {
      window.DashboardState.currentUser = 'j';
    }

    // Default로 첫번째 보여주는 메뉴는 위탁 계좌(인덱스 1)로 설정
    window.DashboardState.currentAccountIndex = 1;

    window.DashboardUI.updateUserSwitcher(window.DashboardState.currentUser);

    // 2. 화면 리사이즈 시 차트 자동 재조정
    window.addEventListener('resize', () => this.renderCurrentView());

    // 3. [Stale-While-Revalidate] 캐시 데이터 우선 렌더링 (0.0초 즉시 표시)
    const cached = window.DashboardState.loadCachedData();
    if (cached && cached.data) {
      window.DashboardState.rawData = cached.data;
      window.DashboardUI.setLoading(false); // 스피너 없이 메인 즉시 노출
      window.DashboardUI.setStatus('syncing'); // 백그라운드 동기화 중 표시
      
      const cacheTimeStr = new Date(cached.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
      const lastUpdateEl = document.getElementById('lastUpdatedTime');
      if (lastUpdateEl) lastUpdateEl.innerText = `캐시 (${cacheTimeStr}) 동기화 중...`;

      // 캐시 데이터로 즉시 화면 렌더링
      this.renderCurrentView();
    } else {
      // 캐시가 없는 첫 접속 시 스켈레톤 UI 노출
      window.DashboardUI.setLoading(true);
      window.DashboardUI.renderSkeletons();
    }

    // 4. 백그라운드 실시간 최신 데이터 동기화
    await this.loadData();
  },

  /**
   * Google Sheets 실시간 데이터 조회 및 화면 갱신
   */
  async loadData() {
    window.DashboardUI.setStatus('syncing');

    try {
      const data = await window.DashboardAPI.fetchStockData();
      window.DashboardState.rawData = data;

      // 최신 데이터 로컬 스토리지에 캐싱
      window.DashboardState.saveCachedData(data);

      window.DashboardUI.setStatus('success');
      window.DashboardUI.setLoading(false);

      // 갱신 시각 표시
      const timeStr = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
      const lastUpdateEl = document.getElementById('lastUpdatedTime');
      if (lastUpdateEl) lastUpdateEl.innerText = "실시간: " + timeStr;

      // 화면 렌더링
      this.renderCurrentView();
    } catch (err) {
      window.DashboardUI.setStatus('error');
      window.DashboardUI.setLoading(false);
      if (!window.DashboardState.rawData) {
        alert("데이터를 불러오지 못했습니다. 잠시 후 새로고침 버튼을 눌러주세요.");
      } else {
        const lastUpdateEl = document.getElementById('lastUpdatedTime');
        if (lastUpdateEl) lastUpdateEl.innerText += " (오프라인)";
      }
    }
  },

  /**
   * 사용자 전환 (내 계좌 Ⓙ <-> 배우자 Ⓚ)
   */
  setUser(userCode) {
    window.DashboardState.currentUser = userCode;
    window.DashboardState.currentAccountIndex = 1; // 기본 탭: 위탁 계좌로 설정
    window.DashboardUI.updateUserSwitcher(userCode);
    this.renderCurrentView();
  },

  /**
   * 계좌 탭 선택 시
   */
  selectAccount(index) {
    window.DashboardState.currentAccountIndex = index;
    this.renderCurrentView();
  },

  /**
   * 현재 선택된 사용자와 계좌에 맞춰 전체 대시보드 뷰 렌더링
   */
  renderCurrentView() {
    const rawData = window.DashboardState.rawData;
    if (!rawData) return;

    const user = window.DashboardState.currentUser;
    const accounts = window.DashboardState.getAccountsForUser(user);
    const activeAccount = accounts[window.DashboardState.currentAccountIndex] || accounts[0];

    // 1. 탭 버튼 렌더링
    window.DashboardUI.renderAccountTabs(
      accounts,
      window.DashboardState.currentAccountIndex,
      (idx) => this.selectAccount(idx)
    );

    // 2. 헤더 정보 업데이트
    document.getElementById('currentAccountTitle').innerText = activeAccount.name;

    // 3. 해당 계좌의 보유 종목 추출 및 총 자산 / 전일 대비 증감액 계산
    const matchedHoldings = rawData.holdings.filter(h => activeAccount.filter.includes(h.account));
    const currentTotalAsset = matchedHoldings.reduce((sum, h) => sum + h.total, 0);
    document.getElementById('headerTotalAsset').innerText = window.DashboardState.formatNumber(currentTotalAsset) + '원';

    // 전일 대비 증감액 계산 (전일 종가 대비 금액)
    let totalDayDiff = 0;
    matchedHoldings.forEach(item => {
      if (item.basePrice && item.price !== undefined && item.qty) {
        totalDayDiff += (item.price - item.basePrice) * item.qty;
      } else if (item.changeRate !== undefined && item.changeRate !== null && item.total) {
        const r = parseFloat(item.changeRate);
        if (!isNaN(r) && r !== -100) {
          totalDayDiff += item.total * (r / (100 + r));
        }
      }
    });

    const diffEl = document.getElementById('headerTotalAssetDiff');
    if (diffEl) {
      const roundedDiff = Math.round(totalDayDiff);
      if (roundedDiff > 0) {
        diffEl.className = "text-base font-bold tabular-nums text-red-600 mt-0.5";
        diffEl.innerText = `▲ +${window.DashboardState.formatNumber(roundedDiff)}원`;
      } else if (roundedDiff < 0) {
        diffEl.className = "text-base font-bold tabular-nums text-blue-600 mt-0.5";
        diffEl.innerText = `▼ ${window.DashboardState.formatNumber(roundedDiff)}원`;
      } else {
        diffEl.className = "text-base font-bold tabular-nums text-slate-500 mt-0.5";
        diffEl.innerText = `0원`;
      }
    }

    // 4. 최근 12개월 히스토리 데이터 구성
    const historyData = rawData.history.map(row => {
      let asset = 0;
      let div = 0;

      activeAccount.filter.forEach(accName => {
        if (accName === "위탁Ⓚ") { asset += row.brokerK_Asset; div += row.brokerK_Div; }
        else if (accName === "위탁Ⓙ") { asset += row.brokerJ_Asset; div += row.brokerJ_Div; }
        else if (accName === "개인연금Ⓚ") { asset += row.pensionK_Asset; div += row.pensionK_Div; }
        else if (accName === "개인연금Ⓙ") { asset += row.pensionJ_Asset; div += row.pensionJ_Div; }
        else if (accName === "퇴직연금") { asset += row.retire_Asset; div += row.retire_Div; }
        else if (accName === "IRP") { asset += row.irp_Asset; div += row.irp_Div; }
      });

      return { month: row.month, asset, div };
    });

    // 당월(가장 최근 월)의 자산 평가액은 실시간 현재가 합산 금액(currentTotalAsset)으로 실시간 동기화
    if (historyData.length > 0 && currentTotalAsset > 0) {
      historyData[historyData.length - 1].asset = currentTotalAsset;
    }

    // 12개월 성장률 레이블
    const growthEl = document.getElementById('assetGrowthLabel');
    if (historyData.length >= 2 && historyData[0].asset > 0) {
      const first = historyData[0].asset;
      const last = historyData[historyData.length - 1].asset;
      const pct = (((last - first) / first) * 100).toFixed(1);
      growthEl.innerText = (pct >= 0 ? '+' : '') + pct + '% (12개월)';
    }

    // 5. 차트 모듈 호출 (상하 2단 분리 막대 & 트리맵 비중 차트)
    window.DashboardCharts.renderAssetBarChart(historyData, 'assetBarChartSvg', 'assetMinVal', 'assetMaxVal');
    window.DashboardCharts.renderDividendBarChart(historyData, 'dividendBarChartSvg', 'latestDividendLabel', 'totalDividendYear', 'avgDividendMonth');
    window.DashboardCharts.renderRatioTreemap(matchedHoldings, currentTotalAsset, 'ratioTreemapContainer', 'stockCountBadge');

    // 6. 종목 상세 카드 리스트 렌더링
    window.DashboardUI.renderHoldingsList(matchedHoldings, currentTotalAsset, 'stockListContainer');
  }
};

// DOM 로드 완료 시 애플리케이션 시작
document.addEventListener('DOMContentLoaded', () => {
  window.DashboardApp.init();
});

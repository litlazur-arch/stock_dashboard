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

    window.DashboardUI.updateUserSwitcher(window.DashboardState.currentUser);

    // 2. 화면 리사이즈 시 차트 자동 재조정
    window.addEventListener('resize', () => this.renderCurrentView());

    // 3. 실시간 데이터 불러오기
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

      window.DashboardUI.setStatus('success');
      window.DashboardUI.setLoading(false);

      // 갱신 시각 표시
      const timeStr = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
      const lastUpdateEl = document.getElementById('lastUpdatedTime');
      if (lastUpdateEl) lastUpdateEl.innerText = "갱신: " + timeStr;

      // 화면 렌더링
      this.renderCurrentView();
    } catch (err) {
      window.DashboardUI.setStatus('error');
      window.DashboardUI.setLoading(false);
      alert("데이터를 불러오지 못했습니다. 잠시 후 새로고침 버튼을 눌러주세요.");
    }
  },

  /**
   * 사용자 전환 (내 계좌 Ⓙ <-> 배우자 Ⓚ)
   */
  setUser(userCode) {
    window.DashboardState.currentUser = userCode;
    window.DashboardState.currentAccountIndex = 0; // 첫 번째 탭(통합)으로 초기화
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

    // 3. 해당 계좌의 보유 종목 추출 및 총 자산 계산
    const matchedHoldings = rawData.holdings.filter(h => activeAccount.filter.includes(h.account));
    const currentTotalAsset = matchedHoldings.reduce((sum, h) => sum + h.total, 0);
    document.getElementById('headerTotalAsset').innerText = window.DashboardState.formatNumber(currentTotalAsset) + '원';

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

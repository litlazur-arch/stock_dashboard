/**
 * ==========================================================================
 * 상태 관리 및 유틸리티 모듈 (state.js)
 * 사용자(내 계좌 Ⓙ / 배우자 Ⓚ) 상태, 계좌 매핑 및 숫자 변환 함수를 제공합니다.
 * ==========================================================================
 */

window.DashboardState = {
  // 현재 선택된 사용자: 'j' (내 계좌) 또는 'k' (배우자 계좌)
  currentUser: 'j',
  
  // 현재 선택된 계좌 탭 인덱스 (기본값: 1 - 위탁 계좌)
  currentAccountIndex: 1,
  
  // API로부터 수신한 원본 데이터
  rawData: null,

  /**
   * 사용자별 보유 계좌 목록과 데이터 필터 매핑 정보를 반환합니다.
   * 추후 새로운 가족이나 계좌가 추가될 경우 여기서 확장합니다.
   */
  getAccountsForUser(userCode) {
    if (userCode === 'j') {
      return [
        { id: "all", name: "통합", filter: ["위탁Ⓙ", "개인연금Ⓙ", "퇴직연금", "IRP"] },
        { id: "broker_j", name: "위탁Ⓙ", filter: ["위탁Ⓙ"] },
        { id: "pension_j", name: "개인연금Ⓙ", filter: ["개인연금Ⓙ"] },
        { id: "retire", name: "퇴직연금", filter: ["퇴직연금"] },
        { id: "irp", name: "IRP", filter: ["IRP"] }
      ];
    } else if (userCode === 'k') {
      return [
        { id: "all_k", name: "통합", filter: ["위탁Ⓚ", "개인연금Ⓚ"] },
        { id: "broker_k", name: "위탁Ⓚ", filter: ["위탁Ⓚ"] },
        { id: "pension_k", name: "개인연금Ⓚ", filter: ["개인연금Ⓚ"] }
      ];
    }
    return [];
  },

  /**
   * 숫자를 3자리 콤마 포맷으로 변환합니다 (예: 1,234,567)
   */
  formatNumber(num) {
    return Math.round(num || 0).toLocaleString('ko-KR');
  },

  /**
   * 한국 금융 단위(억, 만 원)로 축약하여 표시합니다.
   * @param {number} num 
   * @returns {string} 예: "49.8억", "132만"
   */
  formatKoreanMoney(num) {
    if (num >= 100000000) {
      return (num / 100000000).toFixed(1) + '억';
    } else if (num >= 10000) {
      return Math.round(num / 10000).toLocaleString('ko-KR') + '만';
    }
    return this.formatNumber(num);
  },

  /**
   * 평가액을 일관되게 '만 원' 단위로 변환합니다 (예: 122,795만 원, 6,791만 원)
   * @param {number} num
   * @returns {string} 예: "122,795만 원"
   */
  formatManWon(num) {
    if (!num || isNaN(num)) return '0만 원';
    return Math.round(num / 10000).toLocaleString('ko-KR') + '만 원';
  },

  /**
   * 평가액의 숫자 부분만 '만 원' 단위로 변환합니다 (단위 문자 제외, 우측 정렬용)
   * @param {number} num
   * @returns {string} 예: "122,795"
   */
  formatManWonNum(num) {
    if (!num || isNaN(num)) return '0';
    return Math.round(num / 10000).toLocaleString('ko-KR');
  },

  // 로컬 스토리지 캐시 키 (버전 관리)
  CACHE_KEY: 'stock_dashboard_cache_v1',

  /**
   * 로컬 스토리지에서 캐시된 최신 주식 데이터를 불러옵니다.
   * @returns {{data: Object, timestamp: number}|null}
   */
  loadCachedData() {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.data && parsed.data.holdings) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[Cache] 로컬 캐시 조회 실패:', e);
    }
    return null;
  },

  /**
   * API 수신 데이터를 로컬 스토리지에 캐싱합니다.
   * @param {Object} data 
   */
  saveCachedData(data) {
    try {
      if (!data || !data.holdings) return;
      const payload = {
        data: data,
        timestamp: Date.now()
      };
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('[Cache] 로컬 캐시 저장 실패:', e);
    }
  }
};

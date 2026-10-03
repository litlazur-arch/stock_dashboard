/**
 * ==========================================================================
 * 상태 관리 및 유틸리티 모듈 (state.js)
 * 사용자(내 계좌 Ⓙ / 배우자 Ⓚ) 상태, 계좌 매핑 및 숫자 변환 함수를 제공합니다.
 * ==========================================================================
 */

window.DashboardState = {
  // 현재 선택된 사용자: 'j' (내 계좌) 또는 'k' (배우자 계좌)
  currentUser: 'j',
  
  // 현재 선택된 계좌 탭 인덱스 (0: 통합, 1: 첫 번째 계좌 ...)
  currentAccountIndex: 0,
  
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
  }
};

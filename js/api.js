/**
 * ==========================================================================
 * API 통신 모듈 (api.js)
 * Google Apps Script Web App 엔드포인트와 통신하여 실시간 데이터를 수신합니다.
 * ==========================================================================
 */

window.DashboardAPI = {
  // 배포된 구글 시트 웹 앱 URL
  ENDPOINT: "https://script.google.com/macros/s/AKfycbyFhLztxLuaxSw82r08fWJ3Ol_L7dnskJpzje0xvO_GFdkGQ8a48LgUb6PgUlwafuVP/exec",

  /**
   * 구글 시트에서 최신 자산 히스토리 및 보유 종목 데이터를 조회합니다.
   * @returns {Promise<{history: Array, holdings: Array, updatedAt: string}>}
   */
  async fetchStockData() {
    try {
      const response = await fetch(this.ENDPOINT);
      if (!response.ok) {
        throw new Error(`HTTP 오류 발생: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("[API Error] 데이터 수신 실패:", error);
      throw error;
    }
  },

  /**
   * 네이버 페이 증권 종목 상세 모바일 URL을 반환합니다.
   * @param {string} code - 6자리 종목 코드
   * @returns {string}
   */
  getNaverStockUrl(code) {
    if (!code) return '#';
    const normCode = String(code).trim();
    return `https://m.stock.naver.com/domestic/stock/${normCode}/total`;
  }
};

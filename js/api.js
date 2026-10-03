/**
 * ==========================================================================
 * API 통신 모듈 (api.js)
 * Google Apps Script Web App 엔드포인트와 통신하여 실시간 데이터를 수신합니다.
 * ==========================================================================
 */

window.DashboardAPI = {
  // 배포된 구글 시트 웹 앱 URL
  ENDPOINT: "https://script.google.com/macros/s/AKfycbxHGNe6OJDymsWp6n2b5wdDY5Ou-wgUbXD1l3wf39VS3AEObDEncxNbuiEWXVMiB-X2/exec",

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
  }
};

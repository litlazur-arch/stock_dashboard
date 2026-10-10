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

  // 우선주 -> 본주 매핑 테이블 (토스/네이버 CDN 이미지 호환성)
  PREFERRED_STOCK_MAP: {
    '005935': '005930', // 삼성전자우 -> 삼성전자
    '005385': '005380', // 현대차우
    '005387': '005380', // 현대차2우B
    '005389': '005380', // 현대차3우B
    '051915': '051910', // LG화학우
    '003555': '003550', // LG우
  },

  // 지원 ETF 주요 브랜드 목록
  ETF_BRANDS: ['TIGER', 'KODEX', 'ACE', 'SOL', 'PLUS', 'RISE', 'KBSTAR', 'ARIRANG', 'HANARO', 'KOSEF', 'TIMEFOLIO'],

  /**
   * 사용자별 보유 계좌 목록과 데이터 필터 매핑 정보를 반환합니다.
   * 추후 새로운 가족이나 계좌가 추가될 경우 여기서 확장합니다.
   */
  getAccountsForUser(userCode) {
    if (userCode === 'j') {
      return [
        { id: "all", name: "통합", filter: ["위탁Ⓙ", "개인연금Ⓙ", "TLPⒿ", "퇴직연금", "IRP"] },
        { id: "broker_j", name: "위탁Ⓙ", filter: ["위탁Ⓙ"] },
        { id: "pension_j", name: "개인연금Ⓙ", filter: ["개인연금Ⓙ"] },
        { id: "tlp_j", name: "TLPⒿ", filter: ["TLPⒿ"] },
        { id: "retire", name: "퇴직연금", filter: ["퇴직연금"] },
        { id: "irp", name: "IRP", filter: ["IRP"] }
      ];
    } else if (userCode === 'k') {
      return [
        { id: "all_k", name: "통합", filter: ["위탁Ⓚ", "개인연금Ⓚ", "TLPⓀ"] },
        { id: "broker_k", name: "위탁Ⓚ", filter: ["위탁Ⓚ"] },
        { id: "pension_k", name: "개인연금Ⓚ", filter: ["개인연금Ⓚ"] },
        { id: "tlp_k", name: "TLPⓀ", filter: ["TLPⓀ"] }
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

  /**
   * 종목별 전일 대비 가격 및 등락률을 통일된 기준으로 계산합니다.
   * @param {Object} item - 보유 종목 객체
   * @returns {{diffAmt: number, rate: number, isUp: boolean, isDown: boolean, isFlat: boolean}}
   */
  calculatePriceDiff(item) {
    if (!item) return { diffAmt: 0, rate: 0, isUp: false, isDown: false, isFlat: true };

    let rate = 0;
    let diffAmt = 0;

    // 1. 기준가(전일 종가)와 현재가가 존재하면 직접 계산
    if (item.basePrice && item.price) {
      diffAmt = Math.round(item.price - item.basePrice);
      if (item.basePrice > 0) {
        rate = ((item.price - item.basePrice) / item.basePrice) * 100;
      }
    }

    // 2. changeRate 또는 changeAmount 명시값이 있는 경우 반영
    if (item.changeRate !== undefined && item.changeRate !== null) {
      const parsedRate = parseFloat(item.changeRate);
      if (!isNaN(parsedRate)) rate = parsedRate;
    }
    if (item.changeAmount !== undefined && item.changeAmount !== null && item.changeAmount !== 0) {
      diffAmt = Math.round(item.changeAmount);
    } else if (diffAmt === 0 && rate !== 0 && item.price) {
      diffAmt = Math.round(item.price * (rate / (100 + rate)));
    }

    // 3. 부호 불일치 보정 (rate 기준 부호 일치화)
    if (rate < 0 && diffAmt > 0) {
      diffAmt = -Math.abs(diffAmt);
    } else if (rate > 0 && diffAmt < 0) {
      diffAmt = Math.abs(diffAmt);
    }

    const isUp = rate > 0 || (rate === 0 && diffAmt > 0);
    const isDown = rate < 0 || (rate === 0 && diffAmt < 0);
    const isFlat = !isUp && !isDown;

    return { diffAmt, rate, isUp, isDown, isFlat };
  },

  /**
   * 전일 대비 증감 수치를 통일된 핀테크 스타일 HTML 문자열로 변환합니다.
   * @param {number} diffAmt
   * @param {number} rate
   * @returns {{diffAmtHtml: string, diffRateHtml: string}}
   */
  formatSignedDiff(diffAmt, rate) {
    const isUp = rate > 0 || (rate === 0 && diffAmt > 0);
    const isDown = rate < 0 || (rate === 0 && diffAmt < 0);
    const absAmt = Math.abs(diffAmt);
    const absRate = Math.abs(rate);

    if (isUp) {
      return {
        diffAmtHtml: `<span class="text-sm font-bold text-red-600 tabular-nums tracking-tight leading-tight">+${this.formatNumber(absAmt)}원</span>`,
        diffRateHtml: `<span class="text-sm font-bold text-red-600 tabular-nums tracking-tight leading-tight">+${absRate.toFixed(2)}%</span>`
      };
    } else if (isDown) {
      return {
        diffAmtHtml: `<span class="text-sm font-bold text-blue-600 tabular-nums tracking-tight leading-tight">-${this.formatNumber(absAmt)}원</span>`,
        diffRateHtml: `<span class="text-sm font-bold text-blue-600 tabular-nums tracking-tight leading-tight">-${absRate.toFixed(2)}%</span>`
      };
    } else {
      return {
        diffAmtHtml: `<span class="text-sm font-medium text-slate-500 tabular-nums tracking-tight leading-tight">0원</span>`,
        diffRateHtml: `<span class="text-sm font-medium text-slate-500 tabular-nums tracking-tight leading-tight">0.00%</span>`
      };
    }
  },

  // 보유 종목 우선순위 정렬 기준 테이블 (1~11위)
  PRIORITY_HOLDINGS: [
    { code: "000660", keyword: "SK하이닉스" },
    { code: "005380", keyword: "현대차" },
    { code: "005935", keyword: "삼성전자우" },
    { code: "012450", keyword: "한화에어로" },
    { code: "489790", keyword: "한화비전" },
    { code: "010950", keyword: "SOIL" },
    { code: "498400", keyword: "위클리커버드콜" },
    { code: "133690", keyword: "나스닥100" },
    { code: "367380", keyword: "나스닥100" },
    { code: "458730", keyword: "배당다우존스" },
    { code: "490490", keyword: "미국채혼합" }
  ],

  /**
   * 종목의 우선순위 정렬 순번을 반환합니다.
   * @param {Object} item 
   * @returns {number}
   */
  getHoldingPriorityRank(item) {
    if (!item) return 999;
    const code = String(item.code || '').trim();
    const idx = this.PRIORITY_HOLDINGS.findIndex(p => p.code === code);
    if (idx !== -1) return idx;

    const norm = (item.name || "").replace(/[\s\-_]/g, '').toUpperCase();
    for (let i = 0; i < this.PRIORITY_HOLDINGS.length; i++) {
      if (norm.includes(this.PRIORITY_HOLDINGS[i].keyword)) {
        return i;
      }
    }
    return 999;
  },

  /**
   * 데이터 정규화 및 자가 치유 (수량/매수단가 전치 오류 및 총자산 보정)
   * @param {Object} data 
   * @returns {Object}
   */
  normalizeData(data) {
    if (!data) return null;
    if (data.holdings && Array.isArray(data.holdings)) {
      data.holdings.forEach(h => {
        // 1. 배포된 구버전 GAS의 컬럼 스왑 버그 자동 복원 (자가 치유):
        // 구버전 GAS는 buyTotal에 실제 수량(예: 667)을 넣고, qty에 매수단가(예: 49,055)를 넣어 total이 827억으로 폭증함
        if (h.buyPrice === 0 && h.buyTotal > 0 && h.buyTotal < 50000 && h.qty > 500 && (h.total > 5000000000 || (h.price > 0 && h.total > h.buyTotal * h.price * 2))) {
          const actualQty = h.buyTotal;
          const actualBuyPrice = h.qty;
          h.qty = actualQty;
          h.buyPrice = actualBuyPrice;
          h.buyTotal = Math.round(actualQty * actualBuyPrice);
          h.total = Math.round(actualQty * (h.price || actualBuyPrice));
        }

        // 2. 매수금액 및 매수단가 보정
        if ((!h.buyTotal || h.buyTotal === 0) && h.buyPrice > 0 && h.qty > 0) {
          h.buyTotal = Math.round(h.buyPrice * h.qty);
        }
        if ((!h.buyPrice || h.buyPrice === 0) && h.buyTotal > 0 && h.qty > 0) {
          h.buyPrice = Math.round(h.buyTotal / h.qty);
        }
        if ((!h.total || h.total === 0) && h.qty > 0 && h.price > 0) {
          h.total = Math.round(h.qty * h.price);
        }
      });
    }

    if (data.history && Array.isArray(data.history)) {
      data.history.forEach(row => {
        const sum = (row.brokerK_Asset || 0) + (row.brokerJ_Asset || 0) +
                    (row.pensionK_Asset || 0) + (row.pensionJ_Asset || 0) +
                    (row.retire_Asset || 0) + (row.irp_Asset || 0) +
                    (row.tlpK_Asset || 0) + (row.tlpJ_Asset || 0);
        if (sum > 0) {
          row.totalAsset = sum;
        }
      });
    }

    return data;
  },

  // 로컬 스토리지 캐시 키 (버전 관리)
  CACHE_KEY: 'stock_dashboard_cache_v2',

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
          parsed.data = this.normalizeData(parsed.data);
          // 이상치(단일 종목 50억 초과)가 여전히 남은 경우 캐시 폐기
          const hasAnomaly = parsed.data.holdings.some(h => (h.total || 0) > 5000000000);
          if (hasAnomaly) {
            localStorage.removeItem(this.CACHE_KEY);
            return null;
          }
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
      const normalized = this.normalizeData(data);
      const payload = {
        data: normalized,
        timestamp: Date.now()
      };
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('[Cache] 로컬 캐시 저장 실패:', e);
    }
  }
};

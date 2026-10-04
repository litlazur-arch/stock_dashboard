/**
 * ==========================================================================
 * Google Apps Script - SPI2 연동 백엔드 API (Code.gs)
 * 
 * 주요 기능:
 * 1. Brief 시트에서 최근 12개월 자산 및 배당금 추이 자동 추출 (2026년 10월 배당 완벽 반영)
 * 2. 6개 계좌 시트(위탁Ⓚ, 위탁Ⓙ, 개인연금Ⓚ, 개인연금Ⓙ, 퇴직연금, IRP)에서 최신 보유 종목 자동 추출
 * 3. [방식 B 완벽 구현] 네이버 증권 Polling API(1회 초고속 일괄 호출)로
 *    - 기준가: 전일 종가 (sv)
 *    - 현재가: 실시간 현재가 (nv)
 *    - 등락률: 전일 대비 실시간 등락률 (cr & rf)
 *    - 실시간 평가액: 보유수량 × 실시간 현재가로 자동 계산
 * 4. 견고한 에러 핸들링: 외부 API 통신 장애 시에도 대시보드가 절대 중단되지 않음
 * ==========================================================================
 */

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // ==========================================
    // 1. Brief 시트에서 '현재 월까지' 최근 12개월 추출
    // ==========================================
    const wsBrief = ss.getSheetByName("Brief");
    if (!wsBrief) throw new Error("Brief 시트를 찾을 수 없습니다.");

    const briefRange = wsBrief.getDataRange();
    const briefValues = briefRange.getValues();
    const briefFormulas = briefRange.getFormulas();

    // 현재 기준 연/월 (미래 월 차단용)
    const now = new Date();
    const currentYM = now.getFullYear() * 100 + (now.getMonth() + 1);

    // 월별 중복 제거를 위한 Map (Key: "2026.10")
    const monthMap = new Map();

    for (let r = 3; r < briefValues.length; r++) {
      const rawDate = briefValues[r][1]; // B열: 날짜
      const formulaDate = String(briefFormulas[r][1] || '').toUpperCase();
      const totalAsset = Number(briefValues[r][2]) || 0; // C열: 총 잔고
      const totalDiv = Number(briefValues[r][5]) || 0;   // F열: 총 배당금

      // =TODAY() 수식이 들어있는 미래 템플릿 행은 건너뜁니다
      if (formulaDate.includes('TODAY')) continue;

      if (rawDate && !isNaN(new Date(rawDate).getTime()) && totalAsset > 0) {
        const d = new Date(rawDate);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const rowYM = y * 100 + m;

        // 현재 월 이하인 실제 기록만 수집 (미래 월 제외)
        if (rowYM <= currentYM) {
          const monthKey = y + "." + String(m).padStart(2, '0');

          // 이미 정상 배당금이 기록된 행이 있다면 0원짜리 빈 템플릿 행으로 덮어쓰지 않음
          if (monthMap.has(monthKey) && monthMap.get(monthKey).totalDiv > 0 && totalDiv === 0) {
            continue;
          }

          monthMap.set(monthKey, {
            month: monthKey,
            totalAsset: totalAsset,
            totalDiv: totalDiv,
            brokerK_Asset: Number(briefValues[r][8]) || 0,
            brokerK_Div: Number(briefValues[r][9]) || 0,
            brokerJ_Asset: Number(briefValues[r][10]) || 0,
            brokerJ_Div: Number(briefValues[r][11]) || 0,
            pensionK_Asset: Number(briefValues[r][12]) || 0,
            pensionK_Div: Number(briefValues[r][13]) || 0,
            pensionJ_Asset: Number(briefValues[r][14]) || 0,
            pensionJ_Div: Number(briefValues[r][15]) || 0,
            retire_Asset: Number(briefValues[r][16]) || 0,
            retire_Div: Number(briefValues[r][17]) || 0,
            irp_Asset: Number(briefValues[r][18]) || 0,
            irp_Div: Number(briefValues[r][19]) || 0
          });
        }
      }
    }

    // 최근 12개월만 추출
    const allMonths = Array.from(monthMap.values());
    const historyList = allMonths.slice(-12);

    // ==========================================
    // 2. 각 계좌 시트에서 최신 보유 종목 추출
    // ==========================================
    const holdingsList = [];
    const targetSheets = [
      { name: "위탁Ⓚ", maxCol: 75 },
      { name: "위탁Ⓙ", maxCol: 75 },
      { name: "개인연금Ⓚ", maxCol: 25 },
      { name: "개인연금Ⓙ", maxCol: 25 },
      { name: "퇴직연금", maxCol: 30 },
      { name: "IRP", maxCol: 30 }
    ];

    targetSheets.forEach(cfg => {
      const ws = ss.getSheetByName(cfg.name);
      if (!ws) return;

      const values = ws.getDataRange().getValues();
      if (values.length < 4) return;

      // 실제 주가/수량이 있는 유효 최신 행 찾기 (아래쪽 빈 행 건너뛰기)
      let lastRowIdx = 3;
      for (let r = 3; r < values.length; r++) {
        if (values[r][1] && Number(values[r][2]) > 0) {
          lastRowIdx = r;
        }
      }

      // 8열 간격으로 각 종목 블록 파싱 (Row 2가 종목코드 및 종목명)
      for (let col = 2; col < Math.min(cfg.maxCol, values[1].length); col += 8) {
        const code = String(values[1][col] || "").trim();
        const name = String(values[1][col + 1] || "").trim();

        if (!code || !name || code.includes("합계") || name.includes("합계")) continue;

        const price = Number(values[lastRowIdx][col]) || 0;
        const qty = Number(values[lastRowIdx][col + 4]) || 0;
        const total = Number(values[lastRowIdx][col + 6]) || (qty * price);

        if (qty > 0) {
          holdingsList.push({
            account: cfg.name,
            code: code.padStart(6, '0'),
            name: name,
            qty: qty,
            price: price,
            total: total
          });
        }
      }
    });

    // ==========================================
    // 3. [방식 B] 네이버 실시간 Polling API로 전일 종가 기준 현재가 & 등락률 연동
    // ==========================================
    try {
      const uniqueCodes = [...new Set(holdingsList.map(h => h.code).filter(c => c && c.length === 6))];
      const marketMap = fetchStockPollingData(uniqueCodes);

      holdingsList.forEach(item => {
        const market = marketMap[item.code];
        if (market) {
          // 실시간 현재가로 업데이트
          if (market.currentPrice && market.currentPrice > 0) {
            item.price = market.currentPrice;
            item.total = item.qty * item.price; // 실시간 평가액 = 보유수량 × 실시간 현재가
          }
          item.basePrice = market.basePrice;   // 전일 종가 (기준가)
          item.changeRate = market.changeRate; // 전일 대비 실시간 등락률 (▲ +0.49% / ▼ -0.57%)
          item.changeAmount = market.changeAmount; // 전일 대비 등락폭 (원)
        } else {
          item.changeRate = 0;
        }
      });
    } catch (apiErr) {
      Logger.log("실시간 시세 연동 예외 (기본값 유지): " + apiErr);
      holdingsList.forEach(item => {
        if (item.changeRate === undefined) item.changeRate = 0;
      });
    }

    const responseData = {
      history: historyList,
      holdings: holdingsList,
      updatedAt: new Date().toISOString()
    };

    return ContentService.createTextOutput(JSON.stringify(responseData))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      error: true,
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 네이버 증권 Polling API(1회 초고속 일괄 호출)로 전일 대비 실시간 시세 취합
 * 기준가(sv): 전일 종가
 * 현재가(nv): 실시간 종가/현재가
 * 등락률(cr & rf): 전일 대비 등락률
 */
function fetchStockPollingData(codes) {
  if (!codes || codes.length === 0) return {};

  const url = "https://polling.finance.naver.com/api/realtime?query=SERVICE_ITEM:" + codes.join(",");
  const marketMap = {};

  try {
    const res = UrlFetchApp.fetch(url, {
      method: "get",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      muteHttpExceptions: true
    });

    if (res.getResponseCode() === 200) {
      const json = JSON.parse(res.getContentText());
      if (json && json.result && json.result.areas && json.result.areas[0]) {
        const datas = json.result.areas[0].datas || [];
        datas.forEach(d => {
          let rate = parseFloat(d.cr) || 0;
          if (d.rf === "5") {
            rate = -rate; // 하락
          }
          marketMap[d.cd] = {
            basePrice: d.sv,        // 전일 종가 (기준가)
            currentPrice: d.nv,     // 실시간 현재가
            changeRate: rate,       // 전일 대비 실시간 등락률
            changeAmount: d.cv      // 전일 대비 등락폭 (원)
          };
        });
      }
    }
  } catch (err) {
    Logger.log("Polling fetch error: " + err);
  }

  return marketMap;
}

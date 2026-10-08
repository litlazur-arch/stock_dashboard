function authorize() {
  var url = "https://polling.finance.naver.com/api/realtime?query=SERVICE_ITEM:000660";
  var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  Logger.log("권한 승인 완료! HTTP " + res.getResponseCode());
}

function test() {
  var codes = ["000660", "005380"];
  var result = fetchStockPollingData(codes);
  Logger.log("=== 테스트 결과 ===");
  Logger.log(JSON.stringify(result));
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var wsBrief = ss.getSheetByName("Brief");
    if (!wsBrief) throw new Error("Brief 시트를 찾을 수 없습니다.");

    var briefValues = wsBrief.getDataRange().getValues();
    var briefFormulas = wsBrief.getDataRange().getFormulas();
    var now = new Date();
    var currentYM = now.getFullYear() * 100 + (now.getMonth() + 1);
    var monthMap = {};
    var monthKeys = [];

    for (var r = 3; r < briefValues.length; r++) {
      var rawDate = briefValues[r][1];
      var formulaDate = String(briefFormulas[r][1] || "").toUpperCase();
      var totalAsset = Number(briefValues[r][2]) || 0;
      var totalDiv = Number(briefValues[r][5]) || 0;

      if (formulaDate.indexOf("TODAY") !== -1) continue;

      if (rawDate && !isNaN(new Date(rawDate).getTime()) && totalAsset > 0) {
        var d = new Date(rawDate);
        var y = d.getFullYear();
        var m = d.getMonth() + 1;
        var rowYM = y * 100 + m;

        if (rowYM <= currentYM) {
          var monthKey = y + "." + (m < 10 ? "0" + m : m);
          if (monthMap[monthKey] && monthMap[monthKey].totalDiv > 0 && totalDiv === 0) continue;
          if (!monthMap[monthKey]) monthKeys.push(monthKey);

          monthMap[monthKey] = {
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
            irp_Div: Number(briefValues[r][19]) || 0,
            tlpK_Asset: Number(briefValues[r][20]) || 0,
            tlpK_Div: Number(briefValues[r][21]) || 0,
            tlpJ_Asset: Number(briefValues[r][22]) || 0,
            tlpJ_Div: Number(briefValues[r][23]) || 0
          };
        }
      }
    }

    var historyList = [];
    var recentKeys = monthKeys.slice(-12);
    for (var k = 0; k < recentKeys.length; k++) {
      historyList.push(monthMap[recentKeys[k]]);
    }

    var holdingsList = [];
    var targetSheets = [
      { name: "위탁Ⓚ", maxCol: 75 },
      { name: "위탁Ⓙ", maxCol: 75 },
      { name: "개인연금Ⓚ", maxCol: 25 },
      { name: "개인연금Ⓙ", maxCol: 25 },
      { name: "퇴직연금", maxCol: 30 },
      { name: "IRP", maxCol: 30 },
      { name: "TLPⓀ", maxCol: 30 },
      { name: "TLPⒿ", maxCol: 30 }
    ];

    for (var s = 0; s < targetSheets.length; s++) {
      var cfg = targetSheets[s];
      var ws = ss.getSheetByName(cfg.name);
      if (!ws) continue;

      var values = ws.getDataRange().getValues();
      if (values.length < 4) continue;

      var lastRowIdx = 3;
      for (var rIdx = 3; rIdx < values.length; rIdx++) {
        if (values[rIdx][1] && Number(values[rIdx][2]) > 0) lastRowIdx = rIdx;
      }

      var maxC = Math.min(cfg.maxCol, values[1].length);
      for (var col = 2; col < maxC; col += 8) {
        var code = String(values[1][col] || "").trim();
        var name = String(values[1][col + 1] || "").trim();
        if (!code || !name || code.indexOf("합계") !== -1 || name.indexOf("합계") !== -1) continue;

        var price = Number(values[lastRowIdx][col]) || 0;
        var buyPrice = Number(values[lastRowIdx][col + 2]) || 0;
        var buyTotal = Number(values[lastRowIdx][col + 3]) || (buyPrice > 0 ? (qty * buyPrice) : 0);
        var qty = Number(values[lastRowIdx][col + 4]) || 0;
        var total = Number(values[lastRowIdx][col + 6]) || (qty * price);

        if (qty > 0) {
          holdingsList.push({
            account: cfg.name,
            code: padCode(code),
            name: name,
            qty: qty,
            price: price,
            total: total,
            buyPrice: buyPrice,
            buyTotal: buyTotal
          });
        }
      }
    }

    var debugLog = "";
    try {
      var uniqueCodes = getUniqueCodes(holdingsList);
      var pollResult = fetchStockPollingData(uniqueCodes);
      var marketMap = pollResult.map || {};
      debugLog = pollResult.debug || "";

      var history20Map = fetchStockHistory20Days(uniqueCodes);

      for (var h = 0; h < holdingsList.length; h++) {
        var item = holdingsList[h];
        var market = marketMap[item.code];
        if (market) {
          if (market.currentPrice && market.currentPrice > 0) {
            item.price = market.currentPrice;
            item.total = item.qty * item.price;
          }
          item.basePrice = market.basePrice;
          item.changeRate = market.changeRate;
          item.changeAmount = market.changeAmount;
        } else {
          item.changeRate = 0;
        }

        if (history20Map[item.code]) {
          item.recentPrices = history20Map[item.code].prices;
          item.recentDates = history20Map[item.code].dates;
        }
      }
    } catch (apiErr) {
      debugLog = "outer_error: " + apiErr.toString();
      for (var h2 = 0; h2 < holdingsList.length; h2++) {
        if (holdingsList[h2].changeRate === undefined) holdingsList[h2].changeRate = 0;
      }
    }

    var responseData = {
      history: historyList,
      holdings: holdingsList,
      updatedAt: new Date().toISOString(),
      _debug: debugLog
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

function fetchStockPollingData(codes) {
  if (!codes || codes.length === 0) return { map: {}, debug: "no_codes" };
  var url = "https://polling.finance.naver.com/api/realtime?query=SERVICE_ITEM:" + codes.join(",");
  var marketMap = {};

  try {
    var res = UrlFetchApp.fetch(url, {
      method: "get",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      muteHttpExceptions: true
    });

    var statusCode = res.getResponseCode();
    if (statusCode === 200) {
      var json = JSON.parse(res.getContentText());
      if (json && json.result && json.result.areas && json.result.areas[0]) {
        var datas = json.result.areas[0].datas || [];
        for (var i = 0; i < datas.length; i++) {
          var d = datas[i];
          var rate = parseFloat(d.cr) || 0;
          var diffVal = parseFloat(d.cv) || 0;
          
          // rf: 1(상한), 2(상승), 3(보합), 4(하한), 5(하락)
          if (d.rf === "4" || d.rf === "5") {
            rate = -Math.abs(rate);
            diffVal = -Math.abs(diffVal);
          } else if (d.rf === "3") {
            rate = 0;
            diffVal = 0;
          } else {
            rate = Math.abs(rate);
            diffVal = Math.abs(diffVal);
          }

          // 기준가(sv)와 현재가(nv)가 있으면 직접 비교하여 검증
          if (d.nv !== undefined && d.sv !== undefined && Number(d.sv) > 0) {
            var diff = Number(d.nv) - Number(d.sv);
            if (diff < 0) {
              rate = -Math.abs(rate);
              diffVal = -Math.abs(diffVal);
            } else if (diff > 0) {
              rate = Math.abs(rate);
              diffVal = Math.abs(diffVal);
            } else {
              rate = 0;
              diffVal = 0;
            }
          }

          marketMap[d.cd] = {
            basePrice: d.sv,
            currentPrice: d.nv,
            changeRate: rate,
            changeAmount: diffVal
          };
        }
        return { map: marketMap, debug: "success (" + datas.length + " items)" };
      }
      return { map: {}, debug: "json format mismatch" };
    } else {
      return { map: {}, debug: "http_status_" + statusCode };
    }
  } catch (err) {
    Logger.log("Polling fetch error: " + err);
    return { map: {}, debug: "error: " + err.toString() };
  }
}

function fetchStockHistory20Days(codes) {
  if (!codes || codes.length === 0) return {};
  var requests = [];
  for (var i = 0; i < codes.length; i++) {
    requests.push({
      url: "https://m.stock.naver.com/api/stock/" + codes[i] + "/price?page=1&pageSize=20",
      method: "get",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      muteHttpExceptions: true
    });
  }

  var historyMap = {};
  try {
    var responses = UrlFetchApp.fetchAll(requests);
    for (var j = 0; j < responses.length; j++) {
      var code = codes[j];
      var res = responses[j];
      if (res.getResponseCode() === 200) {
        var list = JSON.parse(res.getContentText());
        if (Array.isArray(list) && list.length > 0) {
          var sorted = list.slice().reverse();
          var prices = [];
          var dates = [];
          for (var k = 0; k < sorted.length; k++) {
            var item = sorted[k];
            var p = parseInt(String(item.closePrice || "0").replace(/,/g, ""), 10);
            prices.push(p);
            var dStr = String(item.localTradedAt || "");
            var parts = dStr.split("-");
            var dateFormatted = parts.length >= 3 ? (parts[1] + "." + parts[2]) : dStr;
            dates.push(dateFormatted);
          }
          historyMap[code] = { prices: prices, dates: dates };
        }
      }
    }
  } catch (err) {
    Logger.log("20-day history fetch error: " + err);
  }
  return historyMap;
}

function padCode(str) {
  str = String(str || "");
  while (str.length < 6) str = "0" + str;
  return str;
}

function getUniqueCodes(list) {
  var seen = {};
  var result = [];
  for (var i = 0; i < list.length; i++) {
    var c = list[i].code;
    if (c && c.length === 6 && !seen[c]) {
      seen[c] = true;
      result.push(c);
    }
  }
  return result;
}

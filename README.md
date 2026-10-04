# 가족 주식 및 배당금 대시보드 (Stock & Dividend Dashboard)

Google Drive의 Google Sheets(`SPI2`)와 실시간 연동되는 모바일 최적화 반응형 주식 대시보드입니다.

## 🚀 주요 기능
- **사용자별 URL 분리 접속**:
  - 내 계좌 전용: `.../u/j`
  - 배우자 계좌 전용: `.../u/k`
- **계좌별 독립 탭 전환**:
  - `통합` (전체 합산 뷰)
  - `위탁Ⓚ`, `위탁Ⓙ`, `개인연금Ⓚ`, `개인연금Ⓙ`, `퇴직연금`, `IRP`
- **상하 2단 분리 막대그래프**:
  1. 최근 12개월 총 자산 추이 막대 (월별 자산 성장 곡선 및 최저/최고치)
  2. 동일 기간 배당금 수령 막대 (월별 배당금, 연간 누적 및 월평균 배당금)
- **보유 종목 비중 바**: 100% 누적 가로 컬러 바 및 범례 태그
- **보유 종목 상세 리스트**: 종목코드, 종목명, 보유수량, 현재가, 총 평가금액
- **실시간 갱신**: 구글 시트 원본 수정 후 새로고침(🔄) 터치 시 1초 만에 최신화

## 📁 프로젝트 구조
```
stock-dashboard/
├── index.html           # 메인 HTML 화면 구조
├── css/
│   └── style.css        # 스타일시트 및 다크 테마 변수
├── js/
│   ├── api.js           # Google Apps Script Web App 연동 모듈
│   ├── state.js         # 사용자 상태, 계좌 매핑 및 금액 포맷터
│   ├── charts.js        # SVG 자산/배당 막대그래프 및 비중 바 렌더링
│   ├── ui.js            # 계좌 탭, 종목 리스트 카드 및 상태 제어
│   └── app.js           # 전체 모듈 조율 메인 컨트롤러
├── gas/
│   └── Code.gs          # Google Apps Script 백엔드 소스코드
└── scripts/
    └── check-privacy.js # 커밋 전 개인정보 자동 검사 스크립트
```

## 📌 향후 개선 및 보안 강화 과제 (Backlog)
- [ ] **Cloudflare Pages 이전 및 GitHub 저장소 비공개(Private) 전환**
  - **목적**: 소스코드, 커밋 작성자 이메일, Google Apps Script API 엔드포인트 URL의 외부 노출 원천 차단
  - **내용**: Cloudflare 무료 계정 연동 ➡️ GitHub 저장소를 Private으로 전환 ➡️ (선택) Zero Trust 이메일 인증 추가
- [ ] **Google Apps Script 접근 보안 강화**
  - **목적**: 비인가된 외부 호출 차단
  - **내용**: API 호출 시 간단한 보안 토큰 파라미터(`?token=...`) 검증 로직 추가


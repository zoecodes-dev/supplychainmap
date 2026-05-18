# Battery DPP Dashboard

배터리 DPP 규제 대응 시스템의 시연용 대시보드. Next.js 14 + TypeScript + Tailwind.

## 페이지 구성

| 경로 | 페이지 | 핵심 기능 |
|------|--------|---------|
| `/` | 대시보드 | Tier 5단계 분포 · 일별 처리량 · 실시간 배치 |
| `/supply-chain` | **공급망 맵** (원청 ESG 시점) | 통합 검색 · 필터 · 모달 5탭 (상하위 관계는 포털로 이동) |
| `/queue` | 검증 대기열 | LangGraph 8단계 |
| `/hitl` | HITL 검토 | 신뢰도 미달 검토 |
| `/dpp` | DPP 발행 이력 | 발행 여권 카드 (제품 인스턴스 정보 포함) |
| `/audit` | 감사 추적 | Provenance |
| `/portal` | **협력사 포털** (협력사 시점) | PO 셀렉터 · 공장별 규제 차등 · 상하위 협력사 |

## 핵심 컨셉

### Tier 5단계 (물품 추적 관점)
T1 Pack/Module → T2 Cell → T3 활물질 → T4 전구체·정제 → T5 원광
한 협력사가 여러 Tier 부품을 다룰 수 있음 (`supplier.tiers` 배열)

### 공장별 규제 차등 (정의서 + 팀원 코드 컨셉)
같은 협력사라도 공장마다 납품처가 다르면 적용 규제가 다름.
- POS 포항공장 (EU 납품): EUDR, CSDDD만 필요. UFLPA/IRA 자동 숨김
- POS 광양공장 (US 납품): UFLPA, IRA만 필요. EUDR 자동 숨김
- 옌타이공장 (US 단독): UFLPA, IRA. EUDR 자동 숨김

### 공급 비율 % (분할 납품)
같은 부품을 여러 공장에서 분할 납품 시:
- POS 포항 65% + POS 광양 35% (NCM811 양극재)
- 모달 공장 탭에 큰 숫자 + 막대 그래프

### 권한 제어 (정의서 ②)
협력사 포털에서 시점 토글:
- POS Cathode 시점: 직상위(한양셀)와 직하위(QZ전구체, 포항정제소)만 보임
- Hanyang Cell 시점: 직상위(원청)와 직하위(POS, 옌타이, Mitsui)만 보임
- 옆 라인은 자동 차단 (UI에 표시 자체가 안 됨)

### 통합 검색 (공급망 맵)
협력사명·PO번호·부품코드·HS코드·담당자명·국가 통합 검색.
검색창 아래 인라인 결과 패널, 클릭 시 해당 협력사 모달 + 관련 탭 자동 점프.

## 데이터

- `lib/data.ts` — suppliers (Tier 5단계), supplyEdges, batchesInProgress, dppRecords, **productInstances** (제품 인스턴스: 시리얼·공장·생산시점), KPI
- `lib/supplier-detail-data.ts` — 협력사 상세 (담당자, 공장+규제+공급비율, 인증, 부품, PO, 공정, 완성도, 리마인드)

## 실행

```bash
npm install && npm run dev
```

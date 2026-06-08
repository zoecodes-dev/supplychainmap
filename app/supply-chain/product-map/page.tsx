"use client";

import React, { useState, useMemo } from "react";
import {
  Search, Package, Calendar, Building2, Factory, Layers, GitBranch,
  ChevronRight, ChevronDown, X, ArrowLeft, Boxes, MapPin, Percent,
  Hash, Truck, FileText, CheckCircle2, AlertTriangle, Mail, Phone,
  ShieldAlert, Award, Users, AlertCircle, Activity, Send, ScrollText,
} from "lucide-react";

/* ============================================================
   KIRA — 제품 단위 검색 (단위기간 · 고객사 · BOM 버전)
   진입: ① BOM 버전 검색  또는  ② 단위기간 + 납품 고객사 검색
   결과: 매칭 인스턴스 하나씩 → 선택 시 그 버전 BOM 전개
   ============================================================ */

// 원본 톤(tailwind.config.ts ink/accent/signal). ink는 역스케일: 900=흰색, 100=거의검정
const C = {
  bg: "#FFFFFF",        // ink-900 캔버스(흰색)
  panel: "#F8FAFC",     // ink-800 패널
  panelSoft: "#F8FAFC", // 동일(라이트라 투명도 불필요)
  line: "#E2E8F0",      // ink-700 테두리
  lineSoft: "#E2E8F0",  // ink-700
  text: "#0F172A",      // ink-100 본문
  sub: "#475569",       // ink-400 보조
  faint: "#64748B",     // ink-500 흐림
  accent: "#10B981",    // accent-500
  accentDim: "#ECFDF5", // accent-50 (연한 배경)
  accentLine: "#047857",// accent-700 (강조선/텍스트)
  blue: "#2563EB",      // signal-info
  blueDim: "#EFF6FF",   // 연한 파랑 배경
  amber: "#B45309",     // signal-warn
  red: "#DC2626",       // signal-alert
  violet: "#7C3AED",    // 보라(규제 칩) — 원본에 없으나 톤 맞춰 진하게
};

// ── 마스터: 협력사 / 공장 ──────────────────────────────────
const SUP = {
  "S-CELL-001": "Hanyang Cell (자사)",
  "S-CAM-001": "POS Cathode (KR)", "S-CAM-002": "Yantai Cathode (CN)",
  "S-ANO-001": "Mitsui Anode (JP)", "S-PRE-001": "Quzhou Precursor (CN)",
  "S-REF-001": "Pohang/PIW Refining (AU)", "S-REF-002": "Ganzhou Rare Metals (CN)",
  "S-MINE-001": "Sulawesi/NORI Nickel (ID)", "S-MINE-002": "Katanga Cobalt (CD)",
  "S-MINE-003": "Xinjiang Mineral (CN)",
};
const FAC = {
  "F-001": "한양 1공장(울산)", "F-002": "한양 2공장(서산)", "F-003": "한양 3공장(천안)",
  "F-005": "포항 공장", "F-006": "광양 공장", "F-008": "옌타이 공장",
  "F-010": "오사카 공장", "F-012": "취저우 공장", "F-014": "필바라 정제소",
  "F-016": "술라웨시 광산", "F-017": "카탕가 광산", "F-018": "신장 광산",
};

// 광산은 자체 사이트가 없음 → 운영사/데이터 보고 주체가 대신 보고
// (control point = 운영사·정제소가 광산 원산지 데이터를 제출, OECD/배터리법 실사 관행)
const MINE_OPERATORS = {
  "S-MINE-001": { operatorId: "OP-NORI", operator: "NORI Mining Pte Ltd", note: "술라웨시 광산 운영사 — 광산 데이터 대리 보고" },
  "S-MINE-002": { operatorId: "OP-GLENC", operator: "Glencore Katanga SARL", note: "카탕가 광산 운영사 — 원산지·실사 데이터 보고" },
  "S-MINE-003": { operatorId: "OP-XJM",  operator: "Xinjiang Mining Group", note: "신장 광산 운영사 — UFLPA 검증 데이터 보고 주체" },
};

// ── 협력사 상세 (팝업 패널용) — 기존 product-map DetailPanel 정보 ──
const SUP_DETAIL = {
  "S-CELL-001": {
    nameEn: "Hanyang Cell Manufacturing", nameKo: "한양셀 (자사)", country: "KR", role: "셀·모듈·팩 제조 (자사)", region: "울산·서산·천안",
    status: "verified", riskLevel: "low", riskScore: 8, feoc: "eligible", carbon: 12.4, completeness: 100,
    missing: [], highRisk: [], isSelf: true,
    contacts: [
      { name: "박지훈 (Park Jihoon)", role: "생산총괄 · 제조본부", email: "jh.park@hanyang-cell.com", phone: "+82-52-200-3000", primary: true },
      { name: "최유진 (Choi Yujin)", role: "품질보증 · QA본부", email: "yj.choi@hanyang-cell.com", phone: "+82-41-580-3200", primary: false },
    ],
    factories: [
      { name: "한양 1공장(울산)", id: "F-001", addr: "울산 남구", regs: ["EU_BATTERY", "IRA"], dest: "EU" },
      { name: "한양 2공장(서산)", id: "F-002", addr: "충남 서산시", regs: ["EU_BATTERY", "IRA"], dest: "US" },
      { name: "한양 3공장(천안)", id: "F-003", addr: "충남 천안시", regs: ["EU_BATTERY"], dest: "EU" },
    ],
    certs: [
      { name: "ISO 9001", status: "active" }, { name: "ISO 14001", status: "active" },
      { name: "IATF 16949", status: "active" }, { name: "ISO 45001", status: "active" },
    ],
    regs: ["EU_BATTERY", "IRA", "CSDDD"], outPO: 0, inPO: 12,
  },
  "S-CAM-001": {
    nameEn: "POS Cathode Materials", nameKo: "POS 양극재", country: "KR", role: "양극재 (NCM811)", region: "경북 포항",
    status: "verified", riskLevel: "low", riskScore: 18, feoc: "eligible", carbon: 18.7, completeness: 96,
    missing: [], highRisk: [],
    contacts: [
      { name: "정태양 (Jung Taeyang)", role: "포항공장장 · 생산운영팀", email: "ty.jung@pos-cathode.com", phone: "+82-54-280-1200", primary: false },
      { name: "한소희 (Han Sohee)", role: "광양공장장 · 생산운영팀", email: "sh.han@pos-cathode.com", phone: "+82-61-793-1200", primary: true },
    ],
    factories: [
      { name: "포항 공장", id: "F-005", addr: "경북 포항시 남구", regs: ["EU_BATTERY", "IRA"], dest: "EU" },
      { name: "광양 공장", id: "F-006", addr: "전남 광양시", regs: ["EU_BATTERY"], dest: "EU" },
    ],
    certs: [
      { name: "ISO 9001", status: "active" }, { name: "ISO 14001", status: "active" },
      { name: "IATF 16949", status: "expiring_soon" },
    ],
    regs: ["EU_BATTERY", "IRA", "CSDDD"], outPO: 4, inPO: 2,
  },
  "S-CAM-002": {
    nameEn: "Yantai Cathode Tech", nameKo: "옌타이 양극재", country: "CN", role: "양극재 (NCA)", region: "산둥성 옌타이",
    status: "review", riskLevel: "medium", riskScore: 48, feoc: "under_review", carbon: 24.1, completeness: 72,
    missing: ["IRMA 인증서", "FEOC 지분 공시"], highRisk: ["중국 소재 · FEOC 검토 필요"],
    contacts: [{ name: "Fang Chen", role: "ESG Manager · Compliance", email: "f.chen@yantai-cathode.cn", phone: "+86-535-620-1180", primary: true }],
    factories: [{ name: "옌타이 공장", id: "F-008", addr: "산둥성 옌타이시", regs: ["EU_BATTERY", "UFLPA"], dest: "EU" }],
    certs: [{ name: "ISO 9001", status: "active" }],
    regs: ["EU_BATTERY", "UFLPA", "IRA_FEOC"], outPO: 1, inPO: 1,
  },
  "S-ANO-001": {
    nameEn: "Mitsui Anode Industries", nameKo: "미쓰이 음극재", country: "JP", role: "음극재 (흑연)", region: "오사카",
    status: "verified", riskLevel: "low", riskScore: 12, feoc: "eligible", carbon: 8.3, completeness: 98,
    missing: [], highRisk: [],
    contacts: [{ name: "Kenji Yamamoto", role: "Quality Mgr · Quality", email: "k.yamamoto@mitsui-anode.jp", phone: "+81-6-6210-1180", primary: true }],
    factories: [{ name: "오사카 공장", id: "F-010", addr: "오사카부", regs: ["EU_BATTERY"], dest: "EU" }],
    certs: [{ name: "ISO 9001", status: "active" }, { name: "ISO 14001", status: "active" }, { name: "IATF 16949", status: "active" }],
    regs: ["EU_BATTERY", "CSDDD"], outPO: 1, inPO: 0,
  },
  "S-PRE-001": {
    nameEn: "Quzhou Precursor Co.", nameKo: "취저우 전구체", country: "CN", role: "전구체 (NCM)", region: "저장성 취저우",
    status: "pending", riskLevel: "medium", riskScore: 52, feoc: "under_review", carbon: 31.2, completeness: 64,
    missing: ["제조공정도", "FEOC 지분 공시", "환경 인증"], highRisk: ["전구체 공정 데이터 미비"],
    contacts: [{ name: "Li Wei", role: "ESG Manager · Compliance", email: "l.wei@qz-precursor.cn", phone: "+86-570-801-1180", primary: true }],
    factories: [{ name: "취저우 공장", id: "F-012", addr: "저장성 취저우시", regs: ["EU_BATTERY", "IRA_FEOC"], dest: "EU" }],
    certs: [],
    regs: ["EU_BATTERY", "IRA_FEOC", "CSDDD"], outPO: 2, inPO: 4,
  },
  "S-REF-001": {
    nameEn: "Pohang / PIW Refining Works", nameKo: "리튬 정제", country: "AU", role: "리튬 정제", region: "호주 필바라",
    status: "verified", riskLevel: "low", riskScore: 16, feoc: "eligible", carbon: 9.8, completeness: 92,
    missing: [], highRisk: [],
    contacts: [{ name: "Tom Bradley", role: "Plant Manager · Operations", email: "t.bradley@piw-refining.au", phone: "+61-8-9200-1200", primary: true }],
    factories: [{ name: "필바라 정제소", id: "F-014", addr: "WA 필바라", regs: ["EU_BATTERY", "IRA"], dest: "BOTH" }],
    certs: [{ name: "ISO 14001", status: "active" }],
    regs: ["EU_BATTERY", "IRA"], outPO: 2, inPO: 0,
  },
  "S-REF-002": {
    nameEn: "Ganzhou Rare Metals", nameKo: "간저우 코발트 정제", country: "CN", role: "코발트 정제", region: "장시성 간저우",
    status: "pending", riskLevel: "high", riskScore: 68, feoc: "ineligible", carbon: 28.5, completeness: 48,
    missing: ["FEOC 지분 공시", "원산지 증명", "환경 인증"], highRisk: ["FEOC 부적격 판정", "공급망 공개율 저조"],
    contacts: [{ name: "Zhang Min", role: "Export Manager", email: "z.min@ganzhou-rare.cn", phone: "+86-797-820-1180", primary: true }],
    factories: [{ name: "간저우 공장", id: "F-013", addr: "장시성 간저우시", regs: ["IRA_FEOC", "UFLPA"], dest: "US" }],
    certs: [],
    regs: ["IRA_FEOC", "UFLPA", "CSDDD"], outPO: 1, inPO: 1,
  },
  "S-MINE-001": {
    nameEn: "Sulawesi / NORI Nickel Mine", nameKo: "술라웨시 니켈 광산", country: "ID", role: "니켈 광산", region: "술라웨시",
    status: "review", riskLevel: "medium", riskScore: 44, feoc: "eligible", carbon: 45.8, completeness: 70,
    missing: ["광권 좌표 정밀화", "환경 영향평가"], highRisk: ["고탄소 채굴 공정"],
    contacts: [{ name: "Mary Reyes", role: "ESG Manager · Sustainability", email: "m.reyes@nori-mining.id", phone: "+62-21-8855-1100", primary: true }],
    factories: [{ name: "술라웨시 광산", id: "F-016", addr: "Sulawesi", regs: ["CSDDD", "EUDR"], dest: "EU" }],
    certs: [{ name: "ISO 14001", status: "active" }, { name: "RMI-CRT", status: "active" }],
    regs: ["CSDDD", "EUDR", "EU_BATTERY"], outPO: 2, inPO: 0,
  },
  "S-MINE-002": {
    nameEn: "Katanga Cobalt Mining", nameKo: "카탕가 코발트 광산", country: "CD", role: "코발트 광산", region: "카탕가",
    status: "review", riskLevel: "critical", riskScore: 82, feoc: "under_review", carbon: 38.4, completeness: 42,
    missing: ["아동노동 감사 보고서", "광권 증명", "인권 실사"], highRisk: ["아동노동 리스크 (DRC)", "분쟁광물 검증 필요"],
    contacts: [{ name: "Jean-Paul Mwamba", role: "CEO · Executive", email: "jp.mwamba@kat-cobalt.cd", phone: "+243-99-555-1000", primary: true }],
    factories: [{ name: "카탕가 광산", id: "F-017", addr: "Katanga, DRC", regs: ["CSDDD", "CONFLICT_MINERALS"], dest: "EU" }],
    certs: [{ name: "RMI-CRT", status: "expiring_soon" }],
    regs: ["CSDDD", "CONFLICT_MINERALS", "UFLPA"], outPO: 2, inPO: 0,
  },
  "S-MINE-003": {
    nameEn: "Xinjiang Mineral Resources", nameKo: "신장 광물", country: "CN", role: "망간/리튬 광산", region: "신장 위구르 자치구",
    status: "violation", riskLevel: "critical", riskScore: 95, feoc: "ineligible", carbon: 52.7, completeness: 30,
    missing: ["UFLPA 반증 자료", "노동 감사", "원산지 증명"], highRisk: ["UFLPA 강제노동 위반 추정", "수입 보류 대상"],
    contacts: [{ name: "—", role: "연락처 미등록", email: "", phone: "", primary: true }],
    factories: [{ name: "신장 광산", id: "F-018", addr: "Xinjiang", regs: ["UFLPA"], dest: "—" }],
    certs: [],
    regs: ["UFLPA", "CSDDD"], outPO: 1, inPO: 0,
  },
};

const REG_LABEL = {
  EU_BATTERY: "EU 배터리법", IRA: "IRA", IRA_FEOC: "IRA/FEOC", UFLPA: "UFLPA",
  CSDDD: "CSDDD", EUDR: "EUDR", CONFLICT_MINERALS: "분쟁광물",
};

// ── BOM 트리 (계층 구조 + 부모 대비 구성비) ─────────────────
// comp = 부모 부품 100 대비 이 자재의 함량/중량 비율 (기준값, 버전이 덮어쓸 수 있음)
const PARTS = [
  { id: "PRT-001", code: "PACK-NCM811-100Ah", name: "NCM811 배터리 팩", tier: 1, parent: null,      comp: null },
  { id: "PRT-002", code: "MOD-NCM811-12S",    name: "NCM811 모듈(12셀)", tier: 1, parent: "PRT-001", comp: 88 },
  { id: "PRT-003", code: "BMS-V3-100Ah",      name: "BMS 컨트롤러",      tier: 1, parent: "PRT-001", comp: 12 },
  { id: "PRT-004", code: "CELL-NCM811-5Ah",   name: "NCM811 셀(21700)",  tier: 2, parent: "PRT-002", comp: 100 },
  { id: "PRT-005", code: "CAM-NCM811",        name: "NCM811 양극재",     tier: 3, parent: "PRT-004", comp: 42 },
  { id: "PRT-006", code: "ANO-GRAPHITE",      name: "흑연 음극재",       tier: 3, parent: "PRT-004", comp: 24 },
  { id: "PRT-007", code: "PRE-NCM",           name: "NCM 전구체",        tier: 4, parent: "PRT-005", comp: 92 },
  { id: "PRT-008", code: "MIN-NI",            name: "니켈 원광",         tier: 5, parent: "PRT-007", comp: 80 },
  { id: "PRT-009", code: "MIN-CO",            name: "코발트 원광",       tier: 5, parent: "PRT-007", comp: 10 },
  { id: "PRT-011", code: "MIN-MN",            name: "망간 원광",         tier: 5, parent: "PRT-007", comp: 10 },
  { id: "PRT-010", code: "MIN-LI",            name: "리튬 원광",         tier: 5, parent: "PRT-005", comp: 8 },
];

// 버전별 구성비 오버라이드 (조성이 바뀌는 버전만 명시)
// v2.0: 양극재 NCA 혼합 → Ni 비중↑ (Ni88/Co9/Mn3), 전구체 함량도 소폭 변동
const COMP_OVERRIDE = {
  "v2.0": {
    "PRT-008": 88, // 니켈
    "PRT-009": 9,  // 코발트
    "PRT-011": 3,  // 망간
  },
};

// ── 버전별 소싱 = BOM 노드(partId) → 협력사·공장·% (합 100) ──
// 버전마다 자재 구성(노드 유무)·소싱 둘 다 다를 수 있음
const SOURCING = {
  // v1.0 — 초기: 양극재 단일소싱(POS 포항), 코발트 카탕가 단일
  "v1.0": {
    "PRT-005": [{ sup: "S-CAM-001", fac: "F-005", pct: 100 }],
    "PRT-006": [{ sup: "S-ANO-001", fac: "F-010", pct: 100 }],
    "PRT-007": [{ sup: "S-PRE-001", fac: "F-012", pct: 100 }],
    "PRT-008": [{ sup: "S-MINE-001", fac: "F-016", pct: 100 }],
    "PRT-009": [{ sup: "S-MINE-002", fac: "F-017", pct: 100 }],
    "PRT-011": [{ sup: "S-MINE-003", fac: "F-018", pct: 100 }],
    "PRT-010": [{ sup: "S-REF-001", fac: "F-014", pct: 100 }],
  },
  // v1.2 — 양극재 멀티소싱(POS 포항65/광양35), 코발트 카탕가 우세
  "v1.2": {
    "PRT-005": [
      { sup: "S-CAM-001", fac: "F-005", pct: 65 },
      { sup: "S-CAM-001", fac: "F-006", pct: 35 },
    ],
    "PRT-006": [{ sup: "S-ANO-001", fac: "F-010", pct: 100 }],
    "PRT-007": [{ sup: "S-PRE-001", fac: "F-012", pct: 100 }],
    "PRT-008": [{ sup: "S-MINE-001", fac: "F-016", pct: 100 }],
    "PRT-009": [{ sup: "S-MINE-002", fac: "F-017", pct: 100 }],
    "PRT-011": [{ sup: "S-MINE-003", fac: "F-018", pct: 100 }],
    "PRT-010": [{ sup: "S-REF-001", fac: "F-014", pct: 100 }],
  },
  // v2.0 — 양극재 옌타이(NCA) 혼합 + 코발트 멀티(카탕가60/간저우40), 리튬 동일
  "v2.0": {
    "PRT-005": [
      { sup: "S-CAM-001", fac: "F-005", pct: 50 },
      { sup: "S-CAM-002", fac: "F-008", pct: 50 },
    ],
    "PRT-006": [{ sup: "S-ANO-001", fac: "F-010", pct: 100 }],
    "PRT-007": [{ sup: "S-PRE-001", fac: "F-012", pct: 100 }],
    "PRT-008": [{ sup: "S-MINE-001", fac: "F-016", pct: 100 }],
    "PRT-009": [
      { sup: "S-MINE-002", fac: "F-017", pct: 60 },
      { sup: "S-REF-002",  fac: "F-017", pct: 40 },
    ],
    "PRT-011": [{ sup: "S-MINE-003", fac: "F-018", pct: 100 }],
    "PRT-010": [{ sup: "S-REF-001", fac: "F-014", pct: 100 }],
  },
};

// ── 제품 인스턴스: 단위기간 · 고객사 · BOM 버전 ──────────────
const INSTANCES = [
  { serial: "SN-2026-A1-082413", model: "Premium NCM811 100Ah", rootPart: "PRT-001", facId: "F-003", build: [{ fac: "F-003", pct: 100 }], period: "2026-Q2", customer: "Volkswagen AG", dest: "EU", bom: "v2.0", dppStatus: "issued",      dppId: "DPP-2026-04982" },
  { serial: "SN-2026-A1-082319", model: "Premium NCM811 100Ah", rootPart: "PRT-001", facId: "F-003", build: [{ fac: "F-001", pct: 60 }, { fac: "F-003", pct: 40 }], period: "2026-Q2", customer: "Volkswagen AG", dest: "EU", bom: "v1.2", dppStatus: "issued",      dppId: "DPP-2026-04978" },
  { serial: "SN-2026-A1-081002", model: "Premium NCM811 100Ah", rootPart: "PRT-001", facId: "F-003", build: [{ fac: "F-003", pct: 100 }], period: "2026-Q1", customer: "BMW Group",     dest: "EU", bom: "v1.0", dppStatus: "issued",      dppId: "DPP-2026-04102" },
  { serial: "SN-2026-A1-082451", model: "Premium NCM811 100Ah", rootPart: "PRT-001", facId: "F-003", build: [{ fac: "F-003", pct: 100 }], period: "2026-Q2", customer: "Ford Motor",    dest: "US", bom: "v2.0", dppStatus: "in_progress" },
  { serial: "SN-2026-A1-082341", model: "NCM622 90Ah",          rootPart: "PRT-001", facId: "F-002", build: [{ fac: "F-002", pct: 100 }], period: "2026-Q2", customer: "Ford Motor",    dest: "US", bom: "v1.2", dppStatus: "issued",      dppId: "DPP-2026-04979" },
  { serial: "SN-2026-A2-082398", model: "Standard NCA 80Ah",    rootPart: "PRT-001", facId: "F-003", build: [{ fac: "F-001", pct: 50 }, { fac: "F-002", pct: 50 }], period: "2026-Q2", customer: "BMW Group",     dest: "EU", bom: "v2.0", dppStatus: "issued",      dppId: "DPP-2026-04981" },
  { serial: "SN-2025-A1-079820", model: "Premium NCM811 100Ah", rootPart: "PRT-001", facId: "F-003", build: [{ fac: "F-003", pct: 100 }], period: "2025-Q4", customer: "BMW Group",     dest: "EU", bom: "v1.0", dppStatus: "issued",      dppId: "DPP-2025-09810" },
];

const PERIODS = [...new Set(INSTANCES.map((i) => i.period))].sort().reverse();
const CUSTOMERS = [...new Set(INSTANCES.map((i) => i.customer))].sort();
const VERSIONS = Object.keys(SOURCING);
const MODELS = [...new Set(INSTANCES.map((i) => i.model))].sort();
// 제품(모델)이 실제로 가진 BOM 버전만
const versionsOfModel = (model) =>
  [...new Set(INSTANCES.filter((i) => i.model === model).map((i) => i.bom))]
    .sort();

const statusMeta = {
  issued:      { label: "DPP 발급", color: C.accent, Icon: CheckCircle2 },
  in_progress: { label: "발급 진행", color: C.amber, Icon: AlertTriangle },
  pending:     { label: "대기", color: C.faint, Icon: AlertTriangle },
};

// 통합 검색 인덱스 (협력사 / 제품 시리얼 / 자재) — product-map buildSearchIndex 차용
function buildSearchIndex() {
  const hits = [];
  Object.entries(SUP_DETAIL).forEach(([id, d]) => {
    hits.push({ kind: "supplier", supId: id, label: `${d.nameEn} / ${d.nameKo}`, sub: `${id} · ${d.role} · ${d.country}` });
  });
  INSTANCES.forEach((i) => {
    hits.push({ kind: "product", serial: i.serial, label: i.serial, sub: `${i.model} · ${i.period} · ${i.customer} · BOM ${i.bom}` });
  });
  PARTS.forEach((p) => {
    Object.entries(SOURCING).forEach(([ver, map]) => {
      (map[p.id] ?? []).forEach((s) => {
        hits.push({ kind: "material", supId: s.sup, label: `${p.name} · ${SUP[s.sup] ?? s.sup}`, sub: `${p.code} · ${ver} · ${FAC[s.fac] ?? s.fac} · ${s.pct}%` });
      });
    });
  });
  // 중복 라벨 정리
  const seen = new Set();
  return hits.filter((h) => { const k = h.kind + h.label + h.sub; if (seen.has(k)) return false; seen.add(k); return true; });
}
const SEARCH_INDEX = buildSearchIndex();

// ── 컴포넌트 ────────────────────────────────────────────────
export default function ProductUnitSearch({ serialParam }: { serialParam?: string } = {}) {
  const [mode, setMode] = useState("period"); // 'period' | 'product'
  const [period, setPeriod] = useState("");
  const [customer, setCustomer] = useState("");
  const [model, setModel] = useState("");      // 제품 먼저
  const [version, setVersion] = useState("");  // 그다음 버전
  const [selected, setSelected] = useState(null);
  const [navTarget, setNavTarget] = useState(null); // 클릭한 협력사 상세 팝업

  // 통합 검색바
  const [query, setQuery] = useState("");
  const [showDrop, setShowDrop] = useState(false);

  // serial URL 딥링크 진입 (제품 목록 → 이 페이지) — product-map serialParam 차용
  React.useEffect(() => {
    if (!serialParam) return;
    const inst = INSTANCES.find((i) => i.serial === serialParam);
    if (inst) setSelected(inst);
  }, [serialParam]);

  // 모델 바뀌면 버전 초기화 (버전은 제품에 종속)
  React.useEffect(() => { setVersion(""); }, [model]);

  // 자재 소싱 클릭 → 해당 협력사 상세 팝업 (전체 페이지가 필요하면 router.push로 교체)
  const goSupplier = (supId, facId) => setNavTarget({ supId, facId });

  const searchHits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return SEARCH_INDEX.filter((h) => h.label.toLowerCase().includes(q) || h.sub.toLowerCase().includes(q)).slice(0, 8);
  }, [query]);

  const onPickHit = (h) => {
    setShowDrop(false);
    setQuery(h.label);
    if (h.kind === "product" && h.serial) {
      const inst = INSTANCES.find((i) => i.serial === h.serial);
      if (inst) setSelected(inst);
    } else if (h.supId) {
      setNavTarget({ supId: h.supId, facId: null });
    }
  };

  const results = useMemo(() => {
    if (mode === "product") {
      if (!model) return [];
      return INSTANCES.filter((i) => i.model === model && (!version || i.bom === version));
    }
    return INSTANCES.filter(
      (i) => (!period || i.period === period) && (!customer || i.customer === customer)
    );
  }, [mode, period, customer, model, version]);

  if (selected) {
    return (
      <>
        <InstanceDetail inst={selected} onBack={() => setSelected(null)} onNavigate={goSupplier} />
        {navTarget && <SupplierDetailModal target={navTarget} onClose={() => setNavTarget(null)} />}
      </>
    );
  }

  return (
    <div style={{ fontFamily: '"Pretendard", "Noto Sans KR", system-ui, sans-serif', background: C.bg, color: C.text, minHeight: 600 }}>
      {/* PageHeader (product-map 톤) */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: "20px 24px", borderBottom: `1px solid ${C.line}` }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C.text }}>제품별 공급망 맵</h2>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 4, color: C.accentLine, background: C.accentDim, border: `1px solid ${C.accent}40` }}>신규</span>
          </div>
          <p style={{ margin: "5px 0 0", fontSize: 12, color: C.faint }}>
            제품·기간·고객사로 검색 → BOM 버전 전개 · 자재 클릭 시 협력사 상세
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <a href="/supply-chain/request-map" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: C.sub, textDecoration: "none" }}>
            <Send size={13} /> 입력 요청 현황 <ChevronRight size={12} />
          </a>
          <a href="/products" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: C.accentLine, textDecoration: "none" }}>
            <Boxes size={13} /> 제품 목록 <ChevronRight size={12} />
          </a>
        </div>
      </div>

      <div style={{ padding: 24 }}>
        {/* 통합 검색바 (협력사 / 시리얼 / 자재 자동완성) */}
        <div style={{ position: "relative", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 4, border: `1px solid ${query ? C.accentLine : C.line}`, background: C.panel }}>
            <Search size={16} color={C.faint} />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShowDrop(true); }}
              onFocus={() => setShowDrop(true)}
              placeholder="협력사 · 제품 시리얼 · 자재명 검색"
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", color: C.text, fontSize: 13 }}
            />
            {query && (
              <button onClick={() => { setQuery(""); setShowDrop(false); }} style={{ border: "none", background: "none", cursor: "pointer", color: C.faint }}><X size={14} /></button>
            )}
          </div>
          {showDrop && searchHits.length > 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, zIndex: 20, background: C.bg, border: `1px solid ${C.line}`, borderRadius: 4, boxShadow: "0 8px 24px rgba(15,23,42,0.08)", overflow: "hidden" }}>
              {searchHits.map((h, idx) => (
                <button key={idx} onClick={() => onPickHit(h)} style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "9px 14px",
                  border: "none", borderBottom: idx < searchHits.length - 1 ? `1px solid ${C.line}` : "none", background: "transparent", cursor: "pointer",
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.panel)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {h.kind === "product" ? <Package size={13} color={C.accent} /> : h.kind === "supplier" ? <Building2 size={13} color={C.blue} /> : <Layers size={13} color={C.violet} />}
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: C.text }}>{h.label}</span>
                    <span style={{ display: "block", fontSize: 10.5, color: C.faint, fontFamily: "monospace" }}>{h.sub}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 필터 모드 토글 */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <ModeTab active={mode === "period"} onClick={() => setMode("period")} icon={Calendar} label="기간 · 고객사" />
          <ModeTab active={mode === "product"} onClick={() => setMode("product")} icon={Package} label="제품 · BOM 버전" />
        </div>

        {/* 필터 입력 */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", padding: 16, borderRadius: 4, border: `1px solid ${C.line}`, background: C.panel, marginBottom: 20 }}>
          {mode === "period" ? (
            <>
              <SelectBox label="단위기간" icon={Calendar} value={period} onChange={setPeriod} options={PERIODS} placeholder="전체 기간" />
              <SelectBox label="납품 고객사" icon={Building2} value={customer} onChange={setCustomer} options={CUSTOMERS} placeholder="전체 고객사" />
            </>
          ) : (
            <>
              <SelectBox label="제품 (모델)" icon={Package} value={model} onChange={setModel} options={MODELS} placeholder="제품 선택" />
              <SelectBox
                label="BOM 버전"
                icon={GitBranch}
                value={version}
                onChange={setVersion}
                options={model ? versionsOfModel(model) : []}
                placeholder={model ? "전체 버전" : "먼저 제품 선택"}
                disabled={!model}
              />
            </>
          )}
        </div>

        {/* 결과 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: C.sub }}>
            검색 결과 <b style={{ color: C.text }}>{results.length}</b>건
          </span>
        </div>

        {results.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: C.faint, fontSize: 13, border: `1px dashed ${C.line}`, borderRadius: 4 }}>
            {mode === "product" && !model ? "제품을 먼저 선택하세요" : "조건에 맞는 제품이 없습니다"}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {results.map((i) => (
              <ResultRow key={i.serial} inst={i} onClick={() => setSelected(i)} />
            ))}
          </div>
        )}
      </div>

      {navTarget && <SupplierDetailModal target={navTarget} onClose={() => setNavTarget(null)} />}
    </div>
  );
}

function ResultRow({ inst, onClick }) {
  const sm = statusMeta[inst.dppStatus] ?? statusMeta.pending;
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, width: "100%", textAlign: "left",
      padding: 16, borderRadius: 5, border: `1px solid ${C.line}`, background: C.panelSoft, cursor: "pointer", transition: "all .15s",
    }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.accentLine)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.line)}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Package size={15} color={C.accent} />
          <span style={{ fontSize: 14, fontWeight: 700 }}>{inst.model}</span>
          <Pill color={C.violet} icon={GitBranch}>BOM {inst.bom}</Pill>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 11, color: C.sub }}>
          <Meta icon={Hash} mono>{inst.serial}</Meta>
          <Meta icon={Calendar}>{inst.period}</Meta>
          <Meta icon={Building2}>{inst.customer}</Meta>
          <Meta icon={Truck}>{inst.dest} 납품</Meta>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: sm.color }}>
          <sm.Icon size={13} /> {sm.label}
        </span>
        <ChevronRight size={16} color={C.faint} />
      </div>
    </button>
  );
}

// ── 인스턴스 상세 + 버전 BOM 전개 ─────────────────────────
function InstanceDetail({ inst, onBack, onNavigate }) {
  const sm = statusMeta[inst.dppStatus] ?? statusMeta.pending;

  // 버전별 자재 소싱 + 팩(PRT-001)의 자사 생산 소싱 합성
  // 자사도 "언제(period)·어느 공장·몇 %" 생산했는지 표시 (build 배열)
  const sourcing = useMemo(() => {
    const base = { ...(SOURCING[inst.bom] ?? {}) };
    const build = inst.build ?? [{ fac: inst.facId, pct: 100 }];
    base[inst.rootPart] = build.map((b) => ({ sup: "S-CELL-001", fac: b.fac, pct: b.pct, self: true }));
    return base;
  }, [inst.bom, inst.serial]);

  // 이 버전에 실제 존재하는 노드만 (자재 구성이 버전마다 다를 수 있음)
  const activeParts = useMemo(() => {
    const present = new Set(Object.keys(sourcing));
    // 소싱 명시 노드 + 그 조상(구조 노드)까지 포함
    const keep = new Set(present);
    let added = true;
    while (added) {
      added = false;
      PARTS.forEach((p) => {
        if (keep.has(p.id) && p.parent && !keep.has(p.parent)) { keep.add(p.parent); added = true; }
      });
    }
    return PARTS.filter((p) => keep.has(p.id));
  }, [sourcing]);

  // 버전별 구성비 오버라이드 적용
  const compOf = (p) => {
    const ov = COMP_OVERRIDE[inst.bom]?.[p.id];
    return ov != null ? ov : p.comp;
  };
  const childrenOf = (id) => activeParts.filter((p) => p.parent === id);
  const root = activeParts.find((p) => p.parent === null);

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", background: C.bg, color: C.text, borderRadius: 6, padding: 24, minHeight: 600 }}>
      <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 18, padding: "7px 13px", borderRadius: 4, border: `1px solid ${C.line}`, background: C.panelSoft, color: C.sub, fontSize: 12, cursor: "pointer" }}>
        <ArrowLeft size={14} /> 검색 결과로
      </button>

      {/* 제품 식별 카드 */}
      <div style={{ padding: 20, borderRadius: 6, border: `1px solid ${C.lineSoft}`, background: C.panelSoft, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <Package size={18} color={C.accent} />
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>{inst.model}</h2>
          <Pill color={C.violet} icon={GitBranch}>BOM {inst.bom}</Pill>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: sm.color, marginLeft: "auto" }}>
            <sm.Icon size={14} /> {sm.label}{inst.dppId ? ` · ${inst.dppId}` : ""}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          <KV icon={Hash}      label="시리얼" value={inst.serial} mono />
          <KV icon={Calendar}  label="단위기간" value={inst.period} />
          <KV icon={Building2} label="납품 고객사" value={inst.customer} />
          <KV icon={Truck}     label="납품처" value={`${inst.dest}`} />
          <KV icon={Factory}   label="생산 공장" value={inst.facId} />
        </div>
      </div>

      {/* BOM 전개 헤더 */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <Layers size={16} color={C.accent} />
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>BOM 기준정보 전개 · {inst.bom}</h3>
      </div>
      <p style={{ margin: "0 0 14px", fontSize: 11.5, color: C.faint }}>
        구성비 = 상위 부품 대비 함량 % · 소싱 = 그 자재를 어느 협력사·공장에서 몇 %씩 조달했는지 (버전 고정)
      </p>

      {/* BOM 트리 */}
      <div style={{ border: `1px solid ${C.lineSoft}`, borderRadius: 6, background: C.panelSoft, padding: 8 }}>
        {root && <BomNode node={root} depth={0} childrenOf={childrenOf} sourcing={sourcing} compOf={compOf} onNavigate={onNavigate} period={inst.period} />}
      </div>
    </div>
  );
}

function BomNode({ node, depth, childrenOf, sourcing, compOf, onNavigate, period }) {
  const [open, setOpen] = useState(true);
  const kids = childrenOf(node.id);
  const src = sourcing[node.id];
  const hasKids = kids.length > 0;
  const comp = compOf(node);

  // 광물(T5) 형제들의 조성 — 부모 전구체/양극재 안에서의 함량 비교
  const mineralKids = kids.filter((k) => k.tier === 5);
  const compColor = (v) => (v >= 50 ? C.accent : v >= 15 ? C.blue : C.amber);

  return (
    <div>
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px", marginLeft: depth * 20,
        borderRadius: 4, background: depth === 0 ? C.accentDim : "transparent",
        borderLeft: depth > 0 ? `2px solid ${C.lineSoft}` : "none",
      }}>
        <button onClick={() => hasKids && setOpen(!open)} style={{ background: "none", border: "none", cursor: hasKids ? "pointer" : "default", color: C.faint, padding: 0, marginTop: 2, width: 16 }}>
          {hasKids ? (open ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span style={{ display: "inline-block", width: 14 }} />}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{node.name}</span>
            <span style={{ fontSize: 10, fontFamily: "monospace", color: C.faint }}>{node.code}</span>
            <Pill color={C.blue} small>T{node.tier}</Pill>
            {comp != null && (
              <Pill color={C.violet} small icon={Percent}>상위 대비 {comp}%</Pill>
            )}
          </div>

          {/* 광물 구성비 — 자식이 광물일 때 부모 노드에 조성 막대 표시 */}
          {mineralKids.length > 0 && (
            <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 4, background: C.bg, border: `1px solid ${C.lineSoft}` }}>
              <div style={{ fontSize: 9.5, letterSpacing: 0.5, textTransform: "uppercase", color: C.faint, marginBottom: 6 }}>
                광물 구성비 (이 부품 100 기준)
              </div>
              {/* 누적 막대 */}
              <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 7 }}>
                {mineralKids.map((m) => (
                  <span key={m.id} title={`${m.name} ${compOf(m)}%`} style={{ width: `${compOf(m)}%`, background: compColor(compOf(m)) }} />
                ))}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {mineralKids.map((m) => (
                  <span key={m.id} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: C.sub }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: compColor(compOf(m)) }} />
                    {m.name} <b style={{ fontFamily: "monospace", color: compColor(compOf(m)) }}>{compOf(m)}%</b>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 소싱 행 — 자사 생산 / 광산(운영사 보고) / 일반 협력사 구분 */}
          {src && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
              {src.map((s, idx) => {
                const isSelf = s.self || s.sup === "S-CELL-001";
                const mineOp = MINE_OPERATORS[s.sup]; // 광산이면 운영사 정보
                const tone = isSelf ? C.accentLine : mineOp ? C.amber : C.blue;
                const displayName = isSelf
                  ? "한양셀 (자사 생산)"
                  : mineOp
                  ? mineOp.operator
                  : (SUP[s.sup] ?? s.sup);
                return (
                  <button
                    key={idx}
                    onClick={() => onNavigate?.(s.sup, s.fac)}
                    title={isSelf ? "자사 생산 상세" : mineOp ? `${mineOp.operator} (데이터 보고 주체) 상세` : `${SUP[s.sup] ?? s.sup} 상세`}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 11, width: "100%", textAlign: "left",
                      padding: "6px 8px", borderRadius: 4, background: isSelf ? C.accentDim : "transparent",
                      border: `1px solid ${isSelf ? C.accent + "40" : C.lineSoft}`,
                      color: C.sub, cursor: "pointer", transition: "all .15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = isSelf ? C.accentDim : C.blueDim; e.currentTarget.style.borderColor = tone; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = isSelf ? C.accentDim : "transparent"; e.currentTarget.style.borderColor = isSelf ? C.accent + "40" : C.lineSoft; }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: tone, fontWeight: 600, minWidth: 200 }}>
                      <Building2 size={12} /> {displayName}
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: C.sub }}>
                      <MapPin size={12} color={C.faint} /> {FAC[s.fac] ?? s.fac}
                    </span>
                    {/* 자사: 생산기간 / 광산: 데이터 보고 주체 뱃지 */}
                    {isSelf && period && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 9.5, color: C.accentLine }}>
                        <Calendar size={10} /> {period} 생산
                      </span>
                    )}
                    {mineOp && (
                      <span style={{ fontSize: 9, fontWeight: 600, padding: "1px 6px", borderRadius: 4, color: C.amber, background: C.amber + "14", border: `1px solid ${C.amber}40` }}>
                        데이터 보고 주체
                      </span>
                    )}
                    <span style={{ display: "flex", alignItems: "center", gap: 7, marginLeft: "auto" }}>
                      <span style={{ fontSize: 9, color: C.faint }}>{isSelf ? "생산" : "조달"}</span>
                      <span style={{ width: 80, height: 6, borderRadius: 3, background: C.line, overflow: "hidden" }}>
                        <span style={{ display: "block", height: "100%", width: `${s.pct}%`, background: s.pct >= 60 ? C.accent : tone }} />
                      </span>
                      <span style={{ fontFamily: "monospace", fontWeight: 700, color: s.pct >= 60 ? C.accent : tone, minWidth: 36, textAlign: "right" }}>{s.pct}%</span>
                      <ChevronRight size={13} color={C.faint} />
                    </span>
                  </button>
                );
              })}
              {src.length > 1 && (
                <span style={{ fontSize: 10, color: C.faint, alignSelf: "flex-end" }}>
                  {(src[0].self || src[0].sup === "S-CELL-001") ? `${src.length}개 공장 분할 생산` : `${src.length}개 소스 멀티소싱`} · 합 {src.reduce((a, b) => a + b.pct, 0)}%
                </span>
              )}
              {/* 광산 운영사 안내 (해당 노드에 광산이 있을 때) */}
              {src.some((s) => MINE_OPERATORS[s.sup]) && (
                <span style={{ fontSize: 9.5, color: C.faint, alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <AlertCircle size={10} /> 광산은 자체 사이트가 없어 운영사가 원산지·실사 데이터를 대리 보고합니다
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {open && kids.map((k) => (
        <BomNode key={k.id} node={k} depth={depth + 1} childrenOf={childrenOf} sourcing={sourcing} compOf={compOf} onNavigate={onNavigate} period={period} />
      ))}
    </div>
  );
}

// ── 협력사 상세 팝업 (기존 product-map DetailPanel → 모달) ──
const RISK_META = {
  low:      { label: "저위험", color: C.accent },
  medium:   { label: "중위험", color: C.amber },
  high:     { label: "고위험", color: C.red },
  critical: { label: "최고위험", color: C.red },
};
const FEOC_META = {
  eligible:     { label: "적격", color: C.accent },
  ineligible:   { label: "부적격", color: C.red },
  under_review: { label: "검토 중", color: C.amber },
  unknown:      { label: "미파악", color: C.faint },
};
const COUNTRY_COLOR = { CN: C.red, KR: C.blue, JP: C.violet };

function SupplierDetailModal({ target, onClose }) {
  const [tab, setTab] = useState("overview");
  const d = SUP_DETAIL[target.supId];
  if (!d) return null;
  const rm = RISK_META[d.riskLevel];
  const fm = FEOC_META[d.feoc];
  const cc = COUNTRY_COLOR[d.country] ?? C.faint;
  const mineOp = MINE_OPERATORS[target.supId]; // 광산이면 운영사(데이터 보고 주체)

  const tabs = [
    { key: "overview", label: "개요", icon: Activity },
    { key: "contacts", label: "담당자", icon: Users },
    { key: "factory", label: "공장", icon: Factory },
    { key: "risk", label: "리스크", icon: ShieldAlert },
    { key: "regs", label: "규제", icon: ScrollText },
  ];

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "#000000aa", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: 480, maxHeight: "88vh", display: "flex", flexDirection: "column",
        background: C.panel, border: `1px solid ${C.line}`, borderRadius: 6, overflow: "hidden",
      }}>
        {/* 헤더 */}
        <div style={{ padding: "16px 18px", borderBottom: `1px solid ${C.line}`, background: C.panelSoft, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6, flexWrap: "wrap" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: d.status === "verified" ? C.accent : d.status === "violation" ? C.red : d.status === "review" ? C.amber : C.blue }} />
                <span style={{ fontSize: 10, fontFamily: "monospace", color: C.faint }}>{target.supId}</span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4, color: cc, background: `${cc}1A`, border: `1px solid ${cc}40` }}>{d.country}</span>
                {d.isSelf && <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4, color: C.accentLine, background: C.accentDim, border: `1px solid ${C.accent}40` }}>자사</span>}
              </div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.text }}>{d.nameEn}</h3>
              <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>{d.nameKo} · {d.role} · {d.region}</div>
              {mineOp && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, padding: "6px 10px", borderRadius: 4, background: C.amber + "12", border: `1px solid ${C.amber}40` }}>
                  <AlertCircle size={13} color={C.amber} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 10.5, color: C.amber, lineHeight: 1.4 }}>
                    데이터 보고 주체: <b>{mineOp.operator}</b> · 광산 자체 사이트 없음, 운영사가 원산지·실사 데이터 대리 제출
                  </span>
                </div>
              )}
            </div>
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 4, border: `1px solid ${C.line}`, background: "transparent", color: C.faint, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><X size={15} /></button>
          </div>
        </div>

        {/* 탭 */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "8px 14px", borderBottom: `1px solid ${C.line}`, background: C.bg, flexShrink: 0 }}>
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
              border: `1px solid ${tab === t.key ? C.accentLine : "transparent"}`, background: tab === t.key ? C.accentDim : "transparent", color: tab === t.key ? C.accent : C.sub,
            }}>
              <t.icon size={12} /> {t.label}
            </button>
          ))}
        </div>

        {/* 콘텐츠 */}
        <div style={{ flex: 1, overflowY: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 16 }}>
          {tab === "overview" && (
            <>
              <PSection title="데이터 완성도">
                <Bar pct={d.completeness} />
                {d.missing.slice(0, 3).map((m) => (
                  <div key={m} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10.5, color: C.amber, marginTop: 5 }}>
                    <AlertCircle size={11} /> {m}
                  </div>
                ))}
              </PSection>
              <PSection title="리스크 요약">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: rm.color }}>{rm.label}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 90, height: 6, background: C.line, borderRadius: 3, overflow: "hidden" }}>
                      <span style={{ display: "block", height: "100%", width: `${d.riskScore}%`, background: rm.color }} />
                    </span>
                    <span style={{ fontSize: 11, fontFamily: "monospace", color: C.sub }}>{d.riskScore}/100</span>
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, padding: "6px 10px", borderRadius: 6, border: `1px solid ${fm.color}40`, background: `${fm.color}10` }}>
                  <span style={{ fontSize: 11, color: C.sub }}>FEOC</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: fm.color }}>{fm.label}</span>
                </div>
              </PSection>
              <PSection title="거래 현황">
                <div style={{ display: "flex", gap: 8 }}>
                  <Stat value={d.outPO} label="납품 PO" />
                  <Stat value={d.inPO} label="수신 PO" />
                  <Stat value={d.carbon} label="kgCO₂/kg" color={d.carbon > 40 ? C.red : d.carbon > 20 ? C.amber : C.accent} />
                </div>
              </PSection>
              {d.certs.length > 0 && (
                <PSection title={`인증서 (${d.certs.length}건)`}>
                  {d.certs.map((c) => (
                    <div key={c.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", borderRadius: 6, marginTop: 4, border: `1px solid ${c.status === "expiring_soon" ? C.amber + "40" : C.lineSoft}`, background: c.status === "expiring_soon" ? C.amber + "10" : C.bg }}>
                      <span style={{ fontSize: 11.5, color: C.text }}>{c.name}</span>
                      <span style={{ fontSize: 10, fontFamily: "monospace", color: c.status === "active" ? C.accent : C.amber }}>{c.status === "active" ? "유효" : "만료임박"}</span>
                    </div>
                  ))}
                </PSection>
              )}
            </>
          )}

          {tab === "contacts" && (
            <PSection title="담당자 연락처">
              {d.contacts.map((c, i) => (
                <div key={i} style={{ padding: 12, borderRadius: 4, marginTop: i ? 8 : 0, border: `1px solid ${c.primary ? C.accentLine : C.lineSoft}`, background: c.primary ? C.accentDim : C.bg }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{c.name}</span>
                    {c.primary && <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4, color: C.accent, background: C.accentDim }}>주담당</span>}
                  </div>
                  <div style={{ fontSize: 11, color: C.sub, marginTop: 3 }}>{c.role}</div>
                  {c.email && <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.blue, marginTop: 6 }}><Mail size={12} /> {c.email}</div>}
                  {c.phone && <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.sub, marginTop: 3 }}><Phone size={12} color={C.faint} /> {c.phone}</div>}
                </div>
              ))}
            </PSection>
          )}

          {tab === "factory" && (
            <PSection title="공장·사업장">
              {d.factories.map((f) => (
                <div key={f.id} style={{ padding: 12, borderRadius: 4, marginTop: 8, border: `1px solid ${C.lineSoft}`, background: C.bg }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{f.name}</span>
                    <span style={{ fontSize: 10, fontFamily: "monospace", color: C.faint }}>{f.id}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.sub, marginTop: 4 }}><MapPin size={12} color={C.faint} /> {f.addr}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                    {f.regs.map((r) => <RegPill key={r} reg={r} />)}
                    <span style={{ fontSize: 9.5, padding: "2px 7px", borderRadius: 4, color: C.blue, background: C.blueDim, border: `1px solid ${C.blue}40` }}>{f.dest} 납품</span>
                  </div>
                </div>
              ))}
            </PSection>
          )}

          {tab === "risk" && (
            <>
              <PSection title="종합 리스크">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: rm.color }}>{rm.label}</span>
                  <span style={{ fontSize: 13, fontFamily: "monospace", color: C.sub }}>{d.riskScore}/100</span>
                </div>
                <Bar pct={d.riskScore} danger />
              </PSection>
              {d.highRisk.length > 0 && (
                <PSection title="주요 리스크 사유">
                  {d.highRisk.map((r) => (
                    <div key={r} style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 11.5, color: C.red, marginTop: 5 }}>
                      <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} /> {r}
                    </div>
                  ))}
                </PSection>
              )}
              <PSection title="FEOC 자격">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 4, border: `1px solid ${fm.color}40`, background: `${fm.color}10` }}>
                  <span style={{ fontSize: 12, color: C.sub }}>IRA/FEOC 판정</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: fm.color }}>{fm.label}</span>
                </div>
              </PSection>
            </>
          )}

          {tab === "regs" && (
            <PSection title="적용 규제">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {d.regs.map((r) => <RegPill key={r} reg={r} big />)}
              </div>
            </PSection>
          )}
        </div>

        {/* 푸터: 실제 앱에선 전체 페이지로 */}
        <div style={{ padding: 14, borderTop: `1px solid ${C.line}`, background: C.panelSoft, flexShrink: 0 }}>
          <button onClick={onClose} style={{
            width: "100%", padding: "10px", borderRadius: 4, border: `1px solid ${C.line}`, background: C.bg, color: C.sub,
            fontSize: 12, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            <ChevronRight size={14} /> 협력사 전체 페이지 열기 (/suppliers/{target.supId})
          </button>
        </div>
      </div>
    </div>
  );
}

function PSection({ title, children }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, letterSpacing: 0.5, textTransform: "uppercase", color: C.faint, marginBottom: 8, fontWeight: 600 }}>{title}</div>
      {children}
    </div>
  );
}
function Bar({ pct, danger }: any) {
  const col = danger
    ? (pct >= 70 ? C.red : pct >= 40 ? C.amber : C.accent)
    : (pct >= 90 ? C.accent : pct >= 70 ? C.amber : C.red);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ flex: 1, height: 7, background: C.line, borderRadius: 4, overflow: "hidden" }}>
        <span style={{ display: "block", height: "100%", width: `${pct}%`, background: col }} />
      </span>
      <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: col }}>{pct}%</span>
    </div>
  );
}
function Stat({ value, label, color }: any) {
  return (
    <div style={{ flex: 1, textAlign: "center", padding: "8px 4px", borderRadius: 4, border: `1px solid ${C.lineSoft}`, background: C.bg }}>
      <div style={{ fontSize: 17, fontWeight: 800, fontFamily: "monospace", color: color ?? C.text }}>{value}</div>
      <div style={{ fontSize: 9.5, color: C.faint, marginTop: 2 }}>{label}</div>
    </div>
  );
}
function RegPill({ reg, big }: any) {
  return (
    <span style={{ fontSize: big ? 11 : 9.5, fontWeight: 600, padding: big ? "4px 10px" : "2px 7px", borderRadius: 5, color: C.violet, background: `${C.violet}1A`, border: `1px solid ${C.violet}40` }}>
      {REG_LABEL[reg] ?? reg}
    </span>
  );
}

// ── 작은 UI 유틸 ───────────────────────────────────────────
function ModeTab({ active, onClick, icon: Icon, label }) {
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 15px", borderRadius: 5, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
      border: `1px solid ${active ? C.accentLine : C.line}`, background: active ? C.accentDim : "transparent", color: active ? C.accent : C.sub,
    }}>
      <Icon size={14} /> {label}
    </button>
  );
}
function SelectBox({ label, icon: Icon, value, onChange, options, placeholder, disabled }: any) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 200, opacity: disabled ? 0.55 : 1 }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10.5, letterSpacing: 0.5, textTransform: "uppercase", color: C.faint }}>
        <Icon size={12} /> {label}
      </span>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} style={{
        padding: "10px 12px", borderRadius: 4, border: `1px solid ${value ? C.accentLine : C.line}`,
        background: C.bg, color: value ? C.text : C.faint, fontSize: 13, outline: "none", cursor: disabled ? "not-allowed" : "pointer",
      }}>
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o} value={o} style={{ color: "#000" }}>{o}</option>)}
      </select>
    </label>
  );
}
function Meta({ icon: Icon, children, mono }: any) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: mono ? "monospace" : "inherit" }}>
      <Icon size={11} color={C.faint} /> {children}
    </span>
  );
}
function Pill({ children, color, icon: Icon, small }: any) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4, padding: small ? "1px 6px" : "2px 8px",
      borderRadius: 5, fontSize: small ? 9.5 : 10.5, fontWeight: 700, color, background: `${color}1A`, border: `1px solid ${color}40`,
    }}>
      {Icon && <Icon size={10} />} {children}
    </span>
  );
}
function KV({ icon: Icon, label, value, mono }: any) {
  return (
    <div>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase", color: C.faint, marginBottom: 4 }}>
        <Icon size={11} /> {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: mono ? "monospace" : "inherit" }}>{value}</div>
    </div>
  );
}
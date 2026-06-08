"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  Building2, Factory, Award, Users, Send, Upload, CircleCheck,
  Clock, CircleAlert, ChevronRight, ChevronDown, MapPin, Plus,
  FileUp, Layers, ArrowRight, X, Network, ClipboardList, Mail, Edit3
} from "lucide-react";

/* ============================================================
   KIRA — 협력사 업데이트 플로우 (ADR 7계층 & Seed Data 연동)
   * 다중 역할(Dual-role) 지원: 한양 제조(주)가 T1, T2, T3 연속 담당
   ============================================================ */

const C = {
  bg: "#FFFFFF", panel: "#F8FAFC", panelSoft: "#F8FAFC", line: "#E2E8F0",
  lineSoft: "#E2E8F0", text: "#0F172A", sub: "#475569", faint: "#64748B",
  accent: "#10B981", accentDim: "#ECFDF5", accentLine: "#047857",
  blue: "#2563EB", amber: "#B45309", red: "#DC2626",
};

// ── 7계층 공급망 트리 구조 (02_seed_data_2.sql 기반 매핑) ──
const INITIAL_NODES = {
  "T1-HY": { name: "한양 제조(주)",     tier: 1, role: "배터리 팩",     country: "KR", children: ["T2-HY"] },
  "T2-HY": { name: "한양 제조(주)",     tier: 2, role: "배터리 모듈",   country: "KR", children: ["T3-HY"] },
  "T3-HY": { name: "한양 제조(주)",     tier: 3, role: "배터리 셀",     country: "KR", children: ["T4-DS"] },
  "T4-DS": { name: "동성머티리얼(주)",  tier: 4, role: "양극재 NCM811", country: "KR", children: ["T5-CJ"] },
  "T5-CJ": { name: "청정전구체(주)",    tier: 5, role: "NCM 전구체",    country: "KR", children: ["T6-PR"] },
  "T6-PR": { name: "Pohang Refining",   tier: 6, role: "리튬 정제",     country: "KR", children: ["T7-AL"] },
  "T7-AL": { name: "Australia Lithium", tier: 7, role: "리튬 광산",     country: "AU", children: [] },
};
const ROOT = "T1-HY";
const tierLabel = { 
  1: "T1 Pack", 2: "T2 Module", 3: "T3 Cell", 4: "T4 활물질", 
  5: "T5 전구체", 6: "T6 제련·정제", 7: "T7 원광(광산)" 
};

const FIELD_SECTIONS = [
  {
    key: "basic", title: "기업 기본정보", icon: Building2,
    fields: [
      { k: "nameEn", label: "영문 정식명칭", required: true },
      { k: "nameKo", label: "한글 명칭", required: true },
      { k: "businessRegNo", label: "사업자 등록번호", required: true, mono: true },
      { k: "dunsNumber", label: "DUNS 번호", mono: true },
      { k: "establishedYear", label: "설립연도" },
      { k: "employeeCount", label: "임직원 수" },
      { k: "ceoName", label: "대표자" },
      { k: "website", label: "웹사이트" },
    ],
  },
  {
    key: "contact", title: "담당자 연락처", icon: Users,
    fields: [
      { k: "contactName", label: "담당자 이름", required: true },
      { k: "contactRole", label: "직책/부서" },
      { k: "contactEmail", label: "이메일", required: true },
      { k: "contactPhone", label: "전화번호" },
    ],
  },
  {
    key: "factory", title: "공장·사업장", icon: Factory,
    fields: [
      { k: "factoryName", label: "공장 명칭", required: true },
      { k: "factoryAddress", label: "주소", required: true },
      { k: "monthlyCapacity", label: "월 처리량" },
      { k: "destination", label: "납품처 (EU/US/BOTH/KR)" },
    ],
  },
];

const UPLOAD_SLOTS = [
  { k: "biz_license", label: "사업자 등록증", required: true },
  { k: "cert_iso9001", label: "ISO 9001 인증서", required: true },
  { k: "cert_iso14001", label: "ISO 14001 인증서", required: true },
  { k: "cert_origin", label: "원산지 증명서", required: true },
  { k: "cert_cti", label: "업종별 CTI 상세 문서" },
];

/* ============================================================
   공용 UI 컴포넌트 (양쪽 페이지 모두 사용)
   ============================================================ */

function RenderField({ field, value, isEdit, onChange }) {
  if (isEdit) {
    return (
      <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <span style={{ fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase", color: C.faint }}>
          {field.label}{field.required && <span style={{ color: C.red }}> *</span>}
        </span>
        <input
          value={value} onChange={(e) => onChange(e.target.value)}
          style={{ padding: "9px 11px", borderRadius: 4, border: `1px solid ${value ? C.accentLine : C.line}`, background: C.bg, color: C.text, fontSize: 13, outline: "none", fontFamily: field.mono ? "monospace" : "inherit" }}
        />
      </label>
    );
  }
  return (
    <div style={{ padding: "10px 12px", borderRadius: 4, background: "#F8FAFC", border: `1px solid ${C.line}` }}>
      <div style={{ fontSize: 10, color: C.faint, marginBottom: 4 }}>{field.label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: value ? C.text : "#94A3B8", fontFamily: field.mono ? "monospace" : "inherit" }}>
        {value || "(실시간 대기중 - 미기입)"}
      </div>
    </div>
  );
}

function RenderUploadSlot({ slot, file, isEdit, onUpload, onClear }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 14, borderRadius: 4, border: `1.5px ${file ? "solid" : "dashed"} ${file ? C.accentLine : C.line}`, background: file ? C.accentDim : "#FAFAFA" }}>
      <div style={{ fontSize: 11, color: C.sub, fontWeight: 600 }}>
        {slot.label}{slot.required && <span style={{ color: C.red }}> *</span>}
      </div>
      {file ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: C.accent, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <CircleCheck size={13} /> {file}
          </span>
          {isEdit && <button onClick={onClear} style={{ background: "none", border: "none", cursor: "pointer", color: C.faint }}><X size={13} /></button>}
        </div>
      ) : (
        isEdit ? (
          <button onClick={onUpload} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px", borderRadius: 6, border: `1px solid ${C.line}`, background: C.bg, color: C.sub, fontSize: 11, cursor: "pointer" }}>
            <FileUp size={13} /> 파일 등록
          </button>
        ) : <span style={{ fontSize: 11, color: C.red, fontWeight: 500, fontStyle: "italic" }}>⚠️ 서류 미제출</span>
      )}
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <div style={{ border: `1px solid ${C.lineSoft}`, borderRadius: 5, background: C.panelSoft, padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <Icon size={15} color={C.accent} />
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Legend({ color, label, dashed = false }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 22, height: 0, borderTop: `2px ${dashed ? "dashed" : "solid"} ${color}` }} />
      {label}
    </span>
  );
}

function MiniBtn({ onClick, icon: Icon, label, primary = false, disabled = false }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 9px", borderRadius: 6, fontSize: 10.5, fontWeight: 600,
      cursor: disabled ? "default" : "pointer", border: `1px solid ${disabled ? C.line : primary ? C.accentLine : C.line}`,
      background: disabled ? "transparent" : primary ? C.accent : C.bg, color: disabled ? C.faint : primary ? "#FFFFFF" : C.sub,
    }}>
      {Icon && <Icon size={11} />} {label}
    </button>
  );
}

function Tab({ active, onClick, icon: Icon, label }) {
  return (
    <button onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 4, fontSize: 12.5, fontWeight: 600, cursor: "pointer", border: `1px solid ${active ? C.accentLine : C.line}`, background: active ? C.accentDim : "transparent", color: active ? C.accent : C.sub }}>
      <Icon size={14} /> {label}
    </button>
  );
}

/* ============================================================
   입력 및 모니터링 공통 컴포넌트 (InputPage)
   ============================================================ */
function InputPage({ supplierId, nodes, supplierData, onSave, onSubmit, role, initialInputMode }) {
  const node = nodes[supplierId] || { name: "신규 등록 컴퍼니", tier: 3, role: "" };
  const currentData = supplierData[supplierId] || { vals: {}, files: {} };

  const [vals, setVals] = useState(currentData.vals || {});
  const [files, setFiles] = useState(currentData.files || {});
  const [isEditMode, setIsEditMode] = useState(initialInputMode === "edit");

  useEffect(() => {
    const target = supplierData[supplierId] || { vals: {}, files: {} };
    setVals(target.vals || {});
    setFiles(target.files || {});
    setIsEditMode(initialInputMode === "edit");
  }, [supplierId, supplierData, initialInputMode]);

  const allFields = FIELD_SECTIONS.flatMap((s) => s.fields);
  const reqFields = allFields.filter((f) => f.required);
  const reqUploads = UPLOAD_SLOTS.filter((u) => u.required);
  const filled = reqFields.filter((f) => (vals[f.k] ?? "").trim()).length + reqUploads.filter((u) => files[u.k]).length;
  const totalReq = reqFields.length + reqUploads.length;
  const rate = Math.round((filled / totalReq) * 100);

  const set = (k, v) => setVals((p) => ({ ...p, [k]: v }));
  const upload = (k) => setFiles((p) => ({ ...p, [k]: `${k}_업로드증빙.pdf` }));
  const clearFile = (k) => setFiles((p) => { const n = { ...p }; delete n[k]; return n; });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: isEditMode ? "#EFF6FF" : "#F0FDF4", padding: "12px 16px", borderRadius: 6, border: `1px solid ${isEditMode ? "#BFDBFE" : "#BBF7D0"}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: isEditMode ? C.blue : C.accentLine }}>
          {isEditMode ? "📝 원청사 데이터 변경·편집 모드 구동중" : "🔍 원청사 실시간 데이터 현황 대시보드 모니터링 모드 (조회 전용)"}
        </div>
        <button onClick={() => setIsEditMode(!isEditMode)} style={{ padding: "6px 12px", borderRadius: 4, background: isEditMode ? "#64748B" : C.blue, color: "#FFFFFF", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          {isEditMode ? "👁️ 모니터링 화면으로 전환" : "✏️ 데이터 확인 후 직접 수정하기"}
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 1, color: C.accent, fontWeight: 700 }}>{tierLabel[node.tier]} · {supplierId}</div>
          <h2 style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 800 }}>{node.name}</h2>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "monospace", color: rate >= 100 ? C.accent : rate >= 60 ? C.amber : C.red }}>{rate}%</div>
          <div style={{ fontSize: 11, color: C.faint }}>수집 완료 진척률 ({filled}/{totalReq})</div>
        </div>
      </div>

      <div style={{ height: 6, borderRadius: 3, background: C.line, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${rate}%`, background: rate >= 100 ? C.accent : rate >= 60 ? C.amber : C.red }} />
      </div>

      {FIELD_SECTIONS.map((sec) => (
        <Section key={sec.key} icon={sec.icon} title={sec.title}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
            {sec.fields.map((f) => <RenderField key={f.k} field={f} value={vals[f.k] ?? ""} isEdit={isEditMode} onChange={(v) => set(f.k, v)} />)}
          </div>
        </Section>
      ))}

      <Section icon={Award} title="인증서 및 자격 증빙 파일 현황">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          {UPLOAD_SLOTS.map((u) => <RenderUploadSlot key={u.k} slot={u} file={files[u.k]} isEdit={isEditMode} onUpload={() => upload(u.k)} onClear={() => clearFile(u.k)} />)}
        </div>
      </Section>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        {isEditMode && (
          <button onClick={() => { onSave(supplierId, vals, files); alert("실시간 중간 저장이 처리되었습니다."); setIsEditMode(false); }} style={{ padding: "11px 22px", borderRadius: 4, border: `1px solid ${C.line}`, fontSize: 13, fontWeight: 700, cursor: "pointer", background: "#FFFFFF" }}>
            중간 데이터 저장하기
          </button>
        )}
        <button disabled={rate < 100} onClick={() => onSubmit(supplierId, vals, files)} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 22px", borderRadius: 4, border: "none", fontSize: 13, fontWeight: 700, cursor: rate < 100 ? "not-allowed" : "pointer", background: rate < 100 ? C.line : C.accent, color: rate < 100 ? C.faint : "#FFFFFF" }}>
          <Send size={15} /> {rate < 100 ? "필수 요건 미충족" : "최종 확인 및 승인 처리"}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   공급망 전파 네트워크 맵 (PropagationMap)
   ============================================================ */
function PropagationMap({ 
  states, 
  nodes, 
  onRequest, 
  onOpenInput, 
  selected, 
  onSelect, 
  role, 
  activeSupplier
}: { 
  states: any; 
  nodes: any; 
  onRequest: any; 
  onOpenInput: any; 
  selected: any; 
  onSelect: any; 
  role: any; 
  activeSupplier?: string;
}) {
  const visible = useMemo(() => {
    // 1. 원청사: Root부터 제출된 모든 하위 노드를 재귀적으로 탐색
    if (role === "client") {
      const set = new Set([ROOT]);
      
      const walk = (id) => {
        const node = nodes[id];
        // 노드가 존재하고 제출 상태인 경우에만 자식들을 탐색
        if (node && states[id]?.status === "submitted" && node.children) {
          node.children.forEach((childId) => {
            // 자식 노드가 실제로 데이터에 존재한다면 추가
            if (nodes[childId]) {
              set.add(childId);
              walk(childId); // 재귀 호출
            }
          });
        }
      };
      
      walk(ROOT);
      return set;
    } 
    
    // 2. 협력사: 본인 계정 기준 상위 부모 및 하위 자식 노드만 표시
    else {
      const set = new Set([activeSupplier]);
      
      // 상위 부모 추가
      Object.keys(nodes).forEach((id) => {
        if (nodes[id]?.children?.includes(activeSupplier)) {
          set.add(id);
        }
      });
      
      // 하위 자식 추가
      nodes[activeSupplier]?.children?.forEach((c) => {
        if (nodes[c]) set.add(c);
      });
      
      return set;
    }
  }, [states, nodes, role, activeSupplier]);

  const cols = useMemo(() => {
    const byTier = {};
    [...visible].forEach((id) => {
      const t = nodes[id]?.tier;
      if (t) (byTier[t] = byTier[t] || []).push(id);
    });
    return byTier;
  }, [visible, nodes]);

  const tierOrder = [1, 2, 3, 4, 5, 6, 7];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 16, fontSize: 11, color: C.sub }}>
          <Legend color={C.accent} label="최종 마감/승인" />
          <Legend color={C.amber} label="진행중 (임시저장/독촉대기)" dashed />
        </div>
      </div>

      <div style={{ overflowX: "auto", paddingBottom: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${tierOrder.length}, minmax(185px, 1fr))`, gap: 0, minHeight: 380, minWidth: 1200 }}>
          {tierOrder.map((t, ci) => (
            <div key={t} style={{ display: "flex", flexDirection: "column", gap: 14, padding: "0 10px", borderRight: ci < tierOrder.length - 1 ? `1px dashed ${C.lineSoft}` : "none" }}>
              <div style={{ fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: C.faint, textAlign: "center", paddingBottom: 6, borderBottom: `1px solid ${C.lineSoft}` }}>
                {tierLabel[t]}
              </div>
              {(cols[t] || []).map((id) => {
                const n = nodes[id];
                const s = states[id]?.status;
                const isSel = selected === id;
                const isMe = id === activeSupplier;

                return (
                  <div key={id} onClick={() => onSelect(id)} style={{ padding: 12, borderRadius: 5, cursor: "pointer", border: `1.5px ${s === "requested" ? "dashed" : "solid"} ${role === "supplier" && isMe ? C.blue : isSel ? C.blue + "A0" : (s === "submitted" ? C.accent : C.amber)}`, background: s === "submitted" ? C.accentDim : (role === "supplier" && isMe) ? `${C.blue}05` : C.panelSoft, transition: "all .2s" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700 }}>
                        {n.name} {role === "supplier" && isMe && <span style={{ fontSize: 10, color: C.blue, marginLeft: 2 }}>(자사)</span>}
                      </span>
                      {s === "submitted" ? <CircleCheck size={14} color={C.accent} /> : <Clock size={14} color={C.amber} />}
                    </div>
                    <div style={{ fontSize: 10.5, color: C.sub, marginTop: 3 }}>{n.role} · {n.country}</div>
                    <div style={{ fontSize: 9.5, fontFamily: "monospace", color: C.faint, marginTop: 4 }}>{id}</div>

                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 10 }}>
                      {role === "client" ? (
                        <>
                          <MiniBtn onClick={(e) => { e.stopPropagation(); onOpenInput(id, "review"); }} icon={ClipboardList} label="현황 모니터" primary />
                          {s === "requested" && <MiniBtn onClick={(e) => { e.stopPropagation(); alert(`재촉 알림 발송됨.`); }} icon={Mail} label="재촉 독촉" />}
                          {s === "submitted" && n.children?.length > 0 && (
                            <MiniBtn onClick={(e) => { e.stopPropagation(); onRequest(id); }} icon={Send} label={n.children.every((c) => states[c]) ? "하위 연동됨" : "하위 벤더 전파"} disabled={n.children.every((c) => states[c])} />
                          )}
                        </>
                      ) : (
                        <>
                          {isMe ? (
                            <>
                              <MiniBtn onClick={(e) => { e.stopPropagation(); onOpenInput(id, "edit"); }} icon={Edit3} label="정보 관리" primary />
                              {s === "submitted" && n.children?.length > 0 && (
                                <MiniBtn onClick={(e) => { e.stopPropagation(); onRequest(id); }} icon={Send} label={n.children.every((c) => states[c]) ? "요청 완료" : "하위사 발송"} disabled={n.children.every((c) => states[c])} />
                              )}
                            </>
                          ) : <span style={{ fontSize: 10, color: C.faint, fontStyle: "italic" }}>타사 접근 제한</span>}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   1. 원청사 전용 대시보드 컴포넌트 (ClientDashboard)
   ============================================================ */
function ClientDashboard({ nodes, states, supplierData, handleSaveData, handleSubmitData, handleAddNewSupplier, request }) {
  const [view, setView] = useState("map");
  const [editing, setEditing] = useState(null);
  const [initialInputMode, setInitialInputMode] = useState("review");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState(ROOT);

  const openInput = (id, mode = "review") => { setEditing(id); setInitialInputMode(mode); setView("input"); };

  return (
    <>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "flex-end" }}>
        <button onClick={() => setIsModalOpen(true)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 4, background: C.blue, color: "#FFFFFF", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          <Plus size={16} /> 신규 공급망 편입 및 요청
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Network size={20} color={C.accent} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>7계층 밸류체인 실시간 수집 대시보드</div>
            <div style={{ fontSize: 11, color: C.faint }}>Pack부터 광산(T7)까지의 N차 공급망 추적 맵</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Tab active={view === "map"} onClick={() => setView("map")} icon={Network} label="공급망 진척도 맵" />
        </div>
      </div>

      {view === "map" ? (
        <PropagationMap states={states} nodes={nodes} onRequest={request} onOpenInput={openInput} selected={selected} onSelect={setSelected} role="client" />
      ) : (
        <div>
          <button onClick={() => setView("map")} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16, padding: "6px 12px", borderRadius: 4, border: `1px solid ${C.line}`, background: C.bg, color: C.sub, fontSize: 12, cursor: "pointer" }}>
            <ChevronRight size={13} style={{ transform: "rotate(180deg)" }} /> 대시보드 복귀
          </button>
          <InputPage supplierId={editing ?? ROOT} nodes={nodes} supplierData={supplierData} onSave={handleSaveData} onSubmit={(id, v, f) => { handleSubmitData(id, v, f); setView("map"); setSelected(id); }} role="client" initialInputMode={initialInputMode} />
        </div>
      )}

      {/* 신규 협력사 추가 모달 컴포넌트는 이곳에서만 렌더링 */}
      {isModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div style={{ background: "#FFFFFF", borderRadius: 8, padding: 24, width: "100%", maxWidth: 480, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, borderBottom: "1px solid #E2E8F0", paddingBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.text }}>신규 협력사 추가 및 최초 요청</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
            </div>
            <form onSubmit={(e) => {
            e.preventDefault();
            // 1. e.target을 HTMLFormElement로 단언(as)해줍니다.
            const target = e.target as HTMLFormElement;
            const fd = new FormData(target);
            
            handleAddNewSupplier({ 
              nameKo: fd.get("nameKo") as string, 
              contactEmail: fd.get("contactEmail") as string, 
              contactPhone: fd.get("contactPhone") as string, 
              parentId: fd.get("parentId") as string, 
              role: (fd.get("role") as string) || "신규 밸류체인 벤더" 
            });
            
            setIsModalOpen(false);
            }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>협력사 한글 명칭 *</span>
                <input name="nameKo" required style={{ padding: "8px 12px", borderRadius: 4, border: "1px solid #CBD5E1" }} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>담당자 이메일 *</span>
                <input type="email" name="contactEmail" required style={{ padding: "8px 12px", borderRadius: 4, border: "1px solid #CBD5E1" }} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>담당자 연락처 *</span>
                <input name="contactPhone" required style={{ padding: "8px 12px", borderRadius: 4, border: "1px solid #CBD5E1" }} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>상위 부모 공급처 연결</span>
                <select name="parentId" defaultValue={ROOT} style={{ padding: "8px 12px", borderRadius: 4, border: "1px solid #CBD5E1" }}>
                  {Object.keys(nodes).map(id => <option key={id} value={id}>{nodes[id].name} ({id})</option>)}
                </select>
              </label>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: "8px 14px", borderRadius: 4, border: "1px solid #CBD5E1", background: "#FFF" }}>취소</button>
                <button type="submit" style={{ padding: "8px 14px", borderRadius: 4, border: "none", background: C.blue, color: "#FFF", fontWeight: 700 }}>생성 및 전송</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

/* ============================================================
   2. 개별 협력사 포탈 전용 대시보드 컴포넌트 (SupplierDashboard)
   ============================================================ */
function SupplierDashboard({ nodes, states, supplierData, handleSaveData, handleSubmitData, request, activeSupplier, setActiveSupplier }) {
  const [view, setView] = useState("map");
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(activeSupplier);

  const openInput = (id, mode = "edit") => { setEditing(id); setView("input"); };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#F8FAFC", padding: "6px 12px", borderRadius: 6, border: "1px solid #E2E8F0" }}>
          <span style={{ fontSize: 11, fontWeight: 600 }}>현재 접속 계정:</span>
          <select value={activeSupplier} onChange={(e) => { setActiveSupplier(e.target.value); setView("map"); setSelected(e.target.value); }} style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #CBD5E1", fontSize: 12 }}>
            {Object.keys(nodes).filter(id => id !== ROOT).map(id => <option key={id} value={id}>{nodes[id].name} ({id})</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Network size={20} color={C.accent} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>[{nodes[activeSupplier]?.name}] 제출 시스템</div>
            <div style={{ fontSize: 11, color: C.faint }}>자사 서류 제출 및 하위 공급망 요청 권한만 제공됩니다.</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Tab active={view === "map"} onClick={() => setView("map")} icon={Network} label="공급망 진척도 맵" />
          <Tab active={view === "input"} onClick={() => openInput(activeSupplier, "edit")} icon={ClipboardList} label="자사 서류 관리창" />
        </div>
      </div>

      {view === "map" ? (
        <PropagationMap states={states} nodes={nodes} onRequest={request} onOpenInput={openInput} selected={selected} onSelect={setSelected} role="supplier" activeSupplier={activeSupplier} />
      ) : (
        <div>
          <button onClick={() => setView("map")} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16, padding: "6px 12px", borderRadius: 4, border: `1px solid ${C.line}`, background: C.bg, color: C.sub, fontSize: 12, cursor: "pointer" }}>
            <ChevronRight size={13} style={{ transform: "rotate(180deg)" }} /> 대시보드 복귀
          </button>
          <InputPage supplierId={editing ?? activeSupplier} nodes={nodes} supplierData={supplierData} onSave={handleSaveData} onSubmit={(id, v, f) => { handleSubmitData(id, v, f); setView("map"); setSelected(id); }} role="supplier" initialInputMode="edit" />
        </div>
      )}
    </>
  );
}

/* ============================================================
   최상위 상태 컨테이너 (App 또는 Page 역할)
   ============================================================ */
export default function SupplierUpdateFlow() {
  const [nodes, setNodes] = useState(INITIAL_NODES);
  
  const [states, setStates] = useState({
    "T1-HY": { status: "submitted" }, "T2-HY": { status: "submitted" }, "T3-HY": { status: "submitted" },
    "T4-DS": { status: "submitted" }, "T5-CJ": { status: "submitted" }, "T6-PR": { status: "requested" },
    "T7-AL": { status: "requested" },
  });
  
  const [supplierData, setSupplierData] = useState({
    "T1-HY": { vals: { nameKo: "한양 제조(주)", nameEn: "Hanyang Mfg", ceoName: "Kim CEO" }, files: { biz_license: "한양_사업자.pdf" } },
    "T2-HY": { vals: { nameKo: "한양 제조(주)", nameEn: "Hanyang Mfg", contactEmail: "module@hanyang.com" }, files: {} },
    "T3-HY": { vals: { nameKo: "한양 제조(주)", nameEn: "Hanyang Mfg", contactEmail: "cell@hanyang.com" }, files: {} },
    "T4-DS": { vals: { nameKo: "동성머티리얼(주)", nameEn: "Dongsung Material", ceoName: "Park CEO" }, files: { cert_iso9001: "DS_ISO.pdf" } },
    "T5-CJ": { vals: { nameKo: "청정전구체(주)", nameEn: "Cheongjeong Precursor", ceoName: "Choi CEO" }, files: {} },
  });

  const handleAddNewSupplier = useCallback((data) => {
    const newId = `T${nodes[data.parentId] ? nodes[data.parentId].tier + 1 : 3}-NEW-${String(Object.keys(nodes).length + 1).padStart(3, "0")}`;
    setNodes(prev => {
      const next = { ...prev };
      next[newId] = { name: data.nameKo, tier: prev[data.parentId] ? prev[data.parentId].tier + 1 : 3, role: data.role || "신규 밸류체인 벤더", country: "KR", children: [] };
      if (next[data.parentId]) next[data.parentId] = { ...next[data.parentId], children: [...(next[data.parentId].children || []), newId] };
      return next;
    });
    setStates(prev => ({ ...prev, [newId]: { status: "requested" } }));
    setSupplierData(prev => ({ ...prev, [newId]: { vals: { nameKo: data.nameKo, contactEmail: data.contactEmail, contactPhone: data.contactPhone }, files: {} } }));
    alert(`[${data.nameKo}] 등록 및 요청 발송 완료`);
  }, [nodes]);

  const handleSaveData = useCallback((id, vals, files) => {
    setSupplierData(prev => ({ ...prev, [id]: { vals, files } }));
  }, []);

  const handleSubmitData = useCallback((id, vals, files) => {
    setSupplierData(prev => ({ ...prev, [id]: { vals, files } }));
    setStates((p) => ({ ...p, [id]: { status: "submitted" } }));
  }, []);

  const request = useCallback((parentId) => {
    setStates((p) => {
      const next = { ...p };
      nodes[parentId]?.children?.forEach((c) => { if (!next[c]) next[c] = { status: "requested" }; });
      return next;
    });
  }, [nodes]);

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", background: C.bg, color: C.text, borderRadius: 6, padding: 24, minHeight: 600 }}>
        <ClientDashboard 
          nodes={nodes} states={states} supplierData={supplierData} 
          handleSaveData={handleSaveData} handleSubmitData={handleSubmitData} 
          handleAddNewSupplier={handleAddNewSupplier} request={request} 
        />
    </div>
  );
}
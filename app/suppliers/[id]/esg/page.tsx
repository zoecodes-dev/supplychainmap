// [작업 8 — ESG 탭 실사 이행 워크플로우 추가 (CSDDD / LkSG / Art.47)]
// 변경 사항:
// 1. "CSDDD · LkSG 실사 이행 단계" 4단계 스텝 바 추가 (기존 "실사 이력" 섹션 위)
// 2. 각 auditRecord의 correctiveActions에 nextAuditDue 기준 D-day 표시
// 3. "고충처리 채널" 섹션 맨 하단 신규 추가 (🔄 시스템 검증 대기 고정값)

'use client';

import { useParams } from 'next/navigation';
import { getRiskProfile } from '@/lib/supplier-detail-data';
import {
  AlertTriangle, CheckCircle2, Clock, AlertCircle,
  Shield, HardHat, Heart, MessageSquare, RefreshCw,
} from 'lucide-react';
import clsx from 'clsx';

const issueTypeLabel: Record<string, string> = {
  forced_labor:           '강제노동',
  child_labor:            '아동노동',
  freedom_of_association: '결사의 자유',
  discrimination:         '차별',
  harassment:             '괴롭힘·성희롱',
  wages:                  '임금 체불',
  working_hours:          '초과 근무',
  other:                  '기타',
};

const severityMeta: Record<string, { label: string; color: string; bg: string }> = {
  critical: { label: '심각', color: 'text-red-600',   bg: 'border-red-700/40 bg-red-500/8' },
  major:    { label: '중요', color: 'text-red-500',   bg: 'border-red-700/30 bg-red-500/5' },
  minor:    { label: '경미', color: 'text-amber-600', bg: 'border-amber-700/30 bg-amber-500/5' },
};

const statusMeta: Record<string, { label: string; color: string }> = {
  open:           { label: '미해결',   color: 'text-red-500' },
  in_remediation: { label: '개선 중',  color: 'text-amber-500' },
  resolved:       { label: '해결',     color: 'text-emerald-500' },
  monitoring:     { label: '모니터링', color: 'text-blue-500' },
};

const accidentTypeMeta: Record<string, { label: string; color: string }> = {
  fatality:       { label: '사망사고', color: 'text-red-700' },
  serious_injury: { label: '중상사고', color: 'text-red-500' },
  minor_injury:   { label: '경상사고', color: 'text-amber-500' },
  near_miss:      { label: '아차사고', color: 'text-blue-500' },
  environmental:  { label: '환경사고', color: 'text-purple-500' },
};

const auditResultMeta: Record<string, { label: string; color: string; border: string }> = {
  pass:             { label: '통과',        color: 'text-emerald-600', border: 'border-emerald-700/30 bg-emerald-500/5' },
  conditional_pass: { label: '조건부 통과', color: 'text-amber-600',   border: 'border-amber-700/30 bg-amber-500/5' },
  fail:             { label: '불합격',      color: 'text-red-600',     border: 'border-red-700/30 bg-red-500/5' },
  pending:          { label: '대기',        color: 'text-ink-400',     border: 'border-ink-700 bg-ink-800' },
};

const auditTypeLabel: Record<string, string> = {
  on_site:         '현장 감사',
  remote:          '원격 감사',
  document_review: '서류 검토',
  third_party:     '제3자 감사',
};

// 현재 날짜 기준
const NOW = new Date('2026-05-19');

/** nextAuditDue까지 D-day 계산 */
function calcDday(nextAuditDue: string): number {
  const due = new Date(nextAuditDue);
  return Math.ceil((due.getTime() - NOW.getTime()) / 86400000);
}

/** 실사 이행 단계 판단 */
function getAuditStep(auditRecords: { result: string; correctiveActions: string[] }[]): 1 | 2 | 3 | 4 {
  if (auditRecords.length === 0) return 1;
  const latest = auditRecords[auditRecords.length - 1];
  if (latest.result === 'pending') return 2;
  if (latest.result === 'pass' || latest.result === 'conditional_pass') {
    if (latest.correctiveActions.length > 0) return 4;
    return 3;
  }
  return 2;
}

export default function SupplierEsgPage() {
  const { id } = useParams<{ id: string }>();
  const risk = getRiskProfile(id);

  if (!risk) {
    return <div className="p-8 text-xs text-ink-500">리스크 데이터가 없습니다</div>;
  }

  const openIssues     = risk.humanRightsIssues.filter(i => i.status !== 'resolved').length;
  const criticalIssues = risk.humanRightsIssues.filter(i => i.severity === 'critical').length;
  const fatalAccidents = risk.industrialAccidents.filter(a => a.accidentType === 'fatality').length;

  const currentStep = getAuditStep(risk.auditRecords);

  const steps: { label: string; desc: string }[] = [
    { label: '수립', desc: '실사 정책 수립' },
    { label: '이행', desc: '실사 진행 중' },
    { label: '평가', desc: '결과 검토' },
    { label: '개선', desc: '시정 조치 이행' },
  ];

  return (
    <div className="p-8 space-y-8 max-w-5xl">

      {/* ── 요약 KPI ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiTile
          icon={Shield}        label="실사 이력"       value={risk.auditRecords.length}        unit="건"
          tone={risk.auditRecords.length > 0 ? 'ok' : 'neutral'}
        />
        <KpiTile
          icon={Heart}         label="인권 이슈 (미해결)" value={openIssues}                   unit="건"
          tone={openIssues > 0 ? (criticalIssues > 0 ? 'critical' : 'warn') : 'ok'}
        />
        <KpiTile
          icon={HardHat}       label="산업재해"        value={risk.industrialAccidents.length} unit="건"
          tone={fatalAccidents > 0 ? 'critical' : risk.industrialAccidents.length > 0 ? 'warn' : 'ok'}
        />
        <KpiTile
          icon={AlertTriangle} label="종합 위험 점수"  value={risk.overallRiskScore}           unit="/100"
          tone={risk.overallRiskScore >= 70 ? 'critical' : risk.overallRiskScore >= 40 ? 'warn' : 'ok'}
        />
      </div>

      {/* ── 고위험 사유 ── */}
      {risk.highRiskReasons.length > 0 && (
        <Section title="고위험 플래그 사유" icon={AlertTriangle} iconColor="text-red-500">
          <div className="space-y-1.5">
            {risk.highRiskReasons.map((r, i) => (
              <div key={i} className="flex items-start gap-2 px-3 py-2.5 rounded-xs border border-red-700/30 bg-red-500/5 text-xs text-red-600">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {r}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── [신규] CSDDD · LkSG 실사 이행 단계 스텝 바 ── */}
      <Section title="CSDDD · LkSG 실사 이행 단계" icon={Shield} iconColor="text-teal-500">
        <div className="relative flex items-start gap-0">
          {steps.map((step, idx) => {
            const stepNo    = idx + 1;
            const isDone    = stepNo < currentStep;
            const isActive  = stepNo === currentStep;
            const isPending = stepNo > currentStep;

            return (
              <div key={step.label} className="flex-1 flex flex-col items-center relative">
                {/* 연결선 (첫 번째 제외) */}
                {idx > 0 && (
                  <div className={clsx(
                    'absolute top-[14px] right-1/2 w-full h-px -translate-y-1/2',
                    isDone ? 'bg-emerald-600' : isActive ? 'bg-accent-600' : 'bg-ink-700'
                  )} />
                )}

                {/* 스텝 원 */}
                <div className={clsx(
                  'relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-colors',
                  isDone    ? 'bg-emerald-600/20 border-emerald-600 text-emerald-500' :
                  isActive  ? 'bg-accent-700/20 border-accent-500 text-accent-400' :
                              'bg-ink-800 border-ink-700 text-ink-500'
                )}>
                  {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : stepNo}
                </div>

                {/* 스텝 레이블 */}
                <div className="mt-2 text-center">
                  <div className={clsx('text-[12px] font-medium',
                    isDone   ? 'text-emerald-500' :
                    isActive ? 'text-accent-400'  : 'text-ink-600'
                  )}>
                    {step.label}
                  </div>
                  <div className="text-[10px] text-ink-500 mt-0.5">{step.desc}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 현재 단계 설명 */}
        <div className={clsx(
          'mt-5 px-3 py-2.5 rounded-xs border text-[11px]',
          currentStep === 1 ? 'border-ink-700/60 bg-ink-800/40 text-ink-400' :
          currentStep === 2 ? 'border-blue-700/30 bg-blue-500/8 text-blue-400' :
          currentStep === 3 ? 'border-emerald-700/30 bg-emerald-500/8 text-emerald-500' :
                              'border-accent-700/30 bg-accent-500/8 text-accent-400'
        )}>
          {currentStep === 1 && '실사 정책 수립 단계 — 감사 이력이 없습니다. 첫 실사 일정을 등록하세요.'}
          {currentStep === 2 && '실사 이행 단계 — 감사가 진행 중입니다.'}
          {currentStep === 3 && '평가 완료 단계 — 최근 실사가 통과되었습니다.'}
          {currentStep === 4 && '개선 단계 — 시정 조치 이행 중입니다. D-day를 확인하세요.'}
        </div>
      </Section>

      {/* ── 실사 이력 (개선 조치 D-day 추가) ── */}
      <Section title="실사 이력" icon={Shield} iconColor="text-blue-500">
        {risk.auditRecords.length === 0 ? (
          <Empty label="실사 기록이 없습니다" />
        ) : (
          <div className="space-y-3">
            {risk.auditRecords.map(a => {
              const rm    = auditResultMeta[a.result];
              const dday  = calcDday(a.nextAuditDue);
              const isOverdue = dday <= 0;
              return (
                <div key={a.auditId} className={clsx('p-4 rounded-xs border', rm.border)}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="text-sm font-semibold text-ink-100">{a.auditDate}</div>
                      <div className="text-xs text-ink-400 mt-0.5">
                        {a.auditor} · {auditTypeLabel[a.auditType]}
                      </div>
                      <div className="text-xs text-ink-500 mt-0.5">{a.auditScope}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={clsx('text-xs font-semibold px-2 py-1 rounded-xs border', rm.border, rm.color)}>
                        {rm.label}
                      </span>
                      <div className="text-[10px] text-ink-500 num-mono mt-1">
                        다음 감사: {a.nextAuditDue}
                      </div>
                      {/* D-day 배지 */}
                      <div className={clsx(
                        'text-[10px] num-mono font-bold mt-1',
                        isOverdue ? 'text-red-500' : dday <= 30 ? 'text-amber-500' : 'text-ink-400'
                      )}>
                        {isOverdue ? '기한 초과' : `다음 감사 D-${dday}`}
                      </div>
                    </div>
                  </div>

                  {a.findings.length > 0 && (
                    <div className="mb-2">
                      <div className="text-[10px] uppercase tracking-wider text-ink-500 mb-1.5">주요 발견 사항</div>
                      <div className="space-y-1">
                        {a.findings.map((f, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-[11px] text-amber-600">
                            <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                            {f}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {a.correctiveActions.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-ink-500 mb-1.5">시정 조치</div>
                      <div className="space-y-1.5">
                        {a.correctiveActions.map((ca, i) => (
                          <div key={i} className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-1.5 text-[11px] text-ink-300">
                              <CheckCircle2 className="w-3 h-3 text-ink-500 shrink-0 mt-0.5" />
                              {ca}
                            </div>
                            {/* 시정 조치별 D-day (nextAuditDue 기준) */}
                            <span className={clsx(
                              'shrink-0 text-[10px] num-mono font-semibold px-1.5 py-0.5 rounded-xs border',
                              isOverdue
                                ? 'border-red-700/30 bg-red-500/8 text-red-500'
                                : dday <= 30
                                  ? 'border-amber-700/30 bg-amber-500/8 text-amber-500'
                                  : 'border-ink-700/60 bg-ink-800 text-ink-400'
                            )}>
                              {isOverdue ? '기한 초과' : `이행 기한 D-${dday}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* ── 인권 이슈 ── */}
      <Section title="인권·노동 이슈" icon={Heart} iconColor="text-red-500">
        {risk.humanRightsIssues.length === 0 ? (
          <Empty label="등록된 인권 이슈가 없습니다" ok />
        ) : (
          <div className="space-y-3">
            {risk.humanRightsIssues.map(issue => {
              const sv = severityMeta[issue.severity];
              const st = statusMeta[issue.status];
              return (
                <div key={issue.issueId} className={clsx('p-4 rounded-xs border', sv.bg)}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={clsx('text-[10px] font-bold uppercase tracking-wider', sv.color)}>
                        {sv.label}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-xs bg-ink-700 text-ink-300">
                        {issueTypeLabel[issue.issueType] ?? issue.issueType}
                      </span>
                    </div>
                    <span className={clsx('text-[10px] font-medium shrink-0', st.color)}>{st.label}</span>
                  </div>
                  <p className="text-xs text-ink-200 leading-relaxed mb-2">{issue.description}</p>
                  <div className="flex items-center gap-3 text-[10px] text-ink-500 num-mono">
                    <span>발견: {issue.detectedAt.slice(0, 10)}</span>
                    <span>출처: {issue.source}</span>
                    {issue.resolvedAt && <span>해결: {issue.resolvedAt.slice(0, 10)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* ── 산업재해 ── */}
      <Section title="산업재해 이력" icon={HardHat} iconColor="text-orange-500">
        {risk.industrialAccidents.length === 0 ? (
          <Empty label="등록된 산업재해가 없습니다" ok />
        ) : (
          <div className="space-y-3">
            {risk.industrialAccidents.map(acc => {
              const atm     = accidentTypeMeta[acc.accidentType];
              const isFatal = acc.accidentType === 'fatality';
              return (
                <div key={acc.accidentId} className={clsx(
                  'p-4 rounded-xs border',
                  isFatal                              ? 'border-red-700/40 bg-red-500/8' :
                  acc.accidentType === 'serious_injury' ? 'border-red-700/30 bg-red-500/5' :
                                                          'border-amber-700/30 bg-amber-500/5'
                )}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className={clsx('text-sm font-bold', atm.color)}>{atm.label}</div>
                      <div className="text-[11px] text-ink-400 num-mono">{acc.accidentDate}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] text-ink-400">사상자</div>
                      <div className={clsx('text-lg font-bold num-mono', isFatal ? 'text-red-600' : 'text-amber-600')}>
                        {acc.casualties}명
                      </div>
                      {acc.ltifr !== undefined && (
                        <div className="text-[10px] text-ink-500 num-mono">LTIFR {acc.ltifr}</div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-ink-200 leading-relaxed mb-2">{acc.description}</p>
                  {acc.correctiveAction && (
                    <div className="flex items-start gap-1.5 text-[11px] text-ink-400 pt-2 border-t border-ink-700/30">
                      <CheckCircle2 className="w-3 h-3 text-ink-500 shrink-0 mt-0.5" />
                      {acc.correctiveAction}
                    </div>
                  )}
                  <div className="text-[10px] text-ink-500 mt-1">
                    상태: {acc.status === 'reported' ? '보고됨' : acc.status === 'investigating' ? '조사 중' : '종결'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* ── [신규] 고충처리 채널 ── */}
      <Section title="고충처리 채널" icon={MessageSquare} iconColor="text-ink-400">
        <div className="rounded-xs border border-ink-700/60 bg-ink-900/20 p-4 space-y-3">
          {/* 채널 등록 여부 — 시스템 검증 대기 고정값 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[12px] text-ink-300">
              <span className="text-base leading-none">🔄</span>
              고충처리 채널 등록 여부
            </div>
            <span className="flex items-center gap-1 text-[10px] text-ink-500 border border-ink-700/60 bg-ink-800 px-2 py-0.5 rounded-xs">
              <RefreshCw className="w-2.5 h-2.5" />
              시스템 검증 대기
            </span>
          </div>

          {/* 안내 문구 */}
          <div className="pt-2 border-t border-ink-700/30 text-[11px] text-ink-500 leading-relaxed">
            CSDDD Art.9 요건 — 이해관계자가 접근 가능한 고충처리 절차 운영 필요
          </div>
        </div>
      </Section>

    </div>
  );
}

// ── 공통 서브 컴포넌트 ─────────────────────────────────────────────

function Section({ title, icon: Icon, iconColor, children }: {
  title: string; icon: any; iconColor: string; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Icon className={clsx('w-4 h-4', iconColor)} />
        <h2 className="text-sm font-semibold text-ink-100">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function KpiTile({ icon: Icon, label, value, unit, tone }: {
  icon: any; label: string; value: number; unit: string;
  tone: 'ok' | 'warn' | 'critical' | 'neutral';
}) {
  const colors = {
    ok:       { border: 'border-emerald-700/30', val: 'text-emerald-600' },
    warn:     { border: 'border-amber-700/30',   val: 'text-amber-600' },
    critical: { border: 'border-red-700/30',     val: 'text-red-600' },
    neutral:  { border: 'border-ink-700',        val: 'text-ink-300' },
  }[tone];
  return (
    <div className={clsx('rounded-xs border p-3 bg-ink-800/30', colors.border)}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-wider text-ink-400">{label}</span>
        <Icon className="w-3.5 h-3.5 text-ink-500" />
      </div>
      <div className="flex items-baseline gap-1">
        <span className={clsx('text-2xl font-semibold num-mono', colors.val)}>{value}</span>
        <span className="text-xs text-ink-500">{unit}</span>
      </div>
    </div>
  );
}

function Empty({ label, ok }: { label: string; ok?: boolean }) {
  return (
    <div className={clsx(
      'flex items-center justify-center gap-2 py-6 text-xs rounded-xs border border-dashed',
      ok ? 'border-emerald-700/30 text-emerald-600 bg-emerald-500/5' : 'border-ink-700/40 text-ink-500'
    )}>
      {ok && <CheckCircle2 className="w-4 h-4" />}
      {label}
    </div>
  );
}

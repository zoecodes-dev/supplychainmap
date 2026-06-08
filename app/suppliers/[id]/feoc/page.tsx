// [작업 7 — FEOC 탭 시각화 강화 (IRA/FEOC 이행률 보완)]
// 변경 사항:
// 1. OwnershipTile — 진행 바 + 25% 기준선 점선 추가
// 2. "지분 구조 검토 현황" 패널 신규 추가 (IRA FEOC 판단 기준 섹션 아래)
// 3. "FEOC 이행 체크리스트" 섹션 신규 추가 (지분 구조 패널 아래)

'use client';

import { useParams } from 'next/navigation';
import { suppliers } from '@/lib/data';
import { getSupplierName, getRiskProfile, getOriginCertificates } from '@/lib/supplier-detail-data';
import {
  CheckCircle2, XCircle, Clock, AlertCircle,
  FileCheck, Globe, RefreshCw,
} from 'lucide-react';
import clsx from 'clsx';

const feocStatusMeta: Record<string, {
  label: string; sublabel: string;
  bg: string; border: string; textColor: string; icon: any;
}> = {
  eligible: {
    label: 'FEOC 적격',
    sublabel: 'IRA 세액공제 대상 — 중국·러시아·북한·이란 우려 기업 해당 없음',
    bg: 'bg-emerald-500/8', border: 'border-emerald-700/30', textColor: 'text-emerald-600',
    icon: CheckCircle2,
  },
  ineligible: {
    label: 'FEOC 부적격',
    sublabel: 'IRA 세액공제 제외 — FEOC 지분 25% 이상 또는 직접 통제 관계 확인',
    bg: 'bg-red-500/8', border: 'border-red-700/40', textColor: 'text-red-600',
    icon: XCircle,
  },
  under_review: {
    label: 'FEOC 검토 중',
    sublabel: '지분 구조 검토 진행 중 — 판정 전까지 IRA 세액공제 보류 권고',
    bg: 'bg-amber-500/8', border: 'border-amber-700/30', textColor: 'text-amber-600',
    icon: Clock,
  },
  unknown: {
    label: 'FEOC 미파악',
    sublabel: '지분 구조 파악 필요 — 즉시 확인 요청 권고',
    bg: 'bg-ink-800', border: 'border-ink-700', textColor: 'text-ink-400',
    icon: AlertCircle,
  },
};

const certTypeMeta: Record<string, { label: string; color: string }> = {
  FTA:            { label: 'FTA 원산지',      color: 'text-blue-500' },
  GSP:            { label: 'GSP',             color: 'text-purple-500' },
  UFLPA_REBUTTAL: { label: 'UFLPA 반증',     color: 'text-amber-500' },
  IRA_ORIGIN:     { label: 'IRA 원산지',     color: 'text-emerald-500' },
  CONFLICT_FREE:  { label: '분쟁광물 무분쟁', color: 'text-teal-500' },
  GENERAL:        { label: '일반 원산지',     color: 'text-ink-400' },
};

export default function SupplierFeocPage() {
  const { id } = useParams<{ id: string }>();
  const supplier = suppliers.find(s => s.id === id);
  const name     = supplier ? getSupplierName(id) : null;
  const risk     = getRiskProfile(id);
  const certs    = getOriginCertificates(id);

  if (!risk) {
    return <div className="p-8 text-xs text-ink-500">리스크 데이터가 없습니다</div>;
  }

  const feocMeta   = feocStatusMeta[risk.feocStatus];
  const StatusIcon = feocMeta.icon;

  const now          = new Date('2026-05-19');
  const expiredCerts  = certs.filter(c => c.status === 'expired').length;
  const expiringSoon  = certs.filter(c => c.status === 'expiring_soon').length;
  const validCerts    = certs.filter(c => c.status === 'valid').length;

  // 협력사명 (지분 구조 패널용)
  const supplierDisplayName = name?.shortNameEn ?? supplier?.name ?? id;

  // FEOC 이행 체크리스트 판단
  const now2 = new Date('2026-05-19');
  const checks = {
    판정완료:     risk.feocStatus !== 'unknown',
    직접지분:     risk.feocDirectOwnership !== undefined && risk.feocDirectOwnership < 25,
    간접지분:     risk.feocIndirectOwnership !== undefined && risk.feocIndirectOwnership < 25,
    인증유효:     risk.feocCertExpiry ? new Date(risk.feocCertExpiry) > now2 : false,
    최근평가:     risk.feocLastAssessedAt
                    ? (now2.getTime() - new Date(risk.feocLastAssessedAt).getTime()) < 365 * 24 * 3600 * 1000
                    : false,
  };

  return (
    <div className="p-8 space-y-8 max-w-5xl">

      {/* ── FEOC 판정 카드 ── */}
      <div className={clsx('rounded-sm border p-6', feocMeta.border, feocMeta.bg)}>
        <div className="flex items-start gap-4">
          <StatusIcon className={clsx('w-8 h-8 shrink-0 mt-0.5', feocMeta.textColor)} />
          <div className="flex-1">
            <div className={clsx('text-lg font-bold mb-1', feocMeta.textColor)}>
              {feocMeta.label}
            </div>
            <p className="text-sm text-ink-300 mb-4">{feocMeta.sublabel}</p>

            {/* 지분율 타일 (진행 바 포함 — OwnershipTile 강화) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <OwnershipTile label="직접 지분율" value={risk.feocDirectOwnership} threshold={25} />
              <OwnershipTile label="간접 지분율" value={risk.feocIndirectOwnership} threshold={25} />
              <div className="rounded-xs border border-ink-700/60 bg-ink-900/30 p-2.5 text-center">
                <div className="text-[10px] text-ink-400 uppercase tracking-wider mb-1">최종 평가일</div>
                <div className="text-xs font-medium text-ink-200 num-mono">
                  {risk.feocLastAssessedAt?.slice(0, 10) ?? '—'}
                </div>
              </div>
              <div className="rounded-xs border border-ink-700/60 bg-ink-900/30 p-2.5 text-center">
                <div className="text-[10px] text-ink-400 uppercase tracking-wider mb-1">인증 만료</div>
                <div className={clsx('text-xs font-medium num-mono',
                  risk.feocCertExpiry ? 'text-ink-200' : 'text-red-500'
                )}>
                  {risk.feocCertExpiry?.slice(0, 10) ?? '미발급'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── FEOC 판단 기준 안내 ── */}
      <div className="rounded-xs border border-ink-700/60 bg-ink-900/20 p-4">
        <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold mb-3">IRA FEOC 판단 기준</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-ink-400">
          <div className="flex items-start gap-1.5">
            <div className="w-1 h-1 rounded-full bg-ink-500 mt-1.5 shrink-0" />
            중국·러시아·북한·이란 소재 기업 직접 해당 시 자동 부적격
          </div>
          <div className="flex items-start gap-1.5">
            <div className="w-1 h-1 rounded-full bg-ink-500 mt-1.5 shrink-0" />
            해당 국가 기업의 직접·간접 지분 합산 25% 이상 시 부적격
          </div>
          <div className="flex items-start gap-1.5">
            <div className="w-1 h-1 rounded-full bg-ink-500 mt-1.5 shrink-0" />
            이사회 구성원 과반수 또는 경영 실질적 통제권 보유 시 부적격
          </div>
          <div className="flex items-start gap-1.5">
            <div className="w-1 h-1 rounded-full bg-ink-500 mt-1.5 shrink-0" />
            2025년 배터리 기준 적용, 2027년부터 배터리 소재·부품 확대 예정
          </div>
        </div>
      </div>

      {/* ── [신규] 지분 구조 검토 현황 ── */}
      <div className="rounded-xs border border-ink-700/60 bg-ink-900/20 p-5 space-y-4">
        <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">
          지분 구조 검토 현황
        </div>

        {/* under_review 경고 배너 */}
        {risk.feocStatus === 'under_review' && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xs border border-amber-700/30 bg-amber-500/8 text-amber-500 text-[11px]">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            간접 지분 재귀 계산 대기 중 — 수동 검토 필요
          </div>
        )}

        {/* 직접 지분 경로 */}
        <div className="space-y-2">
          <div className="text-[11px] text-ink-500 font-medium mb-1">직접 지분 경로</div>
          <div className="flex items-center gap-2 text-[12px]">
            <span className="px-2 py-1 rounded-xs bg-ink-800 border border-ink-700 text-ink-300 text-[11px]">
              우려국
            </span>
            <span className="text-ink-600">→</span>
            <span className="px-2 py-1 rounded-xs bg-ink-800 border border-ink-700 text-ink-200 text-[11px] font-medium">
              {supplierDisplayName}
            </span>
            {risk.feocDirectOwnership !== undefined && (
              <span className={clsx(
                'text-[10px] px-2 py-0.5 rounded-xs border',
                risk.feocDirectOwnership >= 25
                  ? 'border-red-700/30 bg-red-500/8 text-red-500'
                  : 'border-emerald-700/30 bg-emerald-500/8 text-emerald-500'
              )}>
                {risk.feocDirectOwnership}%
              </span>
            )}
          </div>
        </div>

        {/* 간접 지분 경로 */}
        <div className="space-y-2">
          <div className="text-[11px] text-ink-500 font-medium mb-1">간접 지분 경로</div>
          <div className="flex items-center gap-2 flex-wrap text-[12px]">
            <span className="px-2 py-1 rounded-xs bg-ink-800 border border-ink-700 text-ink-300 text-[11px]">
              우려국
            </span>
            <span className="text-ink-600">→</span>
            <span className="px-2 py-1 rounded-xs bg-ink-800 border border-ink-700/60 text-ink-400 text-[11px] border-dashed">
              중간 법인
            </span>
            <span className="text-ink-600">→</span>
            <span className="px-2 py-1 rounded-xs bg-ink-800 border border-ink-700 text-ink-200 text-[11px] font-medium">
              {supplierDisplayName}
            </span>
            {risk.feocIndirectOwnership !== undefined && (
              <span className={clsx(
                'text-[10px] px-2 py-0.5 rounded-xs border',
                risk.feocIndirectOwnership >= 25
                  ? 'border-red-700/30 bg-red-500/8 text-red-500'
                  : 'border-emerald-700/30 bg-emerald-500/8 text-emerald-500'
              )}>
                {risk.feocIndirectOwnership}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── [신규] FEOC 이행 체크리스트 ── */}
      <div className="rounded-xs border border-ink-700/60 bg-ink-900/20 p-5">
        <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold mb-4">
          FEOC 이행 체크리스트
        </div>
        <div className="space-y-2">
          <CheckRow
            label="FEOC 판정 완료"
            status={checks.판정완료 ? 'pass' : 'fail'}
            detail={risk.feocStatus === 'unknown' ? '지분 구조 파악 미완료' : undefined}
          />
          <CheckRow
            label="직접 지분 25% 미만"
            status={
              risk.feocDirectOwnership === undefined ? 'fail' :
              checks.직접지분 ? 'pass' : 'fail'
            }
            detail={
              risk.feocDirectOwnership === undefined ? '직접 지분율 미파악' :
              !checks.직접지분 ? `현재 ${risk.feocDirectOwnership}% — IRA 기준 초과` : undefined
            }
          />
          <CheckRow
            label="간접 지분 25% 미만"
            status={
              risk.feocIndirectOwnership === undefined ? 'fail' :
              checks.간접지분 ? 'pass' : 'fail'
            }
            detail={
              risk.feocIndirectOwnership === undefined ? '간접 지분율 미파악' :
              !checks.간접지분 ? `현재 ${risk.feocIndirectOwnership}% — IRA 기준 초과` : undefined
            }
          />
          <CheckRow
            label="FEOC 인증 유효"
            status={risk.feocCertExpiry ? (checks.인증유효 ? 'pass' : 'fail') : 'fail'}
            detail={
              !risk.feocCertExpiry ? '인증서 미발급' :
              !checks.인증유효 ? `만료일: ${risk.feocCertExpiry.slice(0, 10)}` : undefined
            }
          />
          <CheckRow
            label="최근 평가일 12개월 이내"
            status={risk.feocLastAssessedAt ? (checks.최근평가 ? 'pass' : 'fail') : 'fail'}
            detail={
              !risk.feocLastAssessedAt ? '평가 이력 없음' :
              !checks.최근평가 ? `마지막 평가: ${risk.feocLastAssessedAt.slice(0, 10)}` : undefined
            }
          />
          <CheckRow
            label="간접 지분 재귀 계산 완료"
            status="pending"
            detail="시스템 집계 대기"
          />
        </div>
      </div>

      {/* ── 원산지 증명서 ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-semibold text-ink-100">원산지 증명서</h2>
            <span className="text-xs text-ink-500">{certs.length}건</span>
          </div>
          <div className="flex items-center gap-2">
            {validCerts > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-xs border border-emerald-700/30 bg-emerald-500/8 text-emerald-600">
                유효 {validCerts}
              </span>
            )}
            {expiringSoon > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-xs border border-amber-700/30 bg-amber-500/8 text-amber-600">
                만료임박 {expiringSoon}
              </span>
            )}
            {expiredCerts > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-xs border border-red-700/30 bg-red-500/8 text-red-600">
                만료 {expiredCerts}
              </span>
            )}
          </div>
        </div>

        {certs.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-ink-500 border border-ink-700/40 border-dashed rounded-xs">
            <FileCheck className="w-4 h-4" />
            등록된 원산지 증명서가 없습니다
          </div>
        ) : (
          <div className="space-y-2">
            {certs.map(cert => {
              const exp      = new Date(cert.expiresAt);
              const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / 86400000);
              const tm       = certTypeMeta[cert.certType];
              return (
                <div key={cert.certId} className={clsx(
                  'p-4 rounded-xs border',
                  cert.status === 'expired'       ? 'border-red-700/30 bg-red-500/5' :
                  cert.status === 'expiring_soon' ? 'border-amber-700/30 bg-amber-500/5' :
                  cert.status === 'under_review'  ? 'border-blue-700/30 bg-blue-500/5' :
                                                     'border-ink-700/60 bg-ink-900/20',
                )}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={clsx('text-[10px] font-bold', tm.color)}>{tm.label}</span>
                        <span className="text-xs font-semibold text-ink-100 num-mono truncate">
                          {cert.certNumber}
                        </span>
                      </div>
                      <div className="text-[11px] text-ink-400">{cert.issuingAuthority}</div>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-ink-500 num-mono">
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          원산지: {cert.originCountry}
                        </span>
                        <span>발급: {cert.issuedAt.slice(0, 10)}</span>
                        <span>만료: {cert.expiresAt.slice(0, 10)}</span>
                      </div>
                      {cert.coveredMinerals && cert.coveredMinerals.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="text-[10px] text-ink-500">적용 광물:</span>
                          {cert.coveredMinerals.map(m => (
                            <span key={m} className="text-[10px] px-1.5 py-0.5 rounded-xs bg-ink-700 text-ink-300">{m}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className={clsx('text-sm font-bold num-mono',
                        cert.status === 'expired'       ? 'text-red-500' :
                        cert.status === 'expiring_soon' ? 'text-amber-500' :
                        cert.status === 'under_review'  ? 'text-blue-500' : 'text-emerald-500'
                      )}>
                        {cert.status === 'expired'       ? '만료' :
                         cert.status === 'expiring_soon' ? `${daysLeft}일 남음` :
                         cert.status === 'under_review'  ? '검토 중' : '유효'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

// ── OwnershipTile (강화: 진행 바 + 25% 기준선 추가) ──────────────
function OwnershipTile({ label, value, threshold }: {
  label: string; value?: number; threshold: number;
}) {
  const isOver    = value !== undefined && value >= threshold;
  const barWidth  = value !== undefined ? Math.min(value, 100) : 0;
  // 기준선 위치: threshold% 지점 (최대 100% 범위 내)
  const markerPos = threshold; // %

  return (
    <div className={clsx(
      'rounded-xs border p-2.5',
      isOver ? 'border-red-700/30 bg-red-500/8' : 'border-ink-700/60 bg-ink-900/30'
    )}>
      <div className="text-[10px] text-ink-400 uppercase tracking-wider mb-1 text-center">{label}</div>
      <div className={clsx('text-xl font-bold num-mono text-center mb-2',
        value === undefined ? 'text-ink-500' :
        isOver ? 'text-red-500' : 'text-ink-100'
      )}>
        {value !== undefined ? `${value}%` : '—'}
      </div>

      {/* 진행 바 + 기준선 */}
      {value !== undefined && (
        <div className="relative h-1.5 rounded-full bg-ink-700/60 overflow-visible">
          {/* 채워진 바 */}
          <div
            className={clsx('absolute left-0 top-0 h-full rounded-full transition-all',
              isOver ? 'bg-red-500' : 'bg-emerald-500'
            )}
            style={{ width: `${barWidth}%` }}
          />
          {/* 25% 기준선 (점선 표시) */}
          <div
            className="absolute top-[-3px] bottom-[-3px] w-px border-l border-dashed border-ink-400/70"
            style={{ left: `${markerPos}%` }}
          />
        </div>
      )}

      {/* 기준선 레이블 */}
      {value !== undefined && (
        <div className="relative mt-1 h-3">
          <div
            className="absolute text-[8px] text-ink-500 -translate-x-1/2 whitespace-nowrap"
            style={{ left: `${markerPos}%` }}
          >
            IRA 기준 ({threshold}%)
          </div>
        </div>
      )}

      {isOver && (
        <div className="text-[9px] text-red-500 mt-1 text-center">기준 초과 ({threshold}%)</div>
      )}
    </div>
  );
}

// ── CheckRow (체크리스트 행 공통 컴포넌트) ───────────────────────
type CheckStatus = 'pass' | 'fail' | 'pending';

function CheckRow({ label, status, detail }: {
  label: string;
  status: CheckStatus;
  detail?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-ink-700/30 last:border-0">
      <div className="shrink-0 text-base leading-none">
        {status === 'pass'    ? '✅' :
         status === 'fail'    ? '❌' : '🔄'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] text-ink-200">{label}</div>
        {detail && (
          <div className={clsx('text-[10px] mt-0.5',
            status === 'fail'    ? 'text-red-400' :
            status === 'pending' ? 'text-ink-500' : 'text-ink-400'
          )}>
            {detail}
          </div>
        )}
      </div>
      {status === 'pending' && (
        <span className="shrink-0 flex items-center gap-1 text-[10px] text-ink-500 border border-ink-700/60 bg-ink-800 px-2 py-0.5 rounded-xs">
          <RefreshCw className="w-2.5 h-2.5" />
          시스템 집계 대기
        </span>
      )}
    </div>
  );
}

// [작업 5 — 원산지·추적 탭 구현 (UFLPA / EUDR / CRMA / Conflict Minerals)]
// 섹션 순서:
// 1. UFLPA 반증 서류 현황
// 2. EUDR 좌표 제출 현황
// 3. Conflict Minerals (분쟁광물) 현황
// 4. CRMA 국가별 공급 의존도

'use client';

import { useParams } from 'next/navigation';
import {
  getCompleteness, getOriginCertificates, getCertifications, getFactories,
} from '@/lib/supplier-detail-data';
import { AlertCircle, CheckCircle2, RefreshCw, MapPin, Globe } from 'lucide-react';
import clsx from 'clsx';

const NOW = new Date('2026-05-19');

// 인증서 상태 → 배지 스타일
const certStatusStyle: Record<string, { label: string; border: string; text: string; bg: string }> = {
  valid:         { label: '유효',     border: 'border-emerald-700/30', text: 'text-emerald-500', bg: 'bg-emerald-500/8' },
  expiring_soon: { label: '만료임박', border: 'border-amber-700/30',   text: 'text-amber-500',   bg: 'bg-amber-500/8' },
  expired:       { label: '만료',     border: 'border-red-700/30',     text: 'text-red-500',     bg: 'bg-red-500/8' },
  under_review:  { label: '검토 중',  border: 'border-blue-700/30',    text: 'text-blue-500',    bg: 'bg-blue-500/8' },
};

export default function SupplierOriginPage() {
  const { id } = useParams<{ id: string }>();

  const completeness  = getCompleteness(id);
  const certs         = getOriginCertificates(id);
  const certis        = getCertifications(id);
  const factories     = getFactories(id);
  const missing       = completeness?.missingFields ?? [];
  const hasMissing    = (keyword: string) => missing.some(m => m.includes(keyword));

  // ── 섹션 1: UFLPA ─────────────────────────────────────────────
  const uflpaCerts  = certs.filter(c => c.certType === 'UFLPA_REBUTTAL');
  const hasUflpa    = uflpaCerts.length > 0;
  const hasMineralTracking = !hasMissing('광물 추적 시스템');

  // ── 섹션 2: EUDR ──────────────────────────────────────────────
  const eudrFactories = factories.filter(f => f.applicableRegulations?.includes('EUDR'));
  const hasFsc        = certis.some(c => c.certName.includes('FSC') || c.certName.includes('EUDR'));
  const hasPolygon    = !hasMissing('광산 폴리곤 좌표');

  // ── 섹션 3: Conflict Minerals ─────────────────────────────────
  const conflictCerts = certs.filter(c => c.certType === 'CONFLICT_FREE');

  // ── 섹션 4: CRMA ──────────────────────────────────────────────
  // 국가별 supplyRatioPercent 합산
  const countryMap: Record<string, number> = {};
  factories.forEach(f => {
    if (f.supplyRatioPercent) {
      countryMap[f.country] = (countryMap[f.country] ?? 0) + f.supplyRatioPercent;
    }
  });
  const countryEntries = Object.entries(countryMap).sort((a, b) => b[1] - a[1]);
  const maxRatio = countryEntries[0]?.[1] ?? 0;

  return (
    <div className="p-8 space-y-8 max-w-5xl">

      {/* ══════════════════════════════════════════════════════════
          섹션 1 — UFLPA 반증 서류 현황
      ══════════════════════════════════════════════════════════ */}
      <Section title="UFLPA 반증 서류 현황" accent="text-amber-500" dot="bg-amber-500">

        {/* 반증 서류 없음 경고 */}
        {!hasUflpa && (
          <WarningBanner>
            UFLPA 반증 서류 미제출 — CBP 통관 시 강제노동 추정 적용
          </WarningBanner>
        )}

        {/* 반증 서류 목록 */}
        {uflpaCerts.map(cert => {
          const s = certStatusStyle[cert.status];
          const daysLeft = Math.ceil((new Date(cert.expiresAt).getTime() - NOW.getTime()) / 86400000);
          return (
            <div key={cert.certId} className={clsx('p-4 rounded-xs border', s.border, s.bg)}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={clsx('text-[10px] font-bold uppercase', s.text)}>{s.label}</span>
                    <span className="text-xs font-semibold text-ink-100 num-mono">{cert.certNumber}</span>
                  </div>
                  <div className="text-[11px] text-ink-400">{cert.issuingAuthority}</div>
                  <div className="flex items-center gap-3 text-[10px] text-ink-500 num-mono flex-wrap">
                    <span>발급: {cert.issuedAt.slice(0, 10)}</span>
                    <span>만료: {cert.expiresAt.slice(0, 10)}</span>
                    <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{cert.originCountry}</span>
                  </div>
                  {cert.coveredMinerals && cert.coveredMinerals.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      <span className="text-[10px] text-ink-500">적용 광물:</span>
                      {cert.coveredMinerals.map(m => (
                        <span key={m} className="text-[10px] px-1.5 py-0.5 rounded-xs bg-ink-700 text-ink-300">{m}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className={clsx('text-sm font-bold num-mono shrink-0', s.text)}>
                  {cert.status === 'expired' ? '만료' :
                   cert.status === 'expiring_soon' ? `${daysLeft}일 남음` :
                   cert.status === 'under_review' ? '검토 중' : '유효'}
                </div>
              </div>
            </div>
          );
        })}

        {/* N차 추적성 상태 */}
        <div className="mt-4">
          <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold mb-2">N차 추적성 상태</div>
          {hasMineralTracking ? (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xs border border-emerald-700/30 bg-emerald-500/8 text-emerald-500 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              광물 추적 시스템 등록됨
            </div>
          ) : (
            <WarningBanner>
              광물 추적 시스템 미구축 — N차 추적성 보장 불가
            </WarningBanner>
          )}
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════
          섹션 2 — EUDR 좌표 제출 현황
      ══════════════════════════════════════════════════════════ */}
      <Section title="EUDR 좌표 제출 현황" accent="text-emerald-500" dot="bg-emerald-500">

        {eudrFactories.length === 0 ? (
          <div className="py-6 text-center text-xs text-ink-500 border border-dashed border-ink-700/40 rounded-xs">
            EUDR 적용 공장 없음
          </div>
        ) : (
          <div className="space-y-3">
            {eudrFactories.map(f => {
              const hasCoords  = !!f.coordinates;
              const hasPolygonF = !hasMissing('광산 폴리곤 좌표');
              return (
                <div key={f.factoryId} className="p-4 rounded-xs border border-ink-700/60 bg-ink-900/20 space-y-3">
                  {/* 공장 헤더 */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[12px] font-semibold text-ink-100">{f.factoryName}</div>
                      <div className="flex items-center gap-1.5 text-[10px] text-ink-500 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {f.country} · {f.region}
                      </div>
                    </div>
                    <span className="text-[10px] text-ink-500 num-mono shrink-0">{f.factoryId}</span>
                  </div>

                  {/* 좌표 + 폴리곤 + 위성 */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* GPS 좌표 */}
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xs border border-amber-700/30 bg-amber-500/8">
                      <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                      <div>
                        <div className="text-[10px] text-amber-500 font-medium">Point 좌표 제출됨</div>
                        {hasCoords && (
                          <div className="text-[9px] text-ink-500 num-mono">
                            {f.coordinates[1].toFixed(4)}, {f.coordinates[0].toFixed(4)}
                          </div>
                        )}
                        <div className="text-[9px] text-amber-600/70 mt-0.5">폴리곤 아님 — EUDR 요건 미충족</div>
                      </div>
                    </div>

                    {/* 폴리곤 좌표 */}
                    {hasPolygonF ? (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xs border border-emerald-700/30 bg-emerald-500/8">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                        <div className="text-[10px] text-emerald-500 font-medium">폴리곤 좌표 제출됨</div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xs border border-red-700/30 bg-red-500/8">
                        <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                        <div className="text-[10px] text-red-500 font-medium">폴리곤 좌표 미제출 ⚠</div>
                      </div>
                    )}

                    {/* 위성 검증 — 고정값 */}
                    <PendingBadgeBlock label="위성 이미지 검증" detail="AI 검증 대기 중" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* FSC 인증 */}
        <div className="mt-4">
          <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold mb-2">FSC 인증 여부</div>
          {hasFsc ? (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xs border border-emerald-700/30 bg-emerald-500/8 text-emerald-500 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              FSC 인증 보유
              {certis.filter(c => c.certName.includes('FSC')).map(c => (
                <span key={c.certId} className="text-[10px] text-emerald-600/80 num-mono">— {c.certNumber}</span>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xs border border-ink-700/60 bg-ink-900/20 text-ink-400 text-[11px]">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              FSC 인증 미보유
            </div>
          )}
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════
          섹션 3 — Conflict Minerals (분쟁광물) 현황
      ══════════════════════════════════════════════════════════ */}
      <Section title="Conflict Minerals (분쟁광물) 현황" accent="text-red-400" dot="bg-red-500">

        {/* CMRT 제출 상태 */}
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold mb-2">CMRT 제출 상태</div>
          {conflictCerts.length === 0 ? (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xs border border-red-700/30 bg-red-500/8 text-red-500 text-[11px]">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              CMRT 미제출
            </div>
          ) : (
            <div className="space-y-2">
              {conflictCerts.map(cert => {
                const s = certStatusStyle[cert.status];
                const daysLeft = Math.ceil((new Date(cert.expiresAt).getTime() - NOW.getTime()) / 86400000);
                return (
                  <div key={cert.certId} className={clsx('p-4 rounded-xs border', s.border, s.bg)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={clsx('text-[10px] font-bold', s.text)}>{s.label}</span>
                          <span className="text-xs font-semibold text-ink-100 num-mono">{cert.certNumber}</span>
                        </div>
                        <div className="text-[11px] text-ink-400">{cert.issuingAuthority}</div>
                        <div className="flex items-center gap-3 text-[10px] text-ink-500 num-mono flex-wrap">
                          <span>발급: {cert.issuedAt.slice(0, 10)}</span>
                          <span>만료: {cert.expiresAt.slice(0, 10)}</span>
                        </div>
                        {cert.coveredMinerals && cert.coveredMinerals.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            <span className="text-[10px] text-ink-500">적용 광물:</span>
                            {cert.coveredMinerals.map(m => (
                              <span key={m} className="text-[10px] px-1.5 py-0.5 rounded-xs bg-ink-700 text-ink-300">{m}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className={clsx('text-sm font-bold num-mono shrink-0', s.text)}>
                        {cert.status === 'expired' ? '만료' :
                         cert.status === 'expiring_soon' ? `${daysLeft}일 남음` :
                         cert.status === 'under_review' ? '검토 중' : '유효'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 제련소 RMI 인증 — 고정값 */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold mb-2">제련소 RMI 인증 상태</div>
          <PendingBadgeBlock label="RMI 데이터베이스 대조 대기" detail="백엔드 연동 예정" />
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════
          섹션 4 — CRMA 국가별 공급 의존도
      ══════════════════════════════════════════════════════════ */}
      <Section title="CRMA 국가별 공급 의존도" accent="text-violet-400" dot="bg-violet-500">

        {countryEntries.length === 0 ? (
          <div className="py-6 text-center text-xs text-ink-500 border border-dashed border-ink-700/40 rounded-xs">
            공장 데이터 없음
          </div>
        ) : (
          <div className="space-y-3">
            {/* 국가별 바 차트 */}
            {countryEntries.map(([country, ratio]) => {
              const isAbove65 = ratio >= 65;
              const isAbove50 = ratio >= 50;
              return (
                <div key={country}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] text-ink-200 font-medium">{country}</span>
                    <span className={clsx('text-[11px] font-bold num-mono',
                      isAbove65 ? 'text-red-500' : isAbove50 ? 'text-amber-500' : 'text-ink-300'
                    )}>
                      {ratio}%
                      {isAbove65 && <span className="ml-1 text-[9px]">⚠ CRMA 기준 초과</span>}
                      {!isAbove65 && isAbove50 && <span className="ml-1 text-[9px]">⚠ 주의</span>}
                    </span>
                  </div>
                  {/* 바 */}
                  <div className="relative h-2 rounded-full bg-ink-700/60">
                    <div
                      className={clsx('absolute left-0 top-0 h-full rounded-full transition-all',
                        isAbove65 ? 'bg-red-500' : isAbove50 ? 'bg-amber-500' : 'bg-violet-500'
                      )}
                      style={{ width: `${ratio}%` }}
                    />
                    {/* 65% 기준선 */}
                    <div
                      className="absolute top-[-4px] bottom-[-4px] w-px border-l border-dashed border-red-500/60"
                      style={{ left: '65%' }}
                    />
                    {/* 50% 기준선 */}
                    <div
                      className="absolute top-[-4px] bottom-[-4px] w-px border-l border-dashed border-amber-500/40"
                      style={{ left: '50%' }}
                    />
                  </div>
                </div>
              );
            })}

            {/* 기준선 범례 */}
            <div className="flex items-center gap-4 mt-2 text-[10px] text-ink-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-px border-t border-dashed border-amber-500/60" />
                50% 주의선
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-px border-t border-dashed border-red-500/60" />
                65% CRMA 기준선
              </span>
            </div>
          </div>
        )}

        {/* 전체 공급망 집계 대기 — 고정값 */}
        <div className="mt-4 space-y-2">
          <PendingBadgeBlock label="전체 공급망 집계 계산 대기" detail="시스템 집계 후 표시됩니다" />
          <div className="text-[10px] text-ink-500 px-1">
            전체 공급망 의존도는 시스템 집계 후 표시됩니다
          </div>
        </div>
      </Section>

    </div>
  );
}

// ── 공통 서브 컴포넌트 ─────────────────────────────────────────────

function Section({ title, accent, dot, children }: {
  title: string; accent: string; dot: string; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className={clsx('w-2 h-2 rounded-full shrink-0', dot)} />
        <h2 className={clsx('text-sm font-semibold', accent)}>{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function WarningBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xs border border-red-700/30 bg-red-500/8 text-red-500 text-[11px]">
      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
      {children}
    </div>
  );
}

function PendingBadgeBlock({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xs border border-ink-700/60 bg-ink-900/20 text-ink-500 text-[11px]">
      <RefreshCw className="w-3.5 h-3.5 shrink-0" />
      <div>
        <span>{label}</span>
        {detail && <span className="text-[10px] text-ink-600 ml-2">— {detail}</span>}
      </div>
    </div>
  );
}

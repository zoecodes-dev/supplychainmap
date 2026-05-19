'use client';

import { useState, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import Link from 'next/link';
import { suppliers, type Supplier, type Tier } from '@/lib/data';
import {
  getSupplierName, getContacts, getCompleteness, getRiskProfile,
  supplierExtended,
} from '@/lib/supplier-detail-data';
import {
  Search, ChevronRight, Mail, Phone,
  ShieldAlert, Users, Network, Send,
} from 'lucide-react';
import clsx from 'clsx';

// ============================================================
// 통합 공급망 페이지
// ─ 영역 A: 제품별 공급망 맵 (제품 → 협력사 추적)
// ─ 영역 B: 입력 요청 맵 (데이터 제출 현황)
// 두 영역이 같은 페이지 안에서 탭으로 전환됨
// ============================================================

type SectionKey = 'product-map' | 'request-map';

const sectionMeta: Record<SectionKey, {
  label: string;
  subtitle: string;
  icon: any;
}> = {
  'product-map': { label: '제품별 공급망 맵', subtitle: '제품 → 협력사 추적', icon: Network },
  'request-map': { label: '입력 요청 맵',     subtitle: '데이터 제출 현황',   icon: Send },
};

export default function SupplyChainPage() {
  const [section, setSection] = useState<SectionKey>('product-map');

  // KPI (양쪽 영역 공통 표시)
  const highRiskCount = suppliers.filter(s => {
    const r = getRiskProfile(s.id);
    return r?.riskLevel === 'high' || r?.riskLevel === 'critical';
  }).length;

  return (
    <>
      <PageHeader
        title="공급망"
        description="제품별 추적과 데이터 제출 현황을 한 화면에서 관리"
        actions={
          <div className="flex items-center gap-3 text-xs text-ink-400">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              시연 <span className="num-mono text-ink-200 font-medium">{suppliers.length}</span>개사
              <span className="text-ink-500">(전체 187개사)</span>
            </span>
            {highRiskCount > 0 && (
              <span className="flex items-center gap-1 text-red-500">
                <ShieldAlert className="w-3.5 h-3.5" />
                고위험 {highRiskCount}개사
              </span>
            )}
          </div>
        }
      />

      <div className="p-6 space-y-4">

        {/* 영역 전환 탭 */}
        <div className="flex items-center gap-1 border-b border-ink-700">
          {(Object.keys(sectionMeta) as SectionKey[]).map(key => {
            const meta = sectionMeta[key];
            const Icon = meta.icon;
            const active = section === key;
            return (
              <button
                key={key}
                onClick={() => setSection(key)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors',
                  active
                    ? 'border-accent-500 text-accent-600'
                    : 'border-transparent text-ink-400 hover:text-ink-200'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{meta.label}</span>
                <span className="text-[10px] text-ink-500 font-normal">— {meta.subtitle}</span>
              </button>
            );
          })}
        </div>

        {/* 영역 콘텐츠 */}
        {section === 'product-map' ? <ProductMapSection /> : <RequestMapSection />}

      </div>
    </>
  );
}

// ============================================================
// 영역 A: 제품별 공급망 맵
// 협력사 목록 + 검색/필터 + 클릭 시 협력사 상세로 이동
// ============================================================
function ProductMapSection() {
  return (
    <SupplierListPanel
      mode="product-map"
      placeholder="제품 · 부품 · 협력사명 검색"
      defaultColumns={['협력사', 'Tier · 역할', '국가', '상태', '위험도 · FEOC', '주 담당자']}
    />
  );
}

// ============================================================
// 영역 B: 입력 요청 맵
// 협력사 목록 + 완성도 강조 + 리마인드 발송 액션
// ============================================================
function RequestMapSection() {
  return (
    <SupplierListPanel
      mode="request-map"
      placeholder="협력사 · 담당자 · 누락 항목 검색"
      defaultColumns={['협력사', 'Tier · 역할', '상태', '완성도', '주 담당자', '액션']}
    />
  );
}

// ============================================================
// 공통 협력사 목록 패널 (모드에 따라 컬럼 구성 다름)
// ============================================================
type Mode = 'product-map' | 'request-map';

type StatusFilter = 'all' | 'verified' | 'pending' | 'review' | 'violation';
type RiskFilter   = 'all' | 'low' | 'medium' | 'high' | 'critical';
type TierFilter   = 'all' | Tier;

const statusMeta: Record<string, { label: string; dot: string; badge: string }> = {
  verified:  { label: '검증 완료', dot: 'bg-emerald-500', badge: 'border-emerald-700/30 bg-emerald-500/8 text-emerald-600' },
  pending:   { label: '검토 대기', dot: 'bg-blue-500',    badge: 'border-blue-700/30 bg-blue-500/8 text-blue-600' },
  review:    { label: '추가 확인', dot: 'bg-amber-500',   badge: 'border-amber-700/30 bg-amber-500/8 text-amber-600' },
  violation: { label: '규제 위반', dot: 'bg-red-500',     badge: 'border-red-700/30 bg-red-500/8 text-red-600' },
};

const riskMeta: Record<string, { label: string; color: string }> = {
  low:      { label: '저위험',   color: 'text-emerald-600' },
  medium:   { label: '중위험',   color: 'text-amber-600' },
  high:     { label: '고위험',   color: 'text-red-600' },
  critical: { label: '최고위험', color: 'text-red-700 font-bold' },
};

const countryName: Record<string, string> = {
  KR: '한국', CN: '중국', JP: '일본', AU: '호주', CL: '칠레',
  PH: '필리핀', CD: '콩고', ID: '인도네시아',
};

function SupplierListPanel({ mode, placeholder, defaultColumns }: {
  mode: Mode;
  placeholder: string;
  defaultColumns: string[];
}) {
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [riskFilter, setRiskFilter]     = useState<RiskFilter>('all');
  const [tierFilter, setTierFilter]     = useState<TierFilter>('all');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return suppliers.filter(s => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (riskFilter !== 'all'   && s.risk !== riskFilter)     return false;
      if (tierFilter !== 'all'   && !s.tiers.includes(tierFilter as Tier)) return false;
      // 입력 요청 맵 모드에서는 완성도 100% 미만만 (요청 대상)
      if (mode === 'request-map') {
        const c = getCompleteness(s.id);
        if (c && c.completionRate >= 100) return false;
      }
      if (q) {
        const name = getSupplierName(s.id);
        const hay = [
          s.id, s.name, s.role, s.country, s.region,
          name?.nameEn, name?.nameKo, name?.shortNameEn, name?.shortNameKo,
          ...s.material,
          ...getContacts(s.id).flatMap(c => [c.name, c.email, c.role]),
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [search, statusFilter, riskFilter, tierFilter, mode]);

  return (
    <div className="space-y-4">
      {/* 필터 바 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-8 pr-3 py-2 rounded-xs border border-ink-700 bg-ink-800/50 text-sm text-ink-200 placeholder:text-ink-500 outline-none focus:border-accent-600 transition-colors"
          />
        </div>

        <Select value={statusFilter} onChange={v => setStatusFilter(v as StatusFilter)} options={[
          { v: 'all',       label: '상태: 전체' },
          { v: 'verified',  label: '검증 완료' },
          { v: 'pending',   label: '검토 대기' },
          { v: 'review',    label: '추가 확인' },
          { v: 'violation', label: '규제 위반' },
        ]} />
        <Select value={String(tierFilter)} onChange={v => setTierFilter(v === 'all' ? 'all' : Number(v) as Tier)} options={[
          { v: 'all', label: 'Tier: 전체' },
          { v: '1',   label: 'T1 Pack/Module' },
          { v: '3',   label: 'T3 활물질' },
          { v: '4',   label: 'T4 전구체·정제' },
          { v: '5',   label: 'T5 원광' },
        ]} />
        <Select value={riskFilter} onChange={v => setRiskFilter(v as RiskFilter)} options={[
          { v: 'all',      label: '위험도: 전체' },
          { v: 'low',      label: '저위험' },
          { v: 'medium',   label: '중위험' },
          { v: 'high',     label: '고위험' },
          { v: 'critical', label: '최고위험' },
        ]} />

        <div className="text-[11px] text-ink-500 num-mono ml-auto">
          {filtered.length} / {suppliers.length}개사 표시
        </div>
      </div>

      {/* 테이블 */}
      <div className="rounded-sm border border-ink-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink-700 bg-ink-800/30">
                {defaultColumns.map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wider text-ink-500 font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={defaultColumns.length} className="px-5 py-12 text-center text-xs text-ink-500">
                    검색 결과가 없습니다
                  </td>
                </tr>
              ) : (
                filtered.map(s => (
                  <SupplierRow key={s.id} supplier={s} mode={mode} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── 협력사 행 (모드별로 다른 컬럼) ──────────────────────────
function SupplierRow({ supplier, mode }: { supplier: Supplier; mode: Mode }) {
  const name         = getSupplierName(supplier.id);
  const contacts     = getContacts(supplier.id);
  const completeness = getCompleteness(supplier.id);
  const risk         = getRiskProfile(supplier.id);
  const primary      = contacts.find(c => c.isPrimary) ?? contacts[0];
  const sm           = statusMeta[supplier.status];
  const rm           = riskMeta[supplier.risk];

  return (
    <tr className="border-b border-ink-700/40 hover:bg-ink-800/30 group transition-colors">
      {/* 협력사 */}
      <td className="px-4 py-3.5">
        <div className="flex items-start gap-2">
          <span className={clsx('w-1.5 h-1.5 rounded-full mt-1.5 shrink-0', sm.dot)} />
          <div className="min-w-0">
            <div className="text-xs font-semibold text-ink-100 truncate">
              {name?.nameEn ?? supplier.name}
            </div>
            {name?.nameKo && (
              <div className="text-[10px] text-ink-500 truncate">{name.nameKo}</div>
            )}
            <div className="text-[10px] num-mono text-ink-400">{supplier.id}</div>
          </div>
        </div>
      </td>

      {/* Tier · 역할 */}
      <td className="px-4 py-3.5">
        <div className="text-[11px] text-ink-300">{supplier.role}</div>
        <div className="text-[10px] text-ink-500 mt-0.5">
          T{supplier.tiers.join(', T')}
        </div>
      </td>

      {/* 국가 (product-map 모드만) */}
      {mode === 'product-map' && (
        <td className="px-4 py-3.5">
          <div className="text-xs text-ink-200">{countryName[supplier.country] ?? supplier.country}</div>
          <div className="text-[10px] text-ink-500">{supplier.region}</div>
        </td>
      )}

      {/* 상태 */}
      <td className="px-4 py-3.5">
        <span className={clsx('text-[10px] px-2 py-0.5 rounded-xs border font-medium', sm.badge)}>
          {sm.label}
        </span>
      </td>

      {/* 위험도 · FEOC (product-map 모드만) */}
      {mode === 'product-map' && (
        <td className="px-4 py-3.5">
          <div className={clsx('text-[11px]', rm.color)}>{rm.label}</div>
          {risk && (
            <div className="text-[10px] mt-0.5 text-ink-400">FEOC {risk.feocStatus}</div>
          )}
        </td>
      )}

      {/* 완성도 (request-map 모드에서 더 크게 표시) */}
      {mode === 'request-map' && (
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 rounded-full bg-ink-800 overflow-hidden">
              <div
                className="h-full transition-all"
                style={{
                  width: `${completeness?.completionRate ?? 0}%`,
                  backgroundColor: (completeness?.completionRate ?? 0) >= 90 ? '#10B981' :
                                    (completeness?.completionRate ?? 0) >= 70 ? '#F59E0B' : '#EF4444',
                }}
              />
            </div>
            <span className="text-[11px] num-mono text-ink-300">{completeness?.completionRate ?? 0}%</span>
          </div>
          {completeness && completeness.missingFields.length > 0 && (
            <div className="text-[10px] text-ink-500 mt-0.5">
              누락 {completeness.missingFields.length}건
            </div>
          )}
        </td>
      )}

      {/* 주 담당자 */}
      <td className="px-4 py-3.5">
        {primary ? (
          <div>
            <div className="text-xs text-ink-200 font-medium truncate">{primary.name}</div>
            <div className="text-[10px] text-ink-400">{primary.role}</div>
            <a
              href={`mailto:${primary.email}`}
              className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-400 mt-0.5 truncate"
            >
              <Mail className="w-2.5 h-2.5 shrink-0" />
              {primary.email}
            </a>
            <div className="flex items-center gap-1 text-[10px] text-ink-400 num-mono">
              <Phone className="w-2.5 h-2.5 shrink-0" />
              {primary.phone}
            </div>
          </div>
        ) : (
          <span className="text-[10px] text-ink-500">—</span>
        )}
      </td>

      {/* 액션 (request-map 모드만) 또는 상세 링크 (product-map 모드) */}
      <td className="px-4 py-3.5">
        {mode === 'request-map' ? (
          <button
            onClick={() => alert(`${name?.nameEn ?? supplier.name}에 리마인드 발송`)}
            className="text-[10px] px-2 py-1 rounded-xs border border-accent-700/40 text-accent-600 hover:bg-accent-500/10 transition-colors"
          >
            <Send className="w-2.5 h-2.5 inline mr-1" />
            요청
          </button>
        ) : (
          <Link
            href={`/suppliers/${supplier.id}`}
            className="flex items-center gap-1 text-[11px] text-accent-500 hover:text-accent-400 transition-colors opacity-0 group-hover:opacity-100"
          >
            상세
            <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </td>
    </tr>
  );
}

function Select({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { v: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="text-[11px] num-mono px-2.5 py-2 rounded-xs border border-ink-700 bg-ink-800/50 text-ink-300 outline-none focus:border-accent-600"
    >
      {options.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
    </select>
  );
}

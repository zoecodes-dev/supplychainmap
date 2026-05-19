'use client';

import { useState, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import SupplyChainMap from '@/components/SupplyChainMap';
import SupplierDetailModal from '@/components/SupplierDetailModal';
import SearchResultsPanel, { type SearchResult } from '@/components/SearchResultsPanel';
import ProductInstanceDrilldown from '@/components/ProductInstanceDrilldown';
import { suppliers, supplyEdges, Supplier, Tier, productInstances, ProductInstance } from '@/lib/data';
import {
  getSupplierExtended, getIncomingPOs, getOutgoingPOs, getCompleteness,
  supplierCompleteness, remindLogs, getSupplierName, getContacts, factories,
} from '@/lib/supplier-detail-data';
import {
  Search, Filter, ChevronDown, X, Box,
  CheckCircle2, AlertCircle, AlertTriangle, Clock,
  Network, Send, Mail, Bell, Package, Factory,
} from 'lucide-react';
import clsx from 'clsx';

type StatusFilter = 'all' | 'verified' | 'pending' | 'review' | 'violation';
type TierFilter = 'all' | Tier;
type ModalTab = 'completeness' | 'parts' | 'cert' | 'factory' | 'company';

export default function SupplyChainPage() {
  const [openSupplier, setOpenSupplier] = useState<Supplier | null>(null);
  const [openInstance, setOpenInstance] = useState<ProductInstance | null>(null);
  const [initialTab, setInitialTab] = useState<ModalTab | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');

  // 권한 시뮬은 협력사 포털로 이동 — 여기는 항상 원청 ESG 시점
  // (전체 협력사 모두 조회 가능)
  const visibleIds = useMemo(
    () => new Set<string>(suppliers.map(s => s.id)),
    []
  );

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (tierFilter !== 'all' && !s.tiers.includes(tierFilter as Tier)) return false;
      if (countryFilter !== 'all' && s.country !== countryFilter) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const haystack = [
          s.name, s.id, s.role, s.region, s.country,
          ...s.material,
          ...(s.certifications || []),
        ].join(' ').toLowerCase();
        const ext = getSupplierExtended(s.id);
        const allPos = [...getIncomingPOs(s.id), ...getOutgoingPOs(s.id)];
        const poHay = allPos.map(po => `${po.originalPoNumber} ${po.supplierInvoiceNumber} ${po.supplierPartCode} ${po.originalPartCode}`).join(' ').toLowerCase();
        if (!haystack.includes(q) && !poHay.includes(q) && !(ext?.ceoName.toLowerCase().includes(q))) {
          return false;
        }
      }
      return true;
    });
  }, [searchQuery, statusFilter, tierFilter, countryFilter]);

  // 맵 하이라이트 ID (검색/필터 매치)
  const highlightIds = useMemo(() => {
    if (!searchQuery && statusFilter === 'all' && tierFilter === 'all' && countryFilter === 'all') {
      return undefined;
    }
    return new Set(filteredSuppliers.map(s => s.id));
  }, [searchQuery, statusFilter, tierFilter, countryFilter, filteredSuppliers]);

  const verifiedCount  = suppliers.filter(s => s.status === 'verified').length;
  const violationCount = suppliers.filter(s => s.status === 'violation').length;
  const reviewCount    = suppliers.filter(s => s.status === 'review').length;
  const pendingCount   = suppliers.filter(s => s.status === 'pending').length;

  const countries = Array.from(new Set(suppliers.map(s => s.country))).sort();
  const filtersActive =
    statusFilter !== 'all' || tierFilter !== 'all' || countryFilter !== 'all' || searchQuery !== '';

  const handleSearchResultSelect = (result: SearchResult) => {
    // 제품 인스턴스 검색 결과 → 드릴다운 모달 열기
    if (result.kind === 'product_instance' && result.serialNumber) {
      const instance = productInstances.find(p => p.serialNumber === result.serialNumber);
      if (instance) {
        setOpenInstance(instance);
      }
      return;
    }
    // 협력사 관련 검색 결과 → 협력사 모달 열기
    const supplier = suppliers.find(s => s.id === result.supplierId);
    if (!supplier) return;
    const targetTab = result.targetTab === 'relation' as any ? 'company' : result.targetTab;
    setInitialTab(targetTab as ModalTab);
    setOpenSupplier(supplier);
  };

  const handleSupplierOpen = (s: Supplier, tab: ModalTab = 'completeness') => {
    setInitialTab(tab);
    setOpenSupplier(s);
  };

  // 드릴다운 모달의 협력사 점프 핸들러: 드릴다운 닫고 협력사 모달 열기
  const handleOpenSupplierFromDrilldown = (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) return;
    setOpenInstance(null);
    setInitialTab('parts');  // 공급 부품 탭에서 시작
    setOpenSupplier(supplier);
  };

  return (
    <>
      <PageHeader
        title="공급망 맵"
        description="N차 협력사 추적 · 원청 ESG 시점 · 시연 데이터 10개사 (전체 운영: 187개사)"
        badge="시연용 샘플"
      />

      <div className="p-8 space-y-5">
        {/* === 상단 통계 === */}
        <div className="grid grid-cols-4 gap-4">
          <StatTile label="검증 완료" count={verifiedCount} total={suppliers.length} tone="ok" />
          <StatTile label="검토 대기" count={pendingCount}  total={suppliers.length} tone="info" />
          <StatTile label="추가 확인 필요" count={reviewCount} total={suppliers.length} tone="warn" />
          <StatTile label="규제 위반" count={violationCount} total={suppliers.length} tone="alert" />
        </div>

        {/* === 최근 생산 제품 (드릴다운 진입점) === */}
        <Card
          title="최근 생산 제품"
          subtitle="시리얼을 클릭하면 BOM 트리·협력사 매칭이 펼쳐집니다"
          action={
            <span className="text-[11px] text-ink-400 num-mono">
              총 {productInstances.length}건
            </span>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            {productInstances.slice(0, 8).map(inst => (
              <ProductInstanceCard
                key={inst.serialNumber}
                instance={inst}
                onClick={() => setOpenInstance(inst)}
              />
            ))}
          </div>
        </Card>

        {/* === 검색 & 필터 + 인라인 결과 패널 === */}
        <Card>
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="시리얼번호·협력사명·PO번호·부품코드·HS코드·담당자·국가 검색..."
                className="w-full pl-9 pr-9 py-2 rounded-xs bg-ink-900 border border-ink-700 text-sm text-ink-100 placeholder:text-ink-500 focus:border-accent-500 outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <FilterChip label="상태" value={statusFilter} onChange={(v) => setStatusFilter(v as StatusFilter)}
                options={[
                  { v: 'all',       label: '전체' },
                  { v: 'verified',  label: '검증 완료' },
                  { v: 'pending',   label: '검토 대기' },
                  { v: 'review',    label: '추가 확인' },
                  { v: 'violation', label: '규제 위반' },
                ]} />
              <FilterChip label="Tier" value={String(tierFilter)} onChange={(v) => setTierFilter(v === 'all' ? 'all' : Number(v) as Tier)}
                options={[
                  { v: 'all', label: '전체' },
                  { v: '1',   label: 'T1 Pack/Module' },
                  { v: '2',   label: 'T2 Cell' },
                  { v: '3',   label: 'T3 활물질' },
                  { v: '4',   label: 'T4 전구체·정제' },
                  { v: '5',   label: 'T5 원광' },
                ]} />
              <FilterChip label="국가" value={countryFilter} onChange={(v) => setCountryFilter(v)}
                options={[{ v: 'all', label: '전체' }, ...countries.map(c => ({ v: c, label: c }))]} />

              {filtersActive && (
                <button
                  onClick={() => {
                    setSearchQuery(''); setStatusFilter('all'); setTierFilter('all'); setCountryFilter('all');
                  }}
                  className="text-[11px] text-accent-400 hover:text-accent-300 flex items-center gap-1 px-2 py-1"
                >
                  <X className="w-3 h-3" /> 필터 초기화
                </button>
              )}
            </div>
          </div>

          {searchQuery.trim() && (
            <SearchResultsPanel
              query={searchQuery}
              onSelect={handleSearchResultSelect}
              visibleSupplierIds={visibleIds}
            />
          )}

          {!searchQuery.trim() && (statusFilter !== 'all' || tierFilter !== 'all' || countryFilter !== 'all') && (
            <div className="mt-3 pt-3 border-t border-ink-700/60 text-[11px] text-ink-400">
              필터 적용 결과: <span className="num-mono text-ink-200 font-medium">{filteredSuppliers.length}</span>개 협력사
            </div>
          )}
        </Card>

        {/* === 풀폭 공급망 맵 === */}
        <Card
          title="공급망 추적도"
          subtitle="좌측(T5 원광) → 우측(T1 Pack/Module) 흐름"
          action={
            <div className="text-[11px] text-ink-400 num-mono">
              노드 {suppliers.length}개 · 연결 {supplyEdges.length}개
            </div>
          }
        >
          <SupplyChainMap
            onSelectNode={(s) => s && handleSupplierOpen(s)}
            selectedId={openSupplier?.id}
            highlightIds={highlightIds}
          />
        </Card>

        {/* === 협력사 테이블 === */}
        <Card
          title="협력사 목록"
          subtitle={filtersActive ? `필터 적용 — ${filteredSuppliers.length}개` : '시연용 10개사 전체'}
        >
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-ink-400 border-b border-ink-700">
                  <th className="text-left font-medium px-5 py-3">협력사</th>
                  <th className="text-left font-medium px-3 py-3">Tier</th>
                  <th className="text-left font-medium px-3 py-3">역할</th>
                  <th className="text-left font-medium px-3 py-3">소재지</th>
                  <th className="text-right font-medium px-3 py-3">탄소집약도</th>
                  <th className="text-right font-medium px-3 py-3">완성도</th>
                  <th className="text-left font-medium px-3 py-3">상태</th>
                  <th className="text-right font-medium px-5 py-3">최근 검증</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers
                  .sort((a, b) => a.tier - b.tier)
                  .map(s => {
                    const comp = getCompleteness(s.id);
                    return (
                      <tr
                        key={s.id}
                        className="border-b border-ink-700/40 hover:bg-ink-800/40 cursor-pointer"
                        onClick={() => handleSupplierOpen(s)}
                      >
                        <td className="px-5 py-3">
                          <div className="font-medium text-ink-100">{s.name}</div>
                          <div className="text-[10px] text-ink-500 num-mono">{s.id}</div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-0.5 flex-wrap">
                            {s.tiers.map(t => (
                              <span key={t} className="text-[10px] num-mono px-1 py-0.5 rounded-xs bg-ink-700 text-ink-200">
                                T{t}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-xs text-ink-200">{s.role}</td>
                        <td className="px-3 py-3 text-xs text-ink-300">{s.country} · {s.region}</td>
                        <td className="px-3 py-3 text-right text-xs num-mono text-ink-200">
                          {s.carbonIntensity}
                          <span className="text-ink-500 ml-0.5">kg</span>
                        </td>
                        <td className="px-3 py-3 text-right text-xs num-mono">
                          {comp ? (
                            <span className={clsx(
                              comp.completionRate >= 90 ? 'text-emerald-700' :
                              comp.completionRate >= 70 ? 'text-amber-700' : 'text-red-700'
                            )}>
                              {comp.completionRate}%
                            </span>
                          ) : (
                            <span className="text-ink-500">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge status={s.status} />
                        </td>
                        <td className="px-5 py-3 text-right text-xs text-ink-300 num-mono">
                          {s.lastVerified}
                        </td>
                      </tr>
                    );
                  })}
                {filteredSuppliers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-xs text-ink-500">
                      <Search className="w-6 h-6 mx-auto mb-2 text-ink-600" />
                      검색 조건에 맞는 협력사가 없습니다
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* === 하단: 두 영역 탭 (제품별 공급망 맵 / 입력 요청 맵) === */}
        <DualMapSection
          onOpenInstance={(inst) => setOpenInstance(inst)}
          onOpenSupplier={handleSupplierOpen}
        />
      </div>

      {/* === 협력사 상세 모달 (원청 ESG 시점 고정) === */}
      <SupplierDetailModal
        supplier={openSupplier}
        onClose={() => { setOpenSupplier(null); setInitialTab(undefined); }}
        viewerRole="oem"
        onSelectSupplier={(s) => handleSupplierOpen(s)}
        initialTab={initialTab}
      />

      {/* === 제품 인스턴스 드릴다운 모달 (시리얼 → BOM → 협력사) === */}
      <ProductInstanceDrilldown
        instance={openInstance}
        onClose={() => setOpenInstance(null)}
        onOpenSupplier={handleOpenSupplierFromDrilldown}
      />
    </>
  );
}

// === 필터 칩 ===
function FilterChip({ label, value, options, onChange }: any) {
  const [open, setOpen] = useState(false);
  const current = options.find((o: any) => o.v === value);
  const isActive = value !== 'all';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={clsx(
          'flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-xs border transition-colors',
          isActive
            ? 'border-accent-700/40 bg-accent-700/10 text-accent-300'
            : 'border-ink-700 hover:border-ink-600 text-ink-300'
        )}
      >
        <Filter className="w-3 h-3" />
        <span className="text-ink-400">{label}:</span>
        <span className="font-medium">{current?.label}</span>
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-20 min-w-[180px] rounded-xs border border-ink-700 bg-ink-800 shadow-lg py-1">
            {options.map((opt: any) => (
              <button
                key={opt.v}
                onClick={() => { onChange(opt.v); setOpen(false); }}
                className={clsx(
                  'w-full text-left text-[11px] px-3 py-1.5 hover:bg-ink-700/60 transition-colors',
                  opt.v === value ? 'text-accent-400 font-medium' : 'text-ink-200'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// === 제품 인스턴스 카드 (드릴다운 진입점) ===
function ProductInstanceCard({ instance, onClick }: { instance: ProductInstance; onClick: () => void }) {
  const statusMap: Record<string, { tone: any; label: string }> = {
    issued:      { tone: 'ok',      label: 'DPP 발행' },
    in_progress: { tone: 'info',    label: '발행 중' },
    pending:     { tone: 'warn',    label: '대기' },
    not_started: { tone: 'neutral', label: '미시작' },
  };
  const status = statusMap[instance.dppStatus];

  return (
    <button
      onClick={onClick}
      className="text-left rounded-xs border border-ink-700/60 bg-ink-900/40 hover:bg-ink-800/60 hover:border-accent-700/40 p-3 transition-colors group"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <Box className="w-3.5 h-3.5 text-accent-500 shrink-0" strokeWidth={1.8} />
        <Badge tone={status.tone} size="sm">{status.label}</Badge>
      </div>
      <div className="text-xs font-medium text-ink-100 group-hover:text-accent-400 truncate mb-0.5">
        {instance.modelName}
      </div>
      <div className="text-[10px] text-ink-500 num-mono truncate mb-1">
        {instance.serialNumber}
      </div>
      <div className="text-[10px] text-ink-400 num-mono">
        {instance.destination} · {instance.producedAt.slice(0, 10)}
      </div>
    </button>
  );
}

// === 통계 타일 ===
function StatTile({ label, count, total, tone }: any) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const t: any = {
    ok:    { bar: 'bg-emerald-700', text: 'text-emerald-700', icon: CheckCircle2 },
    info:  { bar: 'bg-blue-700',    text: 'text-blue-700',    icon: Clock },
    warn:  { bar: 'bg-amber-700',   text: 'text-amber-700',   icon: AlertCircle },
    alert: { bar: 'bg-red-700',     text: 'text-red-700',     icon: AlertTriangle },
  }[tone];
  const Icon = t.icon;
  return (
    <div className="rounded-sm border border-ink-700 bg-ink-800/40 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wider text-ink-400">{label}</span>
        <Icon className={clsx('w-3.5 h-3.5', t.text)} />
      </div>
      <div className="flex items-baseline gap-1.5 mb-2">
        <span className={clsx('text-3xl font-semibold num-mono', t.text)}>{count}</span>
        <span className="text-xs text-ink-500 num-mono">/ {total}</span>
      </div>
      <div className="h-1 bg-ink-700 rounded-xs overflow-hidden">
        <div className={`h-full ${t.bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// === 상태 배지 ===
function StatusBadge({ status }: { status: any }) {
  const map: any = {
    verified:  { tone: 'ok',    label: '검증 완료' },
    pending:   { tone: 'info',  label: '검토 대기' },
    review:    { tone: 'warn',  label: '추가 확인' },
    violation: { tone: 'alert', label: '규제 위반' },
  };
  const m = map[status] || map.pending;
  return <Badge tone={m.tone} dot>{m.label}</Badge>;
}

// =====================================================
// 하단 영역: 두 탭으로 분리
// - 제품별 공급망 맵: 제품 인스턴스 중심 (시리얼·모델·DPP 상태·목적지·생산공장)
// - 입력 요청 맵: 데이터 완성도 + 리마인드 이력 중심
// =====================================================

type DualMapTab = 'product-map' | 'request-map';

function DualMapSection({
  onOpenInstance,
  onOpenSupplier,
}: {
  onOpenInstance: (instance: ProductInstance) => void;
  onOpenSupplier: (s: Supplier) => void;
}) {
  const [tab, setTab] = useState<DualMapTab>('product-map');

  return (
    <Card>
      {/* 탭 헤더 */}
      <div className="flex items-center gap-1 border-b border-ink-700 -mt-1 -mx-5 px-5 mb-4">
        <TabButton
          active={tab === 'product-map'}
          onClick={() => setTab('product-map')}
          icon={Network}
          label="제품별 공급망 맵"
          subtitle="제품 인스턴스 → 협력사 추적"
        />
        <TabButton
          active={tab === 'request-map'}
          onClick={() => setTab('request-map')}
          icon={Send}
          label="입력 요청 맵"
          subtitle="데이터 제출 현황 · 리마인드"
        />
      </div>

      {/* 탭 콘텐츠 */}
      {tab === 'product-map' ? (
        <ProductMapPanel onOpenInstance={onOpenInstance} />
      ) : (
        <RequestMapPanel onOpenSupplier={onOpenSupplier} />
      )}
    </Card>
  );
}

function TabButton({
  active, onClick, icon: Icon, label, subtitle,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
  subtitle: string;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex items-center gap-2 px-4 py-3 text-left border-b-2 -mb-px transition-colors',
        active
          ? 'border-accent-500 text-accent-600'
          : 'border-transparent text-ink-400 hover:text-ink-200',
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <div>
        <div className="text-xs font-medium">{label}</div>
        <div className="text-[10px] text-ink-500 font-normal">{subtitle}</div>
      </div>
    </button>
  );
}

// === 탭 1: 제품별 공급망 맵 ===
// 모든 제품 인스턴스를 표시. DPP 상태별 그룹핑.
function ProductMapPanel({
  onOpenInstance,
}: {
  onOpenInstance: (instance: ProductInstance) => void;
}) {
  const [destFilter, setDestFilter] = useState<'all' | 'EU' | 'US' | 'KR'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'issued' | 'in_progress' | 'pending' | 'not_started'>('all');

  const filtered = productInstances.filter(inst => {
    if (destFilter !== 'all' && inst.destination !== destFilter) return false;
    if (statusFilter !== 'all' && inst.dppStatus !== statusFilter) return false;
    return true;
  });

  // DPP 상태별 카운트
  const counts = {
    issued:      productInstances.filter(i => i.dppStatus === 'issued').length,
    in_progress: productInstances.filter(i => i.dppStatus === 'in_progress').length,
    pending:     productInstances.filter(i => i.dppStatus === 'pending').length,
    not_started: productInstances.filter(i => i.dppStatus === 'not_started').length,
  };

  return (
    <div className="space-y-4">
      {/* 상단 KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <ProductKpi label="DPP 발행 완료" count={counts.issued}      total={productInstances.length} tone="ok" />
        <ProductKpi label="발행 중"        count={counts.in_progress} total={productInstances.length} tone="info" />
        <ProductKpi label="발행 대기"      count={counts.pending}     total={productInstances.length} tone="warn" />
        <ProductKpi label="검증 미시작"    count={counts.not_started} total={productInstances.length} tone="neutral" />
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-2 text-[11px]">
        <span className="text-ink-500">필터:</span>
        <select
          value={destFilter}
          onChange={(e) => setDestFilter(e.target.value as any)}
          className="num-mono px-2 py-1 rounded-xs border border-ink-700 bg-ink-900/50 text-ink-300 outline-none focus:border-accent-600"
        >
          <option value="all">목적지: 전체</option>
          <option value="EU">EU</option>
          <option value="US">US</option>
          <option value="KR">KR</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="num-mono px-2 py-1 rounded-xs border border-ink-700 bg-ink-900/50 text-ink-300 outline-none focus:border-accent-600"
        >
          <option value="all">DPP 상태: 전체</option>
          <option value="issued">발행 완료</option>
          <option value="in_progress">발행 중</option>
          <option value="pending">발행 대기</option>
          <option value="not_started">미시작</option>
        </select>
        <span className="ml-auto text-ink-500 num-mono">{filtered.length} / {productInstances.length}</span>
      </div>

      {/* 제품 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
        {filtered.map(inst => (
          <ProductInstanceCard
            key={inst.serialNumber}
            instance={inst}
            onClick={() => onOpenInstance(inst)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center text-xs text-ink-500">
            <Package className="w-6 h-6 mx-auto mb-2 text-ink-600" />
            조건에 맞는 제품 인스턴스가 없습니다
          </div>
        )}
      </div>
    </div>
  );
}

function ProductKpi({ label, count, total, tone }: {
  label: string; count: number; total: number;
  tone: 'ok' | 'info' | 'warn' | 'neutral';
}) {
  const colors = {
    ok:      { text: 'text-emerald-600', bar: 'bg-emerald-500' },
    info:    { text: 'text-blue-600',    bar: 'bg-blue-500' },
    warn:    { text: 'text-amber-600',   bar: 'bg-amber-500' },
    neutral: { text: 'text-ink-400',     bar: 'bg-ink-500' },
  }[tone];
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className="rounded-xs border border-ink-700/60 bg-ink-900/30 p-3">
      <div className="text-[10px] uppercase tracking-wider text-ink-500 mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className={clsx('text-xl font-semibold num-mono', colors.text)}>{count}</span>
        <span className="text-[10px] text-ink-500 num-mono">/ {total}</span>
      </div>
      <div className="mt-1.5 h-1 bg-ink-700 rounded-xs overflow-hidden">
        <div className={clsx('h-full', colors.bar)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// === 탭 2: 입력 요청 맵 ===
// 데이터 완성도 100% 미만 협력사 우선 표시. 리마인드 발송 액션 포함.
function RequestMapPanel({
  onOpenSupplier,
}: {
  onOpenSupplier: (s: Supplier) => void;
}) {
  const [sortBy, setSortBy] = useState<'completeness' | 'overdue'>('completeness');

  // 완성도가 있는 협력사만 + 100% 미만 우선
  const rows = useMemo(() => {
    return supplierCompleteness
      .map(comp => {
        const supplier = suppliers.find(s => s.id === comp.supplierId);
        const name = getSupplierName(comp.supplierId);
        const contacts = getContacts(comp.supplierId);
        const primary = contacts.find(c => c.isPrimary) ?? contacts[0];
        const reminds = remindLogs.filter(r => r.supplierId === comp.supplierId);
        const overdueCount = reminds.filter(r => r.status === 'overdue').length;
        const latestRemind = reminds.length > 0
          ? reminds.reduce((a, b) => a.sentAt > b.sentAt ? a : b)
          : null;
        return { comp, supplier, name, primary, overdueCount, latestRemind, reminds };
      })
      .filter(r => r.supplier !== undefined)
      .sort((a, b) => {
        if (sortBy === 'overdue') return b.overdueCount - a.overdueCount;
        return a.comp.completionRate - b.comp.completionRate;
      });
  }, [sortBy]);

  // KPI
  const completeCount   = supplierCompleteness.filter(c => c.completionRate >= 100).length;
  const inProgressCount = supplierCompleteness.filter(c => c.completionRate >= 80 && c.completionRate < 100).length;
  const partialCount    = supplierCompleteness.filter(c => c.completionRate >= 50 && c.completionRate < 80).length;
  const noneCount       = supplierCompleteness.filter(c => c.completionRate < 50).length;
  const totalMissing    = supplierCompleteness.reduce((sum, c) => sum + c.missingFields.length, 0);
  const overdueTotal    = remindLogs.filter(r => r.status === 'overdue').length;

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <ProductKpi label="제출 완료"      count={completeCount}   total={supplierCompleteness.length} tone="ok" />
        <ProductKpi label="입력 중"        count={inProgressCount} total={supplierCompleteness.length} tone="info" />
        <ProductKpi label="부분 제출"      count={partialCount}    total={supplierCompleteness.length} tone="warn" />
        <ProductKpi label="미제출"          count={noneCount}       total={supplierCompleteness.length} tone="neutral" />
      </div>

      {/* 추가 인디케이터 */}
      <div className="flex items-center gap-4 text-[11px] px-1">
        <span className="flex items-center gap-1.5 text-ink-400">
          <AlertCircle className="w-3.5 h-3.5 text-red-500" />
          누락 항목 합계 <span className="num-mono text-ink-200 font-medium">{totalMissing}</span>건
        </span>
        <span className="flex items-center gap-1.5 text-ink-400">
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          미응답 리마인드 <span className="num-mono text-ink-200 font-medium">{overdueTotal}</span>건
        </span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-ink-500">정렬:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="num-mono px-2 py-1 rounded-xs border border-ink-700 bg-ink-900/50 text-ink-300 outline-none focus:border-accent-600"
          >
            <option value="completeness">완성도 낮은 순</option>
            <option value="overdue">미응답 많은 순</option>
          </select>
        </div>
      </div>

      {/* 테이블 */}
      <div className="rounded-xs border border-ink-700/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink-700/60 bg-ink-900/40">
                {['협력사', '완성도', '누락 항목', '미응답', '담당자', '마지막 요청', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wider text-ink-500 font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <RequestRow
                  key={r.comp.supplierId}
                  comp={r.comp}
                  supplier={r.supplier!}
                  name={r.name}
                  primary={r.primary}
                  overdueCount={r.overdueCount}
                  latestRemind={r.latestRemind}
                  onClick={() => onOpenSupplier(r.supplier!)}
                />
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-xs text-ink-500">
                    데이터가 없습니다
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RequestRow({
  comp, supplier, name, primary, overdueCount, latestRemind, onClick,
}: any) {
  const rate = comp.completionRate;
  const tone =
    rate >= 100 ? 'emerald' :
    rate >= 80  ? 'blue' :
    rate >= 50  ? 'amber' : 'red';

  const toneStyles: Record<string, { text: string; bar: string }> = {
    emerald: { text: 'text-emerald-600', bar: 'bg-emerald-500' },
    blue:    { text: 'text-blue-600',    bar: 'bg-blue-500' },
    amber:   { text: 'text-amber-600',   bar: 'bg-amber-500' },
    red:     { text: 'text-red-600',     bar: 'bg-red-500' },
  };
  const s = toneStyles[tone];

  return (
    <tr
      className="border-b border-ink-700/40 hover:bg-ink-800/30 cursor-pointer transition-colors group"
      onClick={onClick}
    >
      {/* 협력사 */}
      <td className="px-4 py-3">
        <div className="text-xs font-medium text-ink-100 group-hover:text-accent-400 truncate">
          {name?.nameEn ?? supplier.name}
        </div>
        {name?.nameKo && (
          <div className="text-[10px] text-ink-500 truncate">{name.nameKo}</div>
        )}
        <div className="text-[10px] text-ink-500 num-mono">{supplier.id}</div>
      </td>

      {/* 완성도 */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-20 h-1.5 bg-ink-700 rounded-xs overflow-hidden">
            <div className={clsx('h-full rounded-xs', s.bar)} style={{ width: `${rate}%` }} />
          </div>
          <span className={clsx('text-[11px] num-mono font-medium', s.text)}>{rate}%</span>
        </div>
      </td>

      {/* 누락 항목 */}
      <td className="px-4 py-3">
        {comp.missingFields.length > 0 ? (
          <div>
            <div className="text-[11px] text-red-500 font-medium">
              {comp.missingFields.length}건
            </div>
            <div className="text-[10px] text-ink-500 truncate max-w-[200px]">
              {comp.missingFields.slice(0, 2).join(', ')}
              {comp.missingFields.length > 2 && '…'}
            </div>
          </div>
        ) : (
          <span className="text-[10px] text-emerald-600">없음</span>
        )}
      </td>

      {/* 미응답 */}
      <td className="px-4 py-3">
        {overdueCount > 0 ? (
          <span className="text-[11px] num-mono text-amber-600 font-medium">
            {overdueCount}건
          </span>
        ) : (
          <span className="text-[10px] text-ink-500">—</span>
        )}
      </td>

      {/* 담당자 */}
      <td className="px-4 py-3">
        {primary ? (
          <div>
            <div className="text-xs text-ink-200 truncate">{primary.name}</div>
            <div className="text-[10px] text-blue-500 truncate">{primary.email}</div>
          </div>
        ) : (
          <span className="text-[10px] text-ink-500">—</span>
        )}
      </td>

      {/* 마지막 요청 */}
      <td className="px-4 py-3">
        {latestRemind ? (
          <div>
            <div className="text-[10px] text-ink-300 num-mono">{latestRemind.sentAt.slice(0, 10)}</div>
            <div className="text-[10px] text-ink-500 truncate max-w-[150px]">
              {latestRemind.requestedField}
            </div>
          </div>
        ) : (
          <span className="text-[10px] text-ink-500">—</span>
        )}
      </td>

      {/* 액션 */}
      <td className="px-4 py-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            alert(`${name?.nameEn ?? supplier.name}에 리마인드 발송`);
          }}
          className="text-[10px] px-2 py-1 rounded-xs border border-accent-700/40 text-accent-600 hover:bg-accent-500/10 transition-colors whitespace-nowrap"
        >
          <Bell className="w-2.5 h-2.5 inline mr-1" />
          리마인드
        </button>
      </td>
    </tr>
  );
}

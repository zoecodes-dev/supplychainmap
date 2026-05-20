'use client';

import { useState, useEffect, useMemo } from 'react';
import { ProductInstance, suppliers } from '@/lib/data';
import {
  factories, getBomTreeForProduct, getPOsForPart, getPart,
  type BomNode, type Part, type PurchaseOrder
} from '@/lib/supplier-detail-data';
import {
  X, Package, Factory, Calendar, ChevronRight, ChevronDown,
  Truck, ArrowRight, Layers, Box, Cpu, Atom, Pickaxe,
  ExternalLink, MapPin, Hash, AlertCircle
} from 'lucide-react';
import Badge from './Badge';
import clsx from 'clsx';

interface Props {
  instance: ProductInstance | null;
  onClose: () => void;
  onOpenSupplier?: (supplierId: string) => void;
}

// Tier별 아이콘
const tierIcons: Record<number, any> = {
  1: Box,
  2: Layers,
  3: Cpu,
  4: Atom,
  5: Pickaxe,
};

// Tier별 색상
const tierColors: Record<number, string> = {
  1: 'text-blue-700 border-blue-700/40 bg-blue-500/5',
  2: 'text-indigo-700 border-indigo-700/40 bg-indigo-500/5',
  3: 'text-teal-700 border-teal-700/40 bg-teal-500/5',
  4: 'text-amber-700 border-amber-700/40 bg-amber-500/5',
  5: 'text-orange-700 border-orange-700/40 bg-orange-500/5',
};

export default function ProductInstanceDrilldown({ instance, onClose, onOpenSupplier }: Props) {
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (instance) {
      window.addEventListener('keydown', handler);
      document.body.style.overflow = 'hidden';
      // 모달 열릴 때 최상위 부품(Pack) 선택
      setSelectedPartId('PRT-001');
    }
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [instance, onClose]);

  const bomTree = useMemo(
    () => instance ? getBomTreeForProduct(instance.productId) : null,
    [instance]
  );

  if (!instance) return null;

  const factory = factories.find(f => f.factoryId === instance.producedAtFactoryId);
  const selectedPart = selectedPartId ? getPart(selectedPartId) : null;
  const matchedPOs = selectedPartId
    ? getPOsForPart(selectedPartId, instance.producedAt)
    : [];

  const statusBadge = {
    issued:      { tone: 'ok',    label: 'DPP 발행 완료' },
    in_progress: { tone: 'info',  label: 'DPP 발행 중' },
    pending:     { tone: 'warn',  label: 'DPP 발행 대기' },
    not_started: { tone: 'neutral', label: '검증 미시작' },
  }[instance.dppStatus];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-50/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-ink-800 border border-ink-700 rounded-sm w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===== 헤더 ===== */}
        <div className="border-b border-ink-700 px-6 py-4 flex items-start justify-between gap-4 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <Badge tone={statusBadge.tone as any} dot>{statusBadge.label}</Badge>
              <Badge tone="info" size="sm">{instance.destination} 납품</Badge>
              <span className="text-[10px] text-ink-400 num-mono">{instance.serialNumber}</span>
            </div>
            <h2 className="text-xl font-semibold text-ink-50 tracking-tight flex items-center gap-2">
              <Package className="w-5 h-5 text-accent-500" />
              {instance.modelName}
            </h2>
            <div className="text-xs text-ink-400 mt-1 flex items-center gap-3 flex-wrap">
              <span className="num-mono">{instance.productId}</span>
              {factory && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Factory className="w-3 h-3 text-ink-500" />
                    {factory.factoryName}
                  </span>
                </>
              )}
              <span>·</span>
              <span className="flex items-center gap-1 num-mono">
                <Calendar className="w-3 h-3 text-ink-500" />
                생산 {instance.producedAt}
              </span>
              {instance.dppId && (
                <>
                  <span>·</span>
                  <span className="num-mono text-emerald-700">{instance.dppId}</span>
                </>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-ink-400 hover:text-ink-100 p-1 rounded-xs hover:bg-ink-700/60 shrink-0"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ===== 본문: 좌측 BOM 트리 + 우측 부품 상세/PO 매칭 ===== */}
        <div className="flex-1 overflow-hidden flex">

          {/* === 좌측: BOM 트리 === */}
          <div className="w-2/5 border-r border-ink-700 overflow-y-auto p-4">
            <div className="mb-3">
              <h3 className="text-xs font-semibold text-ink-100 uppercase tracking-wider mb-1">
                BOM 구성
              </h3>
              <p className="text-[10px] text-ink-500">
                부품을 클릭하면 우측에 공급 협력사·PO가 표시됩니다
              </p>
            </div>
            {bomTree ? (
              <BomTreeNode
                node={bomTree}
                depth={0}
                selectedPartId={selectedPartId}
                onSelect={setSelectedPartId}
              />
            ) : (
              <div className="text-xs text-ink-500 py-4 text-center">BOM 정보 없음</div>
            )}
          </div>

          {/* === 우측: 선택된 부품의 협력사·PO 매칭 === */}
          <div className="flex-1 overflow-y-auto p-5">
            {selectedPart ? (
              <PartDetailPanel
                part={selectedPart}
                matchedPOs={matchedPOs}
                producedAt={instance.producedAt}
                onOpenSupplier={onOpenSupplier}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-ink-500">
                좌측에서 부품을 선택하세요
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// BOM 트리 노드 (재귀)
// =====================================================
function BomTreeNode({
  node, depth, selectedPartId, onSelect,
}: {
  node: BomNode;
  depth: number;
  selectedPartId: string | null;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const Icon = tierIcons[node.part.tierLevel] || Box;
  const isSelected = selectedPartId === node.part.id;
  const hasChildren = node.children.length > 0;
  const colorClass = tierColors[node.part.tierLevel] || tierColors[1];

  return (
    <div>
      <div className="flex items-stretch">
        {/* 들여쓰기 라인 */}
        {Array.from({ length: depth }).map((_, i) => (
          <div key={i} className="w-4 border-l border-ink-700/60 ml-2" />
        ))}

        <button
          onClick={() => {
            onSelect(node.part.id);
            if (hasChildren) setExpanded(!expanded);
          }}
          className={clsx(
            'flex-1 flex items-center gap-2 py-1.5 px-2 rounded-xs text-left border transition-colors my-0.5',
            isSelected
              ? 'border-accent-700/60 bg-accent-500/10'
              : 'border-transparent hover:bg-ink-800/60 hover:border-ink-700/40'
          )}
        >
          {/* 펼침 화살표 */}
          {hasChildren ? (
            expanded
              ? <ChevronDown className="w-3 h-3 text-ink-500 shrink-0" />
              : <ChevronRight className="w-3 h-3 text-ink-500 shrink-0" />
          ) : (
            <div className="w-3 shrink-0" />
          )}

          {/* Tier 배지 */}
          <span className={clsx(
            'text-[9px] num-mono px-1 py-0.5 rounded-xs border font-bold shrink-0',
            colorClass
          )}>
            T{node.part.tierLevel}
          </span>

          <Icon className={clsx('w-3.5 h-3.5 shrink-0', colorClass.split(' ')[0])} strokeWidth={1.8} />

          <div className="flex-1 min-w-0">
            <div className={clsx(
              'text-xs font-medium truncate',
              isSelected ? 'text-accent-300' : 'text-ink-100'
            )}>
              {node.part.partName}
            </div>
            <div className="text-[10px] text-ink-500 num-mono truncate">
              {node.part.partCode}
            </div>
          </div>
        </button>
      </div>

      {/* 자식 노드들 */}
      {expanded && hasChildren && (
        <div>
          {node.children.map((child, i) => (
            <BomTreeNode
              key={child.part.id + i}
              node={child}
              depth={depth + 1}
              selectedPartId={selectedPartId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =====================================================
// 우측: 선택된 부품의 협력사·PO 매칭 패널
// =====================================================
function PartDetailPanel({
  part, matchedPOs, producedAt, onOpenSupplier,
}: {
  part: Part;
  matchedPOs: PurchaseOrder[];
  producedAt: string;
  onOpenSupplier?: (supplierId: string) => void;
}) {
  const Icon = tierIcons[part.tierLevel] || Box;
  const colorClass = tierColors[part.tierLevel] || tierColors[1];

  return (
    <div className="space-y-5">
      {/* 부품 정보 헤더 */}
      <div>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className={clsx(
            'text-[10px] num-mono px-1.5 py-0.5 rounded-xs border font-bold',
            colorClass
          )}>
            T{part.tierLevel}
          </span>
          <Icon className={clsx('w-4 h-4', colorClass.split(' ')[0])} strokeWidth={1.8} />
          <h3 className="text-base font-semibold text-ink-100">{part.partName}</h3>
        </div>
        <div className="text-[11px] text-ink-400 leading-relaxed">
          {part.functionPurpose}
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <KVPair label="부품코드" value={part.partCode} mono />
          <KVPair label="HS코드" value={part.hsCode} mono />
          <KVPair label="단가" value={`$${part.unitPrice}/${part.purchaseUnit}`} mono />
        </div>
      </div>

      <div className="border-t border-ink-700/60 pt-4">
        <div className="flex items-baseline justify-between mb-3">
          <h4 className="text-xs font-semibold text-ink-100 uppercase tracking-wider">
            공급 협력사 · PO 매칭
          </h4>
          <span className="text-[10px] text-ink-500 num-mono">
            생산일 {producedAt} 이전 PO 매칭
          </span>
        </div>

        {matchedPOs.length === 0 ? (
          <div className="rounded-xs border border-amber-700/30 bg-amber-500/5 p-4 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-ink-200 leading-relaxed">
              <div className="font-semibold text-amber-700 mb-0.5">매칭되는 PO 없음</div>
              이 부품에 대한 협력사 PO 데이터가 아직 등록되지 않았거나, 생산 시점 이전 PO가 없습니다.
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {matchedPOs.map(po => (
              <PoMatchCard
                key={po.poId}
                po={po}
                onOpenSupplier={onOpenSupplier}
              />
            ))}
          </div>
        )}
      </div>

      {/* 안내 */}
      <div className="rounded-xs border border-ink-700/40 bg-ink-900/30 p-3">
        <div className="text-[10px] text-ink-400 leading-relaxed">
          <strong className="text-ink-200">추적 흐름:</strong> 이 부품을 공급한 협력사를 클릭하면 협력사 상세 정보로 이동합니다.
          상위 BOM은 좌측 트리에서 부모 부품을, 하위 공급망은 자식 부품을 클릭해 따라갈 수 있습니다.
        </div>
      </div>
    </div>
  );
}

// =====================================================
// PO 매칭 카드
// =====================================================
function PoMatchCard({
  po, onOpenSupplier,
}: {
  po: PurchaseOrder;
  onOpenSupplier?: (supplierId: string) => void;
}) {
  const supplier = suppliers.find(s => s.id === po.supplierId);
  const factory = factories.find(f => f.factoryId === po.factoryId);

  return (
    <div className="rounded-xs border border-ink-700/60 bg-ink-900/40 p-3">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          {/* 원청 PO + 협력사 송장 */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[10px] text-ink-500 num-mono">원청 PO</span>
            <span className="text-xs font-semibold num-mono text-accent-400">{po.originalPoNumber}</span>
            <span className="text-[10px] text-ink-500 num-mono">/ 송장 {po.supplierInvoiceNumber}</span>
          </div>
          {/* 부품코드 매핑 */}
          <div className="flex items-center gap-1.5 text-[11px] num-mono mb-1">
            <span className="text-ink-300">{po.supplierPartCode}</span>
            <ArrowRight className="w-2.5 h-2.5 text-ink-500" />
            <span className="text-accent-500 font-semibold">{po.originalPartCode}</span>
          </div>
        </div>
        <PoStatusBadge status={po.status} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px] mb-3">
        <div className="flex items-center gap-1.5">
          <Truck className="w-3 h-3 text-ink-500" />
          <span className="text-ink-400">납품일</span>
          <span className="num-mono text-ink-200">{po.deliveryDate}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Hash className="w-3 h-3 text-ink-500" />
          <span className="num-mono text-ink-200">{po.quantity.toLocaleString()} {po.unit}</span>
          {po.supplyRatio < 100 && (
            <span className="text-[10px] num-mono text-blue-700 ml-1">({po.supplyRatio}% 비중)</span>
          )}
        </div>
        {factory && (
          <div className="flex items-center gap-1.5">
            <Factory className="w-3 h-3 text-ink-500" />
            <span className="text-ink-300 truncate">{factory.factoryName}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3 h-3 text-ink-500" />
          <span className="text-ink-400">원산지</span>
          <span className="num-mono text-ink-200">{po.originCountry}</span>
        </div>
      </div>

      {/* 협력사 점프 버튼 */}
      {supplier && (
        <button
          onClick={() => onOpenSupplier?.(supplier.id)}
          className="w-full text-left rounded-xs border border-ink-700 hover:border-accent-700/40 hover:bg-accent-500/5 px-2.5 py-2 transition-colors group flex items-center gap-2"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] num-mono px-1 py-0.5 rounded-xs bg-ink-700 text-ink-200 font-bold">
                T{supplier.tier}
              </span>
              <span className="text-xs font-medium text-ink-100 group-hover:text-accent-400">
                {supplier.name}
              </span>
            </div>
            <div className="text-[10px] text-ink-500 num-mono mt-0.5">
              {supplier.id} · {supplier.country} · {supplier.role}
            </div>
          </div>
          <ExternalLink className="w-3 h-3 text-ink-500 group-hover:text-accent-400" />
        </button>
      )}
    </div>
  );
}

// =====================================================
// 공통
// =====================================================
function KVPair({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-ink-500 mb-0.5">{label}</div>
      <div className={clsx('text-[11px] text-ink-100', mono && 'num-mono')}>{value}</div>
    </div>
  );
}

function PoStatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: any; label: string }> = {
    pending:    { tone: 'warn',    label: '대기' },
    in_transit: { tone: 'info',    label: '운송중' },
    delivered:  { tone: 'neutral', label: '인도' },
    verified:   { tone: 'ok',      label: '검증완료' },
  };
  const m = map[status] || map.pending;
  return <Badge tone={m.tone} size="sm">{m.label}</Badge>;
}

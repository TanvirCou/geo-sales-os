"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOrder } from "@/actions/orders";
import { OrderStatus } from "@prisma/client";
import {
  FileEdit,
  Building2,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  X,
  Package,
  DollarSign,
  FileSpreadsheet,
} from "lucide-react";

export interface ProductOption {
  id: string;
  name: string;
  priceBdt: number | null;
  unit?: string | null;
}

export interface EditableOrder {
  id: string;
  externalOrderId: string | null;
  businessName?: string;
  businessId?: string;
  orderedAt: string | null;
  status: OrderStatus;
  source?: string | null;
  totalBdt?: number | null;
  items: Array<{
    id?: string;
    productId?: string | null;
    name?: string | null;
    sourceProductName?: string | null;
    quantity: number;
    unitPriceBdt: number;
  }>;
}

interface EditOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: EditableOrder | null;
  products: ProductOption[];
  onSuccess?: () => void;
}

export default function EditOrderModal({
  isOpen,
  onClose,
  order,
  products,
  onSuccess,
}: EditOrderModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Mode: "DIRECT" (Total Only / Imported without SKU breakdown) vs "ITEMIZED" (List of products)
  const [orderMode, setOrderMode] = useState<"DIRECT" | "ITEMIZED">("DIRECT");
  const [formDirectTotal, setFormDirectTotal] = useState("");
  const [formExtId, setFormExtId] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formStatus, setFormStatus] = useState<OrderStatus>(OrderStatus.PENDING);
  const [formError, setFormError] = useState<string | null>(null);

  // Field-specific validation errors for inline display
  const [fieldErrors, setFieldErrors] = useState<{
    extId?: string;
    date?: string;
    status?: string;
    directTotal?: string;
    items?: string;
  }>({});

  const clearFieldError = (
    field: "extId" | "date" | "status" | "directTotal" | "items"
  ) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const [formItems, setFormItems] = useState<
    Array<{
      productId: string;
      sourceProductName: string;
      quantity: number;
      unitPriceBdt: number;
    }>
  >([]);

  useEffect(() => {
    if (isOpen && order) {
      setFormExtId(order.externalOrderId || `ORD-${order.id.slice(0, 6)}`);
      setFormDate(
        order.orderedAt
          ? new Date(order.orderedAt).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0]
      );
      setFormStatus(order.status || OrderStatus.PENDING);
      setFormError(null);
      setFieldErrors({});

      const hasItems = order.items && order.items.length > 0;
      if (hasItems) {
        setOrderMode("ITEMIZED");
        setFormItems(
          order.items.map((it) => ({
            productId: it.productId || "",
            sourceProductName: it.sourceProductName || it.name || "",
            quantity: Number(it.quantity) || 1,
            unitPriceBdt: Number(it.unitPriceBdt) || 0,
          }))
        );
        setFormDirectTotal(
          order.totalBdt != null && !isNaN(Number(order.totalBdt))
            ? String(order.totalBdt)
            : ""
        );
      } else {
        // Direct Total / Imported Order without line items
        setOrderMode("DIRECT");
        setFormDirectTotal(
          order.totalBdt != null && !isNaN(Number(order.totalBdt))
            ? String(order.totalBdt)
            : "0"
        );
        setFormItems([
          { productId: "", sourceProductName: "", quantity: 1, unitPriceBdt: 0 },
        ]);
      }
    }
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  const isImportedOrder =
    order.source?.toLowerCase().includes("import") ||
    order.source?.toLowerCase().includes("steadfast") ||
    order.source?.toLowerCase().includes("excel") ||
    (order.items && order.items.length === 0);

  const handleProductSelect = (index: number, productId: string) => {
    clearFieldError("items");
    const found = products.find((p) => p.id === productId);
    const updated = [...formItems];
    updated[index].productId = productId;
    if (found) {
      updated[index].sourceProductName = found.name;
      if (found.priceBdt != null) {
        updated[index].unitPriceBdt = Number(found.priceBdt);
      }
    }
    setFormItems(updated);
  };

  const handleQuantityChange = (index: number, val: string) => {
    clearFieldError("items");
    const updated = [...formItems];
    const parsed = parseFloat(val);
    updated[index].quantity = isNaN(parsed) ? 0 : parsed;
    setFormItems(updated);
  };

  const handlePriceChange = (index: number, val: string) => {
    clearFieldError("items");
    const updated = [...formItems];
    const parsed = parseFloat(val);
    updated[index].unitPriceBdt = isNaN(parsed) ? 0 : parsed;
    setFormItems(updated);
  };

  const handleCustomNameChange = (index: number, val: string) => {
    clearFieldError("items");
    const updated = [...formItems];
    updated[index].sourceProductName = val;
    setFormItems(updated);
  };

  const addItemRow = () => {
    clearFieldError("items");
    setFormItems((prev) => [
      ...prev,
      { productId: "", sourceProductName: "", quantity: 1, unitPriceBdt: 0 },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (formItems.length <= 1) return;
    setFormItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSwitchToDirect = () => {
    setOrderMode("DIRECT");
    clearFieldError("items");
    if (!formDirectTotal || formDirectTotal === "0") {
      const itemsSum = formItems.reduce(
        (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPriceBdt) || 0),
        0
      );
      if (itemsSum > 0) {
        setFormDirectTotal(String(itemsSum));
      } else if (order.totalBdt != null && !isNaN(Number(order.totalBdt))) {
        setFormDirectTotal(String(order.totalBdt));
      }
    }
  };

  const handleSwitchToItemized = () => {
    setOrderMode("ITEMIZED");
    clearFieldError("directTotal");
    if (formItems.length === 0) {
      setFormItems([
        { productId: "", sourceProductName: "", quantity: 1, unitPriceBdt: 0 },
      ]);
    }
  };

  // Live total calculation based on active mode
  const calculatedGrandTotal =
    orderMode === "DIRECT"
      ? parseFloat(formDirectTotal) || 0
      : formItems.reduce(
          (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPriceBdt) || 0),
          0
        );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const errors: {
      extId?: string;
      date?: string;
      status?: string;
      directTotal?: string;
      items?: string;
    } = {};

    if (!formExtId.trim()) {
      errors.extId = "Order Reference / Invoice ID is required.";
    }

    if (!formDate.trim()) {
      errors.date = "Order Date is required.";
    }

    if (!formStatus) {
      errors.status = "Order Status is required.";
    }

    const isDirect = orderMode === "DIRECT";

    if (isDirect) {
      const parsed = parseFloat(formDirectTotal);
      if (isNaN(parsed) || parsed < 0) {
        errors.directTotal = "Please enter a valid positive total amount.";
      }
    } else {
      if (formItems.length === 0) {
        errors.items = "At least one line item is required in itemized mode.";
      } else {
        const hasUnselected = formItems.some(
          (i) => !i.productId && !i.sourceProductName?.trim()
        );
        if (hasUnselected) {
          errors.items = "Please select a product or enter description for all items.";
        } else {
          const hasInvalidQty = formItems.some(
            (i) => isNaN(i.quantity) || i.quantity <= 0
          );
          if (hasInvalidQty) {
            errors.items = "All line items must have a quantity greater than 0.";
          }
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError(null);
      return;
    }

    setFieldErrors({});
    setFormError(null);

    startTransition(async () => {
      const payload = {
        id: order.id,
        externalOrderId: formExtId.trim(),
        orderedAt: formDate ? new Date(formDate).toISOString() : null,
        status: formStatus,
        isDirectTotal: isDirect,
        totalAmountBdt: isDirect ? parseFloat(formDirectTotal) || 0 : null,
        items: !isDirect
          ? formItems
              .filter((i) => i.quantity > 0)
              .map((it) => ({
                productId: it.productId || null,
                sourceProductName: it.sourceProductName?.trim() || null,
                quantity: it.quantity,
                unitPriceBdt: it.unitPriceBdt,
              }))
          : [],
      };

      const res = await updateOrder(payload);

      if (res?.error) {
        setFormError(res.error);
      } else {
        if (onSuccess) onSuccess();
        onClose();
        router.refresh();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FileEdit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  Edit Order #{order.externalOrderId || order.id.slice(0, 8)}
                </h2>
                {isImportedOrder && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 flex items-center gap-1">
                    <FileSpreadsheet className="w-2.5 h-2.5" />
                    <span>Imported</span>
                  </span>
                )}
                {orderMode === "DIRECT" && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 flex items-center gap-1">
                    <DollarSign className="w-2.5 h-2.5" />
                    <span>Total Only (Direct)</span>
                  </span>
                )}
              </div>
              {order.businessName && (
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                  <Building2 className="w-3 h-3 text-blue-500" />
                  <span>
                    Client:{" "}
                    <strong className="text-slate-700 dark:text-slate-300">
                      {order.businessName}
                    </strong>
                  </span>
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Banner */}
        {formError && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Prominent Banner for Imported / Total Only (Direct) Orders */}
          {(isImportedOrder || orderMode === "DIRECT") && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200/90 dark:border-amber-500/30 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wider bg-amber-200 dark:bg-amber-500/25 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-500/30 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Total Only (Direct) Order</span>
                  </span>
                  {order.source && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono">
                      Source: {order.source}
                    </span>
                  )}
                </div>

                {order.totalBdt != null && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Previous Stored Total:</span>
                    <span className="text-xs font-extrabold font-mono text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/20 px-2 py-0.5 rounded border border-amber-300/80 dark:border-amber-500/30">
                      BDT {Number(order.totalBdt).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                📦 <strong>Imported Order (Total Only):</strong> This order was recorded with only a lump-sum total amount (without itemized SKU breakdown). You can adjust the lump-sum total directly below, or switch to the <em>"Itemized Line Items"</em> tab to attach specific catalog products.
              </p>
            </div>
          )}

          {/* Top 3 Meta Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Order / Invoice Ref # <span className="text-rose-500 font-bold ml-0.5">*</span>
              </label>
              <input
                type="text"
                value={formExtId}
                onChange={(e) => {
                  setFormExtId(e.target.value);
                  if (e.target.value.trim() && fieldErrors.extId) clearFieldError("extId");
                }}
                placeholder="e.g. ORD-1092"
                className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none transition-colors ${
                  fieldErrors.extId
                    ? "border border-rose-500 bg-rose-50/20 dark:bg-rose-950/20 focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
                    : "border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500"
                }`}
              />
              {fieldErrors.extId && (
                <p className="text-xs text-rose-500 font-medium mt-1 animate-fade-in flex items-center gap-1">
                  <span>{fieldErrors.extId}</span>
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Order Date <span className="text-rose-500 font-bold ml-0.5">*</span>
              </label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => {
                  setFormDate(e.target.value);
                  if (e.target.value.trim() && fieldErrors.date) clearFieldError("date");
                }}
                className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none transition-colors ${
                  fieldErrors.date
                    ? "border border-rose-500 bg-rose-50/20 dark:bg-rose-950/20 focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
                    : "border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500"
                }`}
              />
              {fieldErrors.date && (
                <p className="text-xs text-rose-500 font-medium mt-1 animate-fade-in flex items-center gap-1">
                  <span>{fieldErrors.date}</span>
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Order Lifecycle Status <span className="text-rose-500 font-bold ml-0.5">*</span>
              </label>
              <select
                value={formStatus}
                onChange={(e) => {
                  setFormStatus(e.target.value as OrderStatus);
                  if (e.target.value && fieldErrors.status) clearFieldError("status");
                }}
                className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none transition-colors ${
                  fieldErrors.status
                    ? "border border-rose-500 bg-rose-50/20 dark:bg-rose-950/20 focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
                    : "border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500"
                }`}
              >
                <option value={OrderStatus.PENDING}>🟡 Pending Confirmation</option>
                <option value={OrderStatus.COMPLETED}>🟢 Completed / Delivered</option>
                <option value={OrderStatus.CANCELLED}>🔴 Cancelled Order</option>
                <option value={OrderStatus.RETURNED}>⚪ Returned</option>
                <option value={OrderStatus.PARTIAL}>🟠 Partial Delivery</option>
              </select>
              {fieldErrors.status && (
                <p className="text-xs text-rose-500 font-medium mt-1 animate-fade-in flex items-center gap-1">
                  <span>{fieldErrors.status}</span>
                </p>
              )}
            </div>
          </div>

          {/* Mode Selector Tabs (Direct vs Itemized) */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
            <button
              type="button"
              onClick={handleSwitchToDirect}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                orderMode === "DIRECT"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/60 dark:border-slate-700/60"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Total Only (Direct Total)</span>
            </button>

            <button
              type="button"
              onClick={handleSwitchToItemized}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                orderMode === "ITEMIZED"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/60 dark:border-slate-700/60"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Itemized Line Items ({formItems.filter((i) => i.quantity > 0).length || formItems.length})</span>
            </button>
          </div>

          {/* ── Mode 1: DIRECT TOTAL (Total Only) ────────────────────────────── */}
          {orderMode === "DIRECT" ? (
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-amber-200/60 dark:border-amber-500/20">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-200/80 dark:bg-amber-500/30 text-amber-900 dark:text-amber-200 border border-amber-300/80 dark:border-amber-500/40">
                      Total Only (Direct)
                    </span>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Direct Lump-sum Order Total
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Update order amount directly as a lump-sum without itemized products.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSwitchToItemized}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 text-xs font-semibold border border-slate-200 dark:border-slate-700 shadow-sm transition-all cursor-pointer shrink-0 self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Itemized List</span>
                </button>
              </div>

              {/* Direct Total Input Box */}
              <div className="space-y-2 max-w-md">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Direct Total Amount (BDT): <span className="text-rose-500 font-bold ml-0.5">*</span>
                  </label>
                  {order.totalBdt != null && (
                    <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 font-mono">
                      Previous Stored Total: <strong className="text-slate-800 dark:text-slate-200 font-semibold">BDT {Number(order.totalBdt).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-extrabold text-slate-500 dark:text-slate-400 font-mono pointer-events-none">
                    BDT
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formDirectTotal}
                    onChange={(e) => {
                      setFormDirectTotal(e.target.value);
                      if (e.target.value.trim() && fieldErrors.directTotal) clearFieldError("directTotal");
                    }}
                    placeholder={order.totalBdt != null ? String(order.totalBdt) : "0.00"}
                    className={`w-full pl-14 pr-4 py-2.5 bg-white dark:bg-slate-900 border-2 rounded-xl text-base font-extrabold font-mono text-slate-900 dark:text-slate-100 focus:outline-none transition-colors shadow-sm ${
                      fieldErrors.directTotal
                        ? "border-rose-500 bg-rose-50/20 dark:bg-rose-950/20 focus:ring-2 focus:ring-rose-500/30"
                        : "border-amber-300 dark:border-amber-600/50 focus:ring-2 focus:ring-blue-500"
                    }`}
                  />
                </div>
                {fieldErrors.directTotal && (
                  <p className="text-xs text-rose-500 font-medium mt-1 animate-fade-in flex items-center gap-1">
                    <span>{fieldErrors.directTotal}</span>
                  </p>
                )}
                {order.totalBdt != null && formDirectTotal !== String(order.totalBdt) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormDirectTotal(String(order.totalBdt));
                      clearFieldError("directTotal");
                    }}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer pt-0.5 block"
                  >
                    ↺ Reset to previous total ({Number(order.totalBdt).toLocaleString("en-US", { minimumFractionDigits: 2 })})
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* ── Mode 2: ITEMIZED PRODUCTS ──────────────────────────────────── */
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-blue-500" />
                    <span>Order Line Items ({formItems.length})</span>
                    <span className="text-rose-500 font-bold ml-0.5">*</span>
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Select catalog products and specify quantities and unit rates.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderMode("DIRECT")}
                    className="text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 underline font-medium cursor-pointer"
                  >
                    Switch back to Direct Total
                  </button>

                  <button
                    type="button"
                    onClick={addItemRow}
                    className="px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-lg border border-blue-200 dark:border-blue-500/20 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Item</span>
                  </button>
                </div>
              </div>

              {fieldErrors.items && (
                <p className="text-xs text-rose-500 font-medium animate-fade-in flex items-center gap-1">
                  <span>{fieldErrors.items}</span>
                </p>
              )}

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {formItems.map((item, idx) => {
                  const rowTotal =
                    (Number(item.quantity) || 0) * (Number(item.unitPriceBdt) || 0);
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-slate-400 uppercase">
                          Item #{idx + 1}
                        </span>
                        {formItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItemRow(idx)}
                            className="text-slate-400 hover:text-rose-500 p-1 transition-colors cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                        {/* Product select */}
                        <div className="sm:col-span-6">
                          <select
                            value={item.productId}
                            onChange={(e) => handleProductSelect(idx, e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">
                              — Select Catalog Product (or Custom) —
                            </option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} {p.priceBdt ? `(BDT ${p.priceBdt})` : ""}
                              </option>
                            ))}
                          </select>

                          {/* Custom product description if needed */}
                          {!item.productId && (
                            <input
                              type="text"
                              placeholder="Enter item description..."
                              value={item.sourceProductName}
                              onChange={(e) =>
                                handleCustomNameChange(idx, e.target.value)
                              }
                              className="w-full mt-1.5 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200"
                            />
                          )}
                        </div>

                        {/* Quantity */}
                        <div className="sm:col-span-2">
                          <label className="text-[10px] text-slate-400 uppercase font-semibold block sm:hidden">
                            Qty
                          </label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            placeholder="Qty"
                            value={item.quantity === 0 ? "" : item.quantity}
                            onChange={(e) =>
                              handleQuantityChange(idx, e.target.value)
                            }
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-center font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        {/* Unit Price BDT */}
                        <div className="sm:col-span-2">
                          <label className="text-[10px] text-slate-400 uppercase font-semibold block sm:hidden">
                            Rate (BDT)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            placeholder="Rate"
                            value={item.unitPriceBdt === 0 ? "" : item.unitPriceBdt}
                            onChange={(e) =>
                              handlePriceChange(idx, e.target.value)
                            }
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-right font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        {/* Row Subtotal */}
                        <div className="sm:col-span-2 text-right">
                          <span className="text-[10px] text-slate-400 block uppercase sm:hidden">
                            Subtotal
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                            {rowTotal.toLocaleString("en-US", {
                              minimumFractionDigits: 1,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Summary & Buttons */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Calculated Grand Total:
              </span>
              <span className="text-base sm:text-lg font-extrabold font-mono text-blue-600 dark:text-blue-400">
                BDT{" "}
                {calculatedGrandTotal.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </span>
              {orderMode === "DIRECT" && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                  Total Only
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isPending}
                className="px-5 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                {isPending ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving Changes…</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save Order Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

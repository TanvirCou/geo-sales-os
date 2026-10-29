"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { createOrder, OrderInput } from "@/actions/orders";
import { OrderStatus } from "@prisma/client";
import { Building2, Search, Check, X, Plus, Trash2, Calendar, FileText, CheckCircle2 } from "lucide-react";

export interface BusinessOption {
  id: string;
  name: string;
  area?: string | null;
  district?: string | null;
  phoneRaw?: string | null;
}

export interface ProductOption {
  id: string;
  name: string;
  priceBdt: number | null;
  unit?: string | null;
}

interface RecordOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  businesses: BusinessOption[];
  products: ProductOption[];
  initialBusinessId?: string;
  initialBusinessName?: string;
  onSuccess?: () => void;
}

export default function RecordOrderModal({
  isOpen,
  onClose,
  businesses,
  products,
  initialBusinessId,
  initialBusinessName,
  onSuccess,
}: RecordOrderModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Selected Business state
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessOption | null>(null);
  const [businessSearchQuery, setBusinessSearchQuery] = useState("");
  const [showBusinessDropdown, setShowBusinessDropdown] = useState(false);
  const businessSearchContainerRef = useRef<HTMLDivElement>(null);

  // Order Details state
  const [formExtId, setFormExtId] = useState("");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [formStatus, setFormStatus] = useState<OrderStatus>(OrderStatus.COMPLETED);
  const [formError, setFormError] = useState<string | null>(null);

  // Line items state
  const [formItems, setFormItems] = useState<
    Array<{ productId: string; quantity: number; unitPriceBdt: number }>
  >([{ productId: "", quantity: 1, unitPriceBdt: 0 }]);

  // Initialize or reset when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialBusinessId) {
        const found = businesses.find((b) => b.id === initialBusinessId);
        setSelectedBusiness(
          found || {
            id: initialBusinessId,
            name: initialBusinessName || "Selected Business",
          }
        );
      } else {
        setSelectedBusiness(null);
      }
      setBusinessSearchQuery("");
      setShowBusinessDropdown(false);
      setFormExtId(`ORD-${Date.now().toString().slice(-6)}`);
      setFormDate(new Date().toISOString().split("T")[0]);
      setFormStatus(OrderStatus.COMPLETED);
      setFormError(null);

      // Default line item
      if (products.length > 0) {
        setFormItems([
          {
            productId: products[0].id,
            quantity: 1,
            unitPriceBdt: products[0].priceBdt || 0,
          },
        ]);
      } else {
        setFormItems([{ productId: "", quantity: 1, unitPriceBdt: 0 }]);
      }
    }
  }, [isOpen, initialBusinessId, initialBusinessName, businesses, products]);

  // Click outside listener for business search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        businessSearchContainerRef.current &&
        !businessSearchContainerRef.current.contains(event.target as Node)
      ) {
        setShowBusinessDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isOpen) return null;

  // Filter businesses in real-time
  const filteredBusinesses = businesses
    .filter((b) => {
      if (!businessSearchQuery.trim()) return true;
      const q = businessSearchQuery.toLowerCase();
      return (
        b.name.toLowerCase().includes(q) ||
        b.area?.toLowerCase().includes(q) ||
        b.district?.toLowerCase().includes(q) ||
        b.phoneRaw?.includes(q)
      );
    })
    .slice(0, 8);

  const handleProductSelect = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    setFormItems(
      formItems.map((item, i) =>
        i === index
          ? {
              ...item,
              productId,
              unitPriceBdt: prod?.priceBdt || 0,
            }
          : item
      )
    );
  };

  const handleItemChange = (
    index: number,
    field: "quantity" | "unitPriceBdt",
    value: number
  ) => {
    setFormItems(
      formItems.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const addItemRow = () => {
    const defaultProd = products[0];
    setFormItems([
      ...formItems,
      {
        productId: defaultProd?.id || "",
        quantity: 1,
        unitPriceBdt: defaultProd?.priceBdt || 0,
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (formItems.length === 1) return;
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  const calculatedFormTotal = formItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPriceBdt) || 0),
    0
  );

  const handleSaveOrder = () => {
    if (!selectedBusiness?.id) {
      setFormError("Please select a business for this order.");
      return;
    }
    if (formItems.length === 0) {
      setFormError("Please add at least one line item.");
      return;
    }

    const hasUnselectedProduct = formItems.some(
      (it) => !it.productId || it.productId.trim() === ""
    );
    if (hasUnselectedProduct) {
      setFormError("Please select a product for all order items.");
      return;
    }

    const hasInvalidQtyOrPrice = formItems.some(
      (it) => isNaN(it.quantity) || it.quantity <= 0 || isNaN(it.unitPriceBdt) || it.unitPriceBdt < 0
    );
    if (hasInvalidQtyOrPrice) {
      setFormError("Please enter valid positive quantities and rates for all items.");
      return;
    }

    const payload: OrderInput = {
      businessId: selectedBusiness.id,
      orderedAt: formDate ? new Date(formDate).toISOString() : null,
      status: formStatus,
      externalOrderId: formExtId.trim() || undefined,
      items: formItems.map((it) => {
        const prod = products.find((p) => p.id === it.productId);
        return {
          productId: it.productId,
          sourceProductName: prod?.name || "Product",
          quantity: it.quantity,
          unitPriceBdt: it.unitPriceBdt,
        };
      }),
    };

    startTransition(async () => {
      const res = await createOrder(payload);
      if (res?.error) {
        setFormError(res.error);
      } else {
        onClose();
        if (onSuccess) onSuccess();
        router.refresh();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5 text-slate-900 dark:text-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              +
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Record New Client Order
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Create an invoice linked to this business. It will turn GREEN on the sales map.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {formError && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs sm:text-sm font-medium">
            {formError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ── Client Business Searchable Selector ────────────────────────── */}
          <div ref={businessSearchContainerRef} className="md:col-span-2 space-y-1.5 relative">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Client Business *
            </label>

            {selectedBusiness ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/70 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-slate-800 dark:text-slate-100">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm truncate text-blue-950 dark:text-blue-100">
                        {selectedBusiness.name}
                      </span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    </div>
                    <p className="text-xs text-blue-700/80 dark:text-blue-300/80 truncate">
                      {selectedBusiness.area || selectedBusiness.district || "Client Account"}
                      {selectedBusiness.phoneRaw ? ` • ${selectedBusiness.phoneRaw}` : ""}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedBusiness(null);
                    setBusinessSearchQuery("");
                    setShowBusinessDropdown(true);
                  }}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 hover:bg-blue-100/50 dark:hover:bg-slate-700 border border-blue-200 dark:border-blue-500/30 transition-all shrink-0 ml-2"
                >
                  Change Business
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <input
                    type="text"
                    value={businessSearchQuery}
                    onChange={(e) => {
                      setBusinessSearchQuery(e.target.value);
                      setShowBusinessDropdown(true);
                    }}
                    onFocus={() => setShowBusinessDropdown(true)}
                    placeholder="Search business by name, area or phone..."
                    className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 shadow-sm"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>

                {showBusinessDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 animate-fade-in">
                    <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Matching Businesses ({filteredBusinesses.length})
                    </div>
                    {filteredBusinesses.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-slate-500 text-center">
                        No businesses found matching "{businessSearchQuery}"
                      </div>
                    ) : (
                      filteredBusinesses.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            setSelectedBusiness(b);
                            setShowBusinessDropdown(false);
                            setFormError(null);
                          }}
                          className="w-full px-3.5 py-2.5 text-left hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors flex items-center justify-between gap-3 group"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                              {b.name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              <span>{b.area || b.district || "Unspecified Area"}</span>
                              {b.phoneRaw && <span>• {b.phoneRaw}</span>}
                            </div>
                          </div>
                          <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            Select →
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Order Reference ID
            </label>
            <input
              type="text"
              value={formExtId}
              onChange={(e) => setFormExtId(e.target.value)}
              placeholder="e.g. ORD-2026-001"
              className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 font-mono shadow-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Order Date
            </label>
            <input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 shadow-sm"
            />
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Order Status
            </label>
            <select
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value as OrderStatus)}
              className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 shadow-sm"
            >
              <option value={OrderStatus.COMPLETED}>Delivered (Completed)</option>
              <option value={OrderStatus.PENDING}>Pending</option>
              <option value={OrderStatus.CANCELLED}>Cancelled</option>
            </select>
          </div>
        </div>

        {/* Line Items Section */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Order Items & Pricing
            </h4>
            <button
              type="button"
              onClick={addItemRow}
              className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {formItems.map((item, idx) => (
              <div
                key={idx}
                className="flex flex-col sm:grid sm:grid-cols-[1fr_80px_110px_36px] gap-2 p-2.5 sm:p-0 bg-slate-50 dark:bg-slate-800/40 sm:bg-transparent sm:dark:bg-transparent rounded-lg border sm:border-0 border-slate-200 dark:border-slate-700/60 items-center"
              >
                <div className="w-full">
                  <select
                    value={item.productId}
                    onChange={(e) => handleProductSelect(idx, e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-blue-500 shadow-sm"
                  >
                    <option value="">Select a product…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.unit ? `(${p.unit})` : ""} — BDT {p.priceBdt}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 w-full sm:contents">
                  <div className="flex-1 sm:flex-initial">
                    <input
                      type="number"
                      min="1"
                      step="any"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(idx, "quantity", parseFloat(e.target.value) || 0)
                      }
                      className="w-full px-2.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 text-center focus:outline-none focus:border-blue-500 font-mono shadow-sm"
                    />
                  </div>

                  <div className="flex-1 sm:flex-initial">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Price"
                      value={item.unitPriceBdt === 0 ? "" : item.unitPriceBdt}
                      onChange={(e) =>
                        handleItemChange(idx, "unitPriceBdt", parseFloat(e.target.value) || 0)
                      }
                      className="w-full px-2.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 text-right focus:outline-none focus:border-blue-500 font-mono shadow-sm"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItemRow(idx)}
                    disabled={formItems.length === 1}
                    className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 disabled:opacity-30 transition-colors border border-rose-100 dark:border-transparent"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Calculated Total Display */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <span className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">
              Calculated Total Amount:
            </span>
            <span className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400 font-mono tabular-nums">
              BDT {calculatedFormTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveOrder}
            disabled={isPending}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold shadow-md shadow-blue-600/25 transition-all disabled:opacity-50"
          >
            {isPending ? "Recording…" : "Save Order"}
          </button>
        </div>
      </div>
    </div>
  );
}

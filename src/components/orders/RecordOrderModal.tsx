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
  const [formStatus, setFormStatus] = useState<OrderStatus | "">("" as OrderStatus | "");
  const [formError, setFormError] = useState<string | null>(null);

  // Field validation errors
  const [fieldErrors, setFieldErrors] = useState<{
    business?: string;
    extId?: string;
    date?: string;
    status?: string;
    items?: string;
  }>({});

  const clearFieldError = (field: "business" | "extId" | "date" | "status" | "items") => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

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
      setFormStatus("" as OrderStatus | "");
      setFormError(null);
      setFieldErrors({});

      // Default line item: start with unselected product so user must explicitly choose
      setFormItems([{ productId: "", quantity: 1, unitPriceBdt: 0 }]);
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
    clearFieldError("items");
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
    clearFieldError("items");
    setFormItems(
      formItems.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const addItemRow = () => {
    clearFieldError("items");
    setFormItems([
      ...formItems,
      {
        productId: "",
        quantity: 1,
        unitPriceBdt: 0,
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
    const errors: {
      business?: string;
      extId?: string;
      date?: string;
      status?: string;
      items?: string;
    } = {};

    if (!selectedBusiness?.id) {
      errors.business = "Please select a client business.";
    }

    if (!formExtId.trim()) {
      errors.extId = "Order Reference ID is required.";
    }

    if (!formDate.trim()) {
      errors.date = "Order Date is required.";
    }

    if (!formStatus) {
      errors.status = "Order Status is required.";
    }

    if (formItems.length === 0) {
      errors.items = "Please add at least one line item.";
    } else {
      const hasUnselectedProduct = formItems.some(
        (it) => !it.productId || it.productId.trim() === ""
      );
      if (hasUnselectedProduct) {
        errors.items = "Please select a product for all line items.";
      } else {
        const hasInvalidQtyOrPrice = formItems.some(
          (it) => isNaN(it.quantity) || it.quantity <= 0 || isNaN(it.unitPriceBdt) || it.unitPriceBdt < 0
        );
        if (hasInvalidQtyOrPrice) {
          errors.items = "Please enter valid positive quantities and unit prices for all items.";
        }
      }
    }

    if (Object.keys(errors).length > 0 || !selectedBusiness) {
      setFieldErrors(errors);
      setFormError(null);
      return;
    }

    setFieldErrors({});
    setFormError(null);

    const payload: OrderInput = {
      businessId: selectedBusiness.id,
      orderedAt: formDate ? new Date(formDate).toISOString() : null,
      status: formStatus as OrderStatus,
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
              Client Business <span className="text-rose-500 font-bold ml-0.5">*</span>
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
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 hover:bg-blue-100/50 dark:hover:bg-slate-700 border border-blue-200 dark:border-blue-500/30 transition-all shrink-0 ml-2 cursor-pointer"
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
                    className={`w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none shadow-sm transition-colors ${
                      fieldErrors.business
                        ? "border border-rose-500 bg-rose-50/20 dark:bg-rose-950/20 focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
                        : "border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                    }`}
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>

                {fieldErrors.business && (
                  <p className="text-xs text-rose-500 font-medium mt-1 animate-fade-in flex items-center gap-1">
                    <span>{fieldErrors.business}</span>
                  </p>
                )}

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
                            clearFieldError("business");
                            setFormError(null);
                          }}
                          className="w-full px-3.5 py-2.5 text-left hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors flex items-center justify-between gap-3 group cursor-pointer"
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
              Order Reference ID <span className="text-rose-500 font-bold ml-0.5">*</span>
            </label>
            <input
              type="text"
              value={formExtId}
              onChange={(e) => {
                setFormExtId(e.target.value);
                if (e.target.value.trim() && fieldErrors.extId) clearFieldError("extId");
              }}
              placeholder="e.g. ORD-2026-001"
              className={`w-full px-3.5 py-2 bg-white dark:bg-slate-800 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none font-mono shadow-sm transition-colors ${
                fieldErrors.extId
                  ? "border border-rose-500 bg-rose-50/20 dark:bg-rose-950/20 focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
                  : "border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
              }`}
            />
            {fieldErrors.extId && (
              <p className="text-xs text-rose-500 font-medium mt-1 animate-fade-in flex items-center gap-1">
                <span>{fieldErrors.extId}</span>
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Order Date <span className="text-rose-500 font-bold ml-0.5">*</span>
            </label>
            <input
              type="date"
              value={formDate}
              onChange={(e) => {
                setFormDate(e.target.value);
                if (e.target.value.trim() && fieldErrors.date) clearFieldError("date");
              }}
              className={`w-full px-3.5 py-2 bg-white dark:bg-slate-800 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none shadow-sm transition-colors ${
                fieldErrors.date
                  ? "border border-rose-500 bg-rose-50/20 dark:bg-rose-950/20 focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
                  : "border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
              }`}
            />
            {fieldErrors.date && (
              <p className="text-xs text-rose-500 font-medium mt-1 animate-fade-in flex items-center gap-1">
                <span>{fieldErrors.date}</span>
              </p>
            )}
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Order Status <span className="text-rose-500 font-bold ml-0.5">*</span>
            </label>
            <select
              value={formStatus}
              onChange={(e) => {
                setFormStatus(e.target.value as OrderStatus | "");
                if (e.target.value && fieldErrors.status) clearFieldError("status");
              }}
              className={`w-full px-3.5 py-2 bg-white dark:bg-slate-800 rounded-lg text-sm focus:outline-none shadow-sm cursor-pointer transition-colors ${
                fieldErrors.status
                  ? "border border-rose-500 bg-rose-50/20 dark:bg-rose-950/20 focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
                  : "border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
              } ${
                formStatus === ""
                  ? "text-slate-400 dark:text-slate-500"
                  : "text-slate-900 dark:text-slate-100"
              }`}
            >
              <option value="" disabled>— Select a Status —</option>
              <option value={OrderStatus.PENDING}>Pending</option>
              <option value={OrderStatus.COMPLETED}>Delivered</option>
              <option value={OrderStatus.CANCELLED}>Cancelled</option>
            </select>
            {fieldErrors.status && (
              <p className="text-xs text-rose-500 font-medium mt-1 animate-fade-in flex items-center gap-1">
                <span>{fieldErrors.status}</span>
              </p>
            )}
          </div>
        </div>

        {/* Line Items Section */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Order Items & Pricing <span className="text-rose-500 font-bold ml-0.5">*</span>
            </h4>
            <button
              type="button"
              onClick={addItemRow}
              className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          </div>

          {fieldErrors.items && (
            <p className="text-xs text-rose-500 font-medium animate-fade-in flex items-center gap-1">
              <span>{fieldErrors.items}</span>
            </p>
          )}

          <div className="space-y-2.5">
            {formItems.map((item, idx) => (
              <div
                key={idx}
                className="flex flex-col sm:grid sm:grid-cols-[1fr_80px_110px_90px_36px] gap-2 p-2.5 sm:p-0 bg-slate-50 dark:bg-slate-800/40 sm:bg-transparent sm:dark:bg-transparent rounded-lg border sm:border-0 border-slate-200 dark:border-slate-700/60 items-center"
              >
                <div className="w-full">
                  <select
                    value={item.productId}
                    onChange={(e) => handleProductSelect(idx, e.target.value)}
                    className={`w-full px-3 py-2 bg-white dark:bg-slate-800 rounded-lg text-sm text-slate-900 dark:text-slate-200 focus:outline-none shadow-sm cursor-pointer transition-colors ${
                      !item.productId && fieldErrors.items
                        ? "border border-rose-500 bg-rose-50/20 dark:bg-rose-950/20 focus:ring-2 focus:ring-rose-500/30"
                        : "border border-slate-200 dark:border-slate-700 focus:border-blue-500"
                    }`}
                  >
                    <option value="" disabled>
                      — Select a product —
                    </option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.unit ? ` (${p.unit})` : ""}
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

                  <div className="hidden sm:block text-right text-xs font-mono font-bold text-slate-700 dark:text-slate-300 px-1 truncate">
                    ৳{((item.quantity || 0) * (item.unitPriceBdt || 0)).toLocaleString("en-US", { minimumFractionDigits: 0 })}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItemRow(idx)}
                    disabled={formItems.length === 1}
                    className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 disabled:opacity-30 transition-colors border border-rose-100 dark:border-transparent cursor-pointer"
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

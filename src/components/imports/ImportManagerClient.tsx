"use client";

import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Building2,
  Calendar,
  Phone,
  Search,
  X,
  ArrowRight,
  RefreshCw,
  Download,
  Check,
  Eye,
  Filter,
} from "lucide-react";
import {
  previewAndGeocodeBatch,
  previewAndGeocodeChunk,
  commitImportBatch,
  searchLocationSuggestions,
  type RawImportRow,
  type ResolvedImportRow,
  type LocationSuggestion,
  type CachedBusinessResolution,
} from "@/actions/import";
import Link from "next/link";

export default function ImportManagerClient() {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState<string>("");
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressProcessed, setProgressProcessed] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [progressStatusText, setProgressStatusText] = useState("");
  const [currentLocationName, setCurrentLocationName] = useState("");

  const [resolvedRows, setResolvedRows] = useState<ResolvedImportRow[]>([]);
  const [summary, setSummary] = useState<{
    totalRows: number;
    uniqueBusinesses: number;
    resolvedCount: number;
    needsLocationCount: number;
    totalAmountBdt: number;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<"all" | "needs_location" | "resolved">("all");
  const [previewPage, setPreviewPage] = useState(1);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<{
    success: boolean;
    message: string;
    importedOrdersCount: number;
    newBusinessesCount: number;
    linkedBusinessesCount: number;
  } | null>(null);

  // Fix Modal State
  const [fixingRow, setFixingRow] = useState<ResolvedImportRow | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);

  // Custom Modals State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [unresolvedWarningCount, setUnresolvedWarningCount] = useState(0);
  const [showResetModal, setShowResetModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Download Sample Excel Template ──────────────────────────────────────────
  const downloadSampleTemplate = () => {
    const sampleData = [
      {
        "Business Name": "Sultan's Dine",
        "Category": "Restaurant",
        "Phone Number": "01711223344",
        "Address": "Dhanmondi, Dhaka",
        "Status": "Delivered",
        "Total Amount": 4500,
        "Date": "2026-10-25",
      },
      {
        "Business Name": "Sultan's Dine",
        "Category": "Restaurant",
        "Phone Number": "01711223344",
        "Address": "Dhanmondi, Dhaka",
        "Status": "pending",
        "Total Amount": 3200,
        "Date": "2026-10-27",
      },
      {
        "Business Name": "KFC",
        "Category": "Fast Food",
        "Phone Number": "01822334455",
        "Address": "Mirpur 10, Dhaka",
        "Status": "cancelled",
        "Total Amount": 1800,
        "Date": "2026-10-26",
      },
      {
        "Business Name": "Takeout",
        "Category": "Burger Shop",
        "Phone Number": "01933445566",
        "Address": "Banani, Dhaka",
        "Status": "Delivered",
        "Total Amount": 2750,
        "Date": "2026-10-27",
      },
      {
        "Business Name": "Bhai Bhai Enterprise",
        "Category": "",
        "Phone Number": "01644556677",
        "Address": "Chawkbazar, Old Dhaka",
        "Status": "Pending",
        "Total Amount": "",
        "Date": "2026-10-28",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders_Import_Sample");
    XLSX.writeFile(wb, "orders_business_import_sample.xlsx");
  };

  // ── Parse Excel File in Browser ─────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    processSelectedFile(selected);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) processSelectedFile(dropped);
  };

  const processSelectedFile = async (selected: File) => {
    setFile(selected);
    setIsParsing(true);
    setParseProgress("Reading spreadsheet columns...");
    setCommitResult(null);

    try {
      const arrayBuffer = await selected.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

      if (!rawJson || rawJson.length === 0) {
        setErrorMessage("The selected spreadsheet has no data rows.");
        setIsParsing(false);
        return;
      }

      setParseProgress(`Parsed ${rawJson.length} rows. Running smart geocoding & business deduplication...`);

      // Flexible column mapper: find column regardless of slight name variation
      const normalizeKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, "");

      const mappedRows: RawImportRow[] = rawJson.map((row, idx) => {
        let businessName = "";
        let category = "";
        let location = "";
        let totalPrice: number | null = null;
        let phoneRaw = "";
        let date = "";
        let statusRaw = "pending";

        for (const [col, val] of Object.entries(row)) {
          const norm = normalizeKey(col);
          const strVal = String(val ?? "").trim();

          if (norm.includes("business") || norm.includes("company") || norm.includes("client") || norm === "name") {
            businessName = strVal;
          } else if (norm.includes("category") || norm.includes("genre") || norm.includes("type")) {
            category = strVal;
          } else if (norm.includes("address") || norm.includes("location") || norm.includes("area") || norm.includes("city")) {
            location = strVal;
          } else if (norm.includes("totalamount") || norm.includes("totalprice") || norm.includes("amount") || norm.includes("price") || norm.includes("total") || norm.includes("bill")) {
            const cleaned = strVal.replace(/[^0-9.]/g, "");
            totalPrice = cleaned && !isNaN(parseFloat(cleaned)) ? parseFloat(cleaned) : null;
          } else if (norm.includes("phone") || norm.includes("mobile") || norm.includes("contact")) {
            phoneRaw = strVal;
          } else if (norm.includes("date") || norm.includes("time") || norm.includes("orderedat")) {
            if (val instanceof Date && !isNaN(val.getTime())) {
              date = val.toISOString();
            } else if (strVal && strVal !== "null" && strVal !== "undefined") {
              date = strVal;
            } else {
              date = "";
            }
          } else if (norm.includes("status") || norm.includes("statue") || norm.includes("payment")) {
            statusRaw = strVal;
          }
        }

        return {
          rowId: `row_${idx + 1}`,
          businessName: businessName || `Business ${idx + 1}`,
          category: category || "General",
          location: location || "Dhaka",
          totalPrice,
          phoneRaw,
          date,
          statusRaw,
        };
      });

      // ── Chunked Geocoding with Real-time Progress ────────────────────────
      const total = mappedRows.length;
      setProgressTotal(total);
      setProgressProcessed(0);
      setProgressPercent(0);

      const CHUNK_SIZE = 15;
      const chunks: RawImportRow[][] = [];
      for (let i = 0; i < total; i += CHUNK_SIZE) {
        chunks.push(mappedRows.slice(i, i + CHUNK_SIZE));
      }

      let accumulatedRows: ResolvedImportRow[] = [];
      let currentCache: Record<string, CachedBusinessResolution> = {};

      for (let cIdx = 0; cIdx < chunks.length; cIdx++) {
        const chunk = chunks[cIdx];
        const batchNum = cIdx + 1;
        const totalBatches = chunks.length;

        // Sample location being processed in this chunk for user feedback
        const sampleLoc = chunk.find((r) => r.location)?.location || "Dhaka";
        setCurrentLocationName(sampleLoc);
        setProgressStatusText(`Geocoding batch ${batchNum} of ${totalBatches}... (${sampleLoc})`);

        const res = await previewAndGeocodeChunk(chunk, currentCache);
        if (!res.success) {
          throw new Error(res.error || `Failed to process batch ${batchNum}`);
        }

        accumulatedRows = [...accumulatedRows, ...res.rows];
        currentCache = { ...currentCache, ...res.updatedCache };

        const processed = Math.min(total, (cIdx + 1) * CHUNK_SIZE);
        setProgressProcessed(processed);
        const percent = Math.min(100, Math.round((processed / total) * 100));
        setProgressPercent(percent);
      }

      // Compute final summary
      const resolvedCount = accumulatedRows.filter((r) => r.geocodeStatus === "resolved").length;
      const needsLocationCount = accumulatedRows.length - resolvedCount;
      const totalAmountBdt = accumulatedRows.reduce((sum, r) => sum + (r.totalPrice || 0), 0);

      setSummary({
        totalRows: accumulatedRows.length,
        uniqueBusinesses: Object.keys(currentCache).length,
        resolvedCount,
        needsLocationCount,
        totalAmountBdt,
      });

      setResolvedRows(accumulatedRows);
    } catch (err: any) {
      console.error("Error reading file:", err);
      setErrorMessage("Failed to read Excel file: " + err.message);
    } finally {
      setIsParsing(false);
      setParseProgress("");
    }
  };

  // ── Open Assign Location Modal ──────────────────────────────────────────────
  const handleOpenAssign = (row: ResolvedImportRow) => {
    setFixingRow(row);
    setSearchQuery(`${row.businessName}, ${row.location}`);
    setSuggestions([]);
  };

  // ── Search Location in Modal ────────────────────────────────────────────────
  const handleSearchSuggestions = async () => {
    if (!searchQuery.trim()) return;
    setIsSearchingLocation(true);
    try {
      const res = await searchLocationSuggestions(searchQuery);
      setSuggestions(res);
    } catch (err) {
      console.error("Suggestion error:", err);
    } finally {
      setIsSearchingLocation(false);
    }
  };

  // ── Apply Location to Row and All Matching Dedupe Keys ───────────────────────
  const applyLocationToRow = (suggestion: LocationSuggestion) => {
    if (!fixingRow) return;

    const dedupeKey = fixingRow.businessDedupeKey;

    setResolvedRows((prev) =>
      prev.map((r) => {
        if (r.businessDedupeKey === dedupeKey || r.rowId === fixingRow.rowId) {
          return {
            ...r,
            geocodeStatus: "resolved",
            placeId: suggestion.placeId,
            latitude: suggestion.latitude,
            longitude: suggestion.longitude,
            formattedAddress: suggestion.formattedAddress,
            confidence: 1.0,
          };
        }
        return r;
      })
    );

    // Update summary counts
    setSummary((prev) => {
      if (!prev) return prev;
      const newResolved = resolvedRows.filter((r) =>
        r.businessDedupeKey === dedupeKey || r.rowId === fixingRow.rowId
      ).length;
      return {
        ...prev,
        resolvedCount: prev.resolvedCount + newResolved,
        needsLocationCount: Math.max(0, prev.needsLocationCount - newResolved),
      };
    });

    setFixingRow(null);
  };

  // ── Final Commit to Database ────────────────────────────────────────────────
  const handleCommit = async () => {
    if (resolvedRows.length === 0) return;

    const unresolvedCount = resolvedRows.filter((r) => r.geocodeStatus === "needs_location").length;
    if (unresolvedCount > 0) {
      setUnresolvedWarningCount(unresolvedCount);
      setShowConfirmModal(true);
      return;
    }

    await executeCommit();
  };

  const executeCommit = async () => {
    setShowConfirmModal(false);
    setIsCommitting(true);
    try {
      const res = await commitImportBatch(resolvedRows);
      if (!res.success) {
        setErrorMessage(res.error || "Failed to commit import.");
        setIsCommitting(false);
        return;
      }

      setCommitResult({
        success: true,
        message: res.message || "Import completed successfully!",
        importedOrdersCount: res.importedOrdersCount,
        newBusinessesCount: res.newBusinessesCount,
        linkedBusinessesCount: res.linkedBusinessesCount,
      });
    } catch (err: any) {
      console.error("Commit error:", err);
      setErrorMessage("Error committing import: " + (err.message || "Unknown error occurred"));
    } finally {
      setIsCommitting(false);
    }
  };

  const filteredRows = resolvedRows.filter((r) => {
    if (activeTab === "needs_location") return r.geocodeStatus === "needs_location";
    if (activeTab === "resolved") return r.geocodeStatus === "resolved";
    return true;
  });

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ITEMS_PER_PAGE));
  const safePreviewPage = Math.min(previewPage, totalPages);
  const paginatedRows = filteredRows.slice(
    (safePreviewPage - 1) * ITEMS_PER_PAGE,
    safePreviewPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-6">
      {/* ── Top Header Actions ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            Excel & CSV Order Import
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Automated location geocoding, business deduplication, and order synchronization.
          </p>
        </div>

        <button
          onClick={downloadSampleTemplate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
        >
          <Download className="w-4 h-4 text-blue-500" />
          Download Sample Template (.xlsx)
        </button>
      </div>

      {/* ── Success Banner After Commit ──────────────────────────────────── */}
      {commitResult && (
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-6 space-y-4 animate-in fade-in zoom-in-95">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Import Successfully Committed to Database!
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {commitResult.message}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-emerald-200 dark:border-emerald-900/40">
              <span className="text-xs text-slate-500 dark:text-slate-400">Total Orders Saved</span>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {commitResult.importedOrdersCount}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-emerald-200 dark:border-emerald-900/40">
              <span className="text-xs text-slate-500 dark:text-slate-400">New Businesses Added</span>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {commitResult.newBusinessesCount}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-emerald-200 dark:border-emerald-900/40">
              <span className="text-xs text-slate-500 dark:text-slate-400">Existing Businesses Linked</span>
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                {commitResult.linkedBusinessesCount}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/dashboard/map/google"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
            >
              <MapPin className="w-4 h-4" />
              View on Google Map
            </Link>
            <Link
              href="/dashboard/map/geoapify"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
            >
              <MapPin className="w-4 h-4" />
              View on Geoapify Map
            </Link>
            <Link
              href="/dashboard/orders"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-all"
            >
              <Eye className="w-4 h-4" />
              View in Orders List
            </Link>
            <button
              onClick={() => {
                setFile(null);
                setResolvedRows([]);
                setSummary(null);
                setCommitResult(null);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 ml-auto transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Import Another File
            </button>
          </div>
        </div>
      )}

      {/* ── Progress Card (Shown while parsing & geocoding) ────────────────── */}
      {isParsing && (
        <div className="rounded-3xl border border-blue-200 dark:border-blue-900/60 bg-gradient-to-b from-blue-50/40 via-white to-white dark:from-blue-950/20 dark:via-slate-900 dark:to-slate-900 p-8 sm:p-12 text-center shadow-xl space-y-6 animate-in fade-in zoom-in-95">
          {/* Top Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3.5 text-left">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Geocoding & Validating Import Data
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {progressStatusText || "Matching landmarks & GPS coordinates in Bangladesh..."}
                </p>
              </div>
            </div>

            {/* Percentage Display */}
            <div className="flex items-baseline justify-end gap-1 shrink-0">
              <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-blue-600 dark:text-blue-400">
                {progressPercent}
              </span>
              <span className="text-lg font-bold text-blue-600/70 dark:text-blue-400/70 font-mono">%</span>
            </div>
          </div>

          {/* Large Animated Progress Bar */}
          <div className="space-y-2">
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-4 overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700/60 shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 transition-all duration-300 ease-out shadow-sm"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 px-0.5">
              <span>
                Processed: <strong className="text-slate-900 dark:text-white font-mono">{progressProcessed}</strong> of <strong className="text-slate-900 dark:text-white font-mono">{progressTotal}</strong> orders
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                {progressPercent === 100 ? "Finalizing preview..." : `${progressPercent}% Completed`}
              </span>
            </div>
          </div>

          {/* Micro Status Ticker */}
          <div className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-blue-50/60 dark:bg-slate-800/60 border border-blue-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
            <MapPin className="w-4 h-4 text-emerald-500 shrink-0 animate-bounce" />
            <span className="truncate">
              Currently searching: <strong className="text-slate-900 dark:text-white">{currentLocationName || "Bangladesh Locations"}</strong>
            </span>
          </div>
        </div>
      )}

      {/* ── Upload Area (Shown when not parsing and no rows) ──────────────── */}
      {!isParsing && !commitResult && resolvedRows.length === 0 && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="cursor-pointer rounded-3xl border-2 border-dashed p-10 sm:p-16 text-center transition-all border-slate-300 hover:border-blue-500 dark:border-slate-700 dark:hover:border-blue-400 bg-white/60 dark:bg-slate-900/40 hover:bg-blue-50/30 dark:hover:bg-slate-800/40"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Upload className="w-8 h-8" />
          </div>

          <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            Drop your Excel or CSV spreadsheet here
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            {parseProgress ||
              "Upload and synchronize orders directly with automated geocoding & business linking."}
          </p>

          {/* ── Required Columns Guide Card ─────────────────────────────── */}
          <div className="mt-8 max-w-2xl mx-auto rounded-2xl bg-white/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 p-5 text-left shadow-sm">
            <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100 dark:border-slate-700/60">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Required Spreadsheet Columns:
              </h4>
              <span className="text-[11px] font-medium text-slate-400 dark:text-slate-400">
                Supports .xlsx, .xls, .csv
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 space-y-0.5">
                <span className="font-bold text-slate-900 dark:text-white block">1. Business Name</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">e.g. Sultan's Dine, KFC</p>
              </div>

              <div className="p-2.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40 space-y-0.5">
                <span className="font-bold text-purple-900 dark:text-purple-200 block">2. Category (Optional)</span>
                <p className="text-[11px] text-purple-600 dark:text-purple-300">e.g. Restaurant (default: General)</p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 space-y-0.5">
                <span className="font-bold text-slate-900 dark:text-white block">3. Phone Number</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">e.g. 01711223344</p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 space-y-0.5">
                <span className="font-bold text-slate-900 dark:text-white block">4. Address</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">e.g. Dhanmondi, Dhaka</p>
              </div>

              <div className="p-2.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 space-y-0.5">
                <span className="font-bold text-blue-900 dark:text-blue-200 block">5. Status</span>
                <p className="text-[10px] text-blue-700 dark:text-blue-300 font-mono">
                  Pending, Delivered, Cancelled
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 space-y-0.5">
                <span className="font-bold text-slate-900 dark:text-white block">6. Total Amount (Optional)</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">e.g. 4500 (Leave blank if not available)</p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 space-y-0.5">
                <span className="font-bold text-slate-900 dark:text-white block">7. Date</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">e.g. 2026-10-25</p>
              </div>
            </div>
          </div>

          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
            Click here to choose file or drag & drop into this zone
          </div>
        </div>
      )}

      {/* ── Summary KPI Cards ───────────────────────────────────────────── */}
      {summary && !commitResult && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Orders</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {summary.totalRows}
              </span>
              <span className="text-xs text-slate-400">rows</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Unique Businesses</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
                {summary.uniqueBusinesses}
              </span>
              <span className="text-xs text-slate-400">grouped</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Location Geocoded</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {summary.resolvedCount}
              </span>
              <span className="text-xs text-slate-400">ready on map</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Needs Review</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span
                className={`text-2xl font-extrabold ${
                  summary.needsLocationCount > 0
                    ? "text-amber-500 dark:text-amber-400 animate-pulse"
                    : "text-slate-400"
                }`}
              >
                {summary.needsLocationCount}
              </span>
              <span className="text-xs text-slate-400">missing location</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Table & Actions Section ─────────────────────────────────────── */}
      {resolvedRows.length > 0 && !commitResult && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium w-fit">
              <button
                onClick={() => { setActiveTab("all"); setPreviewPage(1); }}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === "all"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                All Orders ({resolvedRows.length})
              </button>
              <button
                onClick={() => { setActiveTab("needs_location"); setPreviewPage(1); }}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === "needs_location"
                    ? "bg-amber-500 text-white shadow-xs font-semibold"
                    : "text-amber-600 dark:text-amber-400 hover:text-amber-700"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Needs Location ({summary?.needsLocationCount || 0})
              </button>
              <button
                onClick={() => { setActiveTab("resolved"); setPreviewPage(1); }}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === "resolved"
                    ? "bg-emerald-600 text-white shadow-xs font-semibold"
                    : "text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Resolved ({summary?.resolvedCount || 0})
              </button>
            </div>

            {/* Commit Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowResetModal(true)}
                className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-red-500 transition-colors"
              >
                Clear Preview
              </button>

              <button
                disabled={isCommitting}
                onClick={handleCommit}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all disabled:opacity-50"
              >
                {isCommitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Committing to Database...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Finalize & Commit {resolvedRows.length} Orders
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Business</th>
                    <th className="py-3 px-4">Location (Excel)</th>
                    <th className="py-3 px-4">Resolved Address</th>
                    <th className="py-3 px-4">Order Value</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Map Geocode</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {paginatedRows.map((row, idx) => (
                    <tr
                      key={row.rowId}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 text-slate-400">{(safePreviewPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>

                      {/* Business */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            {row.businessName}
                            {row.isExistingBusiness && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20">
                                Existing
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            {row.category && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                {row.category}
                              </span>
                            )}
                            {row.phoneRaw && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {row.phoneRaw}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Location Input */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        {row.location}
                      </td>

                      {/* Resolved Address */}
                      <td className="py-3.5 px-4 max-w-xs truncate text-slate-500 dark:text-slate-400">
                        {row.formattedAddress || "—"}
                      </td>

                      {/* Order Value */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {row.totalPrice != null && row.totalPrice > 0 ? `৳${row.totalPrice.toLocaleString()}` : ""}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {row.date ? new Date(row.date).toLocaleDateString() : <span className="text-slate-400">—</span>}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {row.status === "COMPLETED" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                            Delivered
                          </span>
                        ) : row.status === "CANCELLED" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
                            Cancelled
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Geocode Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {row.geocodeStatus === "resolved" ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              Ready on Map
                            </span>
                            {row.latitude && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                {row.latitude.toFixed(4)}, {row.longitude?.toFixed(4)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                            Missing Location
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleOpenAssign(row)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            row.geocodeStatus === "needs_location"
                              ? "bg-amber-500 hover:bg-amber-600 text-white shadow-xs animate-pulse"
                              : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                          }`}
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          {row.geocodeStatus === "needs_location" ? "Assign Location" : "Change"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Pagination Controls ──────────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-1 pt-1">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Showing{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {(safePreviewPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safePreviewPage * ITEMS_PER_PAGE, filteredRows.length)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-200">{filteredRows.length}</span>{" "}
                rows
              </span>

              <div className="flex items-center gap-1">
                <button
                  disabled={safePreviewPage === 1}
                  onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePreviewPage) <= 1)
                  .reduce<(number | "...")[]>((acc, p, i, arr) => {
                    if (i > 0 && typeof arr[i - 1] === "number" && (arr[i - 1] as number) + 1 < p) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, i) =>
                    item === "..." ? (
                      <span key={`ellipsis-${i}`} className="px-2 text-slate-400 text-xs select-none">…</span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => setPreviewPage(item as number)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                          safePreviewPage === item
                            ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
                            : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}

                <button
                  disabled={safePreviewPage === totalPages}
                  onClick={() => setPreviewPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Assign Location Modal ─────────────────────────────────────────── */}
      {fixingRow && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Assign Location for {fixingRow.businessName}
                </h3>
              </div>
              <button
                onClick={() => setFixingRow(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1 text-xs text-slate-500">
              <p>
                <strong>Current input:</strong> {fixingRow.location}
              </p>
              <p>
                Search address or popular landmark in Bangladesh to link coordinates:
              </p>
            </div>

            {/* Search Box */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchSuggestions()}
                  placeholder="e.g. Dhanmondi 27, Dhaka or Mirpur 10..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <button
                disabled={isSearchingLocation}
                onClick={handleSearchSuggestions}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                {isSearchingLocation ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                Search
              </button>
            </div>

            {/* Suggestions List */}
            <div className="space-y-2 max-h-60 overflow-y-auto pt-2">
              {suggestions.length > 0 ? (
                suggestions.map((s, idx) => (
                  <div
                    key={idx}
                    onClick={() => applyLocationToRow(s)}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 cursor-pointer transition-all space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-500" />
                        {s.formattedAddress}
                      </p>
                      <span className="text-[10px] font-mono text-slate-400">
                        {s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">
                  {isSearchingLocation
                    ? "Searching OpenStreetMap & Geoapify..."
                    : "Type a location name and click Search."}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setFixingRow(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Unmapped Locations Confirmation Modal ───────────────────────── */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/40 p-6 sm:p-7 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Unmapped Locations Notice
                  </h3>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                    {unresolvedWarningCount} order(s) have missing coordinates
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 text-center">
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Total Orders</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{resolvedRows.length}</p>
              </div>
              <div className="border-x border-slate-200 dark:border-slate-700/60">
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase">Geocoded</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {resolvedRows.length - unresolvedWarningCount}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold uppercase">Unmapped</p>
                <p className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-0.5">{unresolvedWarningCount}</p>
              </div>
            </div>

            {/* Explanatory Callout */}
            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/25 border border-amber-200/80 dark:border-amber-900/40 space-y-2 text-xs text-slate-700 dark:text-slate-300">
              <p className="font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                These orders will be saved to your database without map coordinates.
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 leading-relaxed text-[11px] sm:text-xs">
                <li>
                  Orders and business records are completely preserved in the CRM & database.
                </li>
                <li>
                  Unmapped records will appear as <strong>&quot;Needs Location&quot;</strong> and will not show on map views until coordinates are assigned.
                </li>
                <li>
                  You can assign addresses manually anytime from the business profile or the table below.
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  setActiveTab("needs_location");
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 transition-all"
              >
                Review Unmapped ({unresolvedWarningCount})
              </button>

              <button
                type="button"
                disabled={isCommitting}
                onClick={executeCommit}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isCommitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Committing to DB...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Proceed & Save All ({resolvedRows.length})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Clear Preview Modal ───────────────────────────────────────────── */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <h4 className="text-base font-bold text-slate-900 dark:text-white">Clear Current Preview?</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              This will remove the current spreadsheet preview without saving. You will be able to upload a new file.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowResetModal(false);
                  setResolvedRows([]);
                  setSummary(null);
                  setFile(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors"
              >
                Clear Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Error Notice Modal ────────────────────────────────────────────── */}
      {errorMessage && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">Import Error</h4>
                <p className="text-xs text-rose-500">Could not complete import action</p>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-700 dark:text-rose-300 font-mono break-all leading-relaxed max-h-48 overflow-y-auto">
              {errorMessage}
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

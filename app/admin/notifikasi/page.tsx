// app/admin/notifikasi/page.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Bell,
  Mail,
  MessageCircle,
  Settings,
  FlaskConical,
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Loader2,
  Search,
  Send,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Shield,
  Zap,
  Activity,
  Eye,
  Copy,
  CheckCheck,
  Info,
  TrendingUp,
} from "lucide-react";
import {
  Section,
  Input,
  Textarea,
  Select,
  Button,
  EmptyState,
  StatCard,
} from "@/components/admin/AdminFormComponents";
import { useAdminNotification } from "@/components/admin/AdminNotification";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChannelStatus {
  email: boolean;
  whatsapp: boolean;
}

interface NotificationSettings {
  registrasi: ChannelStatus;
  otp: ChannelStatus;
  "order-created": ChannelStatus;
  "payment-success": ChannelStatus;
  "order-processing": ChannelStatus;
  "order-shipped": ChannelStatus;
  "order-completed": ChannelStatus;
  "forgot-password": ChannelStatus;
}

interface ResendStatus {
  configured: boolean;
  fromEmail: string;
  isSandbox: boolean;
  verified: boolean;
  details: string;
}

interface NotificationLog {
  id: string;
  channel: string;
  recipient: string;
  template: string;
  subject: string;
  message: string;
  status: string;
  provider?: string;
  provider_response?: unknown;
  sent_at?: string | null;
  failed_at?: string | null;
  created_at: string;
  related_order_id?: string | null;
  related_user_id?: string | null;
}

interface LogsData {
  logs: NotificationLog[];
  pagination: { total: number; page: number; limit: number; pages: number };
}

interface TestResult {
  request: unknown;
  response: unknown;
  status: "success" | "failed";
  responseTime: string;
}

// ─── Event labels ─────────────────────────────────────────────────────────────

const EVENT_LABELS: Record<string, string> = {
  registrasi: "Registrasi Akun",
  otp: "OTP Verifikasi",
  "order-created": "Pesanan Dibuat",
  "payment-success": "Pembayaran Berhasil",
  "order-processing": "Pesanan Diproses",
  "order-shipped": "Pesanan Dikirim",
  "order-completed": "Pesanan Selesai",
  "forgot-password": "Lupa Password",
};

const DEFAULT_SETTINGS: NotificationSettings = {
  registrasi: { email: true, whatsapp: true },
  otp: { email: true, whatsapp: true },
  "order-created": { email: true, whatsapp: true },
  "payment-success": { email: true, whatsapp: true },
  "order-processing": { email: true, whatsapp: true },
  "order-shipped": { email: true, whatsapp: true },
  "order-completed": { email: true, whatsapp: true },
  "forgot-password": { email: true, whatsapp: true },
};

// ─── Utility Helpers ─────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase();
  if (s === "sent" || s === "success")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-700">
        <CheckCircle2 className="h-3 w-3" /> Terkirim
      </span>
    );
  if (s === "failed")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-red-700">
        <XCircle className="h-3 w-3" /> Gagal
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-700">
      <Clock className="h-3 w-3" /> Pending
    </span>
  );
}

function ChannelIcon({ channel }: { channel: string }) {
  if (channel === "whatsapp")
    return (
      <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-700">
        <MessageCircle className="h-3 w-3" /> WA
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-blue-100 px-2 py-0.5 text-[9px] font-black uppercase text-blue-700">
      <Mail className="h-3 w-3" /> Email
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminNotifikasiPage() {
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "settings" | "logs" | "testing"
  >("dashboard");
  const { success: notifySuccess, error: notifyError } = useAdminNotification();

  // ── Dashboard Stats ──
  const [dashStats, setDashStats] = useState({
    total: 0,
    sent: 0,
    failed: 0,
    pending: 0,
    emailTotal: 0,
    waTotal: 0,
    broadcastSent: 0,
    deliveryRate: 0,
    openRate: 0,
  });
  const [dashPeriod, setDashPeriod] = useState<"day" | "week" | "month" | "year">("month");
  const [dashLoading, setDashLoading] = useState(false);

  // ── Channel Settings ──
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [resendStatus, setResendStatus] = useState<ResendStatus | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // ── Transaction Logs ──
  const [logsData, setLogsData] = useState<LogsData>({
    logs: [],
    pagination: { total: 0, page: 1, limit: 50, pages: 0 },
  });
  const [logsLoading, setLogsLoading] = useState(false);
  const [logSearch, setLogSearch] = useState("");
  const [logChannel, setLogChannel] = useState("");
  const [logStatus, setLogStatus] = useState("");
  const [logTemplate, setLogTemplate] = useState("");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ── Testing Center ──
  const [testType, setTestType] = useState<
    "email" | "whatsapp" | "broadcast-email" | "broadcast-whatsapp"
  >("email");
  const [testEmail, setTestEmail] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [testSubject, setTestSubject] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  // ─── Data fetchers ────────────────────────────────────────────────────────

  const fetchDashStats = useCallback(async () => {
    setDashLoading(true);
    try {
      const res = await fetch(
        `/api/admin/notification/analytics?period=${dashPeriod}`,
        { credentials: "include" }
      );
      const json = await res.json();
      if (res.ok && json.data) {
        setDashStats({
          total: json.data.total ?? 0,
          sent: json.data.sent ?? 0,
          failed: json.data.failed ?? 0,
          pending: json.data.pending ?? 0,
          emailTotal: json.data.emailSent ?? 0,
          waTotal: json.data.waSent ?? 0,
          broadcastSent: json.data.broadcastSent ?? 0,
          deliveryRate: json.data.deliveryRate ?? 0,
          openRate: json.data.openRate ?? 0,
        });
      }
    } catch (err) {
      console.error("Dashboard stats error:", err);
    } finally {
      setDashLoading(false);
    }
  }, [dashPeriod]);

  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch("/api/admin/notification/settings", { credentials: "include" });
      const json = await res.json();
      if (res.ok) {
        if (json.data?.channels) {
          setSettings({ ...DEFAULT_SETTINGS, ...json.data.channels });
        }
        if (json.data?.resendStatus) {
          setResendStatus(json.data.resendStatus);
        }
      }
    } catch (err) {
      console.error("Settings error:", err);
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const q = new URLSearchParams();
      if (logSearch) q.set("search", logSearch);
      if (logChannel) q.set("channel", logChannel);
      if (logStatus) q.set("status", logStatus);
      if (logTemplate) q.set("template", logTemplate);
      q.set("limit", "50");

      const res = await fetch(`/api/admin/notification/logs?${q}`, { credentials: "include" });
      const json = await res.json();
      if (res.ok) setLogsData(json.data);
    } catch (err) {
      console.error("Logs error:", err);
    } finally {
      setLogsLoading(false);
    }
  }, [logSearch, logChannel, logStatus, logTemplate]);

  // ─── Effects ─────────────────────────────────────────────────────────────

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tampilkan loading saat data dimuat
    if (activeTab === "dashboard") fetchDashStats();
    if (activeTab === "settings") fetchSettings();
    if (activeTab === "logs") fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- muat ulang saat tab/periode berubah
  }, [activeTab, dashPeriod]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tampilkan loading saat data dimuat
    if (activeTab === "logs") fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hindari refetch saat mengetik pencarian
  }, [logChannel, logStatus, logTemplate]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      const res = await fetch("/api/admin/notification/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Gagal menyimpan pengaturan");
      notifySuccess("Pengaturan Disimpan", "Konfigurasi channel notifikasi berhasil diperbarui.");
    } catch (err) {
      notifyError("Gagal", (err as Error).message);
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleRetryLog = async (logId: string) => {
    setRetryingLogId(logId);
    try {
      const res = await fetch("/api/admin/notification/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Gagal mengirim ulang");
      notifySuccess("Berhasil", "Notifikasi berhasil dikirim ulang.");
      fetchLogs();
    } catch (err) {
      notifyError("Gagal", (err as Error).message);
    } finally {
      setRetryingLogId(null);
    }
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleTest = async () => {
    const isEmailTest = testType === "email" || testType === "broadcast-email";
    if (isEmailTest && !testEmail) {
      notifyError("Validasi", "Email tujuan wajib diisi.");
      return;
    }
    if (!isEmailTest && !testPhone) {
      notifyError("Validasi", "Nomor WhatsApp tujuan wajib diisi.");
      return;
    }

    setTestLoading(true);
    try {
      const res = await fetch("/api/admin/notification/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: testType,
          recipientEmail: testEmail || undefined,
          recipientPhone: testPhone || undefined,
          subject: testSubject || undefined,
          message: testMessage || undefined,
        }),
        credentials: "include",
      });
      const json = await res.json();
      const result: TestResult = {
        request: json.data?.request ?? {},
        response: json.data?.response ?? json.error ?? {},
        status: json.data?.status === "success" ? "success" : "failed",
        responseTime: json.data?.responseTime ?? "?",
      };
      setTestResults((prev) => [result, ...prev.slice(0, 4)]);

      if (result.status === "success") {
        notifySuccess("Test Berhasil", `Pengiriman berhasil! (${result.responseTime})`);
      } else {
        notifyError("Test Gagal", "Periksa response di bawah untuk detail error.");
      }
    } catch (err) {
      notifyError("Error", (err as Error).message);
    } finally {
      setTestLoading(false);
    }
  };

  // ─── Tab button style ─────────────────────────────────────────────────────

  const tabStyle = (t: string) =>
    cn(
      "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-150",
      activeTab === t
        ? "bg-[#FF6B1A] text-white shadow-xs font-bold"
        : "text-slate-600 hover:bg-slate-200 hover:text-slate-900 bg-slate-100"
    );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-24 font-sans text-slate-800">
      <AdminPageHeader
        title="Pusat Notifikasi"
        subtitle="Kelola integrasi channel Email (Resend) & WhatsApp (Fonnte), pantau log transmisi, dan uji konektivitas"
        breadcrumbs={[{ label: "Komunikasi" }, { label: "Pusat Notifikasi" }]}
        icon={Bell}
        badge={
          <div className="flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>All Engines Online</span>
          </div>
        }
      />

      {/* ── Tabs ── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 pb-3">
        <button onClick={() => setActiveTab("dashboard")} className={tabStyle("dashboard")}>
          <BarChart3 className="h-4 w-4" /> Dashboard
        </button>
        <button onClick={() => setActiveTab("settings")} className={tabStyle("settings")}>
          <Settings className="h-4 w-4" /> Channel Settings
        </button>
        <button onClick={() => setActiveTab("logs")} className={tabStyle("logs")}>
          <Activity className="h-4 w-4" /> Transaction Logs
        </button>
        <button onClick={() => setActiveTab("testing")} className={tabStyle("testing")}>
          <FlaskConical className="h-4 w-4" /> Testing Center
        </button>
      </div>

      {/* ══════════════════════════════════════════════════
          TAB 1 — DASHBOARD ANALYTICS
         ══════════════════════════════════════════════════ */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {(["day", "week", "month", "year"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setDashPeriod(p)}
                className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-wide transition ${
                  dashPeriod === p
                    ? "bg-[#FF6B1A] text-white shadow-md"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {p === "day" ? "Hari" : p === "week" ? "Minggu" : p === "month" ? "Bulan" : "Tahun"}
              </button>
            ))}
          </div>
          {/* Stats Grid */}
          {dashLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[#FF6B1A]" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard
                  label="Total Terkirim"
                  value={dashStats.total.toLocaleString("id-ID")}
                  icon={Send}
                  color="purple"
                  subtitle="Semua channel"
                />
                <StatCard
                  label="Sukses"
                  value={dashStats.sent.toLocaleString("id-ID")}
                  icon={CheckCircle2}
                  color="emerald"
                  subtitle={`${dashStats.deliveryRate}% delivery rate`}
                />
                <StatCard
                  label="Gagal"
                  value={dashStats.failed.toLocaleString("id-ID")}
                  icon={XCircle}
                  color="red"
                  alert={dashStats.failed > 0}
                  subtitle="Perlu perhatian"
                />
                <StatCard
                  label="Pending"
                  value={dashStats.pending.toLocaleString("id-ID")}
                  icon={Clock}
                  color="amber"
                  subtitle="Dalam antrian"
                />
              </div>

              {/* Channel Breakdown */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Email */}
                <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm">
                  <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-blue-100/60" />
                  <div className="relative flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/30">
                          <Mail className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500">Email Channel</p>
                          <p className="text-lg font-black text-blue-900">
                            {dashStats.emailTotal.toLocaleString("id-ID")}
                          </p>
                        </div>
                      </div>
                      <p className="mt-2 text-xs font-medium text-blue-500">Powered by Resend</p>
                    </div>
                    <div className="rounded-full bg-blue-100 px-3 py-1 text-[10px] font-black text-blue-700">
                      {dashStats.total > 0
                        ? Math.round((dashStats.emailTotal / dashStats.total) * 100)
                        : 0}%
                    </div>
                  </div>
                  <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-blue-100">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-700"
                      style={{
                        width: `${
                          dashStats.total > 0
                            ? Math.round((dashStats.emailTotal / dashStats.total) * 100)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {/* WhatsApp */}
                <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
                  <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-emerald-100/60" />
                  <div className="relative flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
                          <MessageCircle className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">WhatsApp Channel</p>
                          <p className="text-lg font-black text-emerald-900">
                            {dashStats.waTotal.toLocaleString("id-ID")}
                          </p>
                        </div>
                      </div>
                      <p className="mt-2 text-xs font-medium text-emerald-500">Powered by Fonnte</p>
                    </div>
                    <div className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black text-emerald-700">
                      {dashStats.total > 0
                        ? Math.round((dashStats.waTotal / dashStats.total) * 100)
                        : 0}%
                    </div>
                  </div>
                  <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-emerald-100">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-700"
                      style={{
                        width: `${
                          dashStats.total > 0
                            ? Math.round((dashStats.waTotal / dashStats.total) * 100)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Rate Card */}
              <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-indigo-50 p-6 shadow-sm">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-5">
                  <div className="rounded-xl bg-white/70 p-4 border border-purple-100">
                    <p className="text-[10px] font-bold uppercase text-purple-500">Broadcast Terkirim</p>
                    <p className="text-2xl font-black text-purple-900">{dashStats.broadcastSent.toLocaleString("id-ID")}</p>
                  </div>
                  <div className="rounded-xl bg-white/70 p-4 border border-purple-100">
                    <p className="text-[10px] font-bold uppercase text-purple-500">Delivery Rate</p>
                    <p className="text-2xl font-black text-purple-900">{dashStats.deliveryRate}%</p>
                  </div>
                  <div className="rounded-xl bg-white/70 p-4 border border-purple-100">
                    <p className="text-[10px] font-bold uppercase text-purple-500">Open Rate</p>
                    <p className="text-2xl font-black text-purple-900">{dashStats.openRate}%</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-lg shadow-purple-600/30">
                      <TrendingUp className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-purple-500">
                        Overall Delivery Rate
                      </p>
                      <p className="text-3xl font-black text-purple-900">
                        {dashStats.deliveryRate}%
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={fetchDashStats}
                    className="flex items-center gap-1.5 rounded-xl border border-purple-200 bg-white px-3 py-2 text-[10px] font-black text-purple-600 shadow-sm transition hover:bg-purple-50"
                  >
                    <RefreshCw className={`h-3 w-3 ${dashLoading ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                </div>
                <div className="mt-5 h-3 w-full overflow-hidden rounded-full bg-purple-100">
                  <div
                    className="h-3 rounded-full bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 transition-all duration-1000"
                    style={{ width: `${dashStats.deliveryRate}%` }}
                  />
                </div>
                <div className="mt-3 flex gap-6 text-[10px] font-bold text-purple-500">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {dashStats.sent} Sukses
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-red-400" />
                    {dashStats.failed} Gagal
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    {dashStats.pending} Pending
                  </span>
                </div>
              </div>

              {/* Quick Links */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <button
                  onClick={() => setActiveTab("settings")}
                  className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                    <Settings className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-zinc-900">Pengaturan Channel</p>
                    <p className="text-[10px] text-zinc-500">Toggle Email & WhatsApp per event</p>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab("logs")}
                  className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-zinc-900">Transaction Logs</p>
                    <p className="text-[10px] text-zinc-500">Pantau semua notifikasi terkirim</p>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab("testing")}
                  className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                    <FlaskConical className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-zinc-900">Testing Center</p>
                    <p className="text-[10px] text-zinc-500">Uji kirim Email & WhatsApp langsung</p>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TAB 2 — CHANNEL SETTINGS
         ══════════════════════════════════════════════════ */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          {settingsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[#FF6B1A]" />
            </div>
          ) : (
            <>
              {/* Provider Status Cards */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Resend */}
                <div
                  className={`rounded-2xl border-2 p-5 ${
                    resendStatus?.configured
                      ? resendStatus.isSandbox
                        ? "border-amber-200 bg-amber-50"
                        : resendStatus.verified
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-orange-200 bg-orange-50"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg ${
                          resendStatus?.verified ? "bg-blue-500" : "bg-blue-300"
                        }`}
                      >
                        <Mail className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-zinc-800">Resend Email</p>
                        <p className="text-[10px] font-medium text-zinc-500">
                          {resendStatus?.fromEmail || "Belum dikonfigurasi"}
                        </p>
                      </div>
                    </div>
                    {resendStatus?.configured ? (
                      resendStatus.isSandbox ? (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black text-amber-700">
                          🏖️ Sandbox
                        </span>
                      ) : resendStatus.verified ? (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-700">
                          ✅ Verified
                        </span>
                      ) : (
                        <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-black text-orange-700">
                          ⚠️ Unverified
                        </span>
                      )
                    ) : (
                      <span className="rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-black text-red-700">
                        ❌ Not Configured
                      </span>
                    )}
                  </div>

                  {resendStatus?.isSandbox && (
                    <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-100/60 p-3">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-600" />
                      <p className="text-[10px] font-bold text-amber-800 leading-relaxed">
                        Mode sandbox aktif. Email hanya dapat dikirim ke alamat yang diverifikasi di dashboard Resend. Verifikasi domain Anda untuk produksi.
                      </p>
                    </div>
                  )}
                  {!resendStatus?.isSandbox && resendStatus?.configured && !resendStatus.verified && (
                    <div className="mt-3 flex items-start gap-2 rounded-xl bg-orange-100/60 p-3">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-orange-600" />
                      <p className="text-[10px] font-bold text-orange-800 leading-relaxed">
                        Domain belum terverifikasi. Verifikasi DNS di dashboard Resend untuk mengaktifkan pengiriman ke semua email.
                      </p>
                    </div>
                  )}
                  {resendStatus?.details && (
                    <p className="mt-2 rounded-lg bg-white/60 p-2 text-[10px] text-zinc-500">
                      {resendStatus.details}
                    </p>
                  )}
                </div>

                {/* Fonnte */}
                <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
                        <MessageCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-zinc-800">Fonnte WhatsApp</p>
                        <p className="text-[10px] font-medium text-zinc-500">
                          {process.env.NEXT_PUBLIC_APP_URL
                            ? "API Terhubung"
                            : "Periksa FONNTE_TOKEN di .env"}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-700">
                      ✅ Ready
                    </span>
                  </div>
                  <p className="mt-3 text-[10px] font-medium text-emerald-700">
                    Pastikan token Fonnte di file .env valid dan nomor WhatsApp terhubung ke perangkat yang aktif.
                  </p>
                </div>
              </div>

              {/* Event Channel Toggles */}
              <Section
                title="Pengaturan Channel per Event"
                subtitle="Aktifkan atau nonaktifkan Email dan WhatsApp untuk setiap jenis notifikasi secara independen"
                icon={<Zap className="h-5 w-5 text-[#FF6B1A]" />}
                action={
                  <Button
                    onClick={handleSaveSettings}
                    loading={settingsSaving}
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    size="sm"
                  >
                    Simpan Pengaturan
                  </Button>
                }
              >
                <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                  {/* Table Header */}
                  <div className="grid grid-cols-4 gap-4 border-b border-zinc-100 bg-zinc-50 px-5 py-3">
                    <div className="col-span-2 text-[10px] font-black uppercase tracking-wider text-zinc-500">
                      Event Notifikasi
                    </div>
                    <div className="text-center text-[10px] font-black uppercase tracking-wider text-blue-500">
                      <Mail className="mx-auto mb-0.5 h-3.5 w-3.5" /> Email
                    </div>
                    <div className="text-center text-[10px] font-black uppercase tracking-wider text-emerald-500">
                      <MessageCircle className="mx-auto mb-0.5 h-3.5 w-3.5" /> WhatsApp
                    </div>
                  </div>

                  {/* Rows */}
                  <div className="divide-y divide-zinc-100">
                    {(Object.keys(EVENT_LABELS) as Array<keyof NotificationSettings>).map((event) => {
                      const cfg = settings[event] ?? { email: false, whatsapp: false };
                      return (
                        <div
                          key={event}
                          className="grid grid-cols-4 items-center gap-4 px-5 py-4 transition-colors hover:bg-zinc-50/60"
                        >
                          <div className="col-span-2">
                            <p className="text-xs font-black text-zinc-800">{EVENT_LABELS[event]}</p>
                            <p className="text-[10px] font-medium text-zinc-400">{event}</p>
                          </div>

                          {/* Email Toggle */}
                          <div className="flex justify-center">
                            <button
                              onClick={() =>
                                setSettings((prev) => ({
                                  ...prev,
                                  [event]: { ...prev[event], email: !cfg.email },
                                }))
                              }
                              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-4 focus:ring-blue-500/20 ${
                                cfg.email ? "bg-blue-500" : "bg-zinc-200"
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                  cfg.email ? "translate-x-5" : "translate-x-0"
                                }`}
                              />
                            </button>
                          </div>

                          {/* WhatsApp Toggle */}
                          <div className="flex justify-center">
                            <button
                              onClick={() =>
                                setSettings((prev) => ({
                                  ...prev,
                                  [event]: { ...prev[event], whatsapp: !cfg.whatsapp },
                                }))
                              }
                              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-4 focus:ring-emerald-500/20 ${
                                cfg.whatsapp ? "bg-emerald-500" : "bg-zinc-200"
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                  cfg.whatsapp ? "translate-x-5" : "translate-x-0"
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Info callout */}
                <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
                  <div className="space-y-1">
                    <p className="text-xs font-black text-blue-800">Sistem Channel Ganda — Independen</p>
                    <p className="text-[10px] font-medium text-blue-700 leading-relaxed">
                      Setiap channel beroperasi secara independen. Jika Email gagal, WhatsApp tetap dikirim. Jika WhatsApp gagal, Email tetap dikirim. Kedua channel tidak saling memblokir.
                    </p>
                  </div>
                </div>
              </Section>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TAB 3 — TRANSACTION LOGS
         ══════════════════════════════════════════════════ */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          <Section
            title="Log Notifikasi Transaksional"
            subtitle="Riwayat lengkap semua notifikasi yang dikirim — Email & WhatsApp"
            icon={<Activity className="h-5 w-5 text-[#FF6B1A]" />}
            badge={logsData.pagination.total}
            action={
              <button
                onClick={fetchLogs}
                className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[10px] font-black text-zinc-600 shadow-sm transition hover:bg-zinc-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${logsLoading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            }
          >
            {/* Filters */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
                  placeholder="Cari penerima, subject, atau pesan..."
                  className="w-full rounded-xl border-2 border-zinc-200 bg-zinc-50 py-2.5 pl-9 pr-4 text-xs font-bold text-zinc-900 placeholder:font-medium placeholder:text-zinc-400 focus:border-[#FF6B1A] focus:bg-white focus:outline-none"
                />
              </div>
              <Select
                value={logChannel}
                onChange={(e) => setLogChannel(e.target.value)}
                options={[
                  { value: "", label: "Semua Channel" },
                  { value: "email", label: "Email" },
                  { value: "whatsapp", label: "WhatsApp" },
                ]}
              />
              <Select
                value={logStatus}
                onChange={(e) => setLogStatus(e.target.value)}
                options={[
                  { value: "", label: "Semua Status" },
                  { value: "sent", label: "Terkirim" },
                  { value: "failed", label: "Gagal" },
                  { value: "pending", label: "Pending" },
                ]}
              />
            </div>

            {/* Template filter chips */}
            <div className="flex flex-wrap gap-2">
              {["", ...Object.keys(EVENT_LABELS)].map((t) => (
                <button
                  key={t}
                  onClick={() => setLogTemplate(t)}
                  className={`rounded-full px-3 py-1 text-[10px] font-black transition-all ${
                    logTemplate === t
                      ? "bg-[#FF6B1A] text-white shadow-md"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  {t === "" ? "Semua Event" : EVENT_LABELS[t]}
                </button>
              ))}
            </div>

            {/* Logs Table */}
            {logsLoading && logsData.logs.length === 0 ? (
              <div className="flex items-center justify-center py-14">
                <Loader2 className="h-8 w-8 animate-spin text-[#FF6B1A]" />
              </div>
            ) : logsData.logs.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="Tidak ada log ditemukan"
                description="Belum ada notifikasi yang dikirim atau filter tidak cocok."
              />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                <div className="divide-y divide-zinc-100">
                  {logsData.logs.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    return (
                      <div key={log.id} className="transition-colors hover:bg-zinc-50/60">
                        {/* Row main */}
                        <div className="flex items-start gap-3 p-4">
                          <div className="mt-0.5 flex-shrink-0">
                            <ChannelIcon channel={log.channel} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-black text-zinc-900 truncate max-w-xs">
                                {log.recipient}
                              </span>
                              <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-zinc-500">
                                {log.template}
                              </span>
                              <StatusBadge status={log.status} />
                            </div>
                            <p className="mt-0.5 text-[10px] font-bold text-zinc-500">
                              {log.subject || "—"}
                            </p>
                            <p className="mt-0.5 text-[10px] text-zinc-400">
                              {fmtDate(log.created_at)}
                              {log.provider && (
                                <span className="ml-2 font-bold text-zinc-500">via {log.provider}</span>
                              )}
                            </p>
                          </div>

                          <div className="flex flex-shrink-0 items-center gap-2">
                            {/* Retry button (only for failed) */}
                            {log.status === "failed" && (
                              <button
                                onClick={() => handleRetryLog(log.id)}
                                disabled={retryingLogId === log.id}
                                className="flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-[10px] font-black text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                              >
                                {retryingLogId === log.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-3 w-3" />
                                )}
                                Retry
                              </button>
                            )}

                            {/* Copy ID */}
                            <button
                              onClick={() => handleCopyId(log.id)}
                              className="flex items-center gap-1 rounded-lg bg-zinc-100 px-2.5 py-1.5 text-[10px] font-bold text-zinc-500 transition hover:bg-zinc-200"
                              title="Salin Log ID"
                            >
                              {copiedId === log.id ? (
                                <CheckCheck className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>

                            {/* Expand detail */}
                            <button
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                              className="flex items-center gap-1 rounded-lg bg-zinc-100 px-2.5 py-1.5 text-[10px] font-bold text-zinc-600 transition hover:bg-zinc-200"
                            >
                              <Eye className="h-3 w-3" />
                              {isExpanded ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Expanded Detail */}
                        {isExpanded && (
                          <div className="border-t border-zinc-100 bg-zinc-50/60 px-4 pb-4 pt-3 space-y-3">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <div>
                                <p className="mb-1 text-[9px] font-black uppercase tracking-wider text-zinc-400">
                                  Log ID
                                </p>
                                <p className="font-mono text-[10px] text-zinc-600 break-all">{log.id}</p>
                              </div>
                              <div>
                                <p className="mb-1 text-[9px] font-black uppercase tracking-wider text-zinc-400">
                                  Related Order
                                </p>
                                <p className="text-[10px] text-zinc-600">
                                  {log.related_order_id || "—"}
                                </p>
                              </div>
                              {log.sent_at && (
                                <div>
                                  <p className="mb-1 text-[9px] font-black uppercase tracking-wider text-zinc-400">
                                    Dikirim Pada
                                  </p>
                                  <p className="text-[10px] text-zinc-600">{fmtDate(log.sent_at)}</p>
                                </div>
                              )}
                              {log.failed_at && (
                                <div>
                                  <p className="mb-1 text-[9px] font-black uppercase tracking-wider text-zinc-400">
                                    Gagal Pada
                                  </p>
                                  <p className="text-[10px] text-red-600">{fmtDate(log.failed_at)}</p>
                                </div>
                              )}
                            </div>

                            {/* Message preview */}
                            <div>
                              <p className="mb-1 text-[9px] font-black uppercase tracking-wider text-zinc-400">
                                Isi Pesan (Truncated)
                              </p>
                              <p className="rounded-xl border border-zinc-200 bg-white p-3 font-mono text-[10px] leading-relaxed text-zinc-700 line-clamp-4 whitespace-pre-wrap">
                                {log.channel === "email"
                                  ? log.message.replace(/<[^>]+>/g, "").trim().slice(0, 400)
                                  : log.message.slice(0, 400)}
                                {log.message.length > 400 && "..."}
                              </p>
                            </div>

                            {/* Provider response */}
                            {!!log.provider_response && (
                              <div>
                                <p className="mb-1 text-[9px] font-black uppercase tracking-wider text-zinc-400">
                                  Provider Response
                                </p>
                                <pre className="overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-900 p-3 text-[9px] font-mono text-emerald-400">
                                  {JSON.stringify(log.provider_response, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Pagination info */}
                {logsData.pagination.total > 50 && (
                  <div className="border-t border-zinc-100 bg-zinc-50 px-5 py-3 text-[10px] font-bold text-zinc-500">
                    Menampilkan 50 dari {logsData.pagination.total.toLocaleString("id-ID")} total log
                  </div>
                )}
              </div>
            )}
          </Section>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TAB 4 — TESTING CENTER
         ══════════════════════════════════════════════════ */}
      {activeTab === "testing" && (
        <div className="space-y-6">
          <Section
            title="Notification Testing Center"
            subtitle="Uji koneksi dan pengiriman nyata ke Email atau WhatsApp tanpa mempengaruhi data transaksi"
            icon={<FlaskConical className="h-5 w-5 text-[#FF6B1A]" />}
          >
            {/* Channel selector */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <button
                onClick={() => setTestType("email")}
                className={`flex items-center justify-center gap-2 rounded-2xl border-2 p-3 text-xs font-black transition-all ${
                  testType === "email"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-zinc-200 bg-white text-zinc-600"
                }`}
              >
                <Mail className="h-4 w-4" /> Test Email
              </button>
              <button
                onClick={() => setTestType("whatsapp")}
                className={`flex items-center justify-center gap-2 rounded-2xl border-2 p-3 text-xs font-black transition-all ${
                  testType === "whatsapp"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-zinc-200 bg-white text-zinc-600"
                }`}
              >
                <MessageCircle className="h-4 w-4" /> Test WA
              </button>
              <button
                onClick={() => setTestType("broadcast-email")}
                className={`flex items-center justify-center gap-2 rounded-2xl border-2 p-3 text-xs font-black transition-all ${
                  testType === "broadcast-email"
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-zinc-200 bg-white text-zinc-600"
                }`}
              >
                <Mail className="h-4 w-4" /> Broadcast Email
              </button>
              <button
                onClick={() => setTestType("broadcast-whatsapp")}
                className={`flex items-center justify-center gap-2 rounded-2xl border-2 p-3 text-xs font-black transition-all ${
                  testType === "broadcast-whatsapp"
                    ? "border-teal-500 bg-teal-50 text-teal-700"
                    : "border-zinc-200 bg-white text-zinc-600"
                }`}
              >
                <MessageCircle className="h-4 w-4" /> Broadcast WA
              </button>
            </div>

            {/* Form */}
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-5 space-y-4">
              {(testType === "email" || testType === "broadcast-email") ? (
                <>
                  <Input
                    label="Email Tujuan"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="admin@example.com"
                    type="email"
                    required
                  />
                  <Input
                    label="Subject (Opsional)"
                    value={testSubject}
                    onChange={(e) => setTestSubject(e.target.value)}
                    placeholder="Jogjadoelan Test Email"
                  />
                </>
              ) : (
                <Input
                  label="Nomor WhatsApp Tujuan"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="628123456789 (format internasional)"
                  required
                />
              )}

              <Textarea
                label="Pesan Kustom (Opsional)"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder={
                  testType.includes("email")
                    ? "<p>Ini adalah email uji coba dari Jogjadoelan Notification Center.</p>"
                    : "Ini adalah pesan WhatsApp uji coba dari Jogjadoelan."
                }
                rows={4}
              />

              <div className="flex justify-end">
                <Button
                  onClick={handleTest}
                  loading={testLoading}
                  icon={<Send className="h-4 w-4" />}
                  size="lg"
                  variant={testType === "whatsapp" ? "secondary" : "primary"}
                >
                  Kirim Test {testType === "email" ? "Email" : "WhatsApp"}
                </Button>
              </div>
            </div>
          </Section>

          {/* Test Results */}
          {testResults.length > 0 && (
            <Section
              title="Hasil Test Terbaru"
              badge={testResults.length}
              icon={<Activity className="h-5 w-5 text-[#FF6B1A]" />}
            >
              <div className="space-y-3">
                {testResults.map((result, idx) => (
                  <div
                    key={idx}
                    className={`rounded-2xl border-2 p-4 ${
                      result.status === "success"
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-red-200 bg-red-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {result.status === "success" ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        <span
                          className={`text-sm font-black ${
                            result.status === "success" ? "text-emerald-700" : "text-red-700"
                          }`}
                        >
                          {result.status === "success" ? "Test Berhasil" : "Test Gagal"}
                        </span>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                          result.status === "success"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {result.responseTime}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <p className="mb-1 text-[9px] font-black uppercase tracking-wider text-zinc-500">
                          Request Payload
                        </p>
                        <pre className="overflow-x-auto rounded-xl bg-zinc-900 p-3 text-[9px] font-mono text-blue-300">
                          {JSON.stringify(result.request, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <p className="mb-1 text-[9px] font-black uppercase tracking-wider text-zinc-500">
                          Provider Response
                        </p>
                        <pre
                          className={`overflow-x-auto rounded-xl p-3 text-[9px] font-mono ${
                            result.status === "success"
                              ? "bg-emerald-900 text-emerald-300"
                              : "bg-red-900 text-red-300"
                          }`}
                        >
                          {JSON.stringify(result.response, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Integration Tips */}
          <Section
            title="Checklist Integrasi"
            icon={<Shield className="h-5 w-5 text-[#FF6B1A]" />}
          >
            <div className="space-y-2">
              {[
                {
                  label: "RESEND_API_KEY",
                  desc: "Tambahkan API key Resend di .env",
                  color: "blue",
                },
                {
                  label: "EMAIL_FROM",
                  desc: "Atur alamat pengirim email (contoh: noreply@jogjadoelan.com)",
                  color: "blue",
                },
                {
                  label: "FONNTE_TOKEN",
                  desc: "Tambahkan token Fonnte WhatsApp di .env",
                  color: "emerald",
                },
                {
                  label: "NEXT_PUBLIC_APP_URL",
                  desc: "URL publik aplikasi untuk tautan dalam notifikasi",
                  color: "violet",
                },
                {
                  label: "Domain Verification",
                  desc: "Verifikasi domain di Resend untuk pengiriman ke semua email",
                  color: "amber",
                },
              ].map((item) => {
                const colorMap: Record<string, string> = {
                  blue: "bg-blue-100 text-blue-700 border-blue-200",
                  emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
                  violet: "bg-violet-100 text-violet-700 border-violet-200",
                  amber: "bg-amber-100 text-amber-700 border-amber-200",
                };
                return (
                  <div
                    key={item.label}
                    className="flex items-start gap-3 rounded-xl border border-zinc-100 bg-white p-3.5"
                  >
                    <span
                      className={`flex-shrink-0 rounded-lg border px-2 py-0.5 font-mono text-[10px] font-black ${colorMap[item.color]}`}
                    >
                      {item.label}
                    </span>
                    <span className="text-xs text-zinc-600">{item.desc}</span>
                  </div>
                );
              })}
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}
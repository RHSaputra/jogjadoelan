// app/admin/broadcast/page.tsx
"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Megaphone,
  Send,
  Trash2,
  MessageCircle,
  Mail,
  Bell,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  Image as ImageIcon,
  Upload,
  AlertCircle,
  Clock,
  User,
  Phone,
  Sparkles,
} from "lucide-react";
import { Section, Input, Select, Button, EmptyState } from "@/components/admin/AdminFormComponents";
import { useAdminNotification } from "@/components/admin/AdminNotification";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { cn } from "@/lib/utils";

// Interface definitions
interface WaContact {
  id: string;
  username: string;
  noHp: string;
  email: string;
  hasOrder?: boolean;
}

interface BroadcastLog {
  id: string;
  nama: string;
  noHp?: string | null;
  email?: string | null;
  userId?: string | null;
  status: "PENDING" | "SENT" | "FAILED";
  error?: string | null;
  retries: number;
  sentAt?: string | null;
  updatedAt: string;
}

interface WhatsAppBroadcast {
  id: string;
  channel: "wa" | "email" | "notif" | "hybrid";
  judul: string;
  pesan: string;
  gambar?: string | null;
  target: "semua" | "aktif" | "order" | "custom" | "csv";
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "PAUSED" | "CANCELLED";
  total: number;
  terkirim: number;
  gagal: number;
  pending: number;
  createdAt: string;
  logs?: BroadcastLog[];
}

interface WhatsAppTransactional {
  id: string;
  channel: "wa" | "email" | "notif";
  recipient: string;
  nama: string;
  tipe: string;
  pesan: string;
  status: "PENDING" | "SENT" | "FAILED";
  error?: string | null;
  retries?: number;
  sentAt?: string | null;
  createdAt: string;
}

export default function AdminBroadcastPage() {
  const [activeTab, setActiveTab] = useState<"broadcast" | "transactional">("broadcast");
  const { success: notifySuccess, error: notifyError, warning: notifyWarning } = useAdminNotification();

  // --- TAB 1: BROADCAST STATES ---
  const [broadcasts, setBroadcasts] = useState<WhatsAppBroadcast[]>([]);
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  
  // Create Form states
  const [channel, setChannel] = useState<"wa" | "email" | "notif" | "hybrid">("wa");
  const [judul, setJudul] = useState("");
  const [pesan, setPesan] = useState("");
  const [gambar, setGambar] = useState("");
  const [target, setTarget] = useState<"semua" | "aktif" | "order" | "custom" | "csv">("semua");
  const [customSelected, setCustomSelected] = useState<string[]>([]);
  const [csvRecipients] = useState<Array<{ nama: string; email?: string; noHp?: string }>>([]);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  // Contacts for custom selection
  const [contacts, setContacts] = useState<WaContact[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [contactsLoading, setContactsLoading] = useState(false);

  // Details Modal
  const [selectedBroadcast, setSelectedBroadcast] = useState<WhatsAppBroadcast | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null);

  // Active Broadcast Polling
  const [activeBroadcastId, setActiveBroadcastId] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Textarea Ref for placeholder insert
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // --- TAB 2: TRANSACTIONAL STATES ---
  const [transLogs, setTransLogs] = useState<WhatsAppTransactional[]>([]);
  const [transLoading, setTransLoading] = useState(false);
  const [transSearch, setTransSearch] = useState("");
  const [transType, setTransType] = useState("");
  const [transStatus, setTransStatus] = useState("");
  const [resendingLogId, setResendingLogId] = useState<string | null>(null);
  const [selectedTransLog, setSelectedTransLog] = useState<WhatsAppTransactional | null>(null);

  // Delete Confirmation Modal
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [broadcastToDelete, setBroadcastToDelete] = useState<string | null>(null);

  // Trans Log Delete Confirmation Modal
  const [deleteTransConfirmOpen, setDeleteTransConfirmOpen] = useState(false);
  const [selectedTransLogs, setSelectedTransLogs] = useState<string[]>([]);

  // Fetch Broadcast history
  const fetchBroadcasts = async () => {
    setBroadcastLoading(true);
    try {
      const res = await fetch("/api/admin/whatsapp-broadcast", { credentials: "include" });
      const json = await res.json();
      if (res.ok) {
        setBroadcasts(json.data.broadcasts || []);
        
        // Find if there is an active running broadcast
        const active = (json.data.broadcasts || []).find(
          (b: WhatsAppBroadcast) =>
            b.status === "PENDING" ||
            b.status === "PROCESSING" ||
            b.status === "PAUSED"
        );
        if (active) {
          setActiveBroadcastId(active.id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBroadcastLoading(false);
    }
  };

  // Poll Active Broadcast Status
  useEffect(() => {
    if (activeBroadcastId) {
      const poll = async () => {
        try {
          const res = await fetch(`/api/admin/whatsapp-broadcast/${activeBroadcastId}/status`, { credentials: "include" });
          const json = await res.json();
          if (res.ok && json.data.broadcast) {
            const b = json.data.broadcast as WhatsAppBroadcast;
            
            // Update in the list
            setBroadcasts((prev) =>
              prev.map((item) => (item.id === b.id ? b : item))
            );

            // Update modal if open
            if (selectedBroadcast && selectedBroadcast.id === b.id) {
              setSelectedBroadcast(b);
            }

            // Stop polling if completed or failed
            if (b.status === "COMPLETED" || b.status === "FAILED") {
              setActiveBroadcastId(null);
              notifySuccess("Broadcast Selesai", `Pengiriman broadcast "${b.judul}" telah selesai.`);
            }
          }
        } catch (err) {
          console.error("Polling error", err);
        }
      };

      pollingRef.current = setInterval(poll, 2000);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [activeBroadcastId, selectedBroadcast, notifySuccess]);

  // Fetch Contacts for Custom Target
  const fetchContacts = async () => {
    setContactsLoading(true);
    try {
      const res = await fetch("/api/admin/broadcast/contacts?target=semua", { credentials: "include" });
      const json = await res.json();
      if (res.ok) {
        const loadedContacts = json.data.contacts || [];
        setContacts(loadedContacts);
        // By default, select all contacts since target is "semua"
        setCustomSelected(loadedContacts.map((c: WaContact) => c.id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setContactsLoading(false);
    }
  };

  // Fetch Transactional logs
  const fetchTransactionalLogs = async () => {
    setTransLoading(true);
    try {
      const q = new URLSearchParams();
      if (transSearch) q.append("search", transSearch);
      if (transType) q.append("tipe", transType);
      if (transStatus) q.append("status", transStatus);

      const res = await fetch(`/api/admin/whatsapp-transactional?${q.toString()}`, { credentials: "include" });
      const json = await res.json();
      if (res.ok) {
        setTransLogs(json.data.logs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTransLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBroadcasts();
    fetchContacts();
  }, []);

  useEffect(() => {
    if (activeTab === "transactional") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchTransactionalLogs();
    }
  }, [activeTab, transType, transStatus]); // eslint-disable-line react-hooks/exhaustive-deps -- hindari refetch saat mengetik pencarian



  // Image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setImageUploading(true);
    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Gagal upload gambar");
      }
      
      const path = json.data.path;
      const origin = window.location.origin;
      setGambar(`${origin}${path}`);
      notifySuccess("Upload Berhasil", "Gambar untuk broadcast berhasil diunggah.");
    } catch (err) {
      notifyError("Gagal Upload", (err as Error).message);
    } finally {
      setImageUploading(false);
    }
  };

  // Trigger Send Broadcast
  const handleSendBroadcast = async () => {
    if (!judul.trim() || !pesan.trim()) {
      notifyWarning("Form tidak lengkap", "Judul dan Pesan wajib diisi.");
      return;
    }

    if (target === "custom" && customSelected.length === 0) {
      notifyWarning("Target kosong", "Pilih minimal 1 customer untuk target tertentu.");
      return;
    }

    if (target === "csv" && csvRecipients.length === 0) {
      notifyWarning("CSV kosong", "Upload CSV dengan minimal 1 penerima.");
      return;
    }

    setSendingBroadcast(true);
    try {
      const res = await fetch("/api/admin/whatsapp-broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          judul,
          pesan,
          gambar: (channel === "wa" || channel === "hybrid") && gambar.trim() ? gambar.trim() : undefined,
          target,
          customCustomerIds: target === "custom" ? customSelected : undefined,
          csvRecipients: target === "csv" ? csvRecipients : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Gagal mengirim broadcast");
      }

      notifySuccess("Broadcast Dimulai", "Broadcast telah masuk antrean pengiriman background.");
      
      // Reset form
      setJudul("");
      setPesan("");
      setGambar("");
      setCustomSelected([]);
      
      // Poll stats
      if (json.data.broadcast) {
        setActiveBroadcastId(json.data.broadcast.id);
      }
      
      fetchBroadcasts();
    } catch (err) {
      notifyError("Gagal Mengirim", (err as Error).message);
    } finally {
      setSendingBroadcast(false);
    }
  };

  // Open Broadcast Detail Modal
  const handleViewDetails = async (b: WhatsAppBroadcast) => {
    setSelectedBroadcast(b);
    setDetailModalOpen(true);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/whatsapp-broadcast/${b.id}/status`, { credentials: "include" });
      const json = await res.json();
      if (res.ok && json.data.broadcast) {
        setSelectedBroadcast(json.data.broadcast);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleBroadcastControl = async (broadcastId: string, action: "pause" | "resume" | "cancel") => {
    try {
      const res = await fetch(`/api/admin/whatsapp-broadcast/${broadcastId}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Gagal mengontrol broadcast");
      notifySuccess("Berhasil", json.data?.message || "Aksi broadcast berhasil");
      fetchBroadcasts();
    } catch (err) {
      notifyError("Gagal", (err as Error).message);
    }
  };

  const handleDeleteBroadcast = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setBroadcastToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const executeDeleteBroadcast = async () => {
    if (!broadcastToDelete) return;

    try {
      const res = await fetch(`/api/admin/whatsapp-broadcast/${broadcastToDelete}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Gagal menghapus");
      notifySuccess("Berhasil", "Riwayat broadcast berhasil dihapus");
      fetchBroadcasts();
    } catch (err) {
      notifyError("Gagal", (err as Error).message);
    } finally {
      setDeleteConfirmOpen(false);
      setBroadcastToDelete(null);
    }
  };

  // Retry failed broadcast recipient
  const handleRetryRecipient = async (logId: string) => {
    if (!selectedBroadcast) return;
    setRetryingLogId(logId);
    try {
      const res = await fetch(`/api/admin/whatsapp-broadcast/${selectedBroadcast.id}/retry-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Gagal mengirim ulang");
      }

      notifySuccess("Terkirim", "Berhasil mengirim ulang ke nomor ini.");
      
      // Update local recipient status
      if (selectedBroadcast.logs) {
        const updatedLogs = selectedBroadcast.logs.map((l) =>
          l.id === logId ? json.data.log : l
        );
        setSelectedBroadcast({
          ...selectedBroadcast,
          logs: updatedLogs,
          terkirim: selectedBroadcast.terkirim + (json.data.log.status === "SENT" ? 1 : 0),
          gagal: selectedBroadcast.gagal - (json.data.log.status === "SENT" ? 1 : 0),
        });
      }

      fetchBroadcasts();
    } catch (err) {
      notifyError("Gagal", (err as Error).message);
    } finally {
      setRetryingLogId(null);
    }
  };

  // Manual Resend Transactional message
  const handleResendTransactional = async (logId: string) => {
    setResendingLogId(logId);
    try {
      const res = await fetch(`/api/admin/whatsapp-transactional/${logId}/resend`, {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Gagal mengirim ulang");
      }

      notifySuccess("Berhasil Dikirim", "Pesan transaksi berhasil dikirim ulang.");
      
      // Update transactional list
      setTransLogs((prev) =>
        prev.map((item) =>
          item.id === logId
            ? {
                ...json.data.log,
                channel: "wa" as const,
                recipient: json.data.log.noHp,
              }
            : item
        )
      );
    } catch (err) {
      notifyError("Gagal", (err as Error).message);
    } finally {
      setResendingLogId(null);
    }
  };

  const executeDeleteTransLog = async () => {
    if (selectedTransLogs.length === 0) return;

    try {
      const res = await fetch(`/api/admin/whatsapp-transactional/delete-bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedTransLogs }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Gagal menghapus log");
      notifySuccess("Berhasil", "Log transaksional berhasil dihapus");
      setSelectedTransLogs([]); // Clear selection
      fetchTransactionalLogs();
    } catch (err) {
      notifyError("Gagal", (err as Error).message);
    } finally {
      setDeleteTransConfirmOpen(false);
    }
  };

  // Filtered contacts list
  const filteredContacts = contacts.filter(
    (c) =>
      c.username.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.noHp.includes(contactSearch) ||
      c.email.toLowerCase().includes(contactSearch.toLowerCase())
  );

  const toggleSelectAllContacts = () => {
    const allFilteredIds = filteredContacts.map((c) => c.id);
    const allFilteredSelected = allFilteredIds.every((id) => customSelected.includes(id));

    if (allFilteredSelected) {
      // Deselect all filtered contacts
      const updated = customSelected.filter((id) => !allFilteredIds.includes(id));
      setCustomSelected(updated);
      setTarget("custom");
    } else {
      // Select all filtered contacts
      const union = Array.from(new Set([...customSelected, ...allFilteredIds]));
      setCustomSelected(union);
      if (union.length === contacts.length) {
        setTarget("semua");
      } else {
        setTarget("custom");
      }
    }
  };

  const handleSelectContact = (id: string) => {
    setCustomSelected((prev) => {
      const updated = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (updated.length === contacts.length) {
        setTarget("semua");
      } else {
        setTarget("custom");
      }
      return updated;
    });
  };

  // Date formatter helper
  const fmtDate = (dStr: string) => {
    return new Date(dStr).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6 pb-24 font-sans text-slate-800">
      <AdminPageHeader
        title="Broadcast Terpadu"
        subtitle="Kirim pengumuman massal secara instan atau terjadwal melalui WhatsApp, Email, dan Notifikasi In-App"
        breadcrumbs={[{ label: "Komunikasi" }, { label: "Broadcast Terpadu" }]}
        icon={Megaphone}
        badge={
          <div className="flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Fonnte & Resend Aktif</span>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex justify-start border-b border-slate-200/80 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("broadcast")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all",
              activeTab === "broadcast"
                ? "bg-[#FF6B1A] text-white shadow-xs font-bold"
                : "text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900"
            )}
          >
            <Megaphone className="h-4 w-4" />
            Notifikasi Broadcast
          </button>
          <button
            onClick={() => setActiveTab("transactional")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all",
              activeTab === "transactional"
                ? "bg-[#FF6B1A] text-white shadow-xs font-bold"
                : "text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900"
            )}
          >
            <Clock className="h-4 w-4" />
            Log WhatsApp Transaksional
          </button>
        </div>
      </div>

      {/* --- TAB 1: BROADCAST VIEW --- */}
      {activeTab === "broadcast" && (
        <div className="space-y-6">
          {/* Realtime progress tracker */}
          {activeBroadcastId && (
            <div className="rounded-2xl border-2 border-[#FF6B1A] bg-orange-50/50 p-5 shadow-lg space-y-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4.5 w-4.5 animate-spin text-[#FF6B1A]" />
                  <span className="text-xs font-black text-[#FF6B1A] uppercase tracking-wider">Sending Broadcast...</span>
                </div>
                <span className="text-[10px] font-black bg-[#FF6B1A] text-white px-2.5 py-0.5 rounded-full">Realtime</span>
              </div>

              {(() => {
                const activeBroad = broadcasts.find((b) => b.id === activeBroadcastId);
                if (!activeBroad) return null;
                const percent = activeBroad.total > 0 ? Math.round(((activeBroad.terkirim + activeBroad.gagal) / activeBroad.total) * 100) : 0;
                
                return (
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`text-[8px] px-1.5 py-0.5 rounded-lg font-black uppercase text-white ${
                          activeBroad.channel === "wa" ? "bg-emerald-600" : activeBroad.channel === "email" ? "bg-blue-600" : "bg-amber-500"
                        }`}>
                          {activeBroad.channel}
                        </span>
                        <span className="text-[10px] font-bold text-zinc-500">ID: {activeBroad.id}</span>
                      </div>
                      <h3 className="text-sm font-black text-zinc-900 line-clamp-1">{activeBroad.judul}</h3>
                      <p className="text-[10px] font-bold text-zinc-500">Total targets: {activeBroad.total} customer</p>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-black text-zinc-700">
                        <span>Progres</span>
                        <span>{percent}%</span>
                      </div>
                      <div className="w-full bg-zinc-200 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-[#FF6B1A] to-amber-500 h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Detail Stats */}
                    <div className="grid grid-cols-4 gap-2 pt-2 text-center text-[10px] font-black">
                      <div className="rounded-lg bg-white p-2 border border-zinc-150">
                        <span className="block text-[8px] font-bold text-zinc-500 uppercase">Total</span>
                        <span className="text-xs text-zinc-800">{activeBroad.total}</span>
                      </div>
                      <div className="rounded-lg bg-emerald-50 p-2 border border-emerald-100">
                        <span className="block text-[8px] font-bold text-emerald-600 uppercase">Sent</span>
                        <span className="text-xs text-emerald-700">{activeBroad.terkirim}</span>
                      </div>
                      <div className="rounded-lg bg-red-50 p-2 border border-red-100">
                        <span className="block text-[8px] font-bold text-red-600 uppercase">Fail</span>
                        <span className="text-xs text-red-700">{activeBroad.gagal}</span>
                      </div>
                      <div className="rounded-lg bg-zinc-100 p-2">
                        <span className="block text-[8px] font-bold text-zinc-500 uppercase">Pend</span>
                        <span className="text-xs text-zinc-700">{activeBroad.pending}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      {activeBroad.status === "PROCESSING" && (
                        <button
                          type="button"
                          onClick={() => handleBroadcastControl(activeBroad.id, "pause")}
                          className="rounded-lg bg-amber-100 px-3 py-1.5 text-[10px] font-black text-amber-700"
                        >
                          Pause
                        </button>
                      )}
                      {activeBroad.status === "PAUSED" && (
                        <button
                          type="button"
                          onClick={() => handleBroadcastControl(activeBroad.id, "resume")}
                          className="rounded-lg bg-emerald-100 px-3 py-1.5 text-[10px] font-black text-emerald-700"
                        >
                          Resume
                        </button>
                      )}
                      {!["COMPLETED", "CANCELLED"].includes(activeBroad.status) && (
                        <button
                          type="button"
                          onClick={() => handleBroadcastControl(activeBroad.id, "cancel")}
                          className="rounded-lg bg-red-100 px-3 py-1.5 text-[10px] font-black text-red-700"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
              <Section
                title="Tulis Pesan Broadcast"
                subtitle="Buat pengumuman baru dan pilih channel serta target customer"
                icon={<Sparkles className="h-5 w-5 text-[#FF6B1A]" />}
              >
                <div className="space-y-4">
                  {/* Channel & Title Grid */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Select
                      label="Broadcast Channel"
                      value={channel}
                      onChange={(e) => setChannel(e.target.value as "wa" | "email" | "notif" | "hybrid")}
                      options={[
                        { value: "wa", label: "WhatsApp (Fonnte)" },
                        { value: "email", label: "Email (Resend)" },
                        { value: "hybrid", label: "Hybrid (WA + Email)" },
                        { value: "notif", label: "In-App Notification" },
                      ]}
                    />
                    <Input
                      label="Judul / Subject"
                      value={judul}
                      onChange={(e) => setJudul(e.target.value)}
                      placeholder={channel === "email" ? "Subject email..." : "Judul notifikasi..."}
                    />
                  </div>

                  {/* Contacts Picker (Always Visible) */}
                  <div className="rounded-2xl border border-zinc-200 p-4 space-y-3 bg-zinc-50/50">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-0.5">
                        <label className="text-xs font-black text-zinc-700">Pilih Penerima Broadcast</label>
                        <p className="text-[10px] text-zinc-500 font-bold">
                          Pilih secara manual atau gunakan tombol pilihan cepat di bawah
                        </p>
                      </div>
                      <span className="self-start sm:self-center text-[10px] font-black bg-[#FF6B1A] text-white px-2.5 py-0.5 rounded-full">
                        Terpilih: {customSelected.length} / {contacts.length}
                      </span>
                    </div>

                    {/* Quick selection options */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCustomSelected(contacts.map((c) => c.id));
                          setTarget("semua");
                        }}
                        className="px-2.5 py-1.5 text-[10px] font-black rounded-lg bg-zinc-200 text-zinc-700 hover:bg-zinc-350 transition-colors"
                      >
                        Semua Customer ({contacts.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setTarget("aktif")}
                        className="px-2.5 py-1.5 text-[10px] font-black rounded-lg bg-zinc-200 text-zinc-700 hover:bg-zinc-350 transition-colors"
                      >
                        Customer Aktif (30 hari)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomSelected(contacts.filter((c) => c.hasOrder).map((c) => c.id));
                          setTarget("order");
                        }}
                        className="px-2.5 py-1.5 text-[10px] font-black rounded-lg bg-zinc-200 text-zinc-700 hover:bg-zinc-350 transition-colors"
                      >
                        Pilih yang Pernah Order ({contacts.filter((c) => c.hasOrder).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomSelected([]);
                          setTarget("custom");
                        }}
                        className="px-2.5 py-1.5 text-[10px] font-black rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                      >
                        Kosongkan Pilihan
                      </button>
                    </div>
                    
                    {/* Contact search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                      <input
                        type="text"
                        value={contactSearch}
                        onChange={(e) => setContactSearch(e.target.value)}
                        placeholder="Cari nama, nomor HP atau email..."
                        className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:border-[#FF6B1A] bg-white font-medium"
                      />
                    </div>

                    {/* Contact selector table */}
                    <div className="max-h-48 overflow-y-auto border border-zinc-200 rounded-xl bg-white text-xs divide-y divide-zinc-100">
                      {contactsLoading ? (
                        <div className="flex items-center justify-center py-8 text-zinc-400 gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-[#FF6B1A]" />
                          <span className="font-bold">Loading data customer...</span>
                        </div>
                      ) : filteredContacts.length === 0 ? (
                        <div className="py-8 text-center text-zinc-400 font-bold">Tidak ada kontak ditemukan</div>
                      ) : (
                        <>
                          {/* Checkbox select all header */}
                          <div className="sticky top-0 bg-zinc-50 flex items-center px-4 py-2 font-black text-zinc-700 border-b border-zinc-200">
                            <input
                              type="checkbox"
                              checked={filteredContacts.length > 0 && filteredContacts.every((c) => customSelected.includes(c.id))}
                              onChange={toggleSelectAllContacts}
                              className="mr-3 h-4 w-4 rounded cursor-pointer accent-[#FF6B1A]"
                            />
                            <span className="flex-1">Nama Customer</span>
                            <span className="w-1/4 text-right">WhatsApp</span>
                            <span className="w-1/3 text-right">Email</span>
                          </div>
                          
                          {/* Rows */}
                          {filteredContacts.map((c) => (
                            <div
                              key={c.id}
                              onClick={() => handleSelectContact(c.id)}
                              className="flex items-center px-4 py-2 hover:bg-zinc-50 cursor-pointer transition"
                            >
                              <input
                                type="checkbox"
                                checked={customSelected.includes(c.id)}
                                onChange={() => {}} // Handled by outer click
                                className="mr-3 h-4 w-4 rounded cursor-pointer accent-[#FF6B1A]"
                              />
                              <span className="flex-1 font-bold text-zinc-800 flex items-center gap-1.5">
                                {c.username}
                                {c.hasOrder && (
                                  <span className="text-[8px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-black tracking-wider">
                                    ORDERED
                                  </span>
                                )}
                              </span>
                              <span className="w-1/4 text-right font-medium text-zinc-500">{c.noHp || "-"}</span>
                              <span className="w-1/3 text-right font-medium text-zinc-500 truncate" title={c.email}>{c.email || "-"}</span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Image Attachment (WhatsApp / Hybrid) */}
                  {(channel === "wa" || channel === "hybrid") && (
                    <div className="rounded-2xl border border-zinc-200 p-4 space-y-3 bg-zinc-50/50">
                      <label className="text-xs font-black text-zinc-700 flex items-center gap-1.5">
                        <ImageIcon className="h-4 w-4 text-[#FF6B1A]" /> Lampiran Gambar (Opsional)
                      </label>
                      <p className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        Fonnte membutuhkan URL gambar HTTPS publik. URL localhost/upload lokal akan diabaikan — pesan tetap terkirim tanpa gambar.
                      </p>
                      
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="flex-1">
                          <Input
                            value={gambar}
                            onChange={(e) => setGambar(e.target.value)}
                            placeholder="Masukkan URL Gambar langsung (https://...)"
                          />
                        </div>
                        
                        <div className="relative">
                          <input
                            type="file"
                            id="file-upload"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                            disabled={imageUploading}
                          />
                          <label
                            htmlFor="file-upload"
                            className={`flex items-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 cursor-pointer transition ${
                              imageUploading ? "opacity-50 pointer-events-none" : ""
                            }`}
                          >
                            {imageUploading ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin text-[#FF6B1A]" />
                                Mengunggah...
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4 text-zinc-400" />
                                Upload Gambar
                              </>
                            )}
                          </label>
                        </div>
                      </div>

                      {gambar && (gambar.includes("localhost") || gambar.startsWith("http://")) && (
                        <p className="text-[10px] font-black text-red-600">
                          ⚠ URL ini tidak publik — gambar tidak akan dilampirkan ke WhatsApp.
                        </p>
                      )}
                      {gambar && (
                        <div className="relative inline-block mt-2 rounded-xl overflow-hidden border border-zinc-200 bg-white p-1 max-w-[200px]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={gambar} alt="Preview" className="max-h-24 w-auto rounded-lg object-contain" />
                          <button
                            onClick={() => setGambar("")}
                            className="absolute top-1.5 right-1.5 rounded-full bg-red-600 text-white p-1 hover:bg-red-700 shadow"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message editor */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-zinc-700">Isi Pesan Broadcast</label>
                    <textarea
                      ref={textareaRef}
                      value={pesan}
                      onChange={(e) => setPesan(e.target.value)}
                      rows={6}
                      placeholder={
                        channel === "email"
                          ? "Tulis isi email di sini..."
                          : channel === "notif"
                          ? "Tulis notifikasi in-app di sini..."
                          : "Tulis pesan WhatsApp di sini..."
                      }
                      className="w-full rounded-xl border-2 border-zinc-200 bg-white px-3 py-2.5 text-xs text-zinc-800 focus:border-[#FF6B1A] focus:outline-none font-medium leading-relaxed"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={handleSendBroadcast}
                      loading={sendingBroadcast}
                      icon={<Send className="h-4 w-4" />}
                      size="lg"
                    >
                      Kirim Broadcast Sekarang
                    </Button>
                  </div>
                </div>
              </Section>


          {/* Broadcast history list */}
          <Section
            title="Riwayat Broadcast Notifikasi"
            badge={broadcasts.length}
            icon={<Megaphone className="h-5 w-5 text-[#FF6B1A]" />}
          >
            {broadcastLoading && broadcasts.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#FF6B1A]" />
              </div>
            ) : broadcasts.length === 0 ? (
              <EmptyState icon={Megaphone} title="Belum ada riwayat broadcast" />
            ) : (
              <div className="divide-y divide-zinc-100 overflow-hidden border border-zinc-200 rounded-2xl bg-white shadow-sm">
                {broadcasts.map((b) => {
                  let statusColor = "bg-zinc-100 text-zinc-700";
                  if (b.status === "PROCESSING") statusColor = "bg-orange-100 text-orange-700";
                  if (b.status === "COMPLETED") statusColor = "bg-emerald-100 text-emerald-700";
                  if (b.status === "FAILED") statusColor = "bg-red-100 text-red-700";

                  let channelBadge = "bg-emerald-100 text-emerald-700 border-emerald-200";
                  if (b.channel === "email") channelBadge = "bg-blue-100 text-blue-700 border-blue-200";
                  if (b.channel === "notif") channelBadge = "bg-amber-100 text-amber-700 border-amber-200";

                  const ChannelIcon = b.channel === "wa" ? MessageCircle : b.channel === "email" ? Mail : Bell;

                  return (
                    <div
                      key={b.id}
                      className="flex flex-col justify-between gap-4 p-4 transition-all duration-200 hover:bg-zinc-50 md:flex-row md:items-center cursor-pointer"
                      onClick={() => handleViewDetails(b)}
                    >
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${channelBadge}`}>
                            <ChannelIcon className="h-3 w-3" />
                            {b.channel === "wa" ? "WA" : b.channel === "email" ? "Email" : "In-App"}
                          </span>
                          <h4 className="text-sm font-black text-zinc-900">{b.judul}</h4>
                          <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${statusColor}`}>
                            {b.status}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-zinc-500 line-clamp-1 max-w-2xl">{b.pesan}</p>
                        <div className="flex items-center gap-3 text-[10px] font-semibold text-zinc-400">
                          <span>Target: <strong className="text-zinc-600 font-bold uppercase">{b.target}</strong></span>
                          <span>·</span>
                          <span>{fmtDate(b.createdAt)}</span>
                        </div>
                      </div>

                      {/* Stats & Actions */}
                      <div className="flex items-center justify-between gap-4 self-end md:self-center">
                        <div className="flex items-center gap-2 text-center text-[10px] font-black">
                          <div className="rounded-lg bg-zinc-50 px-2 py-1 border border-zinc-200">
                            <span className="block text-zinc-500 font-bold uppercase text-[8px]">Total</span>
                            <span className="text-xs text-zinc-800">{b.total}</span>
                          </div>
                          <div className="rounded-lg bg-emerald-50 px-2 py-1 border border-emerald-100">
                            <span className="block text-emerald-600 font-bold uppercase text-[8px]">Terkirim</span>
                            <span className="text-xs text-emerald-700">{b.terkirim}</span>
                          </div>
                          <div className="rounded-lg bg-red-50 px-2 py-1 border border-red-100">
                            <span className="block text-red-600 font-bold uppercase text-[8px]">Gagal</span>
                            <span className="text-xs text-red-700">{b.gagal}</span>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              handleViewDetails(b);
                            }}
                            variant="outline"
                            size="sm"
                          >
                            Detail
                          </Button>
                          <button
                            onClick={(e) => handleDeleteBroadcast(e, b.id)}
                            className="flex items-center justify-center p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition"
                            title="Hapus Riwayat"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        </div>
      )}

      {/* --- TAB 2: TRANSACTIONAL VIEW (Resend-like) --- */}
      {activeTab === "transactional" && (
        <div className="space-y-6">
          <Section
            title="Log Notifikasi Transaksional"
            subtitle="Pantau dan kirim ulang notifikasi otomatis (OTP, Registrasi, Order Status)"
            icon={<Clock className="h-5 w-5 text-[#FF6B1A]" />}
          >
            {/* Filters bar */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4 pb-4 border-b border-zinc-100">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  value={transSearch}
                  onChange={(e) => setTransSearch(e.target.value)}
                  placeholder="Cari nama, nomor HP, atau pesan..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:border-[#FF6B1A]"
                />
              </div>
              <Select
                value={transType}
                onChange={(e) => setTransType(e.target.value)}
                options={[
                  { value: "", label: "Semua Tipe" },
                  { value: "REGISTRASI", label: "Registrasi" },
                  { value: "OTP", label: "OTP Verifikasi" },
                  { value: "ORDER_CREATED", label: "Pesanan Dibuat" },
                  { value: "PAYMENT_RECEIVED", label: "Pembayaran Diterima" },
                  { value: "ORDER_PROCESSED", label: "Pesanan Diproses" },
                  { value: "ORDER_SHIPPED", label: "Pesanan Dikirim" },
                  { value: "ORDER_COMPLETED", label: "Pesanan Selesai" },
                ]}
              />
              <Select
                value={transStatus}
                onChange={(e) => setTransStatus(e.target.value)}
                options={[
                  { value: "", label: "Semua Status" },
                  { value: "SENT", label: "Terkirim" },
                  { value: "FAILED", label: "Gagal" },
                  { value: "PENDING", label: "Pending" },
                ]}
              />
            </div>

            {/* Quick Trigger filter refresh & Bulk Actions */}
            <div className="flex justify-between items-center">
              <div>
                {selectedTransLogs.length > 0 && (
                  <button
                    onClick={() => setDeleteTransConfirmOpen(true)}
                    className="flex items-center gap-1.5 text-[10px] font-black text-white bg-red-500 border border-red-600 px-3 py-1.5 rounded-xl hover:bg-red-600 shadow-sm transition"
                  >
                    <Trash2 className="h-3 w-3" />
                    Hapus {selectedTransLogs.length} Terpilih
                  </button>
                )}
              </div>
              <button
                onClick={fetchTransactionalLogs}
                className="flex items-center gap-1.5 text-[10px] font-black text-[#FF6B1A] bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-xl hover:bg-orange-100 transition"
              >
                <RefreshCw className={`h-3 w-3 ${transLoading ? "animate-spin" : ""}`} />
                Segarkan Data
              </button>
            </div>

            {/* Logs Table */}
            {transLoading && transLogs.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#FF6B1A]" />
              </div>
            ) : transLogs.length === 0 ? (
              <EmptyState icon={Clock} title="Tidak ada logs transaksional ditemukan" />
            ) : (
              <div className="overflow-x-auto border border-zinc-200 rounded-2xl bg-white shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase text-[9px] font-black tracking-wider">
                      <th className="px-4 py-3 w-10 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-zinc-300 text-[#FF6B1A] focus:ring-[#FF6B1A] cursor-pointer"
                          checked={transLogs.length > 0 && selectedTransLogs.length === transLogs.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTransLogs(transLogs.map((log) => log.id));
                            } else {
                              setSelectedTransLogs([]);
                            }
                          }}
                        />
                      </th>
                      <th className="px-4 py-3">Waktu</th>
                      <th className="px-4 py-3">Channel</th>
                      <th className="px-4 py-3">Nama / Penerima</th>
                      <th className="px-4 py-3">Tipe</th>
                      <th className="px-4 py-3">Pesan</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-150">
                    {transLogs.map((log) => {
                      let statusBadge = "bg-zinc-100 text-zinc-700";
                      if (log.status === "SENT") statusBadge = "bg-emerald-100 text-emerald-700";
                      if (log.status === "FAILED") statusBadge = "bg-red-100 text-red-700";
                      if (log.status === "PENDING") statusBadge = "bg-orange-100 text-orange-700";

                      let channelBadge = "bg-emerald-100 text-emerald-700 border-emerald-200";
                      if (log.channel === "email") channelBadge = "bg-blue-100 text-blue-700 border-blue-200";
                      if (log.channel === "notif") channelBadge = "bg-amber-100 text-amber-700 border-amber-200";

                      const ChannelIcon = log.channel === "wa" ? MessageCircle : log.channel === "email" ? Mail : Bell;

                      return (
                        <tr
                          key={`${log.channel}-${log.id}`}
                          className="hover:bg-zinc-50 transition-colors duration-150 cursor-pointer"
                          onClick={() => setSelectedTransLog(log)}
                        >
                          <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-zinc-300 text-[#FF6B1A] focus:ring-[#FF6B1A] cursor-pointer"
                              checked={selectedTransLogs.includes(log.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTransLogs((prev) => [...prev, log.id]);
                                } else {
                                  setSelectedTransLogs((prev) => prev.filter((id) => id !== log.id));
                                }
                              }}
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-zinc-500 font-medium">
                            {fmtDate(log.createdAt)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${channelBadge}`}>
                              <ChannelIcon className="h-3 w-3" />
                              {log.channel === "wa" ? "WA" : log.channel === "email" ? "Email" : "In-App"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-zinc-800 flex items-center gap-1">
                              <User className="h-3 w-3 text-zinc-400" /> {log.nama}
                            </div>
                            <div className="text-zinc-500 font-semibold flex items-center gap-1 mt-0.5">
                              {log.channel === "wa" ? (
                                <><Phone className="h-2.5 w-2.5 text-zinc-400" /> {log.recipient}</>
                              ) : log.channel === "email" ? (
                                <><Mail className="h-2.5 w-2.5 text-zinc-400" /> {log.recipient}</>
                              ) : (
                                <><User className="h-2.5 w-2.5 text-zinc-400" /> {log.recipient}</>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="rounded-lg bg-zinc-100 border border-zinc-200 px-2 py-0.5 font-bold text-[10px] text-zinc-700">
                              {log.tipe}
                            </span>
                          </td>
                          <td className="px-4 py-3 max-w-xs">
                            <span className="font-medium text-zinc-600 line-clamp-1">{log.pesan}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${statusBadge}`}>
                                {log.status}
                              </span>
                              {log.status === "FAILED" && log.error && (
                                <span
                                  className="text-red-500"
                                  title={log.error}
                                >
                                  <AlertCircle className="h-3.5 w-3.5" />
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-2">
                              {log.channel === "wa" && (
                                <button
                                  onClick={() => handleResendTransactional(log.id)}
                                  disabled={resendingLogId === log.id}
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-[10px] font-black text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 transition shadow-sm"
                                >
                                  {resendingLogId === log.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin text-[#FF6B1A]" />
                                  ) : (
                                    <RefreshCw className="h-3 w-3 text-zinc-500" />
                                  )}
                                  Resend
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>
      )}

      {/* --- BROADCAST RECIPENTS LOG MODAL --- */}
      {detailModalOpen && selectedBroadcast && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity"
          onClick={() => setDetailModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 p-5 text-white flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-[8px] font-black uppercase text-white px-1.5 py-0.5 rounded border border-white/25 ${
                    selectedBroadcast.channel === "wa" ? "bg-emerald-600" : selectedBroadcast.channel === "email" ? "bg-blue-600" : "bg-amber-500"
                  }`}>
                    {selectedBroadcast.channel === "wa" ? "WA" : selectedBroadcast.channel === "email" ? "Email" : "In-App"}
                  </span>
                  <h3 className="text-base font-black">{selectedBroadcast.judul}</h3>
                </div>
                <p className="text-[10px] text-zinc-400 mt-0.5">ID: {selectedBroadcast.id}</p>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="rounded-full bg-white/10 hover:bg-white/20 p-1.5 text-zinc-300 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Stats overview */}
              <div className="grid grid-cols-4 gap-3 text-center border-b border-zinc-100 pb-5">
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                  <span className="block text-[9px] font-bold text-zinc-500 uppercase">Total</span>
                  <span className="text-lg font-black text-zinc-800">{selectedBroadcast.total}</span>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-3">
                  <span className="block text-[9px] font-bold text-emerald-600 uppercase">Terkirim</span>
                  <span className="text-lg font-black text-emerald-700">{selectedBroadcast.terkirim}</span>
                </div>
                <div className="rounded-2xl border border-red-100 bg-red-50 px-3 py-3">
                  <span className="block text-[9px] font-bold text-red-600 uppercase">Gagal</span>
                  <span className="text-lg font-black text-red-700">{selectedBroadcast.gagal}</span>
                </div>
                <div className="rounded-2xl border border-orange-100 bg-orange-50 px-3 py-3 animate-pulse">
                  <span className="block text-[9px] font-bold text-orange-600 uppercase">Pending</span>
                  <span className="text-lg font-black text-orange-700">{selectedBroadcast.pending}</span>
                </div>
              </div>

              {/* Message Details */}
              <div className="rounded-2xl bg-zinc-50 border border-zinc-150 p-4 space-y-2">
                <p className="text-[10px] font-black text-zinc-500 uppercase">Isi Templat Pesan</p>
                <p className="text-xs font-semibold text-zinc-700 whitespace-pre-wrap leading-relaxed">&ldquo;{selectedBroadcast.pesan}&rdquo;</p>
                {selectedBroadcast.channel === "wa" && selectedBroadcast.gambar && (
                  <div className="pt-2 flex items-center gap-2">
                    <ImageIcon className="h-3.5 w-3.5 text-[#FF6B1A]" />
                    <a
                      href={selectedBroadcast.gambar}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold text-[#FF6B1A] hover:underline inline-flex items-center gap-1"
                    >
                      Buka Lampiran Gambar <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* Recipients Log List */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-zinc-800 uppercase tracking-wider">
                  Detail Pengiriman per Customer
                </h4>
                
                {detailLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-[#FF6B1A]" />
                  </div>
                ) : !selectedBroadcast.logs || selectedBroadcast.logs.length === 0 ? (
                  <div className="text-center text-zinc-400 font-bold py-6">Tidak ada logs pengiriman</div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {selectedBroadcast.logs.map((log) => {
                      let logBadge = "bg-zinc-100 text-zinc-700";
                      if (log.status === "SENT") logBadge = "bg-emerald-100 text-emerald-700";
                      if (log.status === "FAILED") logBadge = "bg-red-100 text-red-700";
                      if (log.status === "PENDING") logBadge = "bg-orange-100 text-orange-700";

                      return (
                        <div
                          key={log.id}
                          className="flex items-center justify-between border border-zinc-150 rounded-xl p-3 bg-white text-xs hover:border-[#FF6B1A] transition"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap font-medium">
                              <span className="font-bold text-zinc-800">{log.nama}</span>
                              {selectedBroadcast.channel === "wa" && log.noHp && (
                                <span className="text-zinc-500">({log.noHp})</span>
                              )}
                              {selectedBroadcast.channel === "email" && log.email && (
                                <span className="text-zinc-500">({log.email})</span>
                              )}
                              {selectedBroadcast.channel === "notif" && (
                                <span className="text-zinc-400 italic">(In-App)</span>
                              )}
                            </div>
                            {log.status === "FAILED" && log.error && (
                              <p className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-lg">
                                Error: {log.error} (coba: {log.retries})
                              </p>
                            )}
                            {log.status === "SENT" && log.sentAt && (
                              <p className="text-[9px] font-semibold text-zinc-400">
                                Terkirim: {fmtDate(log.sentAt)} (retries: {log.retries})
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <span className={`rounded-full px-2.5 py-0.5 text-[8px] font-black uppercase tracking-wider ${logBadge}`}>
                              {log.status}
                            </span>
                            {log.status === "FAILED" && (
                              <button
                                onClick={() => handleRetryRecipient(log.id)}
                                disabled={retryingLogId === log.id}
                                className="rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 px-3 py-1 text-[10px] font-black transition disabled:opacity-50"
                              >
                                {retryingLogId === log.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  "Retry"
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-zinc-50 border-t border-zinc-100 px-6 py-4 flex justify-end">
              <Button
                variant="outline"
                onClick={() => setDetailModalOpen(false)}
              >
                Tutup Detail
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* --- TRANSACTIONAL DETAIL MODAL --- */}
      {selectedTransLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setSelectedTransLog(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col max-h-[80vh] w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 p-5 text-white flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black flex items-center gap-2">
                  <Clock className="h-4.5 w-4.5 text-[#FF6B1A]" /> Detail Log Transaksional
                </h3>
                <p className="text-[10px] text-zinc-400 mt-0.5">Tipe: {selectedTransLog.tipe}</p>
              </div>
              <button
                onClick={() => setSelectedTransLog(null)}
                className="rounded-full bg-white/10 hover:bg-white/20 p-1.5 text-zinc-300 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 border-b border-zinc-100 pb-4">
                <div>
                  <span className="block text-[9px] font-bold text-zinc-400 uppercase">Nama Penerima</span>
                  <span className="text-sm font-black text-zinc-800">{selectedTransLog.nama}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-zinc-400 uppercase">
                    {selectedTransLog.channel === "email" ? "Email" : selectedTransLog.channel === "wa" ? "No WhatsApp" : "Username"}
                  </span>
                  <span className="text-sm font-black text-zinc-800">{selectedTransLog.recipient}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b border-zinc-100 pb-4">
                <div>
                  <span className="block text-[9px] font-bold text-zinc-400 uppercase">Status</span>
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider mt-1 ${
                    selectedTransLog.status === "SENT"
                      ? "bg-emerald-100 text-emerald-700"
                      : selectedTransLog.status === "FAILED"
                      ? "bg-red-100 text-red-700"
                      : "bg-orange-100 text-orange-700"
                  }`}>
                    {selectedTransLog.status}
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-zinc-400 uppercase">Waktu Dibuat</span>
                  <span className="text-xs font-bold text-zinc-600">{fmtDate(selectedTransLog.createdAt)}</span>
                </div>
              </div>

              {selectedTransLog.status === "FAILED" && selectedTransLog.error && (
                <div className="rounded-2xl bg-red-50 border border-red-100 p-4">
                  <span className="block text-[9px] font-bold text-red-600 uppercase">Catatan Kesalahan / Error</span>
                  <p className="text-red-700 font-bold mt-1 text-[11px] leading-normal">{selectedTransLog.error}</p>
                  {selectedTransLog.channel === "wa" && (
                    <p className="text-[10px] text-red-500 font-semibold mt-2">Jumlah percobaan gagal: {selectedTransLog.retries} kali.</p>
                  )}
                </div>
              )}

              {selectedTransLog.status === "SENT" && (
                <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
                  <span className="block text-[9px] font-bold text-emerald-600 uppercase">Detail Pengiriman</span>
                  <p className="text-emerald-700 font-semibold mt-1">
                    Pesan berhasil dikirim pada: <strong className="font-bold">{fmtDate(selectedTransLog.createdAt)}</strong>
                  </p>
                  {selectedTransLog.channel === "wa" && selectedTransLog.retries !== undefined && (
                    <p className="text-[10px] text-emerald-500 font-semibold mt-1">Telah dicoba sebanyak: {selectedTransLog.retries} kali.</p>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <span className="block text-[9px] font-bold text-zinc-400 uppercase">Isi Pesan Terkirim</span>
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 font-semibold text-zinc-700 whitespace-pre-wrap leading-relaxed text-[11px]">
                  {selectedTransLog.pesan}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-zinc-50 border-t border-zinc-100 px-6 py-4 flex justify-between items-center">
              {selectedTransLog.channel === "wa" ? (
                <button
                  onClick={() => {
                    handleResendTransactional(selectedTransLog.id);
                    setSelectedTransLog(null);
                  }}
                  disabled={resendingLogId === selectedTransLog.id}
                  className="flex items-center gap-1.5 rounded-xl border border-[#FF6B1A] bg-orange-50 px-4 py-2 text-xs font-black text-[#FF6B1A] hover:bg-orange-100 disabled:opacity-50 transition shadow-sm"
                >
                  {resendingLogId === selectedTransLog.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  Kirim Ulang (Resend)
                </button>
              ) : (
                <div />
              )}
              <Button
                variant="outline"
                onClick={() => setSelectedTransLog(null)}
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={deleteConfirmOpen}
        title="Hapus Riwayat Broadcast?"
        message="Apakah Anda yakin ingin menghapus riwayat broadcast ini? Aksi ini tidak dapat dibatalkan."
        confirmText="Ya, Hapus"
        cancelText="Batal"
        variant="danger"
        onConfirm={executeDeleteBroadcast}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setBroadcastToDelete(null);
        }}
      />
      <ConfirmModal
        open={deleteTransConfirmOpen}
        title="Hapus Log Transaksional?"
        message={`Apakah Anda yakin ingin menghapus ${selectedTransLogs.length} log notifikasi transaksional yang dipilih?`}
        confirmText="Ya, Hapus"
        cancelText="Batal"
        variant="danger"
        onConfirm={executeDeleteTransLog}
        onClose={() => {
          setDeleteTransConfirmOpen(false);
        }}
      />
    </div>
  );
}
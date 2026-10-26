import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getMyBorrowings, formatIndoDate, getStatusBadge } from "../services/borrowService";

export default function RiwayatPeminjaman() {
  const [borrowings, setBorrowings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [meta, setMeta] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, PENDING, BORROWED, RETURNED, OVERDUE

  // Detail Modal
  const [selectedBorrowing, setSelectedBorrowing] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    fetchHistory(currentPage);
  }, [currentPage]);

  const fetchHistory = async (page = 1) => {
    setLoading(true);
    setError("");
    const result = await getMyBorrowings(page);
    setLoading(false);

    if (result.success && Array.isArray(result.data)) {
      setBorrowings(result.data);
      if (result.meta) {
        setMeta(result.meta);
      }
    } else {
      setError(result.message || "Gagal memuat riwayat peminjaman.");
    }
  };

  const copyCode = (code) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Hitung ringkasan statistik
  const stats = useMemo(() => {
    let pending = 0;
    let borrowed = 0;
    let returned = 0;
    let overdue = 0;

    borrowings.forEach((b) => {
      const st = (b.status || "").toUpperCase();
      if (b.is_overdue && st !== "RETURNED") overdue++;
      if (st === "PENDING") pending++;
      else if (st === "BORROWED" || st === "APPROVED") borrowed++;
      else if (st === "RETURNED") returned++;
    });

    return {
      total: borrowings.length,
      pending,
      borrowed,
      returned,
      overdue,
    };
  }, [borrowings]);

  // Filter daftar peminjaman berdasarkan pencarian & filter status
  const filteredBorrowings = useMemo(() => {
    return borrowings.filter((item) => {
      // 1. Filter status
      const st = (item.status || "").toUpperCase();
      if (statusFilter === "PENDING" && st !== "PENDING") return false;
      if (statusFilter === "BORROWED" && st !== "BORROWED" && st !== "APPROVED") return false;
      if (statusFilter === "RETURNED" && st !== "RETURNED") return false;
      if (statusFilter === "OVERDUE" && (!item.is_overdue || st === "RETURNED")) return false;

      // 2. Filter query pencarian
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();

      const matchCode = item.transaction_code && item.transaction_code.toLowerCase().includes(q);
      const matchNotes = item.notes && item.notes.toLowerCase().includes(q);
      const matchBooks = item.items?.some((it) => {
        const book = it.book || {};
        return (
          (book.title && book.title.toLowerCase().includes(q)) ||
          (book.author && book.author.toLowerCase().includes(q)) ||
          (book.publisher && book.publisher.toLowerCase().includes(q))
        );
      });

      return matchCode || matchNotes || matchBooks;
    });
  }, [borrowings, statusFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Halaman */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-sm text-blue-600 font-semibold mb-1">
              <Link to="/katalog" className="hover:underline">
                Beranda
              </Link>
              <span>/</span>
              <span className="text-slate-600">Riwayat Peminjaman</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Riwayat Peminjaman Buku
            </h1>
            <p className="text-slate-600 text-sm mt-1">
              Pantau status peminjaman, tanggal pengembalian, dan riwayat peminjaman buku Anda.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchHistory(currentPage)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-semibold transition-colors shadow-xs"
              title="Perbarui Data"
            >
              <svg
                className={`w-4 h-4 text-slate-600 ${loading ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>Segarkan</span>
            </button>

            <Link
              to="/pengajuan-peminjaman"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/20"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Ajukan Peminjaman Baru</span>
            </Link>
          </div>
        </div>

        {/* Ringkasan Statistik */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase">Total Pengajuan</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">{stats.total}</p>
            <p className="text-xs text-slate-600 mt-1">Keseluruhan peminjaman</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-600 uppercase">Menunggu Persetujuan</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-amber-600 mt-2">{stats.pending}</p>
            <p className="text-xs text-slate-600 mt-1">Menunggu konfirmasi petugas</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-600 uppercase">Sedang Dipinjam</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-blue-600 mt-2">{stats.borrowed}</p>
            <p className="text-xs text-slate-600 mt-1">Buku aktif berada pada Anda</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-600 uppercase">Sudah Kembali</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-2">{stats.returned}</p>
            <p className="text-xs text-slate-600 mt-1">Peminjaman selesai</p>
          </div>
        </div>

        {/* Filter Bar & Search */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 mb-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <svg className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Cari kode transaksi, judul buku, catatan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-sm"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Tabs / Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { key: "ALL", label: "Semua" },
                { key: "PENDING", label: `Menunggu (${stats.pending})` },
                { key: "BORROWED", label: `Dipinjam (${stats.borrowed})` },
                { key: "RETURNED", label: `Selesai (${stats.returned})` },
                ...(stats.overdue > 0 ? [{ key: "OVERDUE", label: `Terlambat (${stats.overdue})` }] : []),
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    statusFilter === tab.key
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notifikasi Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl mb-6 text-sm text-red-700 flex items-center justify-between">
            <p>{error}</p>
            <button
              onClick={() => fetchHistory(currentPage)}
              className="text-xs font-bold underline ml-4 hover:text-red-900"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* Content State: Loading, Empty, or List */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-xs">
            <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <h3 className="text-base font-bold text-slate-800">Memuat Riwayat Peminjaman...</h3>
            <p className="text-xs text-slate-600 mt-1">Mengambil data transaksi perpustakaan Anda</p>
          </div>
        ) : filteredBorrowings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 sm:p-16 text-center shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-800">
              {searchQuery || statusFilter !== "ALL"
                ? "Tidak ada peminjaman yang cocok"
                : "Belum Ada Riwayat Peminjaman"}
            </h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto mt-1 mb-6">
              {searchQuery || statusFilter !== "ALL"
                ? "Coba ubah kata kunci pencarian atau reset filter status peminjaman."
                : "Anda belum pernah mengajukan peminjaman buku. Jelajahi katalog buku dan ajukan peminjaman sekarang."}
            </p>
            {searchQuery || statusFilter !== "ALL" ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                }}
                className="px-5 py-2.5 bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-200 transition-colors"
              >
                Reset Filter Pencarian
              </button>
            ) : (
              <Link
                to="/pengajuan-peminjaman"
                className="px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20 inline-block"
              >
                Ajukan Peminjaman Pertama
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBorrowings.map((item) => {
              const badge = getStatusBadge(item.status, item.is_overdue);
              const itemsList = item.items || [];

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 hover:shadow-md transition-all p-5 sm:p-6"
                >
                  {/* Top Bar Card */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-600 uppercase font-semibold">Kode:</span>
                        <span className="font-mono font-bold text-slate-900 text-sm sm:text-base">
                          {item.transaction_code}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyCode(item.transaction_code)}
                          title="Salin kode"
                          className="p-1 text-slate-600 hover:text-blue-600 rounded hover:bg-slate-100"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.bgClass}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${badge.dotClass}`} />
                        <span>{badge.label}</span>
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 flex items-center gap-1">
                      <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Diajukan: {formatIndoDate(item.created_at, true)}</span>
                    </div>
                  </div>

                  {/* Body Card: Buku yang dipinjam & Timeline Tanggal */}
                  <div className="py-4 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                    {/* Daftar Buku */}
                    <div className="md:col-span-2 space-y-3">
                      {itemsList.map((it) => {
                        const book = it.book || {};
                        return (
                          <div key={it.id || book.id} className="flex items-center gap-3.5">
                            {book.cover ? (
                              <img
                                src={book.cover}
                                alt={book.title}
                                className="w-14 h-20 object-cover rounded-lg border border-slate-200 shrink-0 shadow-xs"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="w-14 h-20 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                                BUKU
                              </div>
                            )}

                            <div>
                              <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                                {book.title || "Judul Buku"}
                              </h4>
                              <p className="text-xs text-slate-600 mt-0.5">
                                Penulis: <span className="font-medium text-slate-700">{book.author || "-"}</span> | Penerbit:{" "}
                                <span className="font-medium text-slate-700">{book.publisher || "-"}</span>
                              </p>
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                                  Jumlah: {it.quantity} buku
                                </span>
                                {book.isbn && (
                                  <span className="text-xs text-slate-600 font-mono">
                                    ISBN: {book.isbn}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {item.notes && (
                        <div className="mt-3 p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-600">
                          <span className="font-semibold text-slate-700 block mb-0.5">Catatan Keperluan:</span>
                          <p className="italic">"{item.notes}"</p>
                        </div>
                      )}
                    </div>

                    {/* Timeline & Informasi Tanggal */}
                    <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-2.5 text-xs">
                      <div>
                        <span className="text-slate-600 block">Batas Pengembalian:</span>
                        <span className="font-bold text-slate-900 text-sm block">
                          {formatIndoDate(item.due_date)}
                        </span>
                      </div>

                      {item.borrowed_at && (
                        <div>
                          <span className="text-slate-600 block">Tanggal Diambil:</span>
                          <span className="font-semibold text-slate-800">
                            {formatIndoDate(item.borrowed_at, true)}
                          </span>
                        </div>
                      )}

                      {item.returned_at && (
                        <div>
                          <span className="text-slate-600 block">Tanggal Dikembalikan:</span>
                          <span className="font-semibold text-emerald-700">
                            {formatIndoDate(item.returned_at, true)}
                          </span>
                        </div>
                      )}

                      {item.is_overdue && item.status !== "RETURNED" && (
                        <div className="p-2 bg-red-100 text-red-800 rounded-lg font-semibold flex items-center gap-1.5 mt-2">
                          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Peminjaman melewati batas tempo!</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer Card */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-600">
                      ID Transaksi #{item.id}
                    </span>

                    <button
                      type="button"
                      onClick={() => setSelectedBorrowing(item)}
                      className="px-4 py-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <span>Lihat Detail Lengkap</span>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination jika ada meta */}
        {meta && meta.last_page > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || loading}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              Sebelumnya
            </button>
            <span className="text-sm font-semibold text-slate-700 px-3">
              Halaman {meta.current_page} dari {meta.last_page}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(meta.last_page, p + 1))}
              disabled={currentPage >= meta.last_page || loading}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              Selanjutnya
            </button>
          </div>
        )}
      </main>

      {/* Modal Detail Peminjaman */}
      {selectedBorrowing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold uppercase text-slate-600 block">Detail Peminjaman</span>
                <h3 className="text-xl font-mono font-bold text-slate-900 mt-0.5">
                  {selectedBorrowing.transaction_code}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBorrowing(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Status Info */}
            <div className="my-5 p-4 rounded-xl border flex items-center justify-between gap-4 bg-slate-50">
              <div>
                <span className="text-xs text-slate-600 block font-medium">Status Peminjaman</span>
                <span className="text-base font-bold text-slate-900">
                  {getStatusBadge(selectedBorrowing.status, selectedBorrowing.is_overdue).label}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copyCode(selectedBorrowing.transaction_code)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 shadow-xs"
              >
                {copiedCode ? "Tersalin!" : "Salin Kode"}
              </button>
            </div>

            {/* Detail Timeline */}
            <div className="space-y-3 text-sm pb-5 border-b border-slate-100">
              <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
                <span className="text-slate-600">Peminjam:</span>
                <span className="font-semibold text-slate-900">
                  {selectedBorrowing.borrower_name} ({selectedBorrowing.borrower_identity_number})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
                <span className="text-slate-600">Tanggal Pengajuan:</span>
                <span className="font-semibold text-slate-900">
                  {formatIndoDate(selectedBorrowing.created_at, true)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
                <span className="text-slate-600">Batas Pengembalian (Due Date):</span>
                <span className="font-bold text-blue-700">
                  {formatIndoDate(selectedBorrowing.due_date)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
                <span className="text-slate-600">Tanggal Diambil:</span>
                <span className="font-semibold text-slate-900">
                  {selectedBorrowing.borrowed_at ? formatIndoDate(selectedBorrowing.borrowed_at, true) : "- (Belum diambil)"}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-600">Tanggal Dikembalikan:</span>
                <span className="font-semibold text-slate-900">
                  {selectedBorrowing.returned_at ? formatIndoDate(selectedBorrowing.returned_at, true) : "- (Belum dikembalikan)"}
                </span>
              </div>
            </div>

            {/* Buku-buku dalam transaksi */}
            <div className="my-5">
              <h4 className="text-sm font-bold text-slate-900 mb-3">Buku yang Dipinjam</h4>
              <div className="space-y-3">
                {selectedBorrowing.items?.map((it) => (
                  <div key={it.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                    {it.book?.cover ? (
                      <img
                        src={it.book.cover}
                        alt={it.book.title}
                        className="w-12 h-16 object-cover rounded-md border shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-16 bg-slate-200 rounded-md flex items-center justify-center font-bold text-[10px] text-slate-600 shrink-0">
                        BUKU
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold text-slate-900">{it.book?.title || "Judul Buku"}</p>
                      <p className="text-xs text-slate-600 mt-0.5">Penulis: {it.book?.author || "-"}</p>
                      <p className="text-xs text-slate-600">Jumlah: {it.quantity} buku</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedBorrowing.notes && (
              <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                <span className="font-bold block mb-1">Catatan Peminjaman:</span>
                <p>{selectedBorrowing.notes}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedBorrowing(null)}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

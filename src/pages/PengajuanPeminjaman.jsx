import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getCurrentUser, getBooks, getBookDetail } from "../services/authService";
import { getMyBorrowings, createBorrowing, formatIndoDate } from "../services/borrowService";
import { confirmAction, toastSuccess, toastError, alertError } from "../utils/alert";
import { copyTextToClipboard } from "../utils/clipboard";
import { getErrorMessage } from "../utils/getErrorMessage";

const MAX_BOOKS = 2; // Maksimal peminjaman 2 buku per siswa
const MAX_DAYS = 3;  // Maksimal 3 hari peminjaman

export default function PengajuanPeminjaman() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = getCurrentUser();

  // State buku & seleksi
  const [books, setBooks] = useState([]);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [selectedBooks, setSelectedBooks] = useState([]);

  // State status peminjam
  const [activeBooksCount, setActiveBooksCount] = useState(0);
  const [hasOverdue, setHasOverdue] = useState(false);

  // State form
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  // State UI
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successData, setSuccessData] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Modal pencarian buku
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState("");

  // Perhitungan kuota
  const totalSelectedQty = selectedBooks.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
  const remainingQuota = Math.max(0, MAX_BOOKS - activeBooksCount);

  // Helper tanggal
  const getTodayString = () => new Date().toISOString().split("T")[0];
  const getMaxDateString = () => {
    const d = new Date();
    d.setDate(d.getDate() + MAX_DAYS);
    return d.toISOString().split("T")[0];
  };

  const todayStr = getTodayString();
  const maxDateStr = getMaxDateString();

  useEffect(() => {
    setDueDate(maxDateStr);
    fetchBooks();
    checkUserQuota();
  }, []);

  // Tangani parameter URL ?bookId jika diarahkan dari Katalog
  useEffect(() => {
    const bookIdParam = searchParams.get("bookId") || searchParams.get("book_id");
    if (bookIdParam) {
      loadBookById(bookIdParam);
    }
  }, [searchParams]);

  const fetchBooks = async (query = "") => {
    setLoadingBooks(true);
    const result = await getBooks(query);
    setLoadingBooks(false);
    if (result.success && Array.isArray(result.data)) {
      setBooks(result.data);
    }
  };

  const checkUserQuota = async () => {
    const result = await getMyBorrowings(1);
    if (result.success && Array.isArray(result.data)) {
      const list = result.data;
      const now = new Date();

      // Cek keterlambatan pengembalian
      const isOverdue = list.some((b) => {
        const st = (b.status || "").toUpperCase();
        if (st !== "BORROWED") return false;
        if (b.is_overdue) return true;
        if (b.due_date) return new Date(b.due_date) < now;
        return false;
      });
      setHasOverdue(isOverdue);

      // Hitung buku yang sedang aktif dipinjam
      let activeCount = 0;
      list.forEach((b) => {
        const st = (b.status || "").toUpperCase();
        if (["PENDING", "APPROVED", "BORROWED"].includes(st)) {
          if (Array.isArray(b.items)) {
            b.items.forEach((it) => {
              activeCount += Number(it.quantity) || 1;
            });
          } else {
            activeCount += 1;
          }
        }
      });
      setActiveBooksCount(activeCount);
    }
  };

  const loadBookById = async (id) => {
    const result = await getBookDetail(id);
    if (result.success && result.data) {
      const bookData = result.data;
      setSelectedBooks((prev) => {
        if (prev.some((it) => it.book.id === bookData.id)) return prev;
        const currentQty = prev.reduce((s, it) => s + (Number(it.quantity) || 1), 0);
        if (currentQty >= remainingQuota) return prev;
        return [...prev, { book: bookData, quantity: 1 }];
      });
    }
  };

  const handleAddBook = (book) => {
    if (hasOverdue) {
      toastError("Anda memiliki buku pinjaman yang belum dikembalikan.");
      return;
    }
    if (remainingQuota <= 0) {
      toastError(`Batas maksimal peminjaman adalah ${MAX_BOOKS} buku.`);
      return;
    }
    if (totalSelectedQty + 1 > remainingQuota) {
      toastError(`Sisa kuota peminjaman Anda adalah ${remainingQuota} buku.`);
      return;
    }
    if (selectedBooks.length >= MAX_BOOKS) {
      toastError(`Maksimal ${MAX_BOOKS} judul buku dalam satu pengajuan.`);
      return;
    }
    if (selectedBooks.some((it) => it.book.id === book.id)) {
      toastSuccess(`Buku "${book.title}" sudah ada di daftar.`);
      return;
    }
    if (book.stock !== undefined && book.stock <= 0) {
      toastError(`Stok buku "${book.title}" sedang habis.`);
      return;
    }

    setSelectedBooks((prev) => [...prev, { book, quantity: 1 }]);
    setErrorMessage("");
    toastSuccess(`"${book.title}" ditambahkan`);
  };

  const handleRemoveBook = (bookId) => {
    setSelectedBooks((prev) => prev.filter((it) => it.book.id !== bookId));
  };

  const handleQuantityChange = (bookId, newQty) => {
    const current = selectedBooks.find((it) => it.book.id === bookId);
    if (!current) return;

    const otherQty = selectedBooks
      .filter((it) => it.book.id !== bookId)
      .reduce((s, it) => s + (Number(it.quantity) || 1), 0);
    const maxStock = current.book.stock !== undefined ? current.book.stock : 99;
    const maxAllowed = Math.min(maxStock, remainingQuota - otherQty, MAX_BOOKS);

    const safeQty = Math.max(1, Math.min(newQty, maxAllowed));
    setSelectedBooks((prev) =>
      prev.map((it) => (it.book.id === bookId ? { ...it, quantity: safeQty } : it))
    );
  };

  const setDaysPreset = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setDueDate(d.toISOString().split("T")[0]);
  };

  const copyToClipboard = async (text) => {
    if (!text) return;
    const ok = await copyTextToClipboard(text);
    if (ok) {
      setCopiedCode(true);
      toastSuccess("Kode transaksi disalin!");
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      toastError("Gagal menyalin kode transaksi.");
    }
  };

  const handleResetForm = () => {
    setSelectedBooks([]);
    setDueDate(maxDateStr);
    setNotes("");
    setSuccessData(null);
    setErrorMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (hasOverdue) {
      alertError({
        title: "Peminjaman Ditangguhkan",
        text: "Anda memiliki buku pinjaman yang terlambat. Harap kembalikan terlebih dahulu ke perpustakaan.",
      });
      return;
    }

    if (activeBooksCount + totalSelectedQty > MAX_BOOKS) {
      alertError({
        title: "Batas Kuota Tercapai",
        text: `Maksimal peminjaman adalah ${MAX_BOOKS} buku secara bersamaan.`,
      });
      return;
    }

    if (selectedBooks.length === 0) {
      setErrorMessage("Silakan pilih minimal 1 buku yang ingin dipinjam.");
      return;
    }

    if (!dueDate) {
      setErrorMessage("Tanggal pengembalian wajib diisi.");
      return;
    }

    if (dueDate < todayStr || dueDate > maxDateStr) {
      setErrorMessage(`Batas waktu peminjaman maksimal ${MAX_DAYS} hari dari tanggal pengajuan.`);
      return;
    }

    // Modal konfirmasi sebelum submit
    const booksHtml = selectedBooks
      .map(
        (it) => `
          <div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid #f1f5f9; font-size:13px;">
            <span style="font-weight:600; color:#1e293b; max-width:75%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
              • ${it.book.title}
            </span>
            <span style="color:#2563eb; font-weight:700;">${it.quantity} buku</span>
          </div>
        `
      )
      .join("");

    const { confirmed } = await confirmAction({
      title: "Konfirmasi Pengajuan",
      html: `
        <div style="text-align:left; font-size:13px;">
          <p style="color:#64748b; margin-bottom:8px;">Periksa kembali buku yang ingin Anda ajukan:</p>
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:8px 12px; margin-bottom:10px;">
            ${booksHtml}
          </div>
          <p style="color:#475569;">Batas Pengembalian: <strong>${formatIndoDate(dueDate)}</strong></p>
        </div>
      `,
      confirmText: "Kirim Pengajuan",
      cancelText: "Batal",
      icon: "question",
    });

    if (!confirmed) return;

    setSubmitting(true);
    const result = await createBorrowing({
      items: selectedBooks.map((it) => ({
        bookId: it.book.id,
        quantity: it.quantity,
      })),
      dueDate: dueDate,
      notes: notes.trim() || undefined,
    });
    setSubmitting(false);

    if (result.success && result.data) {
      // Tampilkan popup modal sukses dengan rincian peminjaman dan kode transaksi
      setSuccessData({
        ...result.data,
        borrowedBooks: [...selectedBooks],
      });
      checkUserQuota();
    } else {
      const errorMsg = getErrorMessage(result, "Gagal mengajukan peminjaman.");
      setErrorMessage(errorMsg);
      alertError({ title: "Pengajuan Gagal", text: errorMsg });
    }
  };

  const filteredModalBooks = books.filter((b) => {
    if (!modalSearchQuery.trim()) return true;
    const q = modalSearchQuery.toLowerCase();
    return (
      (b.title && b.title.toLowerCase().includes(q)) ||
      (b.author && b.author.toLowerCase().includes(q)) ||
      (b.publisher && b.publisher.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Halaman */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
              <Link to="/katalog" className="hover:text-blue-600">Katalog</Link>
              <span>/</span>
              <span className="text-slate-800">Pengajuan Peminjaman</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Pengajuan Peminjaman Buku
            </h1>
            <p className="text-slate-600 text-sm mt-1">
              Pilih buku yang ingin Anda pinjam dari perpustakaan (maksimal {MAX_BOOKS} buku).
            </p>
          </div>

          <Link
            to="/riwayat-peminjaman"
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-colors shadow-2xs self-start sm:self-auto"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Riwayat Peminjaman</span>
          </Link>
        </div>

        {/* Peringatan Keterlambatan */}
        {hasOverdue && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-sm">
            <svg className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-bold">Peminjaman Tidak Tersedia</p>
              <p className="text-xs text-rose-700 mt-0.5">
                Anda memiliki buku yang telah melewati batas waktu pengembalian. Kembalikan buku tersebut terlebih dahulu sebelum mengajukan peminjaman baru.
              </p>
            </div>
          </div>
        )}

        {/* Peringatan Kuota Habis */}
        {!hasOverdue && remainingQuota <= 0 && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-800 text-sm">
            <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-bold">Batas Kuota Peminjaman Tercapai</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Anda sedang memiliki {activeBooksCount} buku aktif (maksimal {MAX_BOOKS} buku per siswa). Kembalikan buku untuk dapat mengajukan kembali.
              </p>
            </div>
          </div>
        )}

        {/* Error Submission */}
        {errorMessage && (
          <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs sm:text-sm">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Form Pengajuan (Kiri) */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 space-y-6 shadow-xs">
              {/* Bagian 1: Buku yang Dipinjam */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-bold text-slate-900">
                      Buku yang Dipinjam
                    </label>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {selectedBooks.length}/{MAX_BOOKS} judul
                    </span>
                  </div>

                  {selectedBooks.length > 0 && selectedBooks.length < MAX_BOOKS && remainingQuota > totalSelectedQty && (
                    <button
                      type="button"
                      onClick={() => setSearchModalOpen(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Tambah Buku</span>
                    </button>
                  )}
                </div>

                {selectedBooks.length > 0 ? (
                  <div className="space-y-3">
                    {selectedBooks.map((item) => {
                      const book = item.book;
                      const maxStock = book.stock !== undefined ? book.stock : 99;
                      return (
                        <div
                          key={book.id}
                          className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/40 hover:bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {book.cover ? (
                              <img
                                src={book.cover}
                                alt={book.title}
                                className="w-12 h-16 object-cover rounded border border-slate-200 shrink-0"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="w-12 h-16 bg-slate-100 border border-slate-200 rounded flex flex-col items-center justify-center text-slate-400 shrink-0">
                                <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                                <span className="text-[9px] font-bold text-slate-400">BUKU</span>
                              </div>
                            )}

                            <div className="min-w-0">
                              <h3 className="text-sm font-bold text-slate-900 truncate max-w-sm">
                                {book.title}
                              </h3>
                              <p className="text-xs text-slate-500 truncate">
                                {book.author || "Penulis tidak dicantumkan"}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                                  book.stock > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                                }`}>
                                  Stok: {book.stock ?? "-"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200/60 shrink-0">
                            {/* Stepper Jumlah */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-500">Jumlah:</span>
                              <div className="flex items-center border border-slate-200 rounded-lg bg-white p-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(book.id, item.quantity - 1)}
                                  disabled={item.quantity <= 1}
                                  className="w-6 h-6 rounded bg-slate-50 hover:bg-slate-100 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center font-bold text-xs"
                                >
                                  -
                                </button>
                                <span className="w-7 text-center text-xs font-bold text-slate-800">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(book.id, item.quantity + 1)}
                                  disabled={
                                    item.quantity >= maxStock ||
                                    totalSelectedQty >= remainingQuota ||
                                    item.quantity >= MAX_BOOKS
                                  }
                                  className="w-6 h-6 rounded bg-slate-50 hover:bg-slate-100 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center font-bold text-xs"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            {/* Hapus */}
                            <button
                              type="button"
                              onClick={() => handleRemoveBook(book.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                              title="Hapus buku"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {selectedBooks.length < MAX_BOOKS && remainingQuota > totalSelectedQty && (
                      <button
                        type="button"
                        onClick={() => setSearchModalOpen(true)}
                        className="w-full py-2.5 border border-dashed border-slate-300 hover:border-blue-400 rounded-xl text-slate-600 hover:text-blue-600 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors bg-white hover:bg-blue-50/30"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Pilih Judul Buku Lain (+1)</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-300 rounded-2xl p-6 text-center bg-slate-50/50">
                    <p className="text-sm font-semibold text-slate-800">Belum ada buku yang dipilih</p>
                    <p className="text-xs text-slate-500 mt-0.5 mb-3">
                      Silakan pilih buku dari katalog perpustakaan sekolah.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSearchModalOpen(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors shadow-2xs"
                    >
                      Pilih Buku dari Katalog
                    </button>
                  </div>
                )}
              </div>

              {/* Bagian 2: Tanggal Pengembalian */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-bold text-slate-900">
                    Rencana Tanggal Pengembalian
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Maksimal {MAX_DAYS} hari peminjaman
                  </span>
                </div>

                <input
                  type="date"
                  min={todayStr}
                  max={maxDateStr}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />

                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-slate-500">Pilihan cepat:</span>
                  {[1, 2, 3].map((days) => {
                    const target = new Date();
                    target.setDate(target.getDate() + days);
                    const isSelected = dueDate === target.toISOString().split("T")[0];
                    return (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setDaysPreset(days)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                          isSelected
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        }`}
                      >
                        {days} Hari {days === MAX_DAYS ? "(Maksimal)" : ""}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bagian 3: Catatan Peminjaman */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-sm font-bold text-slate-900 mb-1.5">
                  Keperluan / Catatan Peminjaman <span className="text-xs font-normal text-slate-500">(Opsional)</span>
                </label>
                <textarea
                  rows={2}
                  maxLength={1000}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Untuk referensi tugas mata pelajaran Bahasa Indonesia / persiapan ujian..."
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              {/* Aksi Form */}
              <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
                <Link
                  to="/katalog"
                  className="w-full sm:w-auto px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-50 text-center transition-colors"
                >
                  Batal
                </Link>

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    hasOverdue ||
                    remainingQuota <= 0 ||
                    selectedBooks.length === 0 ||
                    totalSelectedQty > remainingQuota
                  }
                  className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Mengirim Pengajuan...</span>
                    </>
                  ) : (
                    <span>Kirim Pengajuan Peminjaman</span>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Sidebar Ringkasan (Kanan) */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <h2 className="text-sm font-bold text-slate-900 mb-3">
                Ringkasan Pengajuan
              </h2>

              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>Peminjam:</span>
                  <span className="font-semibold text-slate-800">{user?.name || "-"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>NIS:</span>
                  <span className="font-mono text-slate-700">{user?.identity_number || "-"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>Buku yang Diajukan:</span>
                  <span className="font-semibold text-blue-600">
                    {selectedBooks.length} judul ({totalSelectedQty} buku)
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>Batas Pengembalian:</span>
                  <span className="font-medium text-slate-800">
                    {dueDate ? formatIndoDate(dueDate) : "-"}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Status Kuota:</span>
                  <span className="font-semibold text-slate-700">
                    {activeBooksCount} dari {MAX_BOOKS} buku aktif
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Ketentuan Perpustakaan</span>
              </h3>
              <ul className="space-y-2 text-xs text-slate-600 leading-relaxed list-disc list-inside">
                <li>Maksimal <strong>{MAX_BOOKS} buku</strong> dipinjam secara bersamaan.</li>
                <li>Durasi peminjaman maksimal <strong>{MAX_DAYS} hari</strong>.</li>
                <li>Harap kembalikan buku tepat waktu untuk menghindari penangguhan akun.</li>
                <li>Tunjukkan kode transaksi kepada petugas perpustakaan saat pengambilan buku.</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* POPUP MODAL SUKSES */}
      {successData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 relative shadow-2xl border border-slate-100">
            {/* Tombol Close */}
            <button
              type="button"
              onClick={handleResetForm}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
            >
              ✕
            </button>

            {/* Header Dialog */}
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Permohonan Berhasil Diajukan!
                </h3>
                <p className="text-xs text-slate-500">
                  Pengajuan Anda telah tercatat dan menunggu persetujuan petugas.
                </p>
              </div>
            </div>

            {/* Kode Transaksi */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl mb-4 text-center">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Kode Transaksi
              </span>
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl font-mono font-extrabold text-blue-600 tracking-wide">
                  {successData.transaction_code}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(successData.transaction_code)}
                  className="px-2 py-1 text-xs font-semibold rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors inline-flex items-center gap-1"
                >
                  {copiedCode ? (
                    <span className="text-emerald-600">Tersalin!</span>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Salin</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Detail Singkat */}
            <div className="space-y-2 text-xs border-t border-slate-100 pt-3 mb-4 text-slate-600">
              <div className="flex justify-between">
                <span>Peminjam:</span>
                <span className="font-semibold text-slate-800">{user?.name} (NIS: {user?.identity_number})</span>
              </div>
              <div className="flex justify-between">
                <span>Batas Pengembalian:</span>
                <span className="font-semibold text-slate-800">
                  {formatIndoDate(successData.due_date || dueDate)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                  Menunggu Persetujuan
                </span>
              </div>
            </div>

            {/* Daftar Buku yang Berhasil Diajukan */}
            {successData.borrowedBooks && successData.borrowedBooks.length > 0 && (
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mb-4 max-h-36 overflow-y-auto">
                <span className="text-[11px] font-bold text-slate-600 block mb-1.5 uppercase">
                  Buku yang Diajukan:
                </span>
                <div className="space-y-1.5">
                  {successData.borrowedBooks.map((it) => (
                    <div key={it.book.id} className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800 truncate max-w-[70%]">
                        • {it.book.title}
                      </span>
                      <span className="font-semibold text-blue-600">
                        {it.quantity} buku
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instruksi Loket */}
            <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-900 mb-5 flex items-start gap-2">
              <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="leading-relaxed">
                Tunjukkan <strong>kode transaksi</strong> di atas kepada petugas loket perpustakaan untuk verifikasi dan pengambilan buku.
              </p>
            </div>

            {/* Tombol Aksi */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleResetForm}
                className="w-full sm:w-auto px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs sm:text-sm font-semibold transition-colors"
              >
                Ajukan Peminjaman Lain
              </button>
              <button
                type="button"
                onClick={() => navigate("/riwayat-peminjaman")}
                className="w-full sm:w-auto px-5 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-2xs flex items-center justify-center gap-1.5"
              >
                <span>Buka Riwayat Peminjaman</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PILIH BUKU */}
      {searchModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 relative max-h-[85vh] flex flex-col shadow-2xl">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Pilih Buku dari Koleksi
              </h3>
              <button
                type="button"
                onClick={() => setSearchModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Input Pencarian */}
            <div className="py-3">
              <div className="relative">
                <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Ketik judul buku, pengarang, atau penerbit..."
                  value={modalSearchQuery}
                  onChange={(e) => setModalSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  autoFocus
                />
              </div>
            </div>

            {/* Daftar Buku */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[200px]">
              {loadingBooks ? (
                <div className="py-12 text-center text-slate-500">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
                  <p className="text-xs">Memuat koleksi buku...</p>
                </div>
              ) : filteredModalBooks.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <p className="text-sm font-semibold text-slate-700">Buku tidak ditemukan</p>
                  <p className="text-xs mt-0.5">Coba gunakan kata kunci pencarian yang lain.</p>
                </div>
              ) : (
                filteredModalBooks.map((book) => {
                  const isOutOfStock = book.stock !== undefined && book.stock <= 0;
                  const isAlreadySelected = selectedBooks.some((it) => it.book.id === book.id);
                  const isQuotaExceeded =
                    !isAlreadySelected &&
                    (totalSelectedQty >= remainingQuota || selectedBooks.length >= MAX_BOOKS);

                  return (
                    <div
                      key={book.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                        isOutOfStock
                          ? "bg-slate-50 border-slate-200 opacity-60"
                          : isAlreadySelected
                          ? "bg-blue-50/50 border-blue-200"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {book.cover ? (
                          <img
                            src={book.cover}
                            alt={book.title}
                            className="w-10 h-14 object-cover rounded border border-slate-200 shrink-0"
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-10 h-14 bg-slate-100 rounded border border-slate-200 flex items-center justify-center text-slate-400 text-[9px] font-bold shrink-0">
                            BUKU
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate max-w-sm">
                            {book.title}
                          </h4>
                          <p className="text-xs text-slate-500 truncate">
                            {book.author || "Penulis tidak dicantumkan"} {book.publication_year ? `(${book.publication_year})` : ""}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                              isOutOfStock ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
                            }`}>
                              {isOutOfStock ? "Stok Habis" : `Tersedia: ${book.stock}`}
                            </span>
                            {isAlreadySelected && (
                              <span className="text-[10px] font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                                Terpilih
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        {isOutOfStock ? (
                          <span className="text-xs text-slate-400 font-semibold px-2">Habis</span>
                        ) : isAlreadySelected ? (
                          <button
                            type="button"
                            onClick={() => handleRemoveBook(book.id)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors"
                          >
                            Hapus
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isQuotaExceeded}
                            onClick={() => handleAddBook(book)}
                            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs"
                          >
                            Pilih
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Modal */}
            <div className="pt-3 border-t border-slate-100 mt-2 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                <strong className="text-slate-800">{selectedBooks.length} buku</strong> terpilih
              </span>
              <button
                type="button"
                onClick={() => setSearchModalOpen(false)}
                className="px-4 py-1.5 bg-blue-600 text-white hover:bg-blue-700 text-xs font-semibold rounded-xl transition-colors"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

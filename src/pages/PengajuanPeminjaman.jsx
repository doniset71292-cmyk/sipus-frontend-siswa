import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getCurrentUser, getBooks, getBookDetail } from "../services/authService";
import { createBorrowing, formatIndoDate } from "../services/borrowService";

export default function PengajuanPeminjaman() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = getCurrentUser();

  // Daftar buku untuk pilihan
  const [books, setBooks] = useState([]);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Form states
  const [quantity, setQuantity] = useState(1);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  // UI status states
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successData, setSuccessData] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Modal cari / pilih buku
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState("");

  // Helper tanggal minimum (hari ini) dan maksimum (3 hari ke depan)
  const getTodayString = () => {
    const now = new Date();
    return now.toISOString().split("T")[0];
  };

  const getMaxDateString = () => {
    const date = new Date();
    date.setDate(date.getDate() + 3);
    return date.toISOString().split("T")[0];
  };

  const todayStr = getTodayString();
  const maxDateStr = getMaxDateString();

  // Set default due_date to 3 days from now
  useEffect(() => {
    setDueDate(maxDateStr);
  }, []);

  // Muat daftar buku pertama kali
  useEffect(() => {
    fetchAvailableBooks();
  }, []);

  // Jika ada parameter ?bookId di URL, load detail buku tersebut
  useEffect(() => {
    const bookIdParam = searchParams.get("bookId") || searchParams.get("book_id");
    if (bookIdParam) {
      loadBookById(bookIdParam);
    }
  }, [searchParams]);

  const fetchAvailableBooks = async (query = "") => {
    setLoadingBooks(true);
    const result = await getBooks(query);
    setLoadingBooks(false);
    if (result.success && Array.isArray(result.data)) {
      setBooks(result.data);
    }
  };

  const loadBookById = async (id) => {
    setLoadingDetail(true);
    const result = await getBookDetail(id);
    setLoadingDetail(false);
    if (result.success && result.data) {
      setSelectedBook(result.data);
      setQuantity(1);
    }
  };

  const handleSelectBook = (book) => {
    setSelectedBook(book);
    setQuantity(1);
    setErrorMessage("");
    setSearchModalOpen(false);
  };

  const setDaysPreset = (days) => {
    const target = new Date();
    target.setDate(target.getDate() + days);
    setDueDate(target.toISOString().split("T")[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessData(null);

    if (!selectedBook) {
      setErrorMessage("Silakan pilih buku yang ingin dipinjam terlebih dahulu.");
      return;
    }

    if (selectedBook.stock !== undefined && selectedBook.stock <= 0) {
      setErrorMessage("Maaf, stok buku ini sedang habis sehingga tidak dapat dipinjam.");
      return;
    }

    if (!dueDate) {
      setErrorMessage("Tanggal pengembalian buku wajib diisi.");
      return;
    }

    // Validasi batas tanggal
    if (dueDate < todayStr) {
      setErrorMessage("Tanggal pengembalian tidak boleh tanggal yang sudah lewat.");
      return;
    }
    if (dueDate > maxDateStr) {
      setErrorMessage("Batas maksimal peminjaman adalah 3 hari dari tanggal pengajuan.");
      return;
    }

    setSubmitting(true);
    const result = await createBorrowing({
      bookId: selectedBook.id,
      quantity: Number(quantity) || 1,
      dueDate,
      notes,
    });
    setSubmitting(false);

    if (result.success && result.data) {
      setSuccessData(result.data);
    } else {
      if (result.errors) {
        const errorList = Object.values(result.errors).flat().join(" ");
        setErrorMessage(errorList || result.message || "Gagal mengajukan peminjaman.");
      } else {
        setErrorMessage(result.message || "Terjadi kesalahan saat mengajukan peminjaman.");
      }
    }
  };

  const copyToClipboard = (text) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleResetForm = () => {
    setSelectedBook(null);
    setQuantity(1);
    setDueDate(maxDateStr);
    setNotes("");
    setSuccessData(null);
    setErrorMessage("");
  };

  const filteredModalBooks = books.filter((b) => {
    if (!modalSearchQuery.trim()) return true;
    const q = modalSearchQuery.toLowerCase();
    return (
      (b.title && b.title.toLowerCase().includes(q)) ||
      (b.author && b.author.toLowerCase().includes(q)) ||
      (b.publisher && b.publisher.toLowerCase().includes(q)) ||
      (b.isbn && b.isbn.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-blue-600 font-semibold mb-1">
                <Link to="/katalog" className="hover:underline">
                  Katalog
                </Link>
                <span>/</span>
                <span className="text-slate-600">Form Pengajuan Peminjaman</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Pengajuan Peminjaman Buku
              </h1>
              <p className="text-slate-600 text-sm mt-1">
                Lengkapi formulir di bawah ini untuk meminjam buku dari perpustakaan sekolah.
              </p>
            </div>

            <Link
              to="/riwayat-peminjaman"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-xs"
            >
              <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Lihat Riwayat Peminjaman</span>
            </Link>
          </div>
        </div>

        {/* Modal Sukses Pengajuan */}
        {successData && (
          <div className="mb-8 bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-6 sm:p-8 shadow-sm animate-fadeIn">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/30">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <div className="flex-1">
                <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full mb-1">
                  PENGAJUAN BERHASIL DITERIMA
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Permohonan Peminjaman Berhasil Diajukan!
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Pengajuan Anda telah tercatat dalam sistem dengan status{" "}
                  <strong className="text-amber-700 bg-amber-100 px-2 py-0.5 rounded">MENUNGGU PERSETUJUAN</strong>.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-emerald-200/80 grid grid-cols-1 md:grid-cols-3 gap-4 bg-white/70 p-4 rounded-xl">
              <div>
                <span className="text-xs text-slate-600 uppercase font-semibold block">Kode Transaksi</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-base font-mono font-bold text-blue-700">
                    {successData.transaction_code}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(successData.transaction_code)}
                    className="p-1 text-slate-600 hover:text-blue-600 rounded hover:bg-slate-100"
                    title="Salin kode transaksi"
                  >
                    {copiedCode ? (
                      <span className="text-xs font-sans text-emerald-600 font-bold">Tersalin!</span>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-600 uppercase font-semibold block">Batas Pengembalian</span>
                <span className="text-sm font-semibold text-slate-800 mt-1 block">
                  {formatIndoDate(successData.due_date || dueDate)}
                </span>
              </div>

              <div>
                <span className="text-xs text-slate-600 uppercase font-semibold block">Peminjam</span>
                <span className="text-sm font-semibold text-slate-800 mt-1 block">
                  {user?.name} (NIS: {user?.identity_number})
                </span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>Langkah Selanjutnya:</strong> Silakan datang ke perpustakaan sekolah dan tunjukkan kode transaksi di atas kepada petugas perpustakaan untuk pengambilan buku.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 justify-end">
              <button
                type="button"
                onClick={handleResetForm}
                className="px-5 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-100 transition-colors"
              >
                Ajukan Peminjaman Lain
              </button>
              <button
                type="button"
                onClick={() => navigate("/riwayat-peminjaman")}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/20 flex items-center gap-2"
              >
                <span>Buka Riwayat Peminjaman</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Error Notification */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700">
            <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm">
              <p className="font-bold">Gagal Mengajukan Peminjaman</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Kolom Kiri: Form Input Pengajuan */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 sm:p-8 space-y-6">
              {/* Bagian 1: Pemilihan Buku */}
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">
                  Buku yang Dipinjam <span className="text-red-500">*</span>
                </label>

                {selectedBook ? (
                  <div className="border border-blue-200 bg-blue-50/50 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {selectedBook.cover ? (
                        <img
                          src={selectedBook.cover}
                          alt={selectedBook.title}
                          className="w-16 h-22 object-cover rounded-lg border border-slate-200 shadow-xs"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-16 h-22 bg-slate-200 rounded-lg flex items-center justify-center text-slate-600 font-bold text-xs">
                          NO COVER
                        </div>
                      )}
                      <div>
                        <h3 className="text-base font-bold text-slate-900 leading-snug">
                          {selectedBook.title}
                        </h3>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Penulis: {selectedBook.author || "-"} | Penerbit: {selectedBook.publisher || "-"}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            ISBN: {selectedBook.isbn || "-"}
                          </span>
                          <span
                            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${selectedBook.stock > 0
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-red-100 text-red-800"
                              }`}
                          >
                            Stok Tersedia: {selectedBook.stock ?? "-"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSearchModalOpen(true)}
                      className="px-3.5 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors shadow-xs shrink-0"
                    >
                      Ganti Buku
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-blue-400 transition-colors bg-slate-50/50">
                    <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-slate-800 mb-1">
                      Belum ada buku yang dipilih
                    </p>
                    <p className="text-xs text-slate-600 mb-4">
                      Silakan cari dan pilih buku yang ingin Anda pinjam dari koleksi perpustakaan.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSearchModalOpen(true)}
                      className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20"
                    >
                      Pilih Buku dari Katalog
                    </button>
                  </div>
                )}
              </div>

              {/* Bagian 2: Jumlah Buku */}
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-1">
                  Jumlah Buku (Ekselar) <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative w-32">
                    <input
                      type="number"
                      min={1}
                      max={selectedBook?.stock && selectedBook.stock > 0 ? selectedBook.stock : 1}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      required
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-center font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <span className="text-xs text-slate-600">
                    Buku (Maksimal per judul adalah stok yang tersedia)
                  </span>
                </div>
              </div>

              {/* Bagian 3: Tanggal Pengembalian */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-bold text-slate-900">
                    Rencana Tanggal Pengembalian <span className="text-red-500">*</span>
                  </label>
                  <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    Maksimal 3 Hari
                  </span>
                </div>

                <input
                  type="date"
                  min={todayStr}
                  max={maxDateStr}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                />

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-xs text-slate-600 font-medium">Pilihan cepat:</span>
                  <button
                    type="button"
                    onClick={() => setDaysPreset(1)}
                    className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  >
                    1 Hari (+1)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDaysPreset(2)}
                    className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  >
                    2 Hari (+2)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDaysPreset(3)}
                    className="px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-800 transition-colors"
                  >
                    3 Hari (Maksimal)
                  </button>
                </div>

                <p className="text-xs text-slate-600 mt-1.5 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Buku harus dikembalikan paling lambat 3 hari dari tanggal pengajuan.</span>
                </p>
              </div>

              {/* Bagian 4: Catatan / Keperluan Peminjaman */}
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-1">
                  Keperluan / Catatan Peminjaman <span className="text-slate-600 text-xs font-normal">(Opsional)</span>
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Untuk keperluan tugas mata pelajaran Bahasa Indonesia / persiapan ujian..."
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              {/* Tombol Submit */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <Link
                  to="/katalog"
                  className="w-full sm:w-auto px-5 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 text-center transition-colors"
                >
                  Batal / Kembali ke Katalog
                </Link>

                <button
                  type="submit"
                  disabled={submitting || !selectedBook || (selectedBook?.stock !== undefined && selectedBook.stock <= 0)}
                  className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Memproses Pengajuan...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Ajukan Peminjaman Sekarang</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Kolom Kanan: Info Peminjam & Aturan Perpustakaan */}
          <div className="space-y-6">
            {/* Card Data Siswa */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6">
              <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Data Pemohon (Siswa)</span>
              </h2>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-xs text-slate-600 block">Nama Lengkap</span>
                  <span className="font-bold text-slate-900">{user?.name || "Siswa"}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-600 block">Nomor Induk Siswa (NIS)</span>
                  <span className="font-mono font-semibold text-slate-800">{user?.identity_number || "-"}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-600 block">Email Terdaftar</span>
                  <span className="text-slate-800">{user?.email || "-"}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-600 block">Status Keanggotaan</span>
                  <span className="inline-block mt-0.5 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                    Siswa Aktif
                  </span>
                </div>
              </div>
            </div>

            {/* Ketentuan Peminjaman */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
              <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Ketentuan Peminjaman SIPUS</span>
              </h2>

              <ul className="space-y-2 text-xs text-slate-600 leading-relaxed list-disc list-inside">
                <li>Batas maksimal peminjaman adalah <strong>3 hari</strong>.</li>
                <li>Setelah mengajukan, tunjukkan kode transaksi ke petugas untuk verifikasi.</li>
                <li>Wajib menjaga keutuhan dan kebersihan buku yang dipinjam.</li>
                <li>Keterlambatan pengembalian buku dapat dikenakan sanksi tata tertib perpustakaan.</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Modal Dialog Cari / Pilih Buku */}
      {searchModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 relative max-h-[85vh] flex flex-col shadow-2xl">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Pilih Buku dari Koleksi</h3>
                <p className="text-xs text-slate-600">Klik pada salah satu buku untuk memilihnya ke form pengajuan.</p>
              </div>
              <button
                type="button"
                onClick={() => setSearchModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Input Pencarian Modal */}
            <div className="py-4">
              <div className="relative">
                <svg className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Ketik judul buku, nama pengarang, atau ISBN..."
                  value={modalSearchQuery}
                  onChange={(e) => setModalSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Daftar Buku Modal */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {loadingBooks ? (
                <div className="py-12 text-center text-slate-600">
                  <div className="animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
                  <p className="text-sm">Memuat koleksi buku...</p>
                </div>
              ) : filteredModalBooks.length === 0 ? (
                <div className="py-12 text-center text-slate-600">
                  <p className="text-sm font-semibold">Buku tidak ditemukan</p>
                  <p className="text-xs mt-1">Coba gunakan kata kunci pencarian yang lain.</p>
                </div>
              ) : (
                filteredModalBooks.map((book) => {
                  const isOutOfStock = book.stock !== undefined && book.stock <= 0;
                  return (
                    <div
                      key={book.id}
                      onClick={() => !isOutOfStock && handleSelectBook(book)}
                      className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${isOutOfStock
                          ? "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed"
                          : "border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 cursor-pointer"
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        {book.cover ? (
                          <img
                            src={book.cover}
                            alt={book.title}
                            className="w-12 h-16 object-cover rounded-md border border-slate-200 shrink-0"
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-12 h-16 bg-slate-200 rounded-md flex items-center justify-center text-slate-600 text-[10px] font-bold shrink-0">
                            BUKU
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 leading-snug">{book.title}</h4>
                          <p className="text-xs text-slate-600 mt-0.5">
                            {book.author} • {book.publisher || "Penerbit"} ({book.publication_year || "-"})
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${isOutOfStock
                                  ? "bg-red-100 text-red-700"
                                  : "bg-emerald-100 text-emerald-700"
                                }`}
                            >
                              {isOutOfStock ? "Stok Habis" : `Tersedia: ${book.stock}`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isOutOfStock}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 ${isOutOfStock
                            ? "bg-slate-200 text-slate-600 cursor-not-allowed"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}
                      >
                        {isOutOfStock ? "Habis" : "Pilih"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Modal */}
            <div className="pt-3 border-t border-slate-100 mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSearchModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold rounded-xl transition-colors"
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

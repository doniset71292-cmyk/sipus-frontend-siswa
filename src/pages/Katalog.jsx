import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { searchBooks, getBookDetail } from "../services/authService";
import { pinjamBuku } from "../services/borrowService";

export default function Katalog() {
  const [query, setQuery] = useState("");
  const [books, setBooks] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [meta, setMeta] = useState(null);
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [pinjamMsg, setPinjamMsg] = useState("");
  const [pinjamLoading, setPinjamLoading] = useState(false);
  const navigate = useNavigate();

  // Load buku saat page atau filter stok berubah
  useEffect(() => {
    loadBooks(currentPage, availableOnly, query);
  }, [currentPage, availableOnly]);

  const loadBooks = async (page = currentPage, isAvailable = availableOnly, searchQuery = query) => {
    setSearchLoading(true);
    setError("");
    const result = await searchBooks({
      search: searchQuery,
      page,
      availableOnly: isAvailable,
      perPage: 9,
    });
    setSearchLoading(false);
    if (result.success && Array.isArray(result.data)) {
      setBooks(result.data);
      if (result.meta) {
        setMeta(result.meta);
      }
    } else {
      setError(result.message || "Gagal memuat katalog buku.");
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      loadBooks(1, availableOnly, query);
    }
  };

  const openDetail = async (id) => {
    setDetailLoading(true);
    setSelected({ id });
    setPinjamMsg("");
    const result = await getBookDetail(id);
    setDetailLoading(false);
    if (result.success) setSelected(result.data);
  };

  const handleQuickPinjam = async (book) => {
    setPinjamMsg("");
    setPinjamLoading(true);
    const result = await pinjamBuku({
      bookId: book.id,
      quantity: 1,
    });
    setPinjamLoading(false);

    if (result.success && result.data) {
      setPinjamMsg(
        `Berhasil mengajukan peminjaman "${book.title}". Kode Transaksi: ${result.data.transaction_code}. Menunggu persetujuan petugas.`
      );
    } else {
      setPinjamMsg(result.message || "Gagal mengajukan peminjaman.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Banner Hero / Header */}
        <div className="bg-linear-to-r from-blue-700 to-indigo-800 rounded-3xl p-6 sm:p-10 text-white shadow-lg mb-8 relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Temukan & Pinjam Buku Favoritmu
            </h1>
            <p className="mt-2 text-sm sm:text-base text-blue-100/90 leading-relaxed">
              Jelajahi koleksi buku pelajaran, novel, ensiklopedia, dan referensi ilmiah terlengkap di SIPUS.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/pengajuan-peminjaman"
                className="px-5 py-2.5 bg-white text-blue-800 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors shadow-sm"
              >
                Form Pengajuan Peminjaman
              </Link>
              <Link
                to="/riwayat-peminjaman"
                className="px-5 py-2.5 bg-blue-600/60 hover:bg-blue-600 border border-white/20 text-white rounded-xl font-semibold text-sm transition-colors"
              >
                Cek Riwayat Saya
              </Link>
            </div>
          </div>

          <div className="hidden lg:block absolute -right-10 -bottom-10 w-80 h-80 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Pencarian Buku */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 mb-8 shadow-xs">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <svg
                className="w-5 h-5 text-slate-400 absolute left-3.5 top-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari berdasarkan judul buku, nama pengarang, penerbit..."
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={searchLoading}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              {searchLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Mencari...</span>
                </>
              ) : (
                <span>Cari Buku</span>
              )}
            </button>

            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setCurrentPage(1);
                  loadBooks(1, availableOnly, "");
                }}
                className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-colors"
              >
                Reset
              </button>
            )}
          </form>

          {/* Filter Baris: Hanya Stok Tersedia & Info Total */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 flex-wrap gap-3">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={availableOnly}
                onChange={(e) => {
                  setAvailableOnly(e.target.checked);
                  setCurrentPage(1);
                }}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span className="text-xs font-semibold text-slate-700">
                Hanya tampilkan buku yang stoknya tersedia
              </span>
            </label>

            {meta && (
              <span className="text-xs text-slate-500">
                Total: <strong>{meta.total}</strong> buku ditemukan
              </span>
            )}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl mb-6 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Grid Buku */}
        {searchLoading ? (
          <div className="py-20 text-center">
            <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-slate-600 text-sm font-semibold">Memuat koleksi buku...</p>
          </div>
        ) : books.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
            <p className="text-slate-800 font-bold text-base">Tidak ada buku yang ditemukan</p>
            <p className="text-slate-600 text-xs mt-1">Coba gunakan kata kunci pencarian yang berbeda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {books.map((book) => {
              const hasStock = book.stock !== undefined ? book.stock > 0 : true;

              return (
                <div
                  key={book.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 hover:shadow-md transition-all flex flex-col overflow-hidden"
                >
                  {/* Bagian Cover & Detail Utama */}
                  <div className="p-5 flex gap-4 flex-1">
                    {book.cover ? (
                      <img
                        src={book.cover}
                        alt={book.title}
                        className="w-20 h-28 object-cover rounded-xl border border-slate-200 shrink-0 shadow-xs"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-20 h-28 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0">
                        NO COVER
                      </div>
                    )}

                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold mb-1.5 ${hasStock
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-800"
                            }`}
                        >
                          {hasStock ? `Stok: ${book.stock ?? 1}` : "Stok Habis"}
                        </span>
                        <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-2">
                          {book.title}
                        </h3>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-1">
                          Penulis: {book.author || "-"}
                        </p>
                        <p className="text-xs text-slate-600 line-clamp-1">
                          Penerbit: {book.publisher || "-"}
                        </p>
                      </div>

                      {book.publication_year && (
                        <p className="text-[11px] text-slate-600 mt-2">
                          Tahun Terbit: {book.publication_year}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Tombol Aksi */}
                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
                    <button
                      onClick={() => openDetail(book.id)}
                      className="flex-1 px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors text-center"
                    >
                      Detail Buku
                    </button>

                    <button
                      onClick={() => navigate(`/pengajuan-peminjaman?bookId=${book.id}`)}
                      disabled={!hasStock}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-center shadow-xs"
                    >
                      Pinjam
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Paginasi Katalog */}
        {meta && meta.last_page > 1 && (
          <div className="mt-8 flex items-center justify-between bg-white px-5 py-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || searchLoading}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              &larr; Sebelumnya
            </button>
            <span className="text-xs font-semibold text-slate-700">
              Halaman <span className="font-bold text-slate-900">{meta.current_page}</span> dari{" "}
              <span className="font-bold text-slate-900">{meta.last_page}</span>
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(meta.last_page, p + 1))}
              disabled={currentPage >= meta.last_page || searchLoading}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Selanjutnya &rarr;
            </button>
          </div>
        )}

        {/* Modal Detail Buku */}
        {selected && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto shadow-2xl">
              <button
                onClick={() => setSelected(null)}
                className="absolute top-5 right-5 w-9 h-9 rounded-full bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 flex items-center justify-center font-bold"
              >
                ✕
              </button>

              {detailLoading ? (
                <div className="py-16 text-center">
                  <div className="animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
                  <p className="text-sm text-slate-600">Memuat detail buku...</p>
                </div>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row gap-6 pr-6">
                    {selected.cover ? (
                      <img
                        src={selected.cover}
                        alt={selected.title}
                        className="w-28 sm:w-36 h-40 sm:h-52 object-cover rounded-2xl border border-slate-200 shadow-md shrink-0 mx-auto sm:mx-0"
                      />
                    ) : (
                      <div className="w-28 sm:w-36 h-40 sm:h-52 rounded-2xl bg-slate-100 border border-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0 mx-auto sm:mx-0">
                        NO COVER
                      </div>
                    )}

                    <div className="flex-1">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-2 ${selected.stock > 0
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                          }`}
                      >
                        {selected.stock > 0 ? `Stok: ${selected.stock} Buku` : "Stok Habis"}
                      </span>
                      <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">
                        {selected.title}
                      </h2>
                      <p className="text-sm text-slate-600 mt-1">
                        Penulis: <span className="font-semibold text-slate-800">{selected.author || "-"}</span>
                      </p>
                      <p className="text-sm text-slate-600">
                        Penerbit: <span className="font-semibold text-slate-800">{selected.publisher || "-"}</span> ({selected.publication_year || "-"})
                      </p>
                      {selected.isbn && (
                        <p className="text-xs text-slate-600 font-mono mt-1">
                          ISBN: {selected.isbn}
                        </p>
                      )}
                    </div>
                  </div>

                  {selected.description && (
                    <div className="mt-6 pt-6 border-t border-slate-100">
                      <h4 className="text-xs uppercase font-bold text-slate-600 tracking-wider mb-2">
                        Deskripsi / Sinopsis
                      </h4>
                      <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl">
                        {selected.description}
                      </p>
                    </div>
                  )}

                  {pinjamMsg && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
                      {pinjamMsg}
                    </div>
                  )}

                  <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => navigate(`/pengajuan-peminjaman?bookId=${selected.id}`)}
                      disabled={selected.stock <= 0}
                      className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-600/20 text-center transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Lanjut ke Form Peminjaman</span>
                    </button>

                    <button
                      onClick={() => handleQuickPinjam(selected)}
                      disabled={selected.stock <= 0 || pinjamLoading}
                      className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold text-xs transition-colors"
                      title="Ajukan langsung dengan durasi standar 3 hari"
                    >
                      {pinjamLoading ? "Memproses..." : "Pinjam Langsung"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

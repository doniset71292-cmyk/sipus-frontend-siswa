const API_URL =
  typeof window !== "undefined" && window.location.protocol === "https:"
    ? "/api/v1"
    : "http://43.173.6.21:8080/api/v1";

export function authHeader() {
  const token = localStorage.getItem("token");
  return {
    "Accept": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
  };
}

/**
 * Mengambil riwayat peminjaman siswa yang sedang login
 * @param {number} page
 * @returns {Promise<any>}
 */
export async function getMyBorrowings(page = 1) {
  try {
    const res = await fetch(`${API_URL}/borrowings/me?page=${page}`, {
      headers: {
        ...authHeader(),
      },
    });
    return await res.json();
  } catch (error) {
    return {
      success: false,
      message: error.message || "Gagal menghubungi server",
    };
  }
}

/**
 * Mengambil detail peminjaman berdasarkan ID
 * @param {number|string} id
 * @returns {Promise<any>}
 */
export async function getBorrowingDetail(id) {
  try {
    const res = await fetch(`${API_URL}/borrowings/${id}`, {
      headers: {
        ...authHeader(),
      },
    });
    return await res.json();
  } catch (error) {
    return {
      success: false,
      message: error.message || "Gagal memuat detail peminjaman",
    };
  }
}

/**
 * Mengajukan peminjaman buku baru
 * @param {Object} payload
 * @param {number|string} payload.bookId ID buku yang dipinjam
 * @param {number} [payload.quantity=1] Jumlah buku
 * @param {string} payload.dueDate Tanggal batas pengembalian (format YYYY-MM-DD, max 3 hari dari hari ini)
 * @param {string} [payload.notes=""] Catatan/keperluan peminjaman
 * @returns {Promise<any>}
 */
export async function createBorrowing({ bookId, quantity = 1, dueDate, notes = "" }) {
  try {
    const bodyPayload = {
      items: [
        {
          book_id: Number(bookId),
          quantity: Number(quantity) || 1,
        },
      ],
      notes: notes || undefined,
    };

    if (dueDate) {
      bodyPayload.due_date = dueDate;
    }

    const res = await fetch(`${API_URL}/borrowings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader(),
      },
      body: JSON.stringify(bodyPayload),
    });

    const data = await res.json();
    return data;
  } catch (error) {
    return {
      success: false,
      message: error.message || "Terjadi kesalahan saat mengajukan peminjaman",
    };
  }
}

/**
 * Alias untuk kompatibilitas ke belakang
 */
export const pinjamBuku = createBorrowing;

/**
 * Format tanggal ISO ke format Indonesia yang mudah dibaca
 * @param {string} dateString
 * @param {boolean} includeTime
 * @returns {string}
 */
export function formatIndoDate(dateString, includeTime = false) {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const options = {
      day: "numeric",
      month: "short",
      year: "numeric",
      ...(includeTime
        ? {
            hour: "2-digit",
            minute: "2-digit",
          }
        : {}),
    };

    return new Intl.DateTimeFormat("id-ID", options).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Mendapatkan konfigurasi badge (label, kelas css) berdasarkan status peminjaman
 * @param {string} status
 * @param {boolean} isOverdue
 */
export function getStatusBadge(status, isOverdue = false) {
  const normStatus = (status || "").toUpperCase();

  if (isOverdue && normStatus !== "RETURNED") {
    return {
      label: "Terlambat",
      bgClass: "bg-red-100 text-red-800 border-red-200",
      dotClass: "bg-red-500",
    };
  }

  switch (normStatus) {
    case "PENDING":
      return {
        label: "Menunggu Persetujuan",
        bgClass: "bg-amber-100 text-amber-800 border-amber-200",
        dotClass: "bg-amber-500",
      };
    case "BORROWED":
    case "APPROVED":
      return {
        label: "Sedang Dipinjam",
        bgClass: "bg-blue-100 text-blue-800 border-blue-200",
        dotClass: "bg-blue-500",
      };
    case "RETURNED":
      return {
        label: "Sudah Dikembalikan",
        bgClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
        dotClass: "bg-emerald-500",
      };
    case "REJECTED":
      return {
        label: "Ditolak",
        bgClass: "bg-rose-100 text-rose-800 border-rose-200",
        dotClass: "bg-rose-500",
      };
    default:
      return {
        label: status || "Tidak Diketahui",
        bgClass: "bg-slate-100 text-slate-800 border-slate-200",
        dotClass: "bg-slate-500",
      };
  }
}

const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" && window.location.protocol === "https:"
    ? "/api/v1"
    : "http://43.173.6.21:8080/api/v1");

export function authHeader() {
  const token = localStorage.getItem("token");
  return {
    "Accept": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
  };
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function loginSiswa(nis, password) {
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ identity_number: nis, password }),
    });
    const data = await res.json();
    if (data.success && data.data?.token) {
      localStorage.setItem("token", data.data.token);
      localStorage.setItem("user", JSON.stringify(data.data.user));
    }
    return data;
  } catch (error) {
    return {
      success: false,
      message: error.message || "Gagal menghubungi server",
    };
  }
}

export async function searchBooks(query = "") {
  try {
    const url = query
      ? `${API_URL}/books?search=${encodeURIComponent(query)}`
      : `${API_URL}/books`;
    const res = await fetch(url, {
      headers: {
        ...authHeader(),
      },
    });
    return await res.json();
  } catch (error) {
    return {
      success: false,
      message: error.message || "Gagal mencari buku",
    };
  }
}

export const getBooks = searchBooks;

export async function getBookDetail(id) {
  try {
    const res = await fetch(`${API_URL}/books/${id}`, {
      headers: {
        ...authHeader(),
      },
    });
    return await res.json();
  } catch (error) {
    return {
      success: false,
      message: error.message || "Gagal mengambil detail buku",
    };
  }
}

export async function pinjamBuku(bookId, quantity = 1, notes = "", customDueDate = null) {
  try {
    // Sesuai batas server: maksimal 3 hari dari hari ini
    let due_date = customDueDate;
    if (!due_date) {
      const due = new Date();
      due.setDate(due.getDate() + 3);
      due_date = due.toISOString().split("T")[0];
    }

    const payload = {
      items: [
        {
          book_id: Number(bookId),
          quantity: Number(quantity) || 1,
        },
      ],
      due_date,
    };
    if (notes) payload.notes = notes;

    const res = await fetch(`${API_URL}/borrowings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader(),
      },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (error) {
    return {
      success: false,
      message: error.message || "Gagal mengajukan peminjaman",
    };
  }
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

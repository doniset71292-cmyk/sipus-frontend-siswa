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

export async function searchBooks(queryOrParams = "", page = 1) {
  try {
    let url = `${API_URL}/books`;
    const params = new URLSearchParams();

    if (typeof queryOrParams === "object" && queryOrParams !== null) {
      if (queryOrParams.search) params.append("search", queryOrParams.search);
      if (queryOrParams.page) params.append("page", queryOrParams.page);
      if (queryOrParams.availableOnly || queryOrParams.available_only) {
        params.append("available_only", "1");
      }
      if (queryOrParams.perPage || queryOrParams.per_page) {
        params.append("per_page", queryOrParams.perPage || queryOrParams.per_page);
      }
    } else {
      if (queryOrParams) params.append("search", queryOrParams);
      if (page) params.append("page", page);
    }

    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

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

export async function logout() {
  try {
    const token = localStorage.getItem("token");
    if (token) {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });
    }
  } catch {
    // Abaikan jika network error saat logout
  } finally {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }
}


import { authHeader } from "./authService";

const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" && window.location.protocol === "https:"
    ? "/api/v1"
    : "http://43.173.6.21:8080/api/v1");

export async function getBooks(queryOrParams = "", page = 1) {
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
      message: error.message || "Gagal memuat buku",
      data: [],
    };
  }
}

export async function pinjamBuku(bookId, quantity = 1, notes = "", dueDate = null) {
  try {
    let due_date = dueDate;
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

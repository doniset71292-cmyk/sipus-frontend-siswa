import { authHeader } from "./authService";

const API_URL =
  typeof window !== "undefined" && window.location.protocol === "https:"
    ? "/api/v1"
    : "http://43.173.6.21:8080/api/v1";

export async function getBooks(search = "", page = 1) {
  try {
    let url = `${API_URL}/books?page=${page}`;
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
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

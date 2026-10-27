export function getErrorMessage(err, fallback = "Terjadi kesalahan") {
  const data = err?.response?.data || err;

  // Laravel mengirim detail validasi di data.errors (status 422)
  if (data?.errors) {
    return Object.values(data.errors).flat().join("\n");
  }
  return data?.message || fallback;
}

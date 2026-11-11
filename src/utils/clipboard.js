/**
 * Salin teks ke clipboard perangkat dengan fallback untuk koneksi HTTP / browser lama.
 * @param {string} text - Teks yang akan disalin
 * @returns {Promise<boolean>} true jika berhasil, false jika gagal
 */
export async function copyTextToClipboard(text) {
  if (!text) return false;

  // Coba Modern Clipboard API (hanya aktif di HTTPS atau localhost)
  if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Jika gagal atau permission ditolak, lanjut ke fallback
    }
  }

  // Fallback menggunakan textarea tersembunyi dan document.execCommand('copy')
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.width = "2em";
    textArea.style.height = "2em";
    textArea.style.padding = "0";
    textArea.style.border = "none";
    textArea.style.outline = "none";
    textArea.style.boxShadow = "none";
    textArea.style.background = "transparent";
    textArea.setAttribute("readonly", "");

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, 99999); // Khusus perangkat mobile/iOS

    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}


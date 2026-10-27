import Swal from "sweetalert2";
import { getErrorMessage } from "./getErrorMessage";

// Warna mengikuti aksen siswa (blue-600 dan rose-600)
const COLORS = { primary: "#2563eb", danger: "#e11d48" };

const dialogClasses = {
  popup: "sipus-popup",
  title: "sipus-title",
  htmlContainer: "sipus-text",
  actions: "sipus-actions",
  validationMessage: "sipus-validation",
  cancelButton: "sipus-cancel",
};

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 2500,
  timerProgressBar: true,
  customClass: { popup: "sipus-toast" },
});

export function toastSuccess(title) {
  return Toast.fire({ icon: "success", title });
}

export function toastError(title) {
  return Toast.fire({ icon: "error", title, timer: 4000 });
}

function errorText(err) {
  return getErrorMessage(err, "Terjadi kesalahan").split("\n").join("; ");
}

/**
 * Dialog konfirmasi SweetAlert.
 * Jika `action` diberikan, fungsi action dieksekusi dengan loading state,
 * dan error yang dilempar akan ditampilkan di dalam dialog tanpa menutup dialog.
 * @returns {Promise<{ confirmed: boolean, data?: any }>}
 */
export async function confirmAction({
  title,
  text,
  html,
  confirmText = "Ya, lanjutkan",
  cancelText = "Batal",
  icon = "question",
  danger = false,
  action,
}) {
  const result = await Swal.fire({
    title,
    text,
    html,
    icon,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    confirmButtonColor: danger ? COLORS.danger : COLORS.primary,
    reverseButtons: true,
    focusCancel: danger,
    customClass: {
      ...dialogClasses,
      confirmButton: danger ? "sipus-confirm sipus-confirm-danger" : "sipus-confirm",
    },
    showLoaderOnConfirm: Boolean(action),
    allowOutsideClick: () => !Swal.isLoading(),
    preConfirm: action
      ? async () => {
          try {
            return { data: await action() };
          } catch (err) {
            Swal.showValidationMessage(errorText(err));
            return false;
          }
        }
      : undefined,
  });

  return { confirmed: result.isConfirmed, data: result.value?.data };
}

/**
 * Dialog sukses SweetAlert
 */
export function alertSuccess({ title = "Berhasil", text, html, confirmText = "Tutup" }) {
  return Swal.fire({
    icon: "success",
    title,
    text,
    html,
    confirmButtonText: confirmText,
    confirmButtonColor: COLORS.primary,
    customClass: { ...dialogClasses, confirmButton: "sipus-confirm" },
  });
}

/**
 * Dialog error SweetAlert
 */
export function alertError({ title = "Gagal", text, html, confirmText = "Tutup" }) {
  return Swal.fire({
    icon: "error",
    title,
    text,
    html,
    confirmButtonText: confirmText,
    confirmButtonColor: COLORS.danger,
    customClass: { ...dialogClasses, confirmButton: "sipus-confirm sipus-confirm-danger" },
  });
}

/**
 * Dialog informasi SweetAlert
 */
export function alertInfo({ title, text, html, confirmText = "Mengerti" }) {
  return Swal.fire({
    icon: "info",
    title,
    text,
    html,
    confirmButtonText: confirmText,
    confirmButtonColor: COLORS.primary,
    customClass: { ...dialogClasses, confirmButton: "sipus-confirm" },
  });
}

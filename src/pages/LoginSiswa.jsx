import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Lock, Eye, EyeOff, AlertCircle, Loader2, BookOpen } from "lucide-react";
import { loginSiswa } from "../services/authService";
import { toastSuccess } from "../utils/alert";
import logoImg from "../assets/logo.png";
import loginBg from "../assets/login-bg.jpg";

export default function LoginSiswa() {
  const [identityNumber, setIdentityNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await loginSiswa(identityNumber.trim(), password);
      setLoading(false);

      if (result.success) {
        const user = result.data.user;
        const token = result.data.token;

        if (user.role !== "student") {
          setError("Akun ini bukan akun siswa. Akses hanya untuk siswa sekolah.");
          return;
        }

        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        toastSuccess(`Selamat datang, ${user.name || "Siswa"}!`);
        navigate("/katalog");
      } else {
        setError(result.message || "NIS atau password salah");
      }
    } catch {
      setLoading(false);
      setError("Tidak dapat terhubung ke server perpustakaan");
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* Kolom Kiri: Sidebar Form Login Siswa (Minimalis, Rapi, Fokus) */}
      <div className="w-full lg:w-[420px] xl:w-[460px] 2xl:w-[480px] lg:shrink-0 flex flex-col justify-between p-6 sm:p-8 lg:p-10 xl:p-12 border-r border-slate-100 z-10 bg-white">
        {/* Top Header Branding */}
        <div className="flex items-center gap-3">
          <img
            src={logoImg}
            alt="Logo SIPUS"
            className="w-10 h-10 rounded-xl object-contain shadow-2xs border border-slate-100"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg text-slate-900 tracking-tight leading-none">
                SIPUS
              </span>
              <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 uppercase border border-blue-200/60 leading-none">
                Siswa Portal
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Sistem Informasi Perpustakaan Sekolah
            </p>
          </div>
        </div>

        {/* Center Section: Form */}
        <div className="my-10 lg:my-0 max-w-md w-full mx-auto">
          <div className="mb-7">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Selamat Datang, Siswa
            </h1>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Masuk dengan Nomor Induk Siswa (NIS) untuk meminjam buku dan menjelajahi katalog perpustakaan.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200/80 flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Input NIS */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 tracking-tight">
                Nomor Induk Siswa (NIS) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <GraduationCap size={17} />
                </div>
                <input
                  type="text"
                  value={identityNumber}
                  onChange={(e) => setIdentityNumber(e.target.value)}
                  placeholder="Contoh: 202410001"
                  required
                  autoComplete="username"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white focus:bg-white text-slate-900 text-sm pl-10 pr-3.5 py-2.5 transition-all duration-150 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400 shadow-2xs font-medium"
                />
              </div>
            </div>

            {/* Input Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 tracking-tight">
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white focus:bg-white text-slate-900 text-sm pl-10 pr-10 py-2.5 transition-all duration-150 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400 shadow-2xs font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  title={showPassword ? "Sembunyikan password" : "Lihat password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold shadow-xs hover:shadow-md transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Memverifikasi...</span>
                  </>
                ) : (
                  <span>Masuk ke Katalog Buku</span>
                )}
              </button>
            </div>
          </form>

          {/* Student Helper Info */}
          <div className="mt-6 p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5 text-xs text-slate-500">
            <BookOpen size={16} className="text-blue-600 shrink-0" />
            <span>Peminjaman buku sekolah kini lebih mudah secara daring.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-slate-100 text-xs text-slate-400">
          © 2026 SIPUS • Sistem Informasi Perpustakaan Sekolah
        </div>
      </div>

      {/* Kolom Kanan: Visual Hero Panel Luas (Literasi & Pembelajaran Siswa) */}
      <div className="hidden lg:relative lg:flex lg:flex-1 bg-slate-950 overflow-hidden">
        <img
          src={loginBg}
          alt="Gedung SMKS TI ANNISA 2"
          className="absolute inset-0 w-full h-full object-cover object-center scale-102"
        />
        {/* Deep Slate-Blue Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-blue-950/30" />

        {/* Hero Overlay Content */}
        <div className="relative z-10 mt-auto p-12 lg:p-16 xl:p-20 text-white max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-medium text-white mb-4">
            <GraduationCap size={14} className="text-blue-300" />
            <span>Portal Belajar & Literasi Siswa</span>
          </div>

          <h2 className="text-2xl xl:text-3xl font-bold tracking-tight leading-snug text-white">
            "Buku Adalah Jendela Dunia, Membaca Adalah Kuncinya."
          </h2>

          <p className="mt-3 text-sm text-slate-200/90 leading-relaxed font-normal">
            Temukan beragam referensi pelajaran, modul kejuruan, dan bacaan inspiratif untuk menunjang prestasimu di sekolah.
          </p>

          {/* Minimalist Feature Badges Khusus Siswa */}
          <div className="mt-6 flex flex-wrap gap-2 text-xs text-slate-200">
            <span className="px-3 py-1 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10">
              ✓ Koleksi 50+ Buku
            </span>
            <span className="px-3 py-1 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10">
              ✓ Bebas Antre di Perpus
            </span>
            <span className="px-3 py-1 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10">
              ✓ Pantau Batas Pengembalian
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

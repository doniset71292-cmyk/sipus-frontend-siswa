import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginSiswa from "./pages/LoginSiswa";
import Katalog from "./pages/Katalog";
import PengajuanPeminjaman from "./pages/PengajuanPeminjaman";
import RiwayatPeminjaman from "./pages/RiwayatPeminjaman";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login-siswa" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/katalog" replace />} />
        <Route path="/login-siswa" element={<LoginSiswa />} />

        {/* Protected Routes */}
        <Route
          path="/katalog"
          element={
            <ProtectedRoute>
              <Katalog />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pengajuan-peminjaman"
          element={
            <ProtectedRoute>
              <PengajuanPeminjaman />
            </ProtectedRoute>
          }
        />
        <Route
          path="/riwayat-peminjaman"
          element={
            <ProtectedRoute>
              <RiwayatPeminjaman />
            </ProtectedRoute>
          }
        />

        {/* Aliases for convenience */}
        <Route
          path="/peminjaman"
          element={<Navigate to="/pengajuan-peminjaman" replace />}
        />
        <Route
          path="/riwayat"
          element={<Navigate to="/riwayat-peminjaman" replace />}
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/katalog" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

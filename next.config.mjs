/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 16 menggunakan Turbopack by default.
  // XLSX dan jsPDF di-import secara dynamic (browser-only),
  // sehingga tidak perlu konfigurasi tambahan.
  turbopack: {},
};

export default nextConfig;

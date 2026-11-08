import React, { useState, useEffect } from 'react';
import {
  Hexagon,
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  Shield,
  Headphones,
  UserCheck
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { ResetPasswordModal } from './ResetPasswordModal';
import { BaseModal } from '../common/BaseModal';
import { INITIAL_USERS } from '../../data/mockData';
import { UserProfile } from '../../types/erp';
import { ROLE_DEFINITIONS, normalizeRole } from '../../domain/validators/erpRules';

export const LoginPage: React.FC = () => {
  const {
    login,
    authError,
    isSupabaseConfigured: isCloudServerReady,
    loginAsDevSandboxUser
  } = useErp();

  // Remembered Email State
  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ZYVORA_REMEMBER_ME') === 'true';
    }
    return false;
  });

  const [email, setEmail] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ZYVORA_REMEMBERED_EMAIL') || '';
    }
    return '';
  });

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Corporate Info Modal State
  const [corporateModal, setCorporateModal] = useState<'privacy' | 'terms' | 'support' | null>(null);

  // Hidden Developer Shortcut (Ctrl + Shift + D) for Internal Testing Only
  const [isDevShortcutOpen, setIsDevShortcutOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setIsDevShortcutOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setLocalError('Email dan kata sandi wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Manage Remember Me preference
      if (rememberMe) {
        localStorage.setItem('ZYVORA_REMEMBER_ME', 'true');
        localStorage.setItem('ZYVORA_REMEMBERED_EMAIL', cleanEmail);
      } else {
        localStorage.removeItem('ZYVORA_REMEMBER_ME');
        localStorage.removeItem('ZYVORA_REMEMBERED_EMAIL');
      }

      const res = await login(cleanEmail, password);
      if (!res.success) {
        setLocalError(res.error || 'Autentikasi gagal. Periksa kredensial Anda.');
      }
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Terjadi kegagalan komunikasi dengan server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeError = localError || authError;

  return (
    <div className="min-h-screen w-full flex flex-col justify-between items-center bg-[#F8FAFC] relative antialiased select-none p-4 sm:p-6 overflow-x-hidden">
      {/* Subtle Zyvora Ambient Brand Lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,rgba(8,98,136,0.07),rgba(248,250,252,0))] pointer-events-none" />

      {/* Top Spacer for perfect centering balance */}
      <div className="w-full pt-4 sm:pt-8" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10 flex flex-col items-center">
        {/* Brand Header */}
        <div className="text-center mb-7">
          <div className="w-13 h-13 rounded-2xl bg-[#086288] text-white flex items-center justify-center shadow-lg mx-auto mb-3.5 border border-[#086288]/30">
            <Hexagon className="w-7 h-7 fill-white/20 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            ZYVORA ERP 1.0.0
          </h1>
          <p className="text-xs text-[#64748B] mt-1 font-medium tracking-wide">
            Enterprise Resource Planning & Multi-Tenant Portal
          </p>
        </div>

        {/* Floating Hero Card */}
        <div className="w-full bg-white border border-[#CBD5E1] rounded-2xl shadow-xl p-6 sm:p-8 space-y-6">
          {/* Card Header with Verified Shield */}
          <div className="text-center pb-2">
            <div className="inline-flex items-center justify-center gap-2">
              <h2 className="text-lg font-bold text-[#0F172A] tracking-tight">
                Masuk ke Workspace
              </h2>
              <ShieldCheck className="w-5 h-5 text-[#086288]" />
            </div>
            <div className="w-10 h-0.5 bg-[#086288] rounded-full mx-auto mt-2" />
            <p className="text-xs text-[#64748B] mt-2">
              Gunakan akun resmi terdaftar untuk mengakses data bisnis.
            </p>
          </div>

          {/* Active Error Banner */}
          {activeError && (
            <div className="p-3.5 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl flex items-start gap-3 text-xs text-[#DC2626] animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#DC2626]" />
              <div className="flex-1 leading-relaxed">
                <span className="font-bold block">Autentikasi Ditolak:</span>
                <span>{activeError}</span>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Alamat Email <span className="text-[#DC2626]">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@perusahaan.com"
                  required
                  disabled={isSubmitting}
                  autoComplete="email"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs border border-[#CBD5E1] rounded-xl bg-white text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288] transition-colors disabled:bg-[#F8FAFC]"
                />
                <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-3" />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <label className="text-xs font-semibold text-[#0F172A] shrink-0">
                  Kata Sandi <span className="text-[#DC2626]">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(true)}
                  className="text-[11px] font-semibold text-[#086288] hover:text-[#064B6A] hover:underline cursor-pointer transition-colors shrink-0"
                >
                  Lupa kata sandi?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={isSubmitting}
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 text-xs border border-[#CBD5E1] rounded-xl bg-white text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288] transition-colors disabled:bg-[#F8FAFC]"
                />
                <Lock className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-[#94A3B8] hover:text-[#475569] p-0.5 cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-[#475569]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-[#CBD5E1] text-[#086288] focus:ring-[#086288] cursor-pointer"
                />
                <span className="font-medium text-[#334155]">Remember Me</span>
              </label>
            </div>

            {/* Main Submit Button: Login */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 text-xs font-bold text-white bg-[#086288] hover:bg-[#064B6A] rounded-xl transition-all duration-150 cursor-pointer shadow-sm hover:shadow-md flex items-center justify-center gap-2 mt-3 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <span>Login</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Bottom Security & Cloud Indicators */}
          <div className="pt-3 border-t border-[#EEF4F8] flex items-center justify-between text-[11px] text-[#64748B]">
            <span className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isCloudServerReady ? 'bg-[#16A34A]' : 'bg-[#DC2626]'
                }`}
              />
              <span>{isCloudServerReady ? 'Sistem Cloud Terhubung' : 'Koneksi Server Terputus'}</span>
            </span>
            <span className="flex items-center gap-1 text-[#94A3B8]">
              <Shield className="w-3 h-3 text-[#086288]" />
              <span>Enkripsi TLS 1.3</span>
            </span>
          </div>
        </div>
      </div>

      {/* Corporate Clean Footer */}
      <div className="w-full max-w-4xl relative z-10 pt-6 pb-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#64748B] text-center sm:text-left">
        <p>© 2026 Zyvora Technologies. Hak cipta dilindungi.</p>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setCorporateModal('privacy')}
            className="hover:text-[#086288] transition-colors cursor-pointer"
          >
            Kebijakan Privasi
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => setCorporateModal('terms')}
            className="hover:text-[#086288] transition-colors cursor-pointer"
          >
            Syarat Layanan
          </button>
        </div>
      </div>

      {/* Floating Bantuan Widget (Bottom Right like Paper.id) */}
      <button
        type="button"
        onClick={() => setCorporateModal('support')}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-30 bg-white/95 backdrop-blur-sm border border-[#CBD5E1] hover:border-[#086288] shadow-md hover:shadow-lg text-[#086288] px-3.5 py-2 rounded-full text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all duration-150 group"
      >
        <Headphones className="w-4 h-4 text-[#086288] group-hover:scale-110 transition-transform" />
        <span>Bantuan</span>
      </button>

      {/* ==================================================================== */}
      {/* MODALS & HIDDEN DEV SHORTCUT                                         */}
      {/* ==================================================================== */}

      {/* Password Reset Modal */}
      <ResetPasswordModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        initialEmail={email}
      />

      {/* Corporate Info Modals */}
      {corporateModal && (
        <BaseModal
          isOpen={!!corporateModal}
          onClose={() => setCorporateModal(null)}
          title={
            corporateModal === 'privacy'
              ? 'Kebijakan Privasi & Kepatuhan Data'
              : corporateModal === 'terms'
              ? 'Syarat & Ketentuan Lisensi Enterprise'
              : 'Dukungan Teknis & IT Helpdesk'
          }
          maxWidth="max-w-lg"
        >
          <div className="p-5 text-xs text-[#334155] space-y-4 leading-relaxed">
            {corporateModal === 'privacy' && (
              <>
                <p>
                  Zyvora ERP menerapkan standar keamanan tinggi dengan prinsip isolasi multi-tenant data,
                  memastikan data transaksi bisnis Anda terpisah secara ketat dan tidak dapat diakses oleh pihak luar.
                </p>
                <div className="p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg text-[#166534] space-y-1">
                  <span className="font-bold block">Prinsip Keamanan:</span>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>Enkripsi data bergerak (*in-transit*) menggunakan TLS 1.3 256-bit.</li>
                    <li>Row-Level Security (RLS) di lapisan database Supabase Cloud.</li>
                    <li>Audit trail lengkap pada setiap pembuatan dan perubahan transaksi.</li>
                  </ul>
                </div>
              </>
            )}

            {corporateModal === 'terms' && (
              <>
                <p>
                  Penggunaan platform Zyvora ERP tunduk pada Perjanjian Lisensi Perusahaan (*Enterprise Master Services Agreement*).
                </p>
                <p>
                  Setiap akun pengguna hanya boleh digunakan oleh satu individu resmi yang ditunjuk oleh organisasi.
                  Dilarang membagikan kredensial login kepada pihak yang tidak berkepentingan demi menjaga integritas data akuntansi dan operasional.
                </p>
              </>
            )}

            {corporateModal === 'support' && (
              <div className="space-y-3">
                <p>
                  Jika Anda mengalami kendala saat login, membutuhkan reset akun resmi, atau ingin mengajukan hak akses modul baru:
                </p>
                <div className="p-3.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg text-[#1E40AF] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">IT Helpdesk Email:</span>
                    <a
                      href="mailto:support@zyvora.my.id"
                      className="font-mono text-[#086288] hover:underline font-bold"
                    >
                      support@zyvora.my.id
                    </a>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">WhatsApp IT Emergency:</span>
                    <a
                      href="https://wa.me/6285158636606"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[#086288] hover:underline font-bold"
                    >
                      085158636606
                    </a>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Jam Layanan:</span>
                    <span>Senin - Sabtu (08:00 - 20:00 WIB)</span>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setCorporateModal(null)}
                className="px-4 py-2 bg-[#086288] text-white rounded-lg font-semibold hover:bg-[#064B6A] cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </BaseModal>
      )}

      {/* Hidden Developer Shortcut Modal (Triggered by Ctrl + Shift + D only) */}
      {isDevShortcutOpen && (
        <BaseModal
          isOpen={isDevShortcutOpen}
          onClose={() => setIsDevShortcutOpen(false)}
          title="Internal Developer Bypass (Ctrl + Shift + D)"
          maxWidth="max-w-lg"
        >
          <div className="p-5 text-xs space-y-3">
            <div className="p-2.5 bg-[#FEF3C7] border border-[#FDE68A] rounded-md text-[11px] text-[#92400E]">
              <strong>KHUSUS PENGUJIAN INTERNAL:</strong> Panel ini tersembunyi dari publik dan hanya muncul melalui tombol kombinasi pintas untuk kemudahan pengujian fitur.
            </div>

            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {INITIAL_USERS.map((user: UserProfile) => {
                const normRole = normalizeRole(user.role);
                const roleMeta = ROLE_DEFINITIONS[normRole];
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => {
                      loginAsDevSandboxUser(user);
                      setIsDevShortcutOpen(false);
                    }}
                    className="w-full p-2.5 bg-white hover:bg-[#EFF7FA] border border-[#CBD5E1] rounded-lg text-left flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <UserCheck className="w-4 h-4 text-[#086288] shrink-0" />
                      <div className="truncate">
                        <span className="font-bold text-[#0F172A] block">
                          {user.fullName} ({user.userCode})
                        </span>
                        <span className="text-[10px] text-[#64748B] block truncate">
                          {user.email}
                        </span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleMeta.badgeBg} ${roleMeta.badgeText} ${roleMeta.badgeBorder}`}>
                      {roleMeta.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </BaseModal>
      )}
    </div>
  );
};

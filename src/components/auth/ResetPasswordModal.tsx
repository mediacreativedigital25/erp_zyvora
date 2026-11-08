import React, { useState } from 'react';
import { KeyRound, Mail, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { BaseModal } from '../common/BaseModal';
import { AuthService } from '../../services/authService';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  onClose,
  initialEmail = ''
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !email.includes('@')) {
      setErrorMessage('Masukkan format alamat email yang valid.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await AuthService.resetPassword(email);
      if (res.success) {
        setIsSuccess(true);
      } else {
        setErrorMessage(res.error || 'Gagal mengirim instruksi pemulihan password.');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Terjadi kegagalan komunikasi dengan server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setIsSuccess(false);
      setErrorMessage(null);
      onClose();
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      size="sm"
      title={
        <div className="flex items-center gap-2">
          <span>Pemulihan Kata Sandi</span>
        </div>
      }
      description="Masukkan email akun Anda untuk menerima tautan pemulihan kata sandi resmi."
      icon={<KeyRound className="w-4.5 h-4.5 text-[#086288]" />}
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-medium text-[#475569] bg-white border border-[#DCE5EC] rounded-md hover:bg-[#EEF4F8] transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSuccess ? 'Tutup' : 'Batal'}
          </button>
          {!isSuccess && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !email}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#086288] hover:bg-[#064B6A] rounded-md transition-colors cursor-pointer shadow-2xs flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Mengirim...</span>
                </>
              ) : (
                <span>Kirim Tautan Reset</span>
              )}
            </button>
          )}
        </div>
      }
    >
      {isSuccess ? (
        <div className="p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-[#16A34A] mx-auto" />
          <h4 className="text-sm font-bold text-[#166534]">Email Pemulihan Dikirim</h4>
          <p className="text-xs text-[#15803D] leading-relaxed">
            Jika akun dengan alamat <strong>{email}</strong> terdaftar pada sistem, kami telah mengirimkan tautan untuk mengatur ulang kata sandi Anda.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-md flex items-start gap-2.5 text-xs text-[#DC2626]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
              Email Terdaftar <span className="text-[#DC2626]">*</span>
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@perusahaan.com"
                required
                disabled={isSubmitting}
                className="w-full pl-9 pr-3.5 py-2 text-xs border border-[#DCE5EC] rounded-md bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#086288]/20 focus:border-[#086288] disabled:bg-[#F8FAFC]"
              />
              <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
            </div>
          </div>
        </form>
      )}
    </BaseModal>
  );
};

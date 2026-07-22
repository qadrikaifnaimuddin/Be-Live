import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, AlertCircle, X, Lock, Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { User } from '../../types';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onDeleteAccount: () => Promise<void> | void;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onDeleteAccount
}) => {
  const [deleteReason, setDeleteReason] = useState('Concerned about privacy / security');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  if (!isOpen) return null;

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError(null);
    setDeleteLoading(true);

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: currentUser.email,
          password: deletePassword
        });
        if (error) {
          throw new Error('Incorrect password. Identity verification failed.');
        }
        setDeleteStep(2);
      } catch (err: any) {
        setDeleteError(err.message || 'Password verification failed.');
      } finally {
        setDeleteLoading(false);
      }
    } else {
      setTimeout(() => {
        setDeleteLoading(false);
        const expected = (currentUser as any).passwordHash || 'password';
        if (deletePassword !== expected) {
          setDeleteError('Incorrect password.');
        } else {
          setDeleteStep(2);
        }
      }, 800);
    }
  };

  const handleConfirmDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      if (onDeleteAccount) {
        await onDeleteAccount();
      }
      alert('🗑️ Your account was permanently deleted.');
      onClose();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete account.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const resetAndClose = () => {
    setDeletePassword('');
    setDeleteReason('Concerned about privacy / security');
    setDeleteStep(1);
    setDeleteError(null);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-stone-950 border border-stone-850 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl space-y-6 relative"
        >
          {/* Header */}
          <div className="flex justify-between items-center border-b border-stone-900 pb-4">
            <div className="flex items-center gap-2.5 text-rose-500">
              <Trash2 className="w-5 h-5" />
              <h3 className="text-base font-extrabold text-stone-100">
                Delete Account
              </h3>
            </div>
            <button
              onClick={resetAndClose}
              className="p-1 rounded-full text-stone-500 hover:text-stone-300 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {deleteStep === 1 ? (
            /* STEP 1: Reason & Password Verification */
            <form onSubmit={handleVerifyPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase tracking-wider font-extrabold text-[#A89D82]">
                  Why are you deleting your account?
                </label>
                <select
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full pl-4 pr-4 py-3 bg-stone-900 border border-stone-800 rounded-xl text-xs font-medium text-white outline-none focus:border-rose-500 cursor-pointer"
                >
                  <option value="Concerned about privacy / security" className="bg-stone-900 text-white">Concerned about privacy / security</option>
                  <option value="Created a duplicate account" className="bg-stone-900 text-white">Created a duplicate account</option>
                  <option value="Not active / not finding it useful" className="bg-stone-900 text-white">Not active / not finding it useful</option>
                  <option value="Other reason" className="bg-stone-900 text-white">Other reason</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase tracking-wider font-extrabold text-[#A89D82]">
                  Confirm Your Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-800 focus:border-rose-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-stone-100 outline-none transition-colors"
                  />
                </div>
              </div>

              {deleteError && (
                <div className="p-3 bg-rose-950/40 border border-rose-500/60 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetAndClose}
                  className="px-4 py-2 border border-stone-800 hover:bg-stone-900 rounded-xl text-xs font-bold text-stone-400 hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleteLoading}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Verify & Continue</span>}
                </button>
              </div>
            </form>
          ) : (
            /* STEP 2: Final Warning & Confirmation */
            <div className="space-y-5 text-center">
              <div className="flex justify-center">
                <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-rose-500 animate-pulse" />
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  Confirm Permanent Deletion
                </h4>
                <p className="text-xs text-rose-300 font-medium leading-relaxed bg-rose-950/30 border border-rose-900/50 p-4 rounded-2xl">
                  ⚠️ This action is permanent and cannot be undone. Your account profile, stories, messages, and all associated data will be deleted forever.
                </p>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteStep(1)}
                  className="px-4 py-2 border border-stone-800 hover:bg-stone-900 rounded-xl text-xs font-bold text-stone-400 hover:text-white transition-all cursor-pointer"
                >
                  Go Back
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteAccount}
                  disabled={deleteLoading}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Delete Forever</span>}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

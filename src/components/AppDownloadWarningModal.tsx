import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  Tv,
  X,
  Copy,
  Check,
  ShieldCheck,
  Film,
  Trophy,
  Sparkles,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

export const OFFICIAL_APP_DOWNLOAD_URL = 'https://nfiptv24.blogspot.com';

interface AppDownloadWarningModalProps {
  isOpen: boolean;
  itemTitle?: string;
  itemType?: 'event' | 'movie';
  itemImage?: string;
  onClose: () => void;
  onGoToLiveTv: () => void;
}

export const AppDownloadWarningModal: React.FC<AppDownloadWarningModalProps> = ({
  isOpen,
  itemTitle,
  itemType,
  itemImage,
  onClose,
  onGoToLiveTv,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(OFFICIAL_APP_DOWNLOAD_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-[#0a101f] border border-amber-500/40 rounded-2xl shadow-2xl shadow-amber-950/40 overflow-hidden flex flex-col my-auto max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Gradient Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-rose-500 to-sky-500"></div>

        {/* Modal Header */}
        <div className="p-4 sm:p-5 pb-3 flex items-start justify-between gap-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <AlertTriangle className="w-6 h-6 text-amber-400 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  সতর্কবার্তা • App Required
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white mt-1 leading-snug">
                এগুলো দেখতে অবশ্যই অ্যাপ ব্যবহার করতে হবে
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            title="বন্ধ করুন"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 text-xs">
          {/* Main Attention Banner */}
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-500/15 via-rose-500/10 to-transparent border border-amber-500/30 text-amber-200 leading-relaxed">
            <p className="font-semibold text-white text-xs sm:text-sm mb-1 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-amber-400 shrink-0" />
              <span>ওয়েবসাইটে শুধুমাত্র লাইভ টিভি চ্যানেল চালু রয়েছে!</span>
            </p>
            <p className="text-slate-300 text-[11px] sm:text-xs">
              ওয়েবসাইট ভার্সনে শুধুমাত্র <strong className="text-emerald-400">লাইভ টিভি (Live TV)</strong> দেখা যাবে। লাইভ খেলাধুলা (ক্রিকেট ও ফুটবল ইভেন্ট) এবং সিনেমা দেখতে হলে আপনাকে অবশ্যই আমাদের অফিসিয়াল অ্যান্ড্রয়েড অ্যাপ ডাউনলোড করতে হবে।
            </p>
          </div>

          {/* Requested Item Card Preview (if clicked an event or movie) */}
          {itemTitle && (
            <div className="p-3 rounded-xl bg-slate-900/90 border border-white/10 flex items-center gap-3">
              {itemImage ? (
                <img
                  src={itemImage}
                  alt={itemTitle}
                  className="w-12 h-14 object-cover rounded-lg border border-white/10 shrink-0 bg-slate-950"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-12 h-14 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                  {itemType === 'event' ? (
                    <Trophy className="w-6 h-6 text-amber-400" />
                  ) : (
                    <Film className="w-6 h-6 text-sky-400" />
                  )}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">
                  {itemType === 'event' ? '🏏 লাইভ স্পোর্টস ইভেন্ট' : '🎬 সিনেমা / সিরিজ'}
                </span>
                <h4 className="text-xs sm:text-sm font-bold text-white truncate" title={itemTitle}>
                  {itemTitle}
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  এই কনটেন্টটি প্লে করতে অফিসিয়াল অ্যাপ ইন্সটল করুন
                </p>
              </div>
            </div>
          )}

          {/* App Features List */}
          <div className="space-y-2 p-3 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>আমাদের অ্যাপে যা যা পাবেন:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300 pt-1">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>লাইভ ক্রিকেট ও ফুটবল ফুল এইচডি</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                <span>১০০০+ বাংলা ডাবড সিনেমা ও সিরিজ</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                <span>নো-বাফারিং ফাস্ট ভিডিও প্লেয়ার</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span>মোবাইল ও অ্যান্ড্রয়েড টিভি উভয় উপযোগী</span>
              </div>
            </div>
          </div>

          {/* Download & Action Buttons */}
          <div className="space-y-2 pt-1">
            {/* Primary Download CTA */}
            <a
              href={OFFICIAL_APP_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:from-amber-600 hover:via-orange-600 hover:to-rose-700 text-slate-950 font-black text-sm text-center flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              <span>অ্যাপ ডাউনলোড করুন (Download App)</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-950 opacity-75" />
            </a>

            {/* Secondary Option: Return to Live TV & Copy Link */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onGoToLiveTv}
                className="py-2.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Tv className="w-3.5 h-3.5 text-emerald-400" />
                <span>লাইভ টিভি দেখুন</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">লিঙ্ক কপি হয়েছে</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>লিংক কপি করুন</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Footer Info */}
          <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-white/5 pt-2">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              ভাইরাস-মুক্ত ও নিরাপদ APK
            </span>
            <span>ভার্সন: v2.6.5 • সাইজ: ~36 MB</span>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Tv, Smartphone, RotateCcw, Info, ShieldCheck, Wifi, Sparkles, ExternalLink } from 'lucide-react';
import { AppMode } from '../types';

interface MenuViewProps {
  appMode: AppMode;
  onSetAppMode: (mode: AppMode) => void;
  onRefreshData: () => void;
  isFirebaseConnected: boolean;
  activeUsersCount: number;
}

export const MenuView: React.FC<MenuViewProps> = ({
  appMode,
  onSetAppMode,
  onRefreshData,
  isFirebaseConnected,
  activeUsersCount,
}) => {
  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-fade-in py-2">
      {/* App Info Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0c1220] border border-slate-800 shadow-xl flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-sky-500 to-rose-500 p-0.5 shadow-lg shadow-blue-500/20 shrink-0 flex items-center justify-center">
          <div className="w-full h-full bg-[#0c1220] rounded-[14px] flex items-center justify-center font-black text-white text-lg tracking-wider">
            NAFI
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            NAFI TV 24
            <span className="text-[10px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full border border-sky-500/30">
              v3.2 Live
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            লাইভ স্পোর্টস, আইপিটিভি টিভি চ্যানেল এবং সিনেমা স্ট্রিমিং অ্যাপ্লিকেশন
          </p>
        </div>
      </div>

      {/* Mode & Display Settings */}
      <div className="p-4 rounded-2xl bg-[#0c1220] border border-slate-800 shadow-xl space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Tv className="w-4 h-4 text-sky-400" />
          ডিসপ্লে ও লেআউট সেটিংস
        </h3>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => onSetAppMode('mobile')}
            className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
              appMode === 'mobile'
                ? 'bg-blue-600/20 border-blue-500 text-white shadow-md'
                : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-6 h-6 text-sky-400" />
            <div className="text-center">
              <div className="text-xs font-bold">মোবাইল মোড</div>
              <div className="text-[10px] text-slate-400">স্মার্টফোন ও ট্যাবলেটের জন্য</div>
            </div>
          </button>

          <button
            onClick={() => onSetAppMode('tv')}
            className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
              appMode === 'tv'
                ? 'bg-blue-600/20 border-blue-500 text-white shadow-md'
                : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
            }`}
          >
            <Tv className="w-6 h-6 text-sky-400" />
            <div className="text-center">
              <div className="text-xs font-bold">টিভি রিমোট মোড</div>
              <div className="text-[10px] text-slate-400">অ্যান্ড্রয়েড টিভির জন্য</div>
            </div>
          </button>
        </div>
      </div>

      {/* Sync & Connection Status */}
      <div className="p-4 rounded-2xl bg-[#0c1220] border border-slate-800 shadow-xl space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Wifi className="w-4 h-4 text-emerald-400" />
          ডাটাবেস ও সিঙ্ক স্ট্যাটাস
        </h3>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5">
            <span className="text-slate-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Firebase Realtime Database
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {isFirebaseConnected ? 'সংযুক্ত (Connected)' : 'অফলাইন'}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5">
            <span className="text-slate-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-400" />
              সক্রিয় অনলাইন দর্শক
            </span>
            <span className="font-bold text-white">{activeUsersCount} জন</span>
          </div>
        </div>

        <button
          onClick={onRefreshData}
          className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all cursor-pointer active:scale-[0.99]"
        >
          <RotateCcw className="w-4 h-4" />
          <span>সকল ডাটা ও চ্যানেল পুনরায় রিফ্রেশ করুন</span>
        </button>
      </div>

      {/* Support & Feature Info */}
      <div className="p-4 rounded-2xl bg-[#0c1220] border border-slate-800 shadow-xl space-y-2 text-xs text-slate-400">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Info className="w-4 h-4 text-sky-400" />
          প্লেয়ার গাইডলাইন
        </h3>
        <p className="leading-relaxed">
          • <strong>ফুলস্ক্রিন রোটেট:</strong> ভিডিও দেখার সময় ফুলস্ক্রিন বাটন ক্লিক করলে মোবাইল স্ক্রিন স্বয়ংক্রিয়ভাবে ল্যান্ডস্কেপ রোটেট হবে। এছাড়াও প্লেয়ার বারে থাকা 🔄 রোটেট বাটন দিয়ে যেকোনো সময় ভিডিও অনুভূমিকভাবে ঘোরানো যায়।
        </p>
        <p className="leading-relaxed">
          • <strong>মাল্টি-সার্ভার:</strong> কোনো স্ট্রিম ধীরগতির হলে অথবা বন্ধ দেখালে উপরের 'সার্ভার' বাটনে ট্যাপ করে বিকল্প সার্ভারে পরিবর্তন করুন।
        </p>
      </div>
    </div>
  );
};

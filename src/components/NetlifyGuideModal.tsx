import React, { useState } from 'react';
import {
  Cloud,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Zap,
  Globe
} from 'lucide-react';

interface NetlifyGuideModalProps {
  onClose: () => void;
}

export const NetlifyGuideModal: React.FC<NetlifyGuideModalProps> = ({ onClose }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [testUrl, setTestUrl] = useState('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8');
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    isHttps: boolean;
    corsOk: boolean;
    message: string;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const runStreamDiagnostics = async () => {
    if (!testUrl.trim()) return;
    setIsTesting(true);
    setTestResult(null);

    const isHttps = testUrl.trim().toLowerCase().startsWith('https://');

    try {
      // Test fetch with short timeout to check CORS and accessibility
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(testUrl.trim(), {
        method: 'HEAD',
        signal: controller.signal,
      }).catch(() => {
        // Retry with GET if HEAD fails
        return fetch(testUrl.trim(), {
          method: 'GET',
          headers: { Range: 'bytes=0-100' },
          signal: controller.signal,
        });
      });

      clearTimeout(timeoutId);

      if (response && response.ok) {
        setTestResult({
          tested: true,
          isHttps,
          corsOk: true,
          message: isHttps
            ? 'দারুণ! স্ট্রিমটি HTTPS এবং CORS সাপোর্টেড। এটি Netlify-তে সম্পূর্ণ সঠিকভাবে চলবে।'
            : 'সতর্কতা: স্ট্রিমটি HTTP লিঙ্ক। Netlify HTTPS হওয়ায় ব্রাউজার এটি ব্লক করতে পারে। দয়া করে https:// ভার্সন ব্যবহার করুন।',
        });
      } else {
        setTestResult({
          tested: true,
          isHttps,
          corsOk: false,
          message: 'সার্ভার রেসপন্স দিয়েছে কিন্তু CORS বা অ্যাক্সেস লিমিট থাকতে পারে।',
        });
      }
    } catch (e: any) {
      setTestResult({
        tested: true,
        isHttps,
        corsOk: false,
        message: isHttps
          ? 'সার্ভারে CORS নিষেধাজ্ঞা রয়েছে বা লিঙ্কটি নিষ্ক্রিয়। প্লেয়ারে HLS দিয়ে টেস্ট করুন।'
          : 'HTTP লিঙ্ক এবং ব্রাউজারে CORS ব্লক হয়েছে। Netlify-তে চালানোর জন্য https:// লিঙ্ক আবশ্যক।',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#0c1222] border border-sky-500/30 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Netlify ডিপ্লয়মেন্ট গাইড ও অপটিমাইজেশন
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  Ready
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                আপনার NAFI TV 24 অ্যাপটি Netlify-তে সুন্দরভাবে চলার জন্য সম্পূর্ণ তৈরি
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-slate-300 text-xs sm:text-sm">
          {/* Status Box: What is pre-configured */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/40 to-sky-950/40 border border-sky-500/30 space-y-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              এই প্রজেক্টে Netlify-র জন্য কী কী কনফিগারেশন যুক্ত করা হয়েছে:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs text-slate-300">
              <div className="flex items-start gap-2 bg-slate-900/50 p-2.5 rounded-lg border border-white/5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block">netlify.toml তৈরি করা আছে:</strong>
                  রুট ফোল্ডারে বিল্ড কমান্ড (<code className="text-sky-300">npm run build</code>) ও পাবলিশ ফোল্ডার (<code className="text-sky-300">dist</code>) কনফিগার করা।
                </div>
              </div>

              <div className="flex items-start gap-2 bg-slate-900/50 p-2.5 rounded-lg border border-white/5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block">SPA Redirects (_redirects):</strong>
                  যেকোনো রুটে পেজ রিফ্রেশ করলেও 404 Not Found ইরোর আসবে না (<code className="text-sky-300">/* /index.html 200</code>)।
                </div>
              </div>

              <div className="flex items-start gap-2 bg-slate-900/50 p-2.5 rounded-lg border border-white/5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block">CORS & Streaming Headers:</strong>
                  HLS এবং ভিডিও প্লেয়ারের জন্য অপটিমাইজড হেডার যোগ করা হয়েছে।
                </div>
              </div>

              <div className="flex items-start gap-2 bg-slate-900/50 p-2.5 rounded-lg border border-white/5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block">HTTPS Stream Compatibility:</strong>
                  Netlify সম্পূর্ণ HTTPS-এ চলে, তাই সকল স্ট্রিম সুরক্ষিত লিঙ্কে প্লে হওয়ার জন্য অপটিমাইজড।
                </div>
              </div>
            </div>
          </div>

          {/* Deployment Methods */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Netlify-তে হোস্ট করার সহজ ২টি পদ্ধতি:
            </h3>

            {/* Method 1: Netlify Drop */}
            <div className="p-4 rounded-xl bg-slate-900/70 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sky-400 text-xs sm:text-sm">
                  পদ্ধতি ১: Netlify Drop (সবচেয়ে দ্রুত — কোনো গিটহাব ছাড়া)
                </span>
                <span className="text-[10px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full font-bold">
                  ১ মিনিট
                </span>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-300 leading-relaxed">
                <li>প্রথমে প্রজেক্টের কোড ডাউনলোড করে কম্পিউটারের টার্মিনালে <code className="bg-black/40 px-1.5 py-0.5 rounded text-sky-300">npm run build</code> চালান।</li>
                <li>বিল্ড শেষ হলে প্রজেক্টে একটি <strong>dist</strong> ফোল্ডার তৈরি হবে।</li>
                <li>ব্রাউজারে যান: <a href="https://app.netlify.com/drop" target="_blank" rel="noreferrer" className="text-sky-400 underline inline-flex items-center gap-1">app.netlify.com/drop <ExternalLink className="w-3 h-3" /></a></li>
                <li>আপনার তৈরি হওয়া <strong>dist</strong> ফোল্ডারটি টেনে এনে Netlify-র বাক্সে ড্রপ করুন। মুহূর্তেই সাইট লাইভ হয়ে যাবে!</li>
              </ol>
            </div>

            {/* Method 2: GitHub Integration */}
            <div className="p-4 rounded-xl bg-slate-900/70 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-400 text-xs sm:text-sm">
                  পদ্ধতি ২: GitHub রিপোজিটরি কানেক্ট করে (অটোমেটিক আপডেট)
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                  প্রস্তাবিত
                </span>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-300 leading-relaxed">
                <li>GitHub-এ কোড পুশ করুন।</li>
                <li>Netlify-তে <strong>Add new site &gt; Import an existing project</strong> এ গিয়ে GitHub সিলেক্ট করুন।</li>
                <li>আমাদের <code className="text-sky-300">netlify.toml</code> ফাইলটি থাকায় Build Settings স্বয়ংক্রিয়ভাবে ডিটেক্ট হবে:
                  <div className="my-1.5 p-2 bg-black/50 rounded font-mono text-[11px] text-slate-300 flex items-center justify-between">
                    <span>Build command: npm run build | Publish directory: dist</span>
                    <button
                      onClick={() => copyToClipboard('npm run build', 'build_cmd')}
                      className="text-sky-400 hover:text-white ml-2"
                      title="কপি করুন"
                    >
                      {copiedKey === 'build_cmd' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </li>
                <li><strong>Deploy Site</strong> বাটনে চাপুন। এরপর থেকে GitHub-এ যেকোনো আপডেট দিলে Netlify নিজে থেকেই সাইট আপডেট করে নেবে।</li>
              </ol>
            </div>
          </div>

          {/* Important Netlify Streaming Rules */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-2">
            <h4 className="font-bold text-xs sm:text-sm flex items-center gap-2 text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              Netlify-তে লাইভ টিভি স্ট্রিমিংয়ের জরুরি নিয়ম:
            </h4>
            <ul className="list-disc list-inside space-y-1 text-xs text-amber-200/90 leading-relaxed">
              <li><strong>HTTPS লিঙ্ক বাধ্যতামূলক (Mixed Content):</strong> Netlify সাইট সবসময় <code className="bg-black/30 px-1 rounded">https://</code> দিয়ে চলে। আপনার স্ট্রিম লিঙ্কগুলো যদি <code className="bg-black/30 px-1 rounded">http://</code> হয়, ব্রাউজার নিরাপত্তা নিয়মের কারণে তা ব্লক করে। তাই সর্বদা HTTPS স্ট্রিম ব্যবহার করুন।</li>
              <li><strong>CORS পলিসি:</strong> স্ট্রিমিং সার্ভারে CORS ওপেন থাকতে হবে (<code className="bg-black/30 px-1 rounded">Access-Control-Allow-Origin: *</code>)।</li>
            </ul>
          </div>

          {/* Interactive Stream Diagnostics Tester */}
          <div className="p-4 rounded-xl bg-slate-900 border border-white/10 space-y-3">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-400" />
              Netlify স্ট্রিম টেস্ট ডায়াগনস্টিকস (Stream Tester)
            </h4>
            <p className="text-xs text-slate-400">
              যেকোনো স্ট্রিম লিংক এখানে পেস্ট করে পরীক্ষা করুন এটি Netlify-র HTTPS ও CORS এর সাথে সামঞ্জস্যপূর্ণ কি না:
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                placeholder="https://example.com/live.m3u8"
                className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-sky-500"
              />
              <button
                onClick={runStreamDiagnostics}
                disabled={isTesting}
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                {isTesting ? 'টেস্ট হচ্ছে...' : 'টেস্ট করুন'}
              </button>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                  testResult.corsOk && testResult.isHttps
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                {testResult.corsOk && testResult.isHttps ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold">
                    {testResult.corsOk && testResult.isHttps ? 'অনুকূল (Netlify Ready)' : 'দৃষ্টি আকর্ষণ (Warning)'}
                  </div>
                  <div className="text-[11px] mt-0.5 opacity-90">{testResult.message}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-900/80 flex items-center justify-between">
          <span className="text-xs text-slate-400 hidden sm:inline">
            আপনার অ্যাপের কোডে <code className="text-sky-300">netlify.toml</code> ও <code className="text-sky-300">_redirects</code> ফাইল সংরক্ষিত আছে।
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer ml-auto"
          >
            বুঝেছি, বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};

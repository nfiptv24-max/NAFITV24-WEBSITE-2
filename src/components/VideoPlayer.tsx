import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  X,
  SkipForward,
  SkipBack,
  Tv,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Server,
  ShieldCheck,
} from 'lucide-react';
import { StreamServer } from '../types';
import { DEFAULT_LOGO } from '../data/defaultData';
import { formatSeconds, WakeLockManager } from '../utils/streamUtils';

interface VideoPlayerProps {
  streamUrl: string;
  title: string;
  logo?: string;
  servers?: StreamServer[];
  onClose: () => void;
  onNextChannel?: () => void;
  onPrevChannel?: () => void;
  onFailover?: () => void;
  onSelectServer?: (url: string) => void;
}

// Check if string is a YouTube link and extract video ID
function getYouTubeEmbedUrl(rawUrl: string): string | null {
  if (!rawUrl) return null;
  const match = rawUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (match && match[1]) {
    return `https://www.youtube-nocookie.com/embed/${match[1]}?autoplay=1&rel=0`;
  }
  return null;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  streamUrl,
  title,
  logo = DEFAULT_LOGO,
  servers = [],
  onClose,
  onNextChannel,
  onPrevChannel,
  onFailover,
  onSelectServer,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hideControlsTimer = useRef<any>(null);
  const wakeLockManager = useRef<WakeLockManager>(new WakeLockManager());

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [speedIndex, setSpeedIndex] = useState(1);
  const [zoomMode, setZoomMode] = useState<'contain' | 'cover' | 'fill'>('contain');
  const [showLogoOverlay, setShowLogoOverlay] = useState(true);
  const [streamFormat, setStreamFormat] = useState<'HLS' | 'MP4' | 'DASH' | 'YouTube'>('HLS');
  const [isProxied, setIsProxied] = useState(false);
  const [hasTriedProxy, setHasTriedProxy] = useState(false);

  // Status message overlay
  const [status, setStatus] = useState<{
    type: 'loading' | 'buffering' | 'playing' | 'error' | 'switch';
    text: string;
    subText?: string;
  } | null>({
    type: 'loading',
    text: 'স্ট্রিম লোড হচ্ছে...',
    subText: 'দয়া করে অপেক্ষা করুন'
  });

  const speeds = [0.5, 1.0, 1.25, 1.5, 2.0];
  const ytEmbedUrl = getYouTubeEmbedUrl(streamUrl);

  // Auto-hide controls
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    if (isPlaying) {
      hideControlsTimer.current = setTimeout(() => {
        setShowControls(false);
      }, 4000);
    }
  }, [isPlaying]);

  // Clean up HLS instance
  const cleanupHls = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  // Compute the playable source URL (resolving HTTP mixed-content & proxy)
  const computePlayUrl = useCallback(
    (rawUrl: string, forceProxy: boolean) => {
      const trimmed = (rawUrl || '').trim();
      if (!trimmed) return '';

      const isPageHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
      const isHttp = trimmed.startsWith('http://');

      // If page is HTTPS and stream is HTTP, browser strictly blocks it without proxy
      if (forceProxy || (isPageHttps && isHttp)) {
        setIsProxied(true);
        return `/api/proxy?url=${encodeURIComponent(trimmed)}`;
      }

      setIsProxied(false);
      return trimmed;
    },
    []
  );

  // Initialize and load stream
  useEffect(() => {
    const video = videoRef.current;
    if (!streamUrl) return;

    // Check YouTube first
    if (ytEmbedUrl) {
      cleanupHls();
      setStreamFormat('YouTube');
      setStatus(null);
      setShowLogoOverlay(false);
      return;
    }

    if (!video) return;

    cleanupHls();
    setShowLogoOverlay(true);
    setHasTriedProxy(false);

    const urlLower = streamUrl.toLowerCase();
    if (urlLower.includes('.m3u8')) setStreamFormat('HLS');
    else if (urlLower.includes('.mpd')) setStreamFormat('DASH');
    else setStreamFormat('MP4');

    setStatus({
      type: 'loading',
      text: 'সংযুক্ত হচ্ছে...',
      subText: title
    });

    const isPageHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const isHttp = streamUrl.startsWith('http://');
    const shouldUseProxy = isPageHttps && isHttp;

    loadStreamSource(streamUrl, shouldUseProxy);

    // Fade out logo overlay after 3 seconds
    const logoTimer = setTimeout(() => {
      setShowLogoOverlay(false);
    }, 3000);

    return () => {
      cleanupHls();
      clearTimeout(logoTimer);
    };
  }, [streamUrl, title, cleanupHls, ytEmbedUrl]);

  // Core stream loader with Hls.js & native fallback
  const loadStreamSource = (rawUrl: string, useProxy: boolean) => {
    const video = videoRef.current;
    if (!video) return;

    cleanupHls();
    const finalUrl = computePlayUrl(rawUrl, useProxy);
    const urlLower = rawUrl.toLowerCase();

    const isHls = urlLower.includes('.m3u8') || finalUrl.includes('.m3u8') || finalUrl.includes('/api/proxy');

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        fragLoadingMaxRetry: 5,
        manifestLoadingMaxRetry: 5,
        levelLoadingMaxRetry: 5,
        fragLoadingRetryDelay: 1000,
        manifestLoadingRetryDelay: 1000,
        xhrSetup: (xhr) => {
          xhr.withCredentials = false;
        }
      });
      hlsRef.current = hls;

      hls.loadSource(finalUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
        setStatus({ type: 'playing', text: 'লাইভ সম্প্রচার' });
        setTimeout(() => setStatus(null), 1500);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // If network error occurred and proxy hasn't been tried yet, retry through proxy
              if (!useProxy && !hasTriedProxy) {
                setHasTriedProxy(true);
                setStatus({
                  type: 'loading',
                  text: 'প্রক্সি সার্ভার দিয়ে রিট্রাই করা হচ্ছে...',
                  subText: 'দয়া করে একটু অপেক্ষা করুন'
                });
                setTimeout(() => {
                  loadStreamSource(rawUrl, true);
                }, 800);
                return;
              }

              setStatus({
                type: 'error',
                text: 'নেটওয়ার্ক সংযোগ ত্রুটি',
                subText: 'সার্ভার পরিবর্তন বা রিট্রাই করা হচ্ছে...'
              });
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              cleanupHls();
              if (onFailover) {
                setTimeout(onFailover, 1500);
              }
              break;
          }
        }
      });
    } else {
      // Native HTML5 video element (MP4, WebM, or Safari native HLS)
      video.src = finalUrl;
      video.play().catch(() => {});
      setStatus({ type: 'playing', text: 'প্লে হচ্ছে' });
      setTimeout(() => setStatus(null), 1500);
    }
  };

  // Switch proxy mode manually
  const toggleProxy = () => {
    const nextState = !isProxied;
    setStatus({
      type: 'loading',
      text: nextState ? 'প্রক্সি মোড চালু হচ্ছে...' : 'সরাসরি মোড চালু হচ্ছে...',
    });
    loadStreamSource(streamUrl, nextState);
  };

  // Video element events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => {
      setIsPlaying(true);
      wakeLockManager.current.request();
      wakeLockManager.current.startKeepAlive(() => !video.paused);
      resetControlsTimer();
    };

    const onPause = () => {
      setIsPlaying(false);
      wakeLockManager.current.release();
      setShowControls(true);
    };

    const onWaiting = () => {
      setStatus({
        type: 'buffering',
        text: 'বাফারিং হচ্ছে...',
        subText: 'স্ট্রিম লোড হচ্ছে'
      });
    };

    const onPlaying = () => {
      setStatus(null);
    };

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setDuration(video.duration || 0);
    };

    const onError = () => {
      if (!isProxied && !hasTriedProxy) {
        setHasTriedProxy(true);
        setStatus({
          type: 'loading',
          text: 'প্রক্সি সার্ভার দিয়ে রিট্রাই করা হচ্ছে...',
          subText: 'দয়া করে একটু অপেক্ষা করুন'
        });
        loadStreamSource(streamUrl, true);
        return;
      }

      setStatus({
        type: 'error',
        text: 'স্ট্রিম প্লে করা যাচ্ছে না',
        subText: onFailover ? 'অন্য সার্ভার চেক করা হচ্ছে...' : 'দয়া করে অন্য চ্যানেল বেছে নিন'
      });
      if (onFailover) {
        setTimeout(onFailover, 2000);
      }
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('error', onError);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('error', onError);
      wakeLockManager.current.release();
    };
  }, [onFailover, resetControlsTimer, isProxied, hasTriedProxy, streamUrl]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        video.currentTime = Math.min(video.currentTime + 10, video.duration || video.currentTime + 10);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        video.currentTime = Math.max(video.currentTime - 10, 0);
      } else if (e.key === 'ArrowUp' && onNextChannel) {
        e.preventDefault();
        onNextChannel();
      } else if (e.key === 'ArrowDown' && onPrevChannel) {
        e.preventDefault();
        onPrevChannel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNextChannel, onPrevChannel]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const cycleSpeed = () => {
    const nextIndex = (speedIndex + 1) % speeds.length;
    setSpeedIndex(nextIndex);
    if (videoRef.current) {
      videoRef.current.playbackRate = speeds[nextIndex];
    }
  };

  const cycleZoom = () => {
    const modes: ('contain' | 'cover' | 'fill')[] = ['contain', 'cover', 'fill'];
    const currentIdx = modes.indexOf(zoomMode);
    const nextMode = modes[(currentIdx + 1) % modes.length];
    setZoomMode(nextMode);
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      try {
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        }
      } catch (err) {
        // Fullscreen error
      }
    } else {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      } catch (err) {
        // Exit error
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const seekPercent = parseFloat(e.target.value);
    video.currentTime = (seekPercent / 100) * duration;
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={resetControlsTimer}
      onTouchStart={resetControlsTimer}
      className={`relative w-full bg-black overflow-hidden select-none transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 h-screen w-screen' : 'rounded-2xl border border-white/10 shadow-2xl mb-6'
      }`}
    >
      {/* Video Container (16:9 Aspect Ratio) */}
      <div className="relative w-full pt-[56.25%] bg-black">
        {ytEmbedUrl ? (
          <iframe
            src={ytEmbedUrl}
            title={title}
            className="absolute inset-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video
            ref={videoRef}
            playsInline
            autoPlay
            crossOrigin="anonymous"
            className="absolute inset-0 w-full h-full"
            style={{ objectFit: zoomMode }}
            onClick={togglePlay}
          />
        )}

        {/* Center Channel Logo Overlay */}
        {showLogoOverlay && !ytEmbedUrl && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-500 z-10">
            <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-black/60 backdrop-blur-md border border-white/20 animate-fade-in shadow-2xl">
              <img
                src={logo}
                alt={title}
                className="w-16 h-16 object-contain rounded-full bg-white/10 p-1"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = DEFAULT_LOGO;
                }}
              />
              <span className="text-sm font-bold text-white tracking-wide">{title}</span>
            </div>
          </div>
        )}

        {/* Status Indicator (Buffering / Error / Loading) */}
        {status && !ytEmbedUrl && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
            <div className="px-5 py-3.5 rounded-xl bg-black/85 backdrop-blur-md border border-white/15 text-white flex flex-col items-center gap-1.5 shadow-2xl min-w-[200px] text-center">
              {status.type === 'loading' && <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />}
              {status.type === 'buffering' && <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />}
              {status.type === 'playing' && <CheckCircle2 className="w-6 h-6 text-emerald-400" />}
              {status.type === 'error' && <AlertTriangle className="w-6 h-6 text-rose-500" />}
              <span className="text-sm font-semibold">{status.text}</span>
              {status.subText && <span className="text-xs text-slate-300">{status.subText}</span>}
            </div>
          </div>
        )}

        {/* Top Header Controls Overlay */}
        <div
          className={`absolute top-0 inset-x-0 p-3 sm:p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between gap-3 z-30 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Close Button & Channel Name */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              title="প্লেয়ার বন্ধ করুন"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={logo}
                alt={title}
                className="w-6 h-6 rounded-full object-contain bg-white/10 shrink-0"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = DEFAULT_LOGO;
                }}
              />
              <span className="font-bold text-sm text-white truncate max-w-[180px] sm:max-w-xs drop-shadow">
                {title}
              </span>
            </div>
          </div>

          {/* Servers list, Proxy toggle & Format Badge */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Proxy Mode indicator / toggle */}
            {!ytEmbedUrl && (
              <button
                onClick={toggleProxy}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer ${
                  isProxied
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                }`}
                title="স্ট্রিম প্রক্সি টগল করুন (CORS ও HTTP বাইপাস)"
              >
                <ShieldCheck className="w-3 h-3" />
                <span className="hidden sm:inline">প্রক্সি {isProxied ? 'অন' : 'অফ'}</span>
              </button>
            )}

            {servers.length > 1 && (
              <div className="hidden sm:flex items-center gap-1.5 bg-black/60 p-1 rounded-lg border border-white/10">
                <Server className="w-3 h-3 text-slate-400 ml-1" />
                {servers.map((srv, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSelectServer && onSelectServer(srv.url)}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                      srv.url === streamUrl
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {srv.name || `S${idx + 1}`}
                  </button>
                ))}
              </div>
            )}

            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-sky-500/20 text-sky-400 border border-sky-500/40">
              {streamFormat}
            </span>
          </div>
        </div>

        {/* Bottom Custom Controls Bar (hidden for YouTube embed which has native controls) */}
        {!ytEmbedUrl && (
          <div
            className={`absolute bottom-0 inset-x-0 p-3 sm:p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col gap-2 z-30 transition-opacity duration-300 ${
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Progress Seek Bar (if media has known duration) */}
            {duration > 0 && isFinite(duration) && (
              <div className="flex items-center gap-3 w-full">
                <span className="text-[11px] text-slate-300 font-mono w-10 text-right">
                  {formatSeconds(currentTime)}
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.1"
                  value={duration ? (currentTime / duration) * 100 : 0}
                  onChange={handleSeek}
                  className="flex-1 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:h-2 transition-all"
                />
                <span className="text-[11px] text-slate-300 font-mono w-10 text-left">
                  {formatSeconds(duration)}
                </span>
              </div>
            )}

            {/* Primary Buttons Row */}
            <div className="flex items-center justify-between gap-2 mt-1">
              {/* Left Controls: Mute, Speed */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                  title={isMuted ? 'আনমিউট করুন' : 'মিউট করুন'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                </button>

                <button
                  onClick={cycleSpeed}
                  className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer"
                  title="প্লেব্যাক স্পিড পরিবর্তন"
                >
                  {speeds[speedIndex]}x
                </button>
              </div>

              {/* Center Controls: Prev, Play/Pause, Next */}
              <div className="flex items-center gap-3">
                {onPrevChannel && (
                  <button
                    onClick={onPrevChannel}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                    title="পূর্ববর্তী চ্যানেল"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                  title={isPlaying ? 'বিরতি (Pause)' : 'প্লে করুন'}
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
                </button>

                {onNextChannel && (
                  <button
                    onClick={onNextChannel}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                    title="পরবর্তী চ্যানেল"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Right Controls: Aspect Ratio Zoom, Fullscreen */}
              <div className="flex items-center gap-2">
                <button
                  onClick={cycleZoom}
                  className="px-2 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  title="এস্পেক্ট রেশিও (Contain / Cover / Fill)"
                >
                  <Tv className="w-3.5 h-3.5 text-sky-400" />
                  <span className="capitalize text-[11px] hidden sm:inline">{zoomMode}</span>
                </button>

                <button
                  onClick={toggleFullscreen}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                  title={isFullscreen ? 'ফুলস্ক্রিন থেকে বের হন' : 'ফুলস্ক্রিন করুন'}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

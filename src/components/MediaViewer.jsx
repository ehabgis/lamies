import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
    ArrowsClockwise,
    Minus,
    Plus,
    SpeakerHigh,
    X
} from 'phosphor-react';

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'jfif', 'png', 'webp', 'svg', 'gif', 'avif'];
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm', 'm4v'];
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'm4a', 'aac'];

const decodeAndEncodeUri = (value = '') => {
    if (!value) return '';
    try {
        return encodeURI(decodeURI(value));
    } catch {
        return value;
    }
};

const normalizeMediaPath = (rawPath = '') => {
    const cleaned = String(rawPath || '').trim().replace(/\\/g, '/');
    if (!cleaned) return '';

    if (/^https?:\/\//i.test(cleaned)) {
        try {
            const url = new URL(cleaned);
            url.pathname = decodeAndEncodeUri(url.pathname);
            return url.toString();
        } catch {
            return cleaned;
        }
    }

    const withSlash = cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
    return decodeAndEncodeUri(withSlash);
};

const extensionFromPath = (path = '') => {
    const normalized = String(path || '').trim();
    if (!normalized) return '';
    const withoutQuery = normalized.split('?')[0].split('#')[0];
    const lastDot = withoutQuery.lastIndexOf('.');
    if (lastDot < 0) return '';
    return withoutQuery.slice(lastDot + 1).toLowerCase();
};

const inferType = (item) => {
    const explicitType = String(item?.type || '').toLowerCase();
    if (['video', 'image', 'audio', 'pdf', 'pptx'].includes(explicitType)) return explicitType;

    const explicitExtension = String(item?.extension || '').toLowerCase();
    const byExtension = explicitExtension || extensionFromPath(item?.path || '');
    if (IMAGE_EXTENSIONS.includes(byExtension)) return 'image';
    if (VIDEO_EXTENSIONS.includes(byExtension)) return 'video';
    if (AUDIO_EXTENSIONS.includes(byExtension)) return 'audio';
    if (byExtension === 'pdf') return 'pdf';
    if (byExtension === 'pptx') return 'pptx';
    return 'file';
};

const splitDescription = (description = '') => {
    const raw = String(description || '').trim();
    if (!raw) return [];

    const normalized = raw
        .replace(/\r\n/g, '\n')
        .replace(/[\u2022\u25AA\u25CF\u25E6]/g, '\n')
        .replace(/\s{2,}/g, '\n');

    const lineParts = normalized
        .split(/\n+/)
        .map((part) => part.replace(/\s+/g, ' ').trim())
        .filter((part) => part.length > 2);

    if (lineParts.length > 1) return lineParts;

    const sentenceParts = raw
        .replace(/\s+/g, ' ')
        .split(/(?<=[.!\u061F\u060C\u061B])\s+/)
        .map((part) => part.trim())
        .filter((part) => part.length > 2);

    return sentenceParts.length > 1 ? sentenceParts : [];
};

export default function MediaViewer({ item, onClose }) {
    const [portalTarget, setPortalTarget] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [mediaError, setMediaError] = useState('');
    const [mediaReloadKey, setMediaReloadKey] = useState(0);

    useEffect(() => {
        if (typeof document === 'undefined') return;
        setPortalTarget(document.body);
    }, []);

    const normalizedItem = useMemo(() => {
        if (!item) return null;
        const path = normalizeMediaPath(item.path || item.url || '');
        const type = inferType({ ...item, path });
        return {
            ...item,
            path,
            type,
            title: item.title || 'محتوى تعليمي',
            description: item.description || ''
        };
    }, [item]);

    const officeEmbedUrl = useMemo(() => {
        if (!normalizedItem || normalizedItem.type !== 'pptx' || !normalizedItem.path || typeof window === 'undefined') {
            return null;
        }
        try {
            const absoluteFileUrl = new URL(normalizedItem.path, window.location.href).href;
            return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absoluteFileUrl)}`;
        } catch {
            return null;
        }
    }, [normalizedItem]);

    useEffect(() => {
        setZoom(1);
        setMediaError('');
        setMediaReloadKey(0);
    }, [normalizedItem?.path, normalizedItem?.type]);

    useEffect(() => {
        if (!portalTarget || typeof document === 'undefined' || typeof window === 'undefined') return undefined;
        const previousOverflow = document.body.style.overflow;

        const onEscape = (event) => {
            if (event.key === 'Escape') onClose?.();
        };

        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onEscape);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onEscape);
        };
    }, [portalTarget, onClose]);

    if (!normalizedItem || !portalTarget) return null;

    const isVideo = normalizedItem.type === 'video';
    const isImage = normalizedItem.type === 'image';
    const isAudio = normalizedItem.type === 'audio';
    const isPdf = normalizedItem.type === 'pdf';
    const isPptx = normalizedItem.type === 'pptx';
    const canPreview = isVideo || isImage || isAudio || isPdf || isPptx;
    const zoomIn = () => setZoom((value) => Math.min(3, Number((value + 0.25).toFixed(2))));
    const zoomOut = () => setZoom((value) => Math.max(1, Number((value - 0.25).toFixed(2))));
    const resetZoom = () => setZoom(1);

    const typeLabel = isVideo
        ? 'فيديو'
        : isImage
            ? 'صورة'
            : isAudio
                ? 'صوت'
                : isPptx
                    ? 'عرض'
                    : isPdf
                        ? 'ملف PDF'
                        : 'ملف';

    const modal = (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[14000] bg-slate-950/82 backdrop-blur-sm p-3 sm:p-5"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={normalizedItem.title}
        >
            <motion.div
                initial={{ y: 28, opacity: 0.85, scale: 0.97 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 24, opacity: 0, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 240, damping: 24 }}
                className="relative mx-auto flex h-[min(86vh,760px)] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-white/30 bg-white shadow-[0_25px_80px_rgba(2,6,23,0.45)]"
                onClick={(event) => event.stopPropagation()}
            >
                <header className="relative z-10 flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-3 sm:px-5">
                    <div className="min-w-0 flex-1 text-right">
                        <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-xs font-black text-sky-700">
                            {typeLabel}
                        </span>
                        <h3 className="mt-1 line-clamp-1 text-lg font-black text-slate-800 sm:text-xl">
                            {normalizedItem.title}
                        </h3>
                    </div>

                    <button
                        type="button"
                        className="shrink-0 rounded-full border border-slate-200 bg-white p-2 text-slate-700 transition hover:bg-slate-100"
                        onClick={onClose}
                        aria-label="إغلاق العرض"
                    >
                        <X size={24} weight="bold" />
                    </button>
                </header>

                <div className="relative z-10 flex min-h-0 flex-1 bg-slate-100 p-3 sm:p-5">
                    <div className={`relative h-full w-full overflow-hidden rounded-3xl shadow-inner ${isImage || isAudio ? 'bg-white' : 'bg-slate-950'}`}>
                            {isImage && (
                                <div className="absolute left-3 top-3 z-20 flex items-center gap-2 rounded-full border border-white/20 bg-slate-900/70 px-2 py-1 text-white">
                                    <span className="text-[11px] font-black">{Math.round(zoom * 100)}%</span>
                                    <button type="button" onClick={zoomIn} className="rounded-full p-1 hover:bg-white/15" aria-label="تكبير">
                                        <Plus size={16} weight="bold" />
                                    </button>
                                    <button type="button" onClick={resetZoom} className="rounded-full p-1 hover:bg-white/15" aria-label="إعادة التكبير">
                                        <ArrowsClockwise size={16} weight="bold" />
                                    </button>
                                    <button type="button" onClick={zoomOut} className="rounded-full p-1 hover:bg-white/15" aria-label="تصغير">
                                        <Minus size={16} weight="bold" />
                                    </button>
                                </div>
                            )}

                            {mediaError ? (
                                <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-slate-950 p-6 text-center text-white">
                                    <p className="text-xl font-black">تعذر عرض الملف هنا</p>
                                    <p className="max-w-md text-sm font-bold text-white/80">{mediaError}</p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMediaError('');
                                            setMediaReloadKey((value) => value + 1);
                                        }}
                                        className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-black text-slate-800"
                                    >
                                        <ArrowsClockwise size={16} weight="bold" />
                                        حاول تشغيله هنا مرة أخرى
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {isVideo && (
                                        <video
                                            key={`${normalizedItem.path}-${mediaReloadKey}`}
                                            controls
                                            autoPlay
                                            muted
                                            playsInline
                                            preload="auto"
                                            className="h-full w-full bg-black object-contain"
                                            src={normalizedItem.path}
                                            onCanPlay={(event) => {
                                                const player = event.currentTarget;
                                                player.play().catch(() => {
                                                    // قد يمنع المتصفح التشغيل التلقائي قبل أي تفاعل
                                                });
                                            }}
                                            onError={(event) => {
                                                const player = event.currentTarget;
                                                const errorCode = player.error?.code || 0;

                                                // MEDIA_ERR_ABORTED يحدث أحيانًا عند فتح النافذة أو إعادة تركيب العنصر،
                                                // ولا يعني أن ملف الفيديو نفسه تالف أو غير مدعوم.
                                                if (errorCode === 1 || player.readyState >= 2) {
                                                    return;
                                                }

                                                setMediaError(
                                                    errorCode === 2
                                                        ? 'تعذر تحميل الفيديو مؤقتًا. جرّب تشغيله هنا مرة أخرى.'
                                                        : 'تعذر تشغيل الفيديو داخل المتصفح. جرّب إعادة تشغيله هنا.'
                                                );
                                            }}
                                        >
                                            متصفحك لا يدعم تشغيل الفيديو.
                                        </video>
                                    )}

                                    {isImage && (
                                        <div className="flex h-full w-full items-center justify-center overflow-auto bg-slate-100 p-3 sm:p-5">
                                            <img
                                                src={normalizedItem.path}
                                                alt={normalizedItem.title}
                                                className="max-h-full max-w-full origin-center rounded-2xl object-contain shadow-xl transition-transform duration-200"
                                                style={{ transform: `scale(${zoom})` }}
                                                onError={() => setMediaError('الصورة غير متاحة أو مسارها غير صحيح.')}
                                            />
                                        </div>
                                    )}

                                    {isAudio && (
                                        <div className="flex h-full w-full items-center justify-center bg-slate-100 p-4 sm:p-6">
                                            <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-5 text-center shadow-lg sm:p-7">
                                                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sky-50 text-sky-700">
                                                    <SpeakerHigh size={34} weight="fill" />
                                                </div>
                                                <p className="mb-4 text-base font-black text-slate-800">ملف صوتي</p>
                                                <audio
                                                    controls
                                                    className="w-full"
                                                    src={normalizedItem.path}
                                                    onError={() => setMediaError('تعذر تشغيل الملف الصوتي.')}
                                                >
                                                    متصفحك لا يدعم تشغيل الصوت.
                                                </audio>
                                            </div>
                                        </div>
                                    )}

                                    {isPdf && (
                                        <iframe
                                            title={normalizedItem.title || 'PDF'}
                                            src={normalizedItem.path}
                                            className="h-full w-full bg-white"
                                        />
                                    )}

                                    {isPptx && (
                                        officeEmbedUrl ? (
                                            <iframe
                                                title={normalizedItem.title || 'PowerPoint'}
                                                src={officeEmbedUrl}
                                                className="h-full w-full bg-white"
                                                allowFullScreen
                                            />
                                        ) : (
                                            <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-6 text-center text-white">
                                                <p className="text-xl font-black">لا يمكن عرض PowerPoint داخل المتصفح مباشرة.</p>
                                                <p className="text-sm font-bold text-white/75">افتح الملف في نافذة جديدة.</p>
                                            </div>
                                        )
                                    )}

                                    {!canPreview && (
                                        <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center text-white">
                                            <p className="text-xl font-black">هذا النوع من الملفات يحتاج فتحًا خارجيًا.</p>
                                            <p className="text-sm font-bold text-white/75">افتحه في نافذة جديدة عند الحاجة.</p>
                                        </div>
                                    )}
                                </>
                            )}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );

    return createPortal(modal, portalTarget);
}


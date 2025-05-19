'use client';

import { useEffect, useRef } from 'react';

export default function WatchPage() {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const loadHls = async () => {
            if (!videoRef.current) return;
            
            const Hls = (await import('hls.js')).default;
            if (Hls.isSupported()) {
                const hls = new Hls({
                    debug: false,
                    enableWorker: true,
                    lowLatencyMode: true,
                });

                hls.loadSource('http://localhost:3000/streaming/playlist.m3u8');
                hls.attachMedia(videoRef.current);

                hls.on(Hls.Events.MEDIA_ATTACHED, () => {
                    videoRef.current?.play().catch(console.error);
                });

                return () => {
                    hls.destroy();
                };
            } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
                // For Safari
                videoRef.current.src = 'http://localhost:3000/streaming/playlist.m3u8';
                videoRef.current.play().catch(console.error);
            }
        };

        loadHls();
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4 md:p-8">
            <div className="w-full max-w-[1280px] relative">
                {/* Video aspect ratio container */}
                <div className="relative aspect-video rounded-lg overflow-hidden shadow-2xl ring-1 ring-gray-800">
                    {/* Video element */}
                    <video
                        ref={videoRef}
                        className="absolute inset-0 w-full h-full object-cover bg-black"
                        controls
                        playsInline
                        autoPlay
                    />
                    
                    {/* Optional loading overlay */}
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none opacity-0 transition-opacity duration-300 data-[loading=true]:opacity-100">
                        <div className="text-white text-lg">Loading...</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

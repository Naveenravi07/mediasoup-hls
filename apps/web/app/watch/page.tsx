'use client';

import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

export default function Watch() {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (!videoRef.current) return;

        const video = videoRef.current;
        const hlsUrl = 'http://localhost:3000/streaming/hls/composite.m3u8';

        if (Hls.isSupported()) {
            const hls = new Hls({
                debug: false,
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 30,
                maxBufferLength: 10,
                maxMaxBufferLength: 10,
                maxBufferSize: 10 * 1000 * 1000, // 10MB
                maxBufferHole: 0.1,
                highBufferWatchdogPeriod: 1,
                nudgeOffset: 0.1,
                nudgeMaxRetry: 5,
            });

            hls.loadSource(hlsUrl);
            hls.attachMedia(video);

            hls.on(Hls.Events.MEDIA_ATTACHED, () => {
                video.play().catch(error => {
                    console.log('Error auto-playing video:', error);
                });
            });

            return () => {
                hls.destroy();
            };
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // For Safari
            video.src = hlsUrl;
            video.play().catch(error => {
                console.log('Error auto-playing video:', error);
            });
        }
    }, []);

    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-900">
            <div className="w-full max-w-[1280px] aspect-video">
                <video
                    ref={videoRef}
                    className="w-full h-full"
                    controls
                    playsInline
                    autoPlay
                />
            </div>
        </div>
    );
}
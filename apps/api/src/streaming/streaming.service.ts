import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { StreamData } from './dto/streamData';
import { ChildProcess, spawn } from 'child_process';
import { RtpParameters, MediaKind } from 'mediasoup/node/lib/rtpParametersTypes';
import path, { join } from 'path';
import fs from 'fs';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class StreamingService implements OnModuleInit, OnModuleDestroy {
    constructor(private readonly logger: LoggerService) {}

    private active: boolean = false;
    public plainTransport: StreamData[] = [];
    private ffmpegProcess: ChildProcess | null = null;
    private sdpDirPath: string = path.join(process.cwd(), 'sdp');
    private hlsDirPath: string = path.join(process.cwd(), 'public','hls');
    private readonly loggerName = 'ffmpeg';

    onModuleInit() {
        if (!fs.existsSync(this.sdpDirPath)) {
            fs.mkdirSync(this.sdpDirPath, { recursive: true });
        }
        if (!fs.existsSync(this.hlsDirPath)) {
            fs.mkdirSync(this.hlsDirPath, { recursive: true });
        }
    }

    onModuleDestroy() {
        console.log('StreamingService destroyed');
    }

    getActive() {
        return this.active;
    }

    addStreamData(streamData: StreamData) {
        this.plainTransport.push(streamData);

        if (this.plainTransport.length === 1) {
            this.startStreaming();
        } else {
            this.restartStreaming();
        }
    }

    startStreaming() {
        if (this.plainTransport.length === 0) {
            throw new Error('No stream data to start streaming');
        }
        if (this.ffmpegProcess) {
            console.log('Killing existing ffmpeg process');
            this.ffmpegProcess.kill();
        }
        this.active = true;

        const audioStreamData = this.plainTransport.filter(stream => stream.kind === 'audio');
        const videoStreamData = this.plainTransport.filter(stream => stream.kind === 'video');

        this.plainTransport.forEach((m)=>console.log(m?.rtpParameters?.codecs))

        if (!audioStreamData || !videoStreamData) {
            throw new Error('No audio or video stream data to start streaming');
        }
        const ffmpegArgs = [
            '-loglevel', 'verbose',
            '-analyzeduration', '5000000',
            '-probesize', '5000000',
            '-y'
        ];

        this.plainTransport.forEach((transportData, index) => {
            const { transport, rtpParameters, kind, port } = transportData
            let {localIp} = transport.tuple
            const sdpContent = this.generateSDP(kind, localIp, port, rtpParameters);

            const sdpFilePath = path.join(this.sdpDirPath, `${index}.sdp`);
            fs.writeFileSync(sdpFilePath, sdpContent);

            ffmpegArgs.push('-protocol_whitelist', 'file,rtp,udp');
            ffmpegArgs.push('-r', '30');
            ffmpegArgs.push('-i', sdpFilePath);
        })

        if (videoStreamData.length > 0) {
            const videoIndices = videoStreamData.map(stream => 
                this.plainTransport.indexOf(stream));
            
            if (videoIndices.length > 1) {
                const layoutFilter = this.createGridLayout(videoIndices);
                ffmpegArgs.push('-filter_complex', layoutFilter);
                ffmpegArgs.push('-map', '[v]');
            } else {
                ffmpegArgs.push('-map', `${videoIndices[0]}:v`);
            }
        }

        if (audioStreamData.length > 0) {
            const audioIndices = audioStreamData.map(stream => 
                this.plainTransport.indexOf(stream));

            if (audioIndices.length > 1) {
                let audioMixFilter = audioIndices.map(idx => `[${idx}:a]`).join('');
                audioMixFilter += `amix=inputs=${audioIndices.length}:duration=longest[a]`;
                ffmpegArgs.push('-filter_complex', audioMixFilter);
                ffmpegArgs.push('-map', '[a]');
            } else {
                ffmpegArgs.push('-map', `${audioIndices[0]}:a`);
            }
        }

        ffmpegArgs.push(
            // Video codec settings with explicit bitrate
            '-preset', 'fast',
            '-tune', 'zerolatency',
            '-b:v', '1200k',  // Reduced bitrate
            '-maxrate', '1200k',
            '-bufsize', '2400k',
            '-threads', '4',

            
            '-g', '30',       // Keyframe interval
            '-keyint_min', '30',
            '-sc_threshold', '0',
            '-bf', '0',       // Disable B-frames
            '-profile:v', 'baseline',  // Use baseline profile
            '-level', '3.0',  // Set H.264 level
            '-x264opts', 'no-scenecut:filler=1',  // Disable scene cut detection
            '-c:v', 'libx264',
            
            // Audio codec settings
            '-c:a', 'aac',
            '-ar', '48000',
            '-b:a', '128k',

            // HLS output settings
            '-f', 'hls',
            '-hls_time', '2',
            '-hls_list_size', '10',
            '-hls_flags', 'delete_segments+append_list',
            '-hls_segment_filename', path.join(this.hlsDirPath, 'segment_%03d.ts'),
            path.join(this.hlsDirPath, 'playlist.m3u8')
        );

        console.log('Starting FFmpeg with args:', ffmpegArgs.join(' '));
        this.ffmpegProcess = spawn('ffmpeg', ffmpegArgs, {
            detached: false,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        this.ffmpegProcess?.stdout?.on('data', (data) => {
            // this.logger.logStdout(this.loggerName, Buffer.from(data));
        });
        this.ffmpegProcess?.stderr?.on('data', (data) => {
            // this.logger.logStderr(this.loggerName, Buffer.from(data));
        });

        this.ffmpegProcess?.on('close', (code) => {
            console.log('FFmpeg process closed with code:', code);
        });


    }

    restartStreaming() {
        this.ffmpegProcess?.kill();
        fs.rmSync(join(this.hlsDirPath), { recursive: true, force: true });
        fs.mkdirSync(this.hlsDirPath)
        fs.rmSync(join(this.sdpDirPath), { recursive: true, force: true });
        fs.mkdirSync(this.sdpDirPath)
        fs.rmSync(join(process.cwd(),'logs',this.loggerName),{recursive:true,force:true});
        fs.mkdirSync(join(process.cwd(),'logs',this.loggerName))

        setTimeout(()=>{
            console.log('Restarting streaming');
            this.startStreaming();
        },3000)
    }

    generateSDP(kind: MediaKind, ip: string, port: number, rtpParameters: RtpParameters): string {
        const { codecs, encodings, rtcp } = rtpParameters;
        const codec = codecs[0];
        if (!codec) {
            throw new Error('No codec found');
        }

        let sdp = 'v=0\n';
        sdp += 'o=- 0 0 IN IP4 ' + ip + '\n';
        sdp += 's=FFmpeg\n';
        sdp += 'c=IN IP4 ' + ip + '\n';
        sdp += 't=0 0\n';
        
        if (kind === 'video') {
            sdp += 'a=framerate:30\n';
            if (codec.mimeType.toLowerCase().includes('vp8')) {
                sdp += 'a=imageattr:' + codec.payloadType + ' send [x=1280,y=720] recv [x=1280,y=720]\n';
            }
        }
        
        sdp += 'm=' + kind + ' ' + port + ' RTP/AVP ' + codec.payloadType + '\n';
        sdp += 'a=rtpmap:' + codec.payloadType + ' ' + codec.mimeType.split('/')[1] + '/' + codec.clockRate;
        if (codec.channels && codec.mimeType.toLowerCase().includes('opus')) {
            sdp += '/' + codec.channels;
        }
        sdp += '\n';

        if (codec.parameters) {
            const fmtps: string[] = [];
            for (const key in codec.parameters) {
                fmtps.push(key + '=' + codec.parameters[key]);
            }
            if (fmtps.length > 0) {
                sdp += 'a=fmtp:' + codec.payloadType + ' ' + fmtps.join(';') + '\n';
            }
        }

        sdp += 'a=recvonly\n';
                if (rtcp?.cname) {
            sdp += 'a=ssrc:' + (encodings?.[0]?.ssrc || 1) + ' cname:' + rtcp.cname + '\n';
        }
        
        return sdp;
    }

    private createGridLayout(videoIndices: number[]): string {
    const videoCount = videoIndices.length;
    if (videoCount === 0) return '';
    if (videoCount === 1) return `[${videoIndices[0]}:v]scale=1280:720[v]`;

    let filter = '';
    const rows = Math.ceil(Math.sqrt(videoCount));
    const cols = Math.ceil(videoCount / rows);
    const cellWidth = Math.floor(1280 / cols);
    const cellHeight = Math.floor(720 / rows);

    // Scale each video
    videoIndices.forEach((videoIndex, i) => {
        filter += `[${videoIndex}:v]scale=${cellWidth}:${cellHeight}[v${i}];`;
    });

    // Create grid - modified to ensure hstack always gets ≥2 inputs
    let xStack = '';
    let gridInputs = 0;
    
    for (let r = 0; r < rows; r++) {
        const rowInputs : string[] = [];
        for (let c = 0; c < cols; c++) {
            const i = r * cols + c;
            if (i < videoCount) {
                rowInputs.push(`[v${i}]`);
            }
        }
        
        if (rowInputs.length > 1) {
            // Horizontal stack if we have multiple videos in this row
            filter += `${rowInputs.join('')}hstack=inputs=${rowInputs.length}[row${r}];`;
            xStack += `[row${r}]`;
            gridInputs++;
        } else if (rowInputs.length === 1) {
            // Single video in row - just pass through
            filter += `${rowInputs[0]}copy[row${r}];`;
            xStack += `[row${r}]`;
            gridInputs++;
        }
    }

    if (gridInputs > 1) {
        // Vertical stack if we have multiple rows
        filter += `${xStack}vstack=inputs=${gridInputs}[v]`;
    } else if (gridInputs === 1) {
        // Single row - just pass through
        filter += `${xStack}copy[v]`;
    }

    return filter;
}

    

    getHls(){
        const content = fs.readFileSync(path.join(this.hlsDirPath, 'playlist.m3u8'), 'utf8');
        // Ensure absolute URLs in playlist
        return content.replace(/segment_\d+\.ts/g, (match) => {
            return `http://localhost:3000/streaming/${match}`;
        });
    }

    getHlsFile(filename: string){
        if (!filename.match(/^segment_\d+\.ts$/)) {
            throw new Error('Invalid segment filename');
        }
        const filePath = path.join(this.hlsDirPath, filename);
        if (!fs.existsSync(filePath)) {
            throw new Error('Segment file not found');
        }
        return fs.createReadStream(filePath);
    }
} 
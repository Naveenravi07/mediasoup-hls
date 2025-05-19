import { Controller, Get, Param, Header, StreamableFile, Res } from '@nestjs/common';
import { StreamingService } from './streaming.service';
import type { Response } from 'express';

@Controller('streaming')
export class StreamingController {
    constructor(private readonly streamingService: StreamingService) {}

    @Get('/playlist.m3u8')
    @Header('Content-Type', 'application/vnd.apple.mpegurl')
    @Header('Access-Control-Allow-Origin', '*')
    getHls() {
        return this.streamingService.getHls();
    }

    @Get('/:filename')
    @Header('Access-Control-Allow-Origin', '*')
    async getHlsFile(
        @Param('filename') filename: string,
        @Res({ passthrough: true }) response: Response
    ) {
        response.set({
            'Content-Type': 'video/mp2t',
        });
        
        const file = await this.streamingService.getHlsFile(filename);
        return new StreamableFile(file);
    }
} 
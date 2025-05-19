import { Controller, Get } from '@nestjs/common';
import { StreamingService } from './streaming.service';

@Controller('streaming')
export class StreamingController {
    constructor(private readonly streamingService: StreamingService) {}

    @Get('/hls')
    getHls() {
        return this.streamingService.getHls();
    }
    
} 
import { Module } from '@nestjs/common';
import { StreamingService } from './streaming.service';
import { StreamingController } from './streaming.controller';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { LoggerModule } from '../logger/logger.module';

@Module({
    imports: [
        ServeStaticModule.forRoot({
            rootPath: join(process.cwd(), 'public','hls'),
            serveRoot: '/',
        }),
        LoggerModule,
    ],
    providers: [StreamingService],
    controllers: [StreamingController],
    exports: [StreamingService],
})
export class StreamingModule {} 
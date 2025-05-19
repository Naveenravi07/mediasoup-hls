import { Module } from '@nestjs/common';
import { MediasoupService } from './mediasoup.service';
import { MediasoupGateway } from './mediasoup.gateway';
import { UsersModule } from 'src/users/users.module';
import { StreamingModule } from '../streaming/streaming.module';

@Module({
    imports: [UsersModule, StreamingModule],
    providers: [MediasoupService, MediasoupGateway],
    exports: [MediasoupService],
})
export class MediasoupModule { }

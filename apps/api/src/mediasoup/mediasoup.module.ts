import { Module } from '@nestjs/common';
import { MediasoupGateway } from './mediasoup.gateway';
import { UsersModule } from 'src/users/users.module';
import { MediasoupService } from './mediasoup.service';

@Module({
    imports: [UsersModule],
    providers: [MediasoupGateway,MediasoupService ],
    exports:[MediasoupService]
})
export class MediasoupModule { }

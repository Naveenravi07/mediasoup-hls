import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { MediasoupModule } from './mediasoup/mediasoup.module';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { LoggerModule } from './logger/logger.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        DatabaseModule,
        UsersModule,
        AuthModule,
        MediasoupModule,
        RedisModule.forRoot({
            config: [
                {
                    namespace: 'publisher',
                    host: 'localhost',
                    port: 6379,
                },
            ]

        })
    ],
    controllers: [],
    providers: [LoggerModule],
})
export class AppModule { }

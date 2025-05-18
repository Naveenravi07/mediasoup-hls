import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
    Worker,
    Router,
    RtpCapabilities,
    Transport,
    DtlsParameters,
    MediaKind,
    Producer,
    Consumer,
} from 'mediasoup/node/lib/types';
import * as mediasoup from 'mediasoup';
import { UsersService } from 'src/users/users.service';
import { TransportProduceReq } from './dto/transport-produce-req';
import { ConsumeSingleUserReq } from './dto/consume-single-user-req';
import { type TransportConsumeReq } from './dto/transport-cnsume-req';

type UserData = {
    id: string;
    name: string;
    imgSrc: string;
    transportIds: string[];
    producersIds: string[];
    consumersIds: string[];
};

type TransportData = {
    userId: string;
    transport: Transport;
    consumer: boolean;
};

type ProducerData = {
    userId: string;
    transportId: string;
    producer: Producer;
    kind: MediaKind;
};

type ConsumerData = {
    userId: string;
    transportId: string;
    producerId: string;
    consumer: Consumer;
};

type Room = {
    router: Router | null;
    users: Map<string, UserData>;
    transports: Map<string, TransportData>;
    producers: Map<string, ProducerData>;
    consumers: Map<string, ConsumerData>;
};

@Injectable()
export class MediasoupService implements OnModuleInit, OnModuleDestroy {
    private worker: Worker | undefined;

    private room: Room = {
        router: null,
        users: new Map(),
        transports: new Map(),
        producers: new Map(),
        consumers: new Map(),
    };

    constructor(
        private readonly userService: UsersService,
    ) {
    }

    async onModuleInit() {
        if (this.worker) return;

        this.worker = await mediasoup.createWorker({
            logLevel: 'warn',
            appData: { foo: 123 },
        });

        this.worker.on('died', () => {
            console.error('Mediasoup worker died');
            process.exit(1);
        });
    }


    async addUserToRoom(user: { name: string; id: string }) {
        const userData = await this.userService.getUser(user.id);

        this.room.users.set(user.id, {
            id: user.id,
            name: user.name,
            imgSrc: userData.pfpUrl || 'https://i.scdn.co/image/ab67616100005174305839f7ed0cdbc450e4ec97',
            transportIds: [],
            producersIds: [],
            consumersIds: [],
        });
    }

    async getRouterCapabilities(): Promise<RtpCapabilities> {
        if (!this.worker) throw new Error('Worker not found');

        if (!this.room.router) {
            this.room.router = await this.worker.createRouter({
                mediaCodecs: [
                    {
                        kind: 'audio',
                        mimeType: 'audio/opus',
                        clockRate: 48000,
                        channels: 2,
                    },
                    {
                        kind: 'video',
                        mimeType: 'video/VP8',
                        clockRate: 90000,
                        parameters: {
                            'x-google-start-bitrate': 8000,
                        },
                    },
                ],
            });
        }

        return this.room.router.rtpCapabilities;
    }

    async createTransport(userId: string, isConsumer: boolean) {
        if (!this.room.router) throw new Error('Router not found');

        const transport = await this.room.router.createWebRtcTransport({
            listenInfos: [
                {
                    protocol: 'udp',
                    ip: '0.0.0.0',
                    announcedAddress: '192.168.0.109',
                    portRange: { min: 40000, max: 40100 },
                },
                {
                    protocol: 'tcp',
                    ip: '0.0.0.0',
                    announcedAddress: '192.168.0.109',
                    portRange: { min: 40000, max: 40100 },
                },
            ],
            enableUdp: true,
            enableTcp: true,
            preferUdp: true,
            iceConsentTimeout: 20,
            initialAvailableOutgoingBitrate: 1000000,
        });

        this.room.transports.set(transport.id, {
            userId,
            transport,
            consumer: isConsumer,
        });

        this.room.users.get(userId)?.transportIds.push(transport.id);

        return {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
        };
    }

    async setDtlsParameters(transportId: string, dtlsParameters: DtlsParameters, consumer: boolean) {
        const transportData = this.getTransportOrThrow(transportId);

        if (transportData.consumer !== consumer) {
            throw new Error('Invalid transport type');
        }

        await transportData.transport.connect({ dtlsParameters });
        return true;
    }

    async createProducerFromTransport(data: TransportProduceReq, userId: string) {
        const { kind, rtpParameters, appData, transportId } = data;
        const transportData = this.getTransportOrThrow(transportId);

        const producer = await transportData.transport.produce({
            kind,
            rtpParameters,
            appData: appData || {},
        });

        this.room.producers.set(producer.id, {
            userId,
            transportId: transportData.transport.id,
            producer,
            kind,
        });

        this.room.users.get(userId)?.producersIds.push(producer.id);

        await this.addProducerToRecording(producer, userId, kind);
        return { id: producer.id, userId, kind };
    }


    async addProducerToRecording(producer: Producer<mediasoup.types.AppData>, userId: string, kind: string) {

        const plainTransport = await this.room.router?.createPlainTransport({
            listenIp: { ip: '127.0.0.1', announcedIp: undefined },
            rtcpMux: true,
            comedia: true
        });

        if (!plainTransport) throw new Error("Failed to create transport")
        let rtpcap = this.room?.router?.rtpCapabilities

        const rtpCapabilities = {
            codecs: rtpcap?.codecs?.filter(codec =>
                ['audio/opus', 'video/VP8', 'video/H264'].includes(codec.mimeType)
            ),
            headerExtensions: rtpcap?.headerExtensions?.filter(ext =>
                ['urn:ietf:params:rtp-hdrext:sdes:mid', 'http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time'].includes(ext.uri)
            )
        };

        const consumer = await plainTransport.consume({
            producerId: producer.id,
            rtpCapabilities: rtpCapabilities,
            paused: false
        });

        const transportInfo = {
            ip: plainTransport.tuple.localIp,
            port: plainTransport.tuple.localPort
        };


        console.log(rtpCapabilities)
        console.log(transportInfo)
        console.log(`Added ${kind} stream from user ${userId} to streaming system`);

    }

    async createConsumerFromTransport(data: TransportConsumeReq, userId: string) {
        const { rtpCapabilities } = data;
        const userData = this.getUserOrThrow(userId);

        const consumerTransport = this.getConsumerTransport(userData);
        if (!consumerTransport) throw new Error('Failed to get consumer transport');

        const consumersInfo: any[] = [];

        for (const user of this.room.users.values()) {
            if (user.id === userId) continue; // Skip self

            for (const producerId of user.producersIds) {
                const producer = this.room.producers.get(producerId);
                if (!producer || !this.room.router?.canConsume({ producerId, rtpCapabilities })) continue;

                try {
                    const consumer = await consumerTransport.transport.consume({
                        producerId,
                        rtpCapabilities,
                        paused: true,
                    });

                    user.consumersIds.push(consumer.id);
                    this.room.consumers.set(consumer.id, {
                        userId,
                        transportId: consumerTransport.transport.id,
                        producerId,
                        consumer,
                    });

                    consumersInfo.push({
                        id: consumer.id,
                        producerId,
                        kind: producer.kind,
                        rtpParameters: consumer.rtpParameters,
                        userId: producer.userId,
                    });
                } catch (err) {
                    console.error('Failed to create consumer:', err);
                }
            }
        }

        return consumersInfo;
    }

    async consumeSingleUser(data: ConsumeSingleUserReq, userId: string) {
        const { rtpCapabilities, producerId } = data;
        const userData = this.getUserOrThrow(userId);

        const consumerTransport = this.getConsumerTransport(userData);
        if (!consumerTransport) throw new Error('Failed to get consumer transport');

        const producer = this.room.producers.get(producerId);
        if (!producer) throw new Error('Failed to get producer');

        const consumer = await consumerTransport.transport.consume({
            producerId: producer.producer.id,
            rtpCapabilities,
            paused: true,
        });

        userData.consumersIds.push(consumer.id);
        this.room.consumers.set(consumer.id, {
            userId,
            transportId: consumerTransport.transport.id,
            producerId: producer.producer.id,
            consumer,
        });

        return {
            producerId: producer.producer.id,
            id: consumer.id,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
        };
    }

    async resumeConsumerTransport(consumerId: string) {
        const consumer = this.room.consumers.get(consumerId);

        if (!consumer) throw new Error('Consumer not found');
        await consumer.consumer.resume();

        return true;
    }

    async getAllUserDetailsInRoom() {
        return Array.from(this.room.users.values()).map((user) => ({
            id: user.id,
            name: user.name,
            imgSrc: user.imgSrc,
        }));
    }

    async closeProducer(userId: string, producerId: string) {
        const userData = this.getUserOrThrow(userId);
        const producer = this.room.producers.get(producerId);

        if (!producer) throw new Error('Producer not found');

        producer.producer.close();
        userData.producersIds = userData.producersIds.filter((id) => id !== producerId);
        this.room.producers.delete(producerId);

        return {
            producerId: producer.producer.id,
            kind: producer.kind,
            userId,
        };
    }

    async leaveRoom(userId: string) {
        const userData = this.getUserOrThrow(userId);

        userData.consumersIds.forEach((id) => this.room.consumers.delete(id));
        userData.producersIds.forEach((id) => this.room.producers.delete(id));
        userData.transportIds.forEach((id) => this.room.transports.delete(id));
        this.room.users.delete(userId);

        return true;
    }

    onModuleDestroy() {
        this.worker?.close();
    }

    // Helper methods
    private getTransportOrThrow(transportId: string): TransportData {
        const transport = this.room.transports.get(transportId);
        if (!transport) throw new Error('Transport not found');
        return transport;
    }

    private getUserOrThrow(userId: string): UserData {
        const user = this.room.users.get(userId);
        if (!user) throw new Error('User not found');
        return user;
    }

    private getConsumerTransport(userData: UserData): TransportData | undefined {
        const transports = userData.transportIds
            .map((id) => this.room.transports.get(id))
            .filter((t) => t?.consumer);

        return transports[0];
    }
}

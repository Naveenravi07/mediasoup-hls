import { PlainTransport } from "mediasoup/node/lib/PlainTransportTypes";
import { MediaKind, RtpParameters } from "mediasoup/node/lib/rtpParametersTypes";

export type StreamData = {
    userId: string;
    kind: MediaKind,
    transport: PlainTransport,
    rtpParameters: RtpParameters,
    producerId: string,
    port: number,
    rtcpPort: number,   
};
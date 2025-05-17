import * as React from "react";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { connect_admission_socket } from "@/lib/socket";
import useAuth from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

type WaitingRoomModalProps = {
    open: boolean,
    onOpenChange: (open: boolean) => void,
    roomId: string
}

export function WaitingRoomModal({
    open = false,
    onOpenChange,
    roomId
}: WaitingRoomModalProps) {
    const [isMicOn, setIsMicOn] = React.useState(false);
    const [isVideoOn, setIsVideoOn] = React.useState(false);
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const [videoDevices, setVideoDevices] = React.useState<MediaDeviceInfo[]>([]);
    const [audioDevices, setAudioDevices] = React.useState<MediaDeviceInfo[]>([]);
    const [selectedVideoDeviceId, setSelectedVideoDeviceId] = React.useState<string | null>(null);
    const [selectedAudioDeviceId, setSelectedAudioDeviceId] = React.useState<string | null>(null);
    const { user } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    let adm_socket = connect_admission_socket({ roomId: roomId });

    React.useEffect(() => {
        localStorage.setItem('initialMediaState', JSON.stringify({
            video: isVideoOn,
            audio: isMicOn,
            videoDeviceId: selectedVideoDeviceId,
            audioDeviceId: selectedAudioDeviceId
        }));
    }, [isVideoOn, isMicOn, selectedVideoDeviceId, selectedAudioDeviceId]);


    const handleVideoToggle = async () => {
        if (isVideoOn) {
            if (videoRef.current && videoRef.current.srcObject) {
                (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
                videoRef.current.srcObject = null;
            }
        } else {
            if (selectedVideoDeviceId) {
                const constraints = { video: { deviceId: { exact: selectedVideoDeviceId } } };
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            }
        }
        setIsVideoOn(!isVideoOn);
    };

    const handleMicToggle = async () => {
        if (isMicOn) {
            if (videoRef.current && videoRef.current.srcObject) {
                (videoRef.current.srcObject as MediaStream).getAudioTracks().forEach(track => track.stop());
            }
        } else {
            if (selectedAudioDeviceId) {
                const constraints = { audio: { deviceId: { exact: selectedAudioDeviceId } } };
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                if (videoRef.current && videoRef.current.srcObject) {
                    stream.getAudioTracks().forEach(track => {
                        (videoRef.current!.srcObject as MediaStream).addTrack(track);
                    });
                }
            }
        }
        setIsMicOn(!isMicOn);
    };

    const handleConnect = async () => {
        if (!user) return;
        adm_socket.emit('initialize', (status: boolean) => {
            if (status == true) {
                adm_socket.emit("waitingAdd");
                navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then(() => {
                    navigator.mediaDevices.enumerateDevices().then((deviceList) => {
                        console.log(deviceList);
                        setVideoDevices(deviceList.filter((d) => d.kind === "videoinput" && d.deviceId != ""));
                        setAudioDevices(deviceList.filter((d) => d.kind === "audioinput" && d.deviceId != ""));
                    });
                });

            }
        });
    };

    const handleAdmissionApproval = async (data: string) => {
        if (data.toLowerCase() == "ok") {
            let str = localStorage.getItem('initialMediaState')
            if (str) {
                let data: any = JSON.parse(str)
                localStorage.setItem('initialMediaState', JSON.stringify({
                    video: data.video,
                    audio: data.audio
                }));
                console.log("PREPPING TO REDIRECT", localStorage.getItem('initialMediaState'));
            }
            router.push(`/meet/${roomId}`);
        }
    };

    const handleAdmissionRejected = async (data: string) => {
        if (data.toLowerCase() == "ok") {
            toast({
                title: "The creator rejected your join request",
                variant: "destructive"
            });
            router.push("/");
            onOpenChange(false);
        }
    };

    const onErrorMessage = async (err: string) => {
        toast({
            title: "Something went wrong",
            description: err,
            variant: "destructive"
        });
        onOpenChange(false);
    };

    const handleDisconnect = async () => {
        console.log("CLIENT DISCONNECTED");
        onOpenChange(false);
    };

    const handleCameraChange = async (deviceId: string) => {
        setSelectedVideoDeviceId(deviceId);
        if (isVideoOn) {
            const constraints = { video: { deviceId: { exact: deviceId } } };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        }
    };

    const handleMicrophoneChange = async (deviceId: string) => {
        setSelectedAudioDeviceId(deviceId);
        if (isMicOn) {
            const constraints = { audio: { deviceId: { exact: deviceId } } };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            if (videoRef.current && videoRef.current.srcObject) {
                (videoRef.current.srcObject as MediaStream).getAudioTracks().forEach(track => track.stop());
                stream.getAudioTracks().forEach(track => {
                    (videoRef.current!.srcObject as MediaStream).addTrack(track);
                });
            }
        }
    };


    React.useEffect(() => {
        if (!user) return;
        adm_socket.connect();
        adm_socket.on('connect', handleConnect);
        adm_socket.on('admission-approval', handleAdmissionApproval);
        adm_socket.on('admission-rejected', handleAdmissionRejected);
        adm_socket.on("error", onErrorMessage);
        adm_socket.on("disconnect", handleDisconnect);

        return (() => {
            adm_socket.off('connect', handleConnect);
            adm_socket.off('admission-approval', handleAdmissionApproval);
            adm_socket.off('admission-rejected', handleAdmissionRejected);
            adm_socket.off("error", onErrorMessage);
            adm_socket.off("disconnect", handleDisconnect);
            adm_socket.disconnect();
            adm_socket.close();
        });
    }, [user]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px] bg-black border-white/20">
                <DialogHeader>
                    <DialogTitle className="text-white">Waiting to accept admit request</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-6">
                    <div className="relative aspect-video bg-zinc-900 rounded-lg border border-white/20">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className={`w-full h-full object-cover rounded-lg ${!isVideoOn && 'hidden'}`}
                        />
                        {!isVideoOn && (
                            <div className="absolute inset-0 flex items-center justify-center text-white/50">
                                Camera Off
                            </div>
                        )}
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-10 w-10 rounded-full bg-zinc-900 border-white/20 hover:bg-zinc-800"
                                onClick={handleMicToggle}
                            >
                                {isMicOn ? <Mic className="h-4 w-4 text-white" /> : <MicOff className="h-4 w-4 text-red-500" />}
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-10 w-10 rounded-full bg-zinc-900 border-white/20 hover:bg-zinc-800"
                                onClick={handleVideoToggle}
                            >
                                {isVideoOn ? <Video className="h-4 w-4 text-white" /> : <VideoOff className="h-4 w-4 text-red-500" />}
                            </Button>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm text-white">Microphone Input</label>
                            <Select onValueChange={handleMicrophoneChange}>
                                <SelectTrigger className="w-full bg-zinc-900 border-white/20 text-white">
                                    <SelectValue placeholder="Select microphone" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-white/20">
                                    {audioDevices.map((device) => (
                                        <SelectItem key={device.deviceId} value={device.deviceId} style={{ color: '#fff' }}>
                                            {device.label || `Microphone ${audioDevices.indexOf(device) + 1}`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-white">Camera Input</label>
                            <Select onValueChange={handleCameraChange}>
                                <SelectTrigger className="w-full bg-zinc-900 border-white/20 text-white">
                                    <SelectValue placeholder="Select camera" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-white/20">
                                    {videoDevices.map((device) => (
                                        <SelectItem key={device.deviceId} value={device.deviceId} style={{ color: '#fff' }}>
                                            {device.label || `Camera ${videoDevices.indexOf(device) + 1}`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

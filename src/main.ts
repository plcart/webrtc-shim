const pc_config = {
    iceServers: [{
        urls: 'stun:stun.1.google.com:19302'
    }]
}

interface WebRTCShimPeerConnection extends RTCPeerConnection {
    createDataChannel(channel: string, constraint: any);
    ondatachannel: (this: RTCPeerConnection, ev: { channel: WebRTCShimDataChannel }) => any;
    onconnectionstatechange: (this: RTCPeerConnection, ev: any) => any;
    connectionState: string;
}

interface WebRTCShimDataChannel {
    onopen: (this: WebRTCShimDataChannel) => any;
    onclose: (this: WebRTCShimDataChannel) => any;
    onmessage: (this: WebRTCShimDataChannel, ev: any) => any;
    send(value: any);
    readyState: 'open' | string;
}

export class WebRTCShim {
    peerConnection: WebRTCShimPeerConnection;
    localStream: MediaStream;
    remoteStream: MediaStream;
    isStarted: boolean = false;
    dataChannel: WebRTCShimDataChannel;

    constructor(
        private messageCallbackFn: (message: RTCSessionDescriptionInit | any) => any,
        private dataChannelCallbackFn: (value: any) => any,
        private remoteStreamCallbackFn: (stream: MediaStream) => any,
        public pcConfig: RTCConfiguration = pc_config) {
        this.peerConnection = this.createPeerConnection(pc_config);
    }

    createPeerConnection(pcConfig = pc_config): WebRTCShimPeerConnection {
        let pc = new RTCPeerConnection(pc_config) as WebRTCShimPeerConnection;

        pc.onaddstream = event => {
            this.remoteStream = event.stream;
            this.remoteStreamCallbackFn(this.remoteStream);
        };

        pc.onremovestream = event => {
            this.remoteStream = null;
            this.remoteStreamCallbackFn(this.remoteStream);
        };

        pc.onicecandidate = event => {
            if (event.candidate) {
                this.messageCallbackFn({
                    type: 'candidate',
                    label: event.candidate.sdpMLineIndex,
                    id: event.candidate.sdpMid,
                    candidate: event.candidate.candidate
                });
            }
        };

        pc.ondatachannel = event => {
            this.dataChannel = event.channel;
            this.configDataChannel();
        }

        pc.oniceconnectionstatechange = e => {
            if (this.peerConnection && this.peerConnection.connectionState == 'disconnected') {
                this.hangup();
            }
        }

        return pc as WebRTCShimPeerConnection;
    }

    addLocalStream(stream: MediaStream): void {
        this.localStream = stream;
        if (!this.peerConnection)
            this.peerConnection = this.createPeerConnection();
        this.peerConnection.addStream(stream);
    }

    setLocalAndSendMessage(sessionDescription: RTCSessionDescriptionInit): void {
        this.isStarted = true;
        this.peerConnection.setLocalDescription(sessionDescription);
        this.messageCallbackFn(sessionDescription);
    }

    doCall(): void {
        this.dataChannel = this.peerConnection.createDataChannel('data', null);
        this.configDataChannel();
        this.peerConnection.createOffer().then((description) => {
            this.setLocalAndSendMessage(description);
        }).catch(err => console.log(err));
    }

    doAnswer(): void {
        this.peerConnection.createAnswer().then((description) => {
            this.setLocalAndSendMessage(description);
        }).catch(err => console.log(err));
    }

    configDataChannel() {
        if (this.dataChannel) {
            this.dataChannel.onopen = () => { };
            this.dataChannel.onclose = () => { };
            this.dataChannel.onmessage = value => {
                this.dataChannelCallbackFn(value);
            };
        }
    }

    send(value: any) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(value);
        }
    }

    stop(): void {
        this.isStarted = false;
        if (this.peerConnection) {
            this.peerConnection.close();
        }
        this.peerConnection = null;
        this.dataChannel = null;
    }

    hangup(): void {
        this.stop();
        this.messageCallbackFn({
            type: 'bye'
        });
    }

    onMessage(message): void {
        if (!this.peerConnection)
            this.peerConnection = this.createPeerConnection();
        switch (message.type) {
            case 'offer':
                this.peerConnection.setRemoteDescription(new RTCSessionDescription(message));
                this.doAnswer();
                break;
            case 'answer':
                this.peerConnection.setRemoteDescription(new RTCSessionDescription(message));
                break;
            case 'candidate':
                const candidate = new RTCIceCandidate({
                    sdpMLineIndex: message.label,
                    candidate: message.candidate
                });
                this.peerConnection.addIceCandidate(candidate);
                break;
            case 'bye':
                this.stop();
                break;
        }
    }

}

window['WebRTCShim'] = WebRTCShim;
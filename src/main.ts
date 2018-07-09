const pc_config = {
    iceServers: [{
        urls: 'stun:stun.1.google.com:19302'
    }]
}

export class WebRTCShim {
    peerConnection: RTCPeerConnection;
    localStream: MediaStream;
    remoteStream: MediaStream;
    isStarted: boolean = false;

    constructor(
        private messageCallbackFn: (message: RTCSessionDescriptionInit | any) => void,
        private remoteStreamCallbackFn: (stream: MediaStream) => void,
        public pcConfig: RTCConfiguration = pc_config) {
        this.peerConnection = this.createPeerConnection(pc_config);

    }

    createPeerConnection(pcConfig = pc_config): RTCPeerConnection {
        let pc = new RTCPeerConnection(pc_config);

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

        return pc;
    }

    addLocalStream(stream: MediaStream): void {
        this.localStream = stream;
        this.peerConnection.addStream(stream);
    }

    setLocalAndSendMessage(sessionDescription: RTCSessionDescriptionInit): void {
        this.isStarted = true;
        this.peerConnection.setLocalDescription(sessionDescription);
        this.messageCallbackFn(sessionDescription);
    }

    doCall(): void {
        this.peerConnection.createOffer().then((description) => {
            this.setLocalAndSendMessage(description);
        }).catch(err => console.log(err));
    }

    doAnswer(): void {
        this.peerConnection.createAnswer().then((description) => {
            this.setLocalAndSendMessage(description);
        }).catch(err => console.log(err));
    }

    stop(): void {
        this.isStarted = false;
        if (this.peerConnection) {
            this.peerConnection.close();
        }
        this.peerConnection = null;
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
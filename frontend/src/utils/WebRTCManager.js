
import { io } from 'socket.io-client';

const STUN_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};

export class WebRTCManager {
    constructor(signalingUrl, onStatusChange, onRemoteStream, onMessage) {
        this.socket = io(signalingUrl);
        this.peerConnection = null;
        this.dataChannel = null;
        this.localStream = null;
        this.onStatusChange = onStatusChange || (() => { });
        this.onRemoteStream = onRemoteStream || (() => { });
        this.onMessage = onMessage || (() => { });
        this.role = null;
        this.targetId = null;

        this.setupSocketListeners();
    }

    setupSocketListeners() {
        this.socket.on('connect', () => {
            console.log('Connected to signaling server');
            this.onStatusChange('CONNECTED_TO_SERVER');
        });

        this.socket.on('session-created', (id) => {
            this.onStatusChange('SESSION_CREATED', id);
        });

        this.socket.on('session-joined', (id) => {
            this.onStatusChange('SESSION_JOINED', id);
        });

        this.socket.on('client-ready', (clientId) => {
            console.log("Client ready, initiating call to", clientId);
            this.targetId = clientId;
            this.startCall();
        });

        this.socket.on('offer', async ({ sender, payload }) => {
            // If I am client, I receive offer from Host
            if (this.role === 'client') {
                this.targetId = sender; // Store host ID to reply
                await this.handleOffer(payload);
            }
        });

        this.socket.on('answer', async ({ sender, payload }) => {
            await this.handleAnswer(payload);
        });

        this.socket.on('ice-candidate', async ({ sender, candidate }) => {
            await this.handleCandidate(candidate);
        });

        this.socket.on('error', (msg) => {
            console.error("Socket Error:", msg);
            alert(msg);
            this.onStatusChange('ERROR', msg);
        });
    }

    // --- Host Functions ---
    startHosting(id) {
        this.role = 'host';
        this.socket.emit('create-session', id);
    }

    async startCall() {
        this.createPeerConnection();

        try {
            // Capture Screen
            this.localStream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: "always" },
                audio: false
            });
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });
        } catch (err) {
            console.error("Error accessing display media:", err);
            return;
        }

        // Create Data Channel
        this.dataChannel = this.peerConnection.createDataChannel("control");
        this.setupDataChannel(this.dataChannel);

        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);

        this.socket.emit('offer', { target: this.targetId, payload: offer });
    }

    // --- Client Functions ---
    joinSession(id) {
        this.role = 'client';
        this.socket.emit('join-session', id);
    }

    // --- Common WebRTC ---
    createPeerConnection() {
        if (this.peerConnection) return;

        this.peerConnection = new RTCPeerConnection(STUN_SERVERS);

        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate && this.targetId) {
                this.socket.emit('ice-candidate', { target: this.targetId, candidate: event.candidate });
            }
        };

        this.peerConnection.ontrack = (event) => {
            if (event.streams && event.streams[0]) {
                this.onRemoteStream(event.streams[0]);
            }
        };

        this.peerConnection.ondatachannel = (event) => {
            this.setupDataChannel(event.channel);
        };
    }

    setupDataChannel(channel) {
        this.dataChannel = channel;
        this.dataChannel.onopen = () => {
            console.log("Data Channel Open");
            // this.onStatusChange('DATA_CHANNEL_OPEN');
        };
        this.dataChannel.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                this.onMessage(msg);
            } catch (e) { console.error("Invalid msg", event.data); }
        };
    }

    async handleOffer(offer) {
        this.createPeerConnection();
        await this.peerConnection.setRemoteDescription(offer);

        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        this.socket.emit('answer', { target: this.targetId, payload: answer });
    }

    async handleAnswer(answer) {
        if (this.peerConnection) {
            await this.peerConnection.setRemoteDescription(answer);
        }
    }

    async handleCandidate(candidate) {
        if (this.peerConnection) {
            try {
                await this.peerConnection.addIceCandidate(candidate);
            } catch (e) { console.error("Error adding candidate", e); }
        }
    }

    sendMessage(data) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify(data));
        }
    }

    disconnect() {
        if (this.peerConnection) this.peerConnection.close();
        if (this.socket) this.socket.disconnect();
    }
}

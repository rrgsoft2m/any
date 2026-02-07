import { Peer } from 'peerjs';

export class WebRTCManager {
    constructor(onStatusChange, onRemoteStream, onMessage) {
        this.peer = null;
        this.conn = null;
        this.call = null;
        this.localStream = null;

        this.onStatusChange = onStatusChange || (() => { });
        this.onRemoteStream = onRemoteStream || (() => { });
        this.onMessage = onMessage || (() => { });

        this.role = null;
    }

    // --- Host Functions ---
    async startHosting() {
        this.role = 'host';
        this.onStatusChange('Creating ID...');

        // Create a new Peer with a random ID
        this.peer = new Peer({
            debug: 2
        });

        this.peer.on('open', (id) => {
            console.log('My peer ID is: ' + id);
            this.onStatusChange('SESSION_CREATED', id);
        });

        this.peer.on('connection', (conn) => {
            console.log('Incoming connection from client');
            this.handleDataConnection(conn);
        });

        this.peer.on('call', (call) => {
            // Host usually sends stream, doesn't receive call, but good to handle
            console.log("Host received call?");
        });

        this.peer.on('error', (err) => {
            console.error(err);
            this.onStatusChange('ERROR', err.type);
        });
    }

    async initiateCall(remotePeerId) {
        // Host calls the client to share screen
        try {
            this.localStream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: "always" },
                audio: false
            });

            const call = this.peer.call(remotePeerId, this.localStream);
            this.call = call;

            call.on('stream', (remoteStream) => {
                // Host doesn't usually view client stream, but possible
            });

            call.on('close', () => {
                this.stopSharing();
            });

            // Allow user to stop sharing via browser UI
            this.localStream.getVideoTracks()[0].onended = () => {
                this.stopSharing();
            };

        } catch (err) {
            console.error("Failed to get display media", err);
            this.onStatusChange('ERROR', 'Screen share denied');
        }
    }

    stopSharing() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        if (this.call) {
            this.call.close();
            this.call = null;
        }
        this.onStatusChange('SESSION_ENDED');
    }

    // --- Client Functions ---
    joinSession(hostId) {
        this.role = 'client';
        this.onStatusChange('Connecting...');

        this.peer = new Peer({
            debug: 2
        });

        this.peer.on('open', () => {
            // Connect to host data channel
            const conn = this.peer.connect(hostId);
            this.handleDataConnection(conn);
        });

        // Wait for Host to call us with the stream
        this.peer.on('call', (call) => {
            console.log("Received call (screen share) from host");
            call.answer(); // Answer without stream (receive only)

            call.on('stream', (remoteStream) => {
                console.log("Received remote stream");
                this.onRemoteStream(remoteStream);
                this.onStatusChange('SESSION_JOINED', hostId);
            });
        });

        this.peer.on('error', (err) => {
            console.error(err);
            this.onStatusChange('ERROR', "Ulanishda xatolik: " + err.type);
        });
    }

    // --- Common ---
    handleDataConnection(conn) {
        this.conn = conn;

        conn.on('open', () => {
            console.log("Data connection open");
            if (this.role === 'host') {
                // If host, we are ready, maybe wait for explicit command or just start?
                // Let's autosend the stream call to this peer
                this.initiateCall(conn.peer);
            }
        });

        conn.on('data', (data) => {
            // Handle mouse/keyboard events
            if (typeof data === 'object') {
                this.onMessage(data);
            }
        });

        conn.on('close', () => {
            console.log("Connection closed");
            this.onStatusChange('SESSION_ENDED');
        });

        conn.on('error', (err) => console.error("Conn error", err));
    }

    sendMessage(data) {
        if (this.conn && this.conn.open) {
            this.conn.send(data);
        }
    }

    disconnect() {
        this.stopSharing();
        if (this.conn) this.conn.close();
        if (this.peer) this.peer.destroy();
    }
}

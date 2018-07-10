/* jshint undef: true, unused: false, esversion: 6 */
/* globals io */
(function (window) {

    /** DOM */
    const btnJoin = document.querySelector('#btnJoin');
    const txtAlias = document.querySelector('#alias');
    const userOverlay = document.querySelector('.overlay');
    const ulOnlineUsers = document.querySelector('ul.online-users');
    const localVideo = document.querySelector('#localVideo');
    const remoteVideo = document.querySelector('#remoteVideo');
    const localVideoContainer = document.querySelector('.local-video-container');

    /** WebRTC Variables */
    const socket = io.connect('http://vctalksocket-env.u5facjqxpk.eu-west-2.elasticbeanstalk.com');
    const RTCClient = new window.WebRTCShim(message => {
        socket.emit('rtcmessage', message);
    }, remoteStream => {
        remoteVideo.srcObject = remoteStream;
    });
    const state = {
        alias: null,
        isAvailable: true,
        peerId: null,
        room: null,
        isInitiator: false
    };

    /** Event Handlers */
    btnJoin.onclick = () => {
        if (txtAlias.value) {
            state.alias = txtAlias.value;
            socket.emit('join', state.alias);
            userOverlay.classList.add('hide');
        }
    };

    const btnCall_onClick = (e) => {
        if (state.isAvailable) {
            const userId = e.srcElement.getAttribute('data-id');
            navigator.mediaDevices.getUserMedia({
                audio: true,
                video: true
            }).then(stream => {
                localVideo.srcObject = stream;
                RTCClient.addLocalStream(stream);
                state.peerId = userId;
                state.isAvailable = false;
                state.isInitiator = true;
                socket.emit('call', state.peerId);
            });
        }
    };

    /** Socket Listeners */
    socket.on('ping', () => socket.emit('pong'));

    socket.on('online', data => {
        ulOnlineUsers.innerHTML = data.reduce((previous, current) =>
            previous + `<li class="online-user"><div class="user-avatar">${current.alias.substring(0,1).toUpperCase()}</div><div class="user-alias">${current.alias}</div><div data-id="${current.id}" class="user-action">Call</div></li>`, '');
        const btnCall = document.querySelectorAll('.user-action');
        btnCall.forEach(x => x.onclick = btnCall_onClick);
    });

    socket.on('rtcmessage', message => {
        RTCClient.onMessage(message);
    });

    socket.on('created', room => {
        state.room = room;
        state.isInitiator = true;
    });

    socket.on('ready', () => {
        if (state.isInitiator) {
            RTCClient.doCall();
            localVideoContainer.classList.add('on-call');
        }
    });
  
})(window);
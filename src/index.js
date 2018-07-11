/* jshint undef: true, unused: false, esversion: 6 */

(function (window) {

    /** DOM */
    const btnMakeOffer = document.querySelector('#btnMakeOffer');
    const btnSendData = document.querySelector('#btnSendData ');
    const localStream = document.querySelector('#localStream');
    const remoteStream = document.querySelector('#remoteStream');

    /** WebRTCShim constants */
    const rtcLeftClient = new window.WebRTCShim(
        rtcMessage => {
            /** here is the callback function of any offer, anwer or candidate
             * you could easily send to you socket structure like
             * socket.emit('rtcmessage', rtcmessage);
             * here we gonna pass to the other peer directly
             * */
            rtcRightClient.onMessage(rtcMessage);
        },
        dataChannel => {
            /** here is your data channel callback */
            console.log(dataChannel.data);
            localStream.classList.add('add-some-video-style');
        },
        stream => {
            /** Here is where you gonna receive the other peer stream 
             * nothing to do here in this example
             */
        });

    /** Same goes for the other client */
    const rtcRightClient = new window.WebRTCShim(
        rtcMessage => {
            /** just fowarding the message */
            rtcLeftClient.onMessage(rtcMessage);
        },
        dataChannel => {

        },
        stream => {
            /** gonna add your stream to my HTMLVideoElement */
            remoteStream.srcObject = stream;
        });

    /** Events */
    btnMakeOffer.onclick = event => {
        const divLeft = document.querySelector('#divLeft');
        const divRight = document.querySelector('#divRight');
        divLeft.classList.add('bg-light');
        divLeft.classList.remove('bg-info');
        divRight.classList.remove('bg-light');
        divRight.classList.add('bg-info');
        btnMakeOffer.disabled = true;
        /** Send an offer to the other peer */
        rtcLeftClient.doCall();
        btnSendData.disabled = false;
    };

    btnSendData.onclick = event => {
        /** Data Channel is created, you can send whatever you want */
        rtcRightClient.send('hey can you add some style to your video?');
    };

    /** grab your user media */
    navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
    }).then(stream => {
        localStream.srcObject = stream;
        /** Add your stream, soon you do the offer RTC gonna put your audio and video as ICE candidates */
        rtcLeftClient.addLocalStream(stream);
    });

})(window);
const connectButton = document.getElementById('connect-button');
const room_id = document.location.pathname.split('/').pop();
const statusIndicator = document.createElement('div');
const roomIdSpan = document.getElementById('room-id');
const userID = Math.random().toString(36).slice(2);

const muteButton = document.createElement('button');
muteButton.textContent = 'Unmute';
muteButton.style.position = 'absolute';
muteButton.style.top = '64px';
muteButton.style.left = '10px';
document.body.appendChild(muteButton);

let muted = true;
let audioContext;
let source;
let mediaStream;
let processor;
let new_websocket;

const connectedUsers = document.createElement('div');
connectedUsers.style.position = 'absolute';
connectedUsers.style.top = '44px';
connectedUsers.style.left = '10px';
document.body.appendChild(connectedUsers);


const recconectable_websocket = () => {
  new_websocket = new WebSocket(`wss://ws.nichind.dev/ws/${room_id}`);

  new_websocket.addEventListener('open', handleOpen);
  new_websocket.addEventListener('message', handleMessage);
  new_websocket.addEventListener('error', handleError);
  new_websocket.addEventListener('close', handleClose);

  navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 48000, channelCount: 2 } })
    .then(stream => {
      mediaStream = stream;
      audioContext = new AudioContext({ sampleRate: 48000 });
      source = audioContext.createMediaStreamSource(stream);
      processor = audioContext.createScriptProcessor(1024, 2, 2);
      source.connect(processor);
      processor.connect(audioContext.destination);

      processor.onaudioprocess = event => {
        setTimeout(() => {
            const left = event.inputBuffer.getChannelData(0);
            const right = event.inputBuffer.getChannelData(1);
    
            if (!muted && new_websocket.readyState === WebSocket.OPEN) {
              new_websocket.send(JSON.stringify({
                type: 'audio',
                data: { left, right },
              }));
            }
        }, 200)
      };
    })
    .catch(error => {
      console.error('Error getting user media:', error);
    });
};

muteButton.addEventListener('click', () => {
    muted = !muted;
    if (muted) {
      muteButton.textContent = 'Unmute';
    //   gainNode.gain.value = 0;
    } else {
      muteButton.textContent = 'Mute';
    //   gainNode.gain.value = 0.5;
    }
});

const handleOpen = () => {
  statusIndicator.textContent = 'Connected';
  statusIndicator.style.background = '#4CAF50';
};


const handleMessage = event => {
    const message = JSON.parse(event.data);
  
    if (message.type === 'users') {
      connectedUsers.textContent = `Connected users: ${message.data.length}`;
    }

    if (message.type === 'audio') {
        const audioData = message.data;
        const leftData = new Float32Array(Object.values(audioData.left));
        const rightData = new Float32Array(Object.values(audioData.right));
    
        const audioContext = new AudioContext({ sampleRate: 48000 });
        const source = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 1.5;
    
        const leftBuffer = audioContext.createBuffer(2, 2048, audioContext.sampleRate);
        const leftChannelData = leftBuffer.getChannelData(0);
        const rightChannelData = leftBuffer.getChannelData(1);
    
        leftChannelData.set(leftData);
        rightChannelData.set(rightData);
    
        source.buffer = leftBuffer;
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        source.start();
    
        // console.log('Received and played audio:', audioData);
    }
};

const handleError = event => {
  statusIndicator.textContent = 'Error';
  statusIndicator.style.background = '#F44336';
};

const handleClose = event => {
  statusIndicator.textContent = 'Disconnected';
  statusIndicator.style.background = '#F44336';
  setTimeout(recconectable_websocket, 1000);

  new_websocket.removeEventListener('message');
  new_websocket.removeEventListener('error');
  new_websocket.removeEventListener('close');

  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
  if (source) {
    source.stop();
    source = null;
  }
};

recconectable_websocket();

statusIndicator.style.position = 'absolute';
statusIndicator.style.top = '10px';
statusIndicator.style.right = '10px';
statusIndicator.style.padding = '5px';
statusIndicator.style.border = '1px solid #ccc';
statusIndicator.style.borderRadius = '5px';
statusIndicator.style.background = '#ccc';
document.body.appendChild(statusIndicator);
roomIdSpan.textContent = room_id;
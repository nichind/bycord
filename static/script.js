const connectButton = document.getElementById('connect-button');
const room_id = document.location.pathname.split('/').pop();
const statusIndicator = document.createElement('div');
const roomIdSpan = document.getElementById('room-id');
const userID = Math.random().toString(36).slice(2);
const muteButton = document.getElementById('mute-button');


let muted = true;
let audioContext;
let source;
let mediaStream;
let processor;
let new_websocket;


const reconnectable_websocket = () => {
  new_websocket = new WebSocket(`wss://ws.nichind.dev/ws/${room_id}`);

  new_websocket.addEventListener('open', handleOpen);
  new_websocket.addEventListener('message', handleMessage);
  new_websocket.addEventListener('error', handleError);
  new_websocket.addEventListener('close', handleClose);

  navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 44100, channelCount: 2 } })
    .then(stream => {
      mediaStream = stream;
      audioContext = new AudioContext({ sampleRate: 44100 });
      source = audioContext.createMediaStreamSource(stream);
      processor = audioContext.createScriptProcessor(512, 2, 2);
      source.connect(processor);
      processor.connect(audioContext.destination);

      let lastProcess = performance.now();
      processor.onaudioprocess = event => {
        const now = performance.now();
        if (now - lastProcess > 500) {
          lastProcess = now;

          const left = event.inputBuffer.getChannelData(0);
          const right = event.inputBuffer.getChannelData(1);

          if (!muted && new_websocket.readyState === WebSocket.OPEN) {
            new_websocket.send(JSON.stringify({
              type: 'audio',
              data: { left, right },
            }));
          }
        }
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
    } else {
      muteButton.textContent = 'Mute';
    }
});

const handleOpen = () => {
  statusIndicator.textContent = 'Connected';
  statusIndicator.style.background = '#4CAF50';
};


const handleMessage = event => {
    const message = JSON.parse(event.data);
  
    if (message.type === 'audio') {
      const audioData = message.data;
      const leftData = new Float32Array(Object.values(audioData.left));
      const rightData = new Float32Array(Object.values(audioData.right));
  
      const leftBuffer = audioContext.createBuffer(1, leftData.length, audioContext.sampleRate);
      const leftChannelData = leftBuffer.getChannelData(0);
      leftChannelData.set(leftData);
  
      const rightBuffer = audioContext.createBuffer(1, rightData.length, audioContext.sampleRate);
      const rightChannelData = rightBuffer.getChannelData(0);
      rightChannelData.set(rightData);
  
      const source = audioContext.createBufferSource();
      source.buffer = leftBuffer;
      source.connect(audioContext.destination);
      source.start();
  
      const source2 = audioContext.createBufferSource();
      source2.buffer = rightBuffer;
      source2.connect(audioContext.destination);
      source2.start();
  
      console.log('Received and played audio:', audioData);
    }
}; 

const handleError = event => {
  statusIndicator.textContent = 'Error';
  statusIndicator.style.background = '#F44336';
};

const handleClose = event => {
  statusIndicator.textContent = 'Disconnected';
  statusIndicator.style.background = '#F44336';
  setTimeout(reconnectable_websocket, 1000);
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
  new_websocket.removeEventListener('message');
  new_websocket.removeEventListener('error');
  new_websocket.removeEventListener('close');
  if (source) {
    source.stop();
    source = null;
  }
};

reconnectable_websocket();

statusIndicator.style.position = 'absolute';
statusIndicator.style.top = '10px';
statusIndicator.style.right = '10px';
statusIndicator.style.padding = '5px';
statusIndicator.style.border = '1px solid #ccc';
statusIndicator.style.borderRadius = '5px';
statusIndicator.style.background = '#ccc';
document.body.appendChild(statusIndicator);
roomIdSpan.textContent = room_id;
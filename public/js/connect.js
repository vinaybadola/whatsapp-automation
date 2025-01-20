const socket = io('http://localhost:8000');

socket.on('connect', () => {
  console.log('Connected to WebSocket server with socket ID:', socket.id);
});

let sessionId;

document.getElementById('send-message').disabled = true;

document.getElementById('start-session').addEventListener('click', () => {
  console.log('Starting session with ID:', socket.id);
  if(localStorage.getItem('sessionId')){
    sessionId = localStorage.getItem('sessionId');
  }
  else{
    sessionId = socket.id;
    localStorage.setItem('sessionId', sessionId);
  }

  // sessionId = Number("reignahBxcMCHD8aAAAD");
  // set into localstorage
  fetch('/api/device/connect/startSession', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  })
    .then((response) => response.json())
    .then((data) => {
      console.log(data.message);
      document.getElementById('start-session').disabled = true;
      document.getElementById('send-message').disabled = false;
    })
    .catch((error) => console.error(error));
});

socket.on('qr-code', (qr) => {
  console.log('Received QR Code:', qr);  
  document.getElementById('qr-code').textContent = qr;
});

socket.on('connected', (message) => {
  document.getElementById('status').textContent = message;
});

document.getElementById('send-message').addEventListener('click', () => {
  // Ensure sessionId is set
  if (!sessionId) {
    console.error('Session not started. Please start the session first.');
    document.getElementById('status').textContent = 'Please start the session first.';
    return;
  }

  const phoneNumber = document.getElementById('phone-number').value;
  const message = document.getElementById('message').value;

  // Validate input
  if (!phoneNumber || !message) {
    console.error('Phone number or message is missing.');
    document.getElementById('status').textContent = 'Please enter both phone number and message.';
    return;
  }
  const deptType = "67823f62488dc80b1dd316ee";
  fetch('/api/device/connect/send-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, phoneNumber, message, deptType }),
  })
    .then((response) => response.json())
    .then((data) => {
      console.log('data resp..', data.message);
      document.getElementById('status').textContent = data.message;
    })
    .catch((error) => {
      console.error(error);
      document.getElementById('status').textContent = 'Failed to send message.';
    });
});

document.getElementById('logout').addEventListener('click', () => {
  const sessionId = localStorage.getItem('sessionId');
  
  if(sessionId){
    localStorage.removeItem('sessionId');
    socket.emit('logout', { sessionId });
    localStorage.removeItem('sessionId');
    document.getElementById('qr-code').textContent = '';
    document.getElementById('status').textContent = 'Logged out. Please scan the QR code to reconnect.';    
  }
  
});

socket.on('logout-success', () => {
  console.log('Logged out successfully.');
  document.getElementById('start-session').disabled = false;
  document.getElementById('send-message').disabled = true;
  document.getElementById('status').textContent = 'Logged out. Please scan the QR code to reconnect.';
  location.reload();
});


document.getElementById('fetch-groups').addEventListener('click', () => {
  const sessionId = localStorage.getItem('sessionId');
  if(!sessionId){
    console.error('Session not started. Please start the session first.');
    document.getElementById('status').textContent = 'Please start the session first.';
    return;
  }
  fetch('/api/device/connect/fetch-groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  })
  .then((response) => response.json())
  .then((data) => {
    const groupsDiv = document.getElementById('groups');
    groupsDiv.innerHTML = '';
    data.groups.forEach((group) => {
      const groupElement = document.createElement('div');
      groupElement.textContent = `${group.name} (${group.id})`;
      groupsDiv.appendChild(groupElement);
    });
  })
  .catch((error) => console.error(error));
});

socket.on('disconnected', () => {
  document.getElementById('status').textContent = 'Disconnected. Please scan the QR code again.';
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  document.getElementById('status').textContent = 'Connection error. Please scan the QR code again.';
});

socket.on('connect_timeout', () => {
  console.error('Connection timeout.');
  // calls the backend to generate new qr 
  document.getElementById('status').textContent = 'Connection timeout. Please scan the QR code again.';
});

socket.on('connected', (message) => {
  document.getElementById('status').textContent = message;
  document.getElementById('qr-code').style.display = 'none';
  document.getElementById('profileContainer').style.display = 'block';
});

socket.on('disconnected', () => {
  document.getElementById('status').textContent = 'Disconnected. Please scan the QR code again.';
  document.getElementById('qr-code').style.display = 'block';
  document.getElementById('profileContainer').style.display = 'none';
});
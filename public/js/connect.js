const socket = io('http://localhost:8000');

// Check if a session is already active on page load
const sessionId = localStorage.getItem('sessionId');
const isConnected = localStorage.getItem('isConnected');

if (isConnected && sessionId) {
  // User is already connected
  document.getElementById('start-session').disabled = true;
  document.getElementById('send-message').disabled = false;
  document.getElementById('qr-code').style.display = 'none';
  document.getElementById('status').textContent = 'You are connected!';
  document.getElementById('profileContainer').style.display = 'block';
} else {
  // User is not connected
  document.getElementById('start-session').disabled = false;
  document.getElementById('send-message').disabled = true;
  document.getElementById('qr-code').style.display = 'block';
  document.getElementById('status').textContent = 'Please start a session.';
}

socket.on('connect', () => {
  console.log('Connected to WebSocket server with socket ID:', socket.id);
  document.getElementById('status').textContent = " ";
});

document.getElementById('start-session').addEventListener('click', () => {
  console.log('Starting session with ID:', socket.id);
  let sessionId = localStorage.getItem('sessionId') || socket.id;
  localStorage.setItem('sessionId', sessionId);

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
      localStorage.setItem('isConnected', 'true'); // Mark session as connected
    })
    .catch((error) => console.error(error));
});

socket.on('qr-code', (qr) => {
  document.getElementById('qr-code').textContent = qr;
});

document.getElementById('send-message').addEventListener('click', () => {
  const sessionId = localStorage.getItem('sessionId');
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

socket.on('connected', (message) => {
  document.getElementById('status').textContent = message;
  document.getElementById('qr-code').style.display = 'none';
  document.getElementById('profileContainer').style.display = 'block';
  localStorage.setItem('isConnected', 'true'); // Mark session as connected
});

socket.on('logout-success', () => {
  console.log('Logged out successfully.');
  document.getElementById('start-session').disabled = false;
  document.getElementById('send-message').disabled = true;
  localStorage.removeItem('sessionId');
  localStorage.removeItem('isConnected'); // Clear connection state
  document.getElementById('status').textContent = 'Logged out. Please scan the QR code to reconnect.';
  location.reload();
});

document.getElementById('logout').addEventListener('click', () => {
  console.log('logging out...');
  const sessionId = localStorage.getItem('sessionId');
  if(!sessionId){
    console.log('No session ID found in local storage.');
    return;
  }

  fetch('/api/device/connect/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  })

  .then((response) => response.json())
  .then((data) => {
    console.log(data.message);
    document.getElementById('start-session').disabled = false;
    document.getElementById('send-message').disabled = true;
    localStorage.removeItem('sessionId');
    localStorage.removeItem('isConnected'); // Clear connection state
    document.getElementById('status').textContent = 'Logged out. Please scan the QR code to reconnect.';
    location.reload();
  })
  .catch((error) => {
    console.error('Error during logout:', error);
  });  
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

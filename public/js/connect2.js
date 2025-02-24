// Adjust this base URL as needed (or inject via server-side templating)
const API_BASE_URL = "http://localhost:8000"; 

const socket = io(API_BASE_URL);

// DOM elements
const startSessionBtn = document.getElementById("start-session");
const statusDiv = document.getElementById("status");
const connectedMsg = document.getElementById("connected-message");
const qrCodeDiv = document.getElementById("qr-code"); // Added missing element

// When "Start Session" button is clicked
startSessionBtn.addEventListener("click", async () => {
  // Disable the button to prevent duplicate requests
  startSessionBtn.disabled = true;
  statusDiv.textContent = "Starting session, please wait...";

  try {
    // Get a session ID from socket.io (or generate your own)
    const sessionId = socket.id;
    // Use a fixed role for testing, e.g., "HR-Department"
    const devicePhone = "8417900754"; // Replace with actual if needed

    const response = await fetch(`${API_BASE_URL}/api/external/connect-external-device`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, role: "HR-Department", devicePhone }),
      credentials: "include"
    });
    
    const data = await response.json();
    
    if (data.success) {
      statusDiv.textContent = "Session started. Please scan the QR code below with your authenticator app.";
      // Show the QR code (data.qrCode should contain the QR code string or data URL)
      qrCodeDiv.textContent = data.qrCode || "QR code not available.";
      qrCodeDiv.style.display = "block";
      
      // Optionally, listen for a socket event that confirms connection
      socket.on("connected", (message) => {
        statusDiv.textContent = message;
        qrCodeDiv.style.display = "none";
        connectedMsg.style.display = "block";
      });
    } else {
      statusDiv.textContent = `Error: ${data.error || data.message}`;
      startSessionBtn.disabled = false;
    }
  } catch (error) {
    console.error("Error starting session:", error);
    statusDiv.textContent = "Failed to start session.";
    startSessionBtn.disabled = false;
  }
});

socket.on('qr-code', (qr) => {
  // Update the QR code element if a new QR code is received from the server
  qrCodeDiv.textContent = qr;
});

// Declare globals at the very top of the script so they exist everywhere
let sharepointUrlBuild = '';
let channelName = '';
let channelId = '';

// Chat context variables
let currentAgentName = '';
let currentModel = '';
let currentSharepointUrl = '';
let currentChannelName = '';
let currentChannelId = '';

document.addEventListener('DOMContentLoaded', function () {
  // Initialize Microsoft Teams SDK
  microsoftTeams.app
    .initialize()
    .then(() => microsoftTeams.app.getContext())
    .then((context) => {
      console.log('Teams Context:', JSON.stringify(context, null, 2));

      const teamName = context.team?.displayName || 'Not available';
      channelId = context.channel?.id || 'Not available';
      channelName = context.channel?.displayName || 'Not available';
      const channelType = context.channel?.membershipType || 'Unknown';

      // Build SharePoint URL
      if (
        teamName !== 'Not available' &&
        channelName !== 'Not available' &&
        context.sharePointSite?.teamSiteUrl
      ) {
        if (channelType === 'Private') {
          sharepointUrlBuild = `${context.sharePointSite.teamSiteUrl}/Shared%20Documents`;
        } else {
          const encodedChannelName = encodeURIComponent(channelName);
          sharepointUrlBuild = `${context.sharePointSite.teamSiteUrl}/Shared%20Documents/${encodedChannelName}`;
        }
      } else {
        sharepointUrlBuild = '';
        console.warn('Cannot generate URL - missing team or channel name.');
      }

      console.log('Initialized SharePoint URL:', sharepointUrlBuild);

      // Optional: Show the URL somewhere if you uncomment the label in HTML
      // const sharepointLabel = document.getElementById('sharepointUrl');
      // if (sharepointLabel) {
      //   sharepointLabel.textContent = sharepointUrlBuild || 'N/A';
      // }

      showNotification('✅ App initialized successfully!');
    })
    .catch((error) => {
      console.error('Error initializing Teams SDK:', error);
      showNotification(`❌ Failed to initialize Teams SDK: ${error.message}`, true);
    });

  // Button logic
  const createAgentBtn = document.getElementById('createAgentBtn');
  createAgentBtn.addEventListener('click', createAgent);

  createAgentBtn.addEventListener('mouseenter', function () {
    this.style.transform = 'translateY(-2px)';
    this.style.boxShadow = '0 6px 16px rgba(121, 80, 242, 0.2)';
  });

  createAgentBtn.addEventListener('mouseleave', function () {
    this.style.transform = 'translateY(0)';
    this.style.boxShadow = 'none';
  });

  // If you have a login button you want to hide:
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
    loginBtn.style.display = 'none';
  }
});

//New Status Code

// Your Logic App flow URL
const flowUrl = 'https://prod-66.westus.logic.azure.com:443/workflows/ae73ec5a5772423cb733a1860271241c/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=MC48I55t5lRY9EewVtiHSxwcDsRwUGVArQbWrVZjYGU'; // Replace with your actual URL

// Handle Create Agent button click
document.getElementById('createAgentBtn').addEventListener('click', async function () {
  // Get form values
  const agentName = document.getElementById('agentName').value.trim();
  const model = document.getElementById('modelSelect').value;
  const sharepointUrl = document.getElementById('sharepointUrl').value.trim();
  const channelName = document.getElementById('channelName').value.trim();
  const channelId = document.getElementById('channelId').value.trim();

  if (!agentName) {
    alert('Please enter an agent name.');
    return;
  }

  // Disable the button to prevent multiple clicks
  this.disabled = true;

  // Immediately show waiting screen
  showWaitingScreen(agentName, model);

  // Start polling
  pollStatusUntilSuccess(agentName, model, sharepointUrl, channelName, channelId);
});

// Function to show the "waiting" screen
function showWaitingScreen(agentName, model) {
  document.getElementById('initialScreen').style.display = 'none';
  const successScreen = document.getElementById('successScreen');
  successScreen.style.display = 'block';

  // Initially show "Creating your agent..."
  successScreen.querySelector('h2').textContent = 'Creating your agent...';
  successScreen.querySelector('p').textContent = 'Please wait while we set things up.';
  
  document.getElementById('successAgentName').textContent = agentName;
  document.getElementById('successModel').textContent = model === 'gpt-4' ? 'GPT-4' : 'GPT-3.5 Turbo';
}

// Function to show the final success message
function showSuccessScreen(agentName, model, sharepointUrl, channelName, channelId) {
  document.getElementById('initialScreen').style.display = 'none';
  document.getElementById('successScreen').style.display = 'block';
  document.getElementById('chatScreen').style.display = 'none';

  document.getElementById('successAgentName').textContent = agentName;
  document.getElementById('successModel').textContent = model === 'gpt-4' ? 'GPT-4' : 'GPT-3.5 Turbo';
  
  // Update the chat model badge in the sidebar
  document.getElementById('chatModelBadge').textContent = model === 'gpt-4' ? 'GPT-4' : 'GPT-4o-mini';
  
  // Show the Start Chatting button
  const startChatBtn = document.getElementById('startChattingBtn');
  startChatBtn.style.display = 'inline-block';
  
  // Update the click handler to pass all required parameters
  startChatBtn.onclick = function() {
    showChatScreen(agentName, model, sharepointUrl, channelName, channelId);
  };
  
  // Back to create button
  document.getElementById('backToCreateBtn').onclick = function() {
    document.getElementById('initialScreen').style.display = 'block';
    document.getElementById('successScreen').style.display = 'none';
    document.getElementById('chatScreen').style.display = 'none';
  };
}

// Function to show the chat screen
function showChatScreen(agentName, model, sharepointUrl, channelName, channelId) {
  // Update global context
  currentAgentName = agentName;
  currentModel = model;
  currentSharepointUrl = sharepointUrl || '';
  currentChannelName = channelName || '';
  currentChannelId = channelId || '';

  // Hide other screens and show chat screen
  document.getElementById('initialScreen').style.display = 'none';
  document.getElementById('successScreen').style.display = 'none';
  document.getElementById('chatScreen').style.display = 'flex';
  
  // Set the agent name in the UI
  document.querySelectorAll('.chat-header h2, .sidebar-header h3').forEach(el => {
    el.textContent = agentName;
  });
  document.getElementById('chatAgentName2').textContent = agentName;
  
  // Initialize chat functionality
  initializeChat(agentName, model);
}

// Function to initialize chat functionality
function initializeChat(agentName, model) {
  const chatMessages = document.getElementById('chatMessages');
  const userMessageInput = document.getElementById('userMessageInput');
  const sendMessageBtn = document.getElementById('sendMessageBtn');
  
  // Clear any existing messages
  chatMessages.innerHTML = '';
  
  // Add welcome message
  addWelcomeMessage(agentName);
  
  // Function to add welcome message
  function addWelcomeMessage(agentName) {
    const welcomeMessage = `
      <div class="message bot-message welcome-message">
        <div class="message-avatar">
          <div class="avatar">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="currentColor"/>
              <path d="M12 6C9.79 6 8 7.79 8 10C8 12.21 9.79 14 12 14C14.21 14 16 12.21 16 10C16 7.79 14.21 6 12 6ZM12 12C10.9 12 10 11.1 10 10C10 8.9 10.9 8 12 8C13.1 8 14 8.9 14 10C14 11.1 13.1 12 12 12Z" fill="currentColor"/>
              <path d="M12 15C9.33 15 4 16.34 4 19V21H20V19C20 16.34 14.67 15 12 15ZM6 19C6.22 18.28 9.31 17 12 17C14.7 17 17.8 18.29 18 19H6Z" fill="currentColor"/>
            </svg>
          </div>
        </div>
        <div class="message-content">
          <h3>Hi, I'm <span id="chatAgentName2">${agentName}</span></h3>
          <p>Good Day! How may I assist you today?</p>
        </div>
      </div>
    `;
    chatMessages.innerHTML = welcomeMessage;
  }
  
  // Function to add a message to the chat
  function addMessage(isUser, message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
    
    // Create avatar
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    
    if (isUser) {
      // User avatar (first letter of the name)
      const userInitial = document.createElement('span');
      userInitial.textContent = 'Y';
      avatar.appendChild(userInitial);
    } else {
      // Bot avatar (icon)
      const botIcon = document.createElement('div');
      botIcon.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="currentColor"/>
          <path d="M12 6C9.79 6 8 7.79 8 10C8 12.21 9.79 14 12 14C14.21 14 16 12.21 16 10C16 7.79 14.21 6 12 6ZM12 12C10.9 12 10 11.1 10 10C10 8.9 10.9 8 12 8C13.1 8 14 8.9 14 10C14 11.1 13.1 12 12 12Z" fill="currentColor"/>
          <path d="M12 15C9.33 15 4 16.34 4 19V21H20V19C20 16.34 14.67 15 12 15ZM6 19C6.22 18.28 9.31 17 12 17C14.7 17 17.8 18.29 18 19H6Z" fill="currentColor"/>
        </svg>
      `;
      avatar.appendChild(botIcon);
    }
    
    avatarDiv.appendChild(avatar);
    
    // Create message content
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    if (!isUser) {
      const nameElement = document.createElement('h3');
      nameElement.textContent = agentName;
      contentDiv.appendChild(nameElement);
    }
    
    const textElement = document.createElement('p');
    textElement.textContent = message;
    contentDiv.appendChild(textElement);
    
    // Assemble message
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    
    // Add to chat
    chatMessages.appendChild(messageDiv);
    
    // Scroll to the bottom of the chat
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return messageDiv;
  }
  
  // Function to handle sending a message
  async function sendMessage() {
    const message = userMessageInput.value.trim();
    if (message === '') return;
    
    // Add user message to chat
    addMessage(true, message);
    
    // Clear input
    userMessageInput.value = '';
    
    // Show typing indicator
    const typingIndicator = addMessage(false, '...');
    typingIndicator.id = 'typing-indicator';
    typingIndicator.querySelector('.message-content p').textContent = 'Typing...';
    
    try {
      const url = "https://prod-63.westus.logic.azure.com:443/workflows/b9ee53a9ab534a1baa45c05f1df28495/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=Fsb7sxBPYvrGZyaFX3M6nW8i2IUk7oDJ2FynTcu9Nqc";
      
      const requestBody = {
        botName: currentAgentName,
        botModel: currentModel,
        url: currentSharepointUrl,
        cname: currentChannelName,
        cid: currentChannelId,
        userMessage: message,
        timestamp: new Date().toISOString(),
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      const botResponse = data.botresponse || "I'm sorry, I couldn't process your request at the moment.";
      
      // Remove typing indicator
      const indicator = document.getElementById('typing-indicator');
      if (indicator) indicator.remove();
      
      // Add bot response
      addMessage(false, botResponse);
      
    } catch (error) {
      console.error('Error getting bot response:', error);
      // Remove typing indicator
      const indicator = document.getElementById('typing-indicator');
      if (indicator) indicator.remove();
      
      // Show error message
      addMessage(false, "I'm having trouble connecting to the server. Please try again later.");
    }
  }
  
  // Event listeners
  sendMessageBtn.addEventListener('click', sendMessage);
  
  userMessageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });
  
  // Quick action button
  document.querySelector('.quick-action-btn').addEventListener('click', () => {
    userMessageInput.value = 'Tell me about the application';
    userMessageInput.focus();
    sendMessage(); // Automatically send the quick action message
  });
  
  // Sidebar actions
  const newChatBtn = document.querySelector('.sidebar-action-btn:first-child');
  const savedPromptsBtn = document.querySelector('.sidebar-action-btn:last-child');
  
  newChatBtn.addEventListener('click', () => {
    // Clear chat messages
    chatMessages.innerHTML = '';
    // Add welcome message
    addWelcomeMessage(agentName);
    // Set active state
    newChatBtn.classList.add('active');
    savedPromptsBtn.classList.remove('active');
  });
  
  savedPromptsBtn.addEventListener('click', () => {
    // In a real app, this would show saved prompts
    alert('Saved prompts feature coming soon!');
    // Set active state
    savedPromptsBtn.classList.add('active');
    newChatBtn.classList.remove('active');
  });
  
  // Set focus to input field
  userMessageInput.focus();
}

// Function to poll until success
async function pollStatusUntilSuccess(agentName, model, sharepointUrl, channelName, channelId) {
  const url = "https://prod-66.westus.logic.azure.com:443/workflows/ae73ec5a5772423cb733a1860271241c/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=MC48I55t5lRY9EewVtiHSxwcDsRwUGVArQbWrVZjYGU";
  const maxAttempts = 2000; // Maximum number of attempts
  let attempt = 1;
  let isSuccess = false;

  const requestBody = {
    botName: agentName,
    botModel: model,
    url: sharepointUrl,
    cname: channelName,
    cid: channelId,
    timestamp: new Date().toISOString(),
  };

  const statusElement = document.getElementById('successScreen').querySelector('p');
  
  // Function to delay between attempts
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  while (attempt <= maxAttempts && !isSuccess) {
    try {
      console.log(`⏳ Attempt ${attempt}/${maxAttempts}: Checking agent status...`);
      statusElement.textContent = `Checking agent status (${attempt}/${maxAttempts})...`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ Attempt ${attempt}:`, data);

      if (data.Status === "Success" || data.status === "Success") {
        console.log("🎉 Agent is ready!");
        statusElement.textContent = 'Agent is ready to use!';
        showSuccessScreen(agentName, model, sharepointUrl, channelName, channelId);
        isSuccess = true;
        return; // Exit the function on success
      } else {
        console.log(`Attempt ${attempt}: Agent not ready yet`);
        statusElement.textContent = `Agent is being set up... (${attempt}/${maxAttempts} attempts)`;
      }
    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed:`, error.message);
      statusElement.textContent = `Connection issue, retrying... (${attempt}/${maxAttempts} attempts)`;
    }

    // Only wait if we're going to make another attempt
    if (attempt < maxAttempts) {
      await delay(15000); // Wait 15 seconds before next attempt
    }
    attempt++;
  }

  if (!isSuccess) {
    console.error("❌ Max attempts reached without success");
    statusElement.textContent = 'Agent setup is taking longer than expected. Please check back later.';
  }
}

// Function to create agent
async function createAgent() {
  const agentName = document.getElementById('agentName').value.trim();
  const model = document.getElementById('modelSelect').value;
  const createAgentBtn = document.getElementById('createAgentBtn');
  const originalText = createAgentBtn.textContent;

  if (!agentName) {
    showNotification('Please enter a name for your agent', true);
    return;
  }

  if (!sharepointUrlBuild) {
    showNotification('Cannot create agent: SharePoint URL is not available', true);
    return;
  }

  try {
    // Show waiting screen immediately
    showWaitingScreen(agentName, model);
    createAgentBtn.disabled = true;
    createAgentBtn.textContent = 'Creating...';

    // First API call to create the agent
    const createUrl = 'https://prod-41.westus.logic.azure.com:443/workflows/e5f0ce23f3ea415696da0d9b4eeed2ec/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=IZXxoQiXyN8FToQ0GSaFPAy8iO9NEDf9vx5qRP7g0NA';
    
    const requestBody = {
      botName: agentName,
      botModel: model,
      url: sharepointUrlBuild,
      cname: channelName,
      cid: channelId,
      timestamp: new Date().toISOString(),
    };

    console.log('Sending create agent request:', requestBody);
    
    const response = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Failed to create agent: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json();
    console.log('Agent creation response:', responseData);
    
    // Start polling for status after successful creation
    pollStatusUntilSuccess(agentName, model, sharepointUrlBuild, channelName, channelId);
    
  } catch (error) {
    console.error('Error in createAgent:', error);
    showNotification(`❌ Error: ${error.message}`, true);
    // Show the form again on error
    document.getElementById('initialScreen').style.display = 'block';
    document.getElementById('successScreen').style.display = 'none';
  } finally {
    createAgentBtn.disabled = false;
    createAgentBtn.textContent = originalText;
  }
}

// Function to show notifications
function showNotification(message, isError = false) {
  let notification = document.getElementById('notification');
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'notification';
    document.body.appendChild(notification);
  }

  notification.textContent = message;
  notification.style.backgroundColor = isError ? '#f44336' : '#4CAF50';
  notification.style.transform = 'translateX(0)';

  setTimeout(() => {
    notification.style.transform = 'translateX(120%)';
  }, 5000);
}

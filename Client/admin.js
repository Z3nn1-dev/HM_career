class AdminChatClient {
    constructor() {
        this.socket = null;
        this.currentAdmin = null;
        this.currentSession = null;
        this.isConnected = false;
        this.sessions = new Map();
        
        this.initializeElements();
        this.attachEventListeners();
        this.checkStoredSession();
    }

    initializeElements() {
        // Login elements
        this.adminLogin = document.getElementById('adminLogin');
        this.adminPanel = document.getElementById('adminPanel');
        this.loginForm = document.getElementById('loginForm');
        this.adminNameInput = document.getElementById('adminNameInput');
        this.adminPassword = document.getElementById('adminPassword');
        
        // Header elements
        this.connectionStatus = document.getElementById('connectionStatus');
        this.adminNameDisplay = document.getElementById('adminName');
        this.logoutBtn = document.getElementById('logoutBtn');
        
        // Navigation
        this.navButtons = document.querySelectorAll('.nav-btn');
        this.adminTabs = document.querySelectorAll('.admin-tab');
        
        // Chat elements
        this.adminMessagesList = document.getElementById('adminMessagesList');
        this.adminMessageInput = document.getElementById('adminMessageInput');
        this.sendAdminMessage = document.getElementById('sendAdminMessage');
        this.closeSessionBtn = document.getElementById('closeSessionBtn');
        this.leaveSessionBtn = document.getElementById('leaveSessionBtn');
        this.sessionInfo = document.getElementById('sessionInfo');
        this.customerName = document.getElementById('customerName');
        this.sessionId = document.getElementById('sessionId');
        this.viewHistoryBtn = document.getElementById('viewHistoryBtn');
        this.noSessionMessage = document.getElementById('noSessionMessage');
        this.messagesPanel = document.getElementById('messagesPanel');
        this.messageControls = document.getElementById('messageControls');
        
        // Sessions elements
        this.sessionsList = document.getElementById('sessionsList');
        this.sessionCount = document.getElementById('sessionCount');
        this.activeSessionCount = document.getElementById('activeSessionCount');
        this.waitingSessionCount = document.getElementById('waitingSessionCount');
        
        // Closed sessions elements
        this.closedSessionsList = document.getElementById('closedSessionsList');
        this.closedSessionCount = document.getElementById('closedSessionCount');
        this.refreshClosedBtn = document.getElementById('refreshClosedBtn');
        this.closedSessionModal = document.getElementById('closedSessionModal');
        this.closeClosedSessionModal = document.getElementById('closeClosedSessionModal');
        this.closedCustomerName = document.getElementById('closedCustomerName');
        this.closedAdminName = document.getElementById('closedAdminName');
        this.closedSessionStart = document.getElementById('closedSessionStart');
        this.closedSessionEnd = document.getElementById('closedSessionEnd');
        this.closedMessageCount = document.getElementById('closedMessageCount');
        this.closedMessagesList = document.getElementById('closedMessagesList');
        this.exportClosedSessionBtn = document.getElementById('exportClosedSessionBtn');
        
        // Settings elements
        this.serverStatus = document.getElementById('serverStatus');
        this.serverUptime = document.getElementById('serverUptime');
        this.exportChatBtn = document.getElementById('exportChatBtn');
        this.reloadServerBtn = document.getElementById('reloadServerBtn');
    }

    attachEventListeners() {
        // Login form
        this.loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAdminLogin();
        });
        
        // Logout button
        this.logoutBtn.addEventListener('click', () => {
            this.handleLogout();
        });
        
        // Navigation
        this.navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchTab(btn.dataset.tab);
            });
        });
        
        // Chat controls
        this.sendAdminMessage.addEventListener('click', () => this.sendMessage());
        this.adminMessageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        
        // Session controls
        if (this.closeSessionBtn) {
            this.closeSessionBtn.addEventListener('click', () => this.closeCurrentSession());
        }
        
        if (this.leaveSessionBtn) {
            this.leaveSessionBtn.addEventListener('click', () => this.leaveCurrentSession());
        }
        
        // Settings controls
        if (this.reloadServerBtn) {
            this.reloadServerBtn.addEventListener('click', () => this.reconnect());
        }
        
        if (this.exportChatBtn) {
            this.exportChatBtn.addEventListener('click', () => this.exportChatHistory());
        }
        
        // Closed sessions controls
        if (this.refreshClosedBtn) {
            this.refreshClosedBtn.addEventListener('click', () => this.refreshClosedSessions());
        }
        
        if (this.closeClosedSessionModal) {
            this.closeClosedSessionModal.addEventListener('click', () => this.hideClosedSessionModal());
        }
        
        if (this.exportClosedSessionBtn) {
            this.exportClosedSessionBtn.addEventListener('click', () => this.exportClosedSession());
        }
    }

    checkStoredSession() {
        try {
            const storedAdmin = localStorage.getItem('adminSession');
            if (storedAdmin) {
                const adminData = JSON.parse(storedAdmin);
                if (adminData.name && adminData.loginTime) {
                    // Check if session is not too old (24 hours)
                    const sessionAge = Date.now() - adminData.loginTime;
                    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
                    
                    if (sessionAge < maxAge) {
                        this.currentAdmin = {
                            name: adminData.name,
                            isAdmin: true
                        };
                        this.initializeSocket();
                        this.showAdminPanel();
                        return;
                    } else {
                        // Session expired, clear it
                        localStorage.removeItem('adminSession');
                    }
                }
            }
        } catch (error) {
            console.error('Error checking stored session:', error);
            localStorage.removeItem('adminSession');
        }
    }

    saveAdminSession() {
        if (this.currentAdmin) {
            const sessionData = {
                name: this.currentAdmin.name,
                loginTime: Date.now()
            };
            localStorage.setItem('adminSession', JSON.stringify(sessionData));
        }
    }

    clearAdminSession() {
        localStorage.removeItem('adminSession');
    }

    handleAdminLogin() {
        const adminName = this.adminNameInput.value.trim();
        const password = this.adminPassword.value;
        
        // Simple password check (in production, use proper authentication)
        if (!adminName || password !== 'admin123') {
            alert('Invalid credentials. Use password: admin123');
            return;
        }
        
        this.currentAdmin = {
            name: adminName,
            isAdmin: true
        };
        
        this.saveAdminSession();
        this.initializeSocket();
        this.showAdminPanel();
    }

    showAdminPanel() {
        this.adminLogin.classList.add('hidden');
        this.adminPanel.classList.remove('hidden');
        this.adminNameDisplay.textContent = this.currentAdmin.name;
        
        // Ensure the first tab (Active Session) is shown by default
        this.switchTab('chat');
    }

    handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            this.clearAdminSession();
            this.currentAdmin = null;
            this.currentSession = null;
            
            // Disconnect socket if connected
            if (this.socket) {
                this.socket.disconnect();
                this.socket = null;
            }
            
            // Clear UI state
            this.sessions.clear();
            this.isConnected = false;
            
            // Show login screen
            this.adminPanel.classList.add('hidden');
            this.adminLogin.classList.remove('hidden');
            
            // Clear form
            this.adminNameInput.value = '';
            this.adminPassword.value = '';
            this.adminNameInput.focus();
        }
    }

    initializeSocket() {
        this.socket = io('https://realtime-chat-a2ut.onrender.com');
        
        // Connection events
        this.socket.on('connect', () => {
            console.log('Admin connected to server');
            this.isConnected = true;
            this.updateConnectionStatus('connected');
            
            // Join as admin
            this.socket.emit('join', this.currentAdmin);
            
            // Request session list
            setTimeout(() => {
                console.log('Requesting initial session list...');
                this.socket.emit('get_sessions');
            }, 500);
        });
        
        this.socket.on('disconnect', () => {
            console.log('Admin disconnected from server');
            this.isConnected = false;
            this.updateConnectionStatus('disconnected');
        });
        
        // Session events
        this.socket.on('session_list_update', (sessions) => {
            console.log('Received session list update:', sessions);
            
            // Log detailed session info
            sessions.forEach((session, index) => {
                console.log(`Session ${index}:`, {
                    id: session.id,
                    customer: session.customer,
                    admin: session.admin,
                    isMySession: session.admin && session.admin.name === this.currentAdmin.name
                });
            });
            
            this.updateSessionsList(sessions);
        });
        
        this.socket.on('session_history', (data) => {
            console.log('=== RECEIVED SESSION HISTORY ===');
            console.log('Session history data:', data);
            
            if (data && data.sessionId) {
                console.log('Loading session history for:', data.sessionId);
                this.loadSessionHistory(data);
            } else {
                console.error('Invalid session history data received:', data);
            }
        });
        
        // Handle successful session join
        this.socket.on('session_joined', (data) => {
            console.log('=== SESSION JOINED SUCCESSFULLY ===');
            console.log('Joined session data:', data);
            
            if (data && data.sessionId) {
                // Update current session
                this.currentSession = {
                    id: data.sessionId,
                    sessionId: data.sessionId,
                    customer: data.customer,
                    messages: data.messages || []
                };
                
                // Update UI
                this.updateActiveSessionUI();
                this.switchTab('chat');
                
                // Show success message
                alert(`✅ Successfully joined session with ${data.customer ? data.customer.name : 'customer'}!`);
            }
        });
        
        // Handle session history requests (different from joining)
        this.socket.on('session_messages', (data) => {
            console.log('Received session messages:', data);
            if (this.currentSession && this.currentSession.id === data.sessionId) {
                this.currentSession.messages = data.messages || [];
                // Load messages into UI
                this.adminMessagesList.innerHTML = '';
                if (data.messages) {
                    data.messages.forEach(message => this.displayMessage(message));
                }
            }
        });
        
        this.socket.on('new_session_alert', (data) => {
            this.showNewSessionAlert(data);
        });
        
        this.socket.on('customer_disconnected', (data) => {
            this.showSystemMessage(`Customer in session ${data.sessionId} has disconnected`);
        });
        
        // Chat events
        this.socket.on('receive_message', (message) => {
            this.displayMessage(message);
        });
        
        this.socket.on('error', (data) => {
            alert(`Error: ${data.message}`);
        });
        
        // Closed sessions events
        this.socket.on('closed_sessions_update', (sessions) => {
            this.updateClosedSessionsList(sessions);
        });
        
        this.socket.on('closed_session_messages', (data) => {
            this.showClosedSessionModal(data);
        });
        
        this.socket.on('client_history', (data) => {
            console.log('Received client history:', data);
            this.showClientHistoryModal(data);
        });
    }

    updateConnectionStatus(status) {
        this.connectionStatus.className = `status-indicator ${status}`;
        switch (status) {
            case 'connected':
                this.connectionStatus.textContent = 'Connected';
                break;
            case 'disconnected':
                this.connectionStatus.textContent = 'Disconnected';
                break;
            case 'connecting':
                this.connectionStatus.textContent = 'Connecting...';
                break;
        }
    }

    switchTab(tabName) {
        console.log('Switching to tab:', tabName);
        
        // Update navigation
        this.navButtons.forEach(btn => {
            const isActive = btn.dataset.tab === tabName;
            btn.classList.toggle('active', isActive);
            console.log(`Nav button ${btn.dataset.tab}: ${isActive ? 'active' : 'inactive'}`);
        });
        
        // Update tabs
        this.adminTabs.forEach(tab => {
            const shouldBeActive = tab.id === `${tabName}Tab`;
            if (shouldBeActive) {
                tab.classList.add('active');
                tab.style.display = 'flex';
                tab.style.visibility = 'visible';
                tab.style.opacity = '1';
                console.log(`Tab ${tab.id}: showing (classes: ${tab.className})`);
            } else {
                tab.classList.remove('active');
                tab.style.display = 'none';
                console.log(`Tab ${tab.id}: hiding (classes: ${tab.className})`);
            }
        });
        
        // Special handling for each tab
        if (tabName === 'sessions') {
            console.log('Requesting session update for sessions tab');
            this.socket.emit('get_sessions');
            
            // Force visibility for sessions tab content
            if (this.sessionsList) {
                this.sessionsList.style.display = 'block';
                this.sessionsList.style.visibility = 'visible';
                console.log('Forced sessions list to be visible');
            }
        } else if (tabName === 'chat') {
            console.log('Switching to Active Session tab');
            // Only update UI if we don't already have a current session displayed
            if (this.currentSession && !this.messagesPanel.classList.contains('hidden')) {
                console.log('Already displaying current session, no need to update');
            } else if (this.currentSession) {
                console.log('Updating UI for existing current session');
                this.updateActiveSessionUI();
            } else {
                console.log('No current session - showing empty state');
                this.clearActiveSessionUI();
                // Also check if we have any active sessions
                this.socket.emit('get_sessions');
            }
        } else if (tabName === 'closed') {
            console.log('Switching to Closed Sessions tab');
            this.refreshClosedSessions();
        }
    }

    sendMessage() {
        const message = this.adminMessageInput.value.trim();
        if (!message || !this.currentSession) return;
        
        this.socket.emit('send_message', { 
            message: message,
            sessionId: this.currentSession.id 
        });
        this.adminMessageInput.value = '';
    }

    // Session management methods
    updateSessionsList(sessions) {
        console.log('Updating sessions list with:', sessions);
        this.sessions.clear();
        let activeCount = 0;
        let waitingCount = 0;
        let myActiveSession = null;
        
        sessions.forEach(session => {
            this.sessions.set(session.id, session);
            if (session.admin) {
                activeCount++;
                // Check if this admin is me
                if (session.admin.name === this.currentAdmin.name) {
                    myActiveSession = session;
                    console.log('Found my active session:', session);
                }
            } else if (session.customer) {
                waitingCount++;
            }
        });
        
        // Update counters
        if (this.sessionCount) this.sessionCount.textContent = sessions.length;
        if (this.activeSessionCount) this.activeSessionCount.textContent = activeCount;
        if (this.waitingSessionCount) this.waitingSessionCount.textContent = waitingCount;
        
        console.log(`Session counts - Total: ${sessions.length}, Active: ${activeCount}, Waiting: ${waitingCount}`);
        
        // If I have an active session but currentSession is not set, set it
        if (myActiveSession && !this.currentSession) {
            console.log('AUTO-LOADING: Found my active session, loading it automatically:', myActiveSession);
            
            // Set the current session
            this.currentSession = {
                id: myActiveSession.id,
                sessionId: myActiveSession.id,
                customer: myActiveSession.customer,
                messages: myActiveSession.messages || []
            };
            
            // Update UI immediately
            this.updateActiveSessionUI();
            
            // Only request session history if we don't have messages, and don't re-join
            if (!myActiveSession.messages || myActiveSession.messages.length === 0) {
                console.log('No messages cached, requesting session history...');
                console.log('Current admin object:', this.currentAdmin);
                this.socket.emit('get_session_history', { 
                    sessionId: myActiveSession.id,
                    adminId: this.currentAdmin ? this.currentAdmin.name : 'unknown'
                });
            }
            
        } else if (myActiveSession && this.currentSession && this.currentSession.id !== myActiveSession.id) {
            // If we have a different active session, switch to it
            console.log('SWITCHING: Different active session detected, switching to:', myActiveSession);
            this.currentSession = {
                id: myActiveSession.id,
                sessionId: myActiveSession.id,
                customer: myActiveSession.customer,
                messages: myActiveSession.messages || []
            };
            this.updateActiveSessionUI();
            this.socket.emit('get_session_history', { 
                sessionId: myActiveSession.id,
                adminId: this.currentAdmin ? this.currentAdmin.name : 'unknown'
            });
            
        } else if (myActiveSession && this.currentSession) {
            // Update existing session data
            this.currentSession.customer = myActiveSession.customer;
            this.updateActiveSessionUI();
            
        } else if (!myActiveSession && this.currentSession) {
            // No active session found but we think we have one - clear it
            console.log('CLEARING: No active session found, clearing current session');
            this.currentSession = null;
            this.clearActiveSessionUI();
        }
        
        // Update sessions list UI
        this.renderSessionsList(sessions);
    }
    
    updateActiveSessionUI() {
        if (this.currentSession && this.currentSession.customer) {
            console.log('Updating active session UI for:', this.currentSession);
            
            // Hide no session message
            if (this.noSessionMessage) {
                this.noSessionMessage.classList.add('hidden');
                this.noSessionMessage.style.display = 'none';
            }
            
            // Show session elements
            if (this.sessionInfo) {
                this.sessionInfo.classList.remove('hidden');
                this.sessionInfo.style.display = 'block';
            }
            if (this.messagesPanel) {
                this.messagesPanel.classList.remove('hidden');
                this.messagesPanel.style.display = 'block';
            }
            if (this.messageControls) {
                this.messageControls.classList.remove('hidden');
                this.messageControls.style.display = 'flex';
            }
            if (this.closeSessionBtn) {
                this.closeSessionBtn.classList.remove('hidden');
                this.closeSessionBtn.style.display = 'inline-block';
            }
            if (this.leaveSessionBtn) {
                this.leaveSessionBtn.classList.remove('hidden');
                this.leaveSessionBtn.style.display = 'inline-block';
            }
            
            // Update session info
            if (this.customerName) {
                this.customerName.textContent = `Chat with ${this.currentSession.customer.name}`;
            }
            if (this.sessionId) {
                this.sessionId.textContent = `Session: ${this.currentSession.sessionId || this.currentSession.id}`;
            }
            
            // Show/hide view history button based on client ID
            if (this.viewHistoryBtn) {
                console.log('Checking view history button visibility...');
                console.log('Current session customer:', this.currentSession.customer);
                console.log('Customer clientId:', this.currentSession.customer ? this.currentSession.customer.clientId : 'No customer');
                
                if (this.currentSession.customer && this.currentSession.customer.clientId) {
                    console.log('Showing view history button');
                    this.viewHistoryBtn.classList.remove('hidden');
                    this.viewHistoryBtn.style.display = 'inline-block';
                } else {
                    console.log('Hiding view history button - no clientId');
                    this.viewHistoryBtn.classList.add('hidden');
                    this.viewHistoryBtn.style.display = 'none';
                }
            } else {
                console.log('View history button element not found!');
            }
            
            // Load messages if available
            if (this.currentSession.messages && this.currentSession.messages.length > 0) {
                if (this.adminMessagesList) {
                    this.adminMessagesList.innerHTML = '';
                    this.currentSession.messages.forEach(message => this.displayMessage(message));
                }
            } else {
                // Show a placeholder message if no messages yet
                if (this.adminMessagesList) {
                    this.adminMessagesList.innerHTML = '<div class="system-message">Session started. Waiting for messages...</div>';
                }
            }
            
            console.log('Active session UI updated successfully - customer:', this.currentSession.customer.name);
        } else {
            console.log('Cannot update active session UI - no valid current session');
            this.clearActiveSessionUI();
        }
    }
    
    clearActiveSessionUI() {
        console.log('Clearing active session UI');
        
        // Hide session elements
        if (this.sessionInfo) {
            this.sessionInfo.classList.add('hidden');
            this.sessionInfo.style.display = 'none';
        }
        if (this.messagesPanel) {
            this.messagesPanel.classList.add('hidden');
            this.messagesPanel.style.display = 'none';
        }
        if (this.messageControls) {
            this.messageControls.classList.add('hidden');
            this.messageControls.style.display = 'none';
        }
        if (this.closeSessionBtn) {
            this.closeSessionBtn.classList.add('hidden');
            this.closeSessionBtn.style.display = 'none';
        }
        if (this.leaveSessionBtn) {
            this.leaveSessionBtn.classList.add('hidden');
            this.leaveSessionBtn.style.display = 'none';
        }
        if (this.viewHistoryBtn) {
            this.viewHistoryBtn.classList.add('hidden');
            this.viewHistoryBtn.style.display = 'none';
        }
        
        // Show no session message
        if (this.noSessionMessage) {
            this.noSessionMessage.classList.remove('hidden');
            this.noSessionMessage.style.display = 'block';
        }
        
        // Clear content
        if (this.customerName) {
            this.customerName.textContent = 'No active session';
        }
        if (this.sessionId) {
            this.sessionId.textContent = '';
        }
        if (this.adminMessagesList) {
            this.adminMessagesList.innerHTML = '';
        }
    }
    
    renderSessionsList(sessions) {
        console.log('Rendering sessions list:', sessions);
        console.log('Sessions list element:', this.sessionsList);
        
        if (!this.sessionsList) {
            console.error('Sessions list element not found!');
            return;
        }
        
        this.sessionsList.innerHTML = '';
        
        // Add test content to verify the element is working
        this.sessionsList.innerHTML = '<div style="padding: 1rem; background: #f0f0f0; margin: 1rem; border-radius: 4px;">TEST: Sessions list is working. Loading sessions...</div>';
        
        if (sessions.length === 0) {
            console.log('No sessions to display');
            this.sessionsList.innerHTML = '<div class="no-sessions">No active sessions</div>';
            return;
        }
        
        console.log(`Rendering ${sessions.length} sessions`);
        
        // Clear test content
        this.sessionsList.innerHTML = '';
        
        sessions.forEach((session, index) => {
            console.log(`Rendering session ${index}:`, session);
            const sessionCard = document.createElement('div');
            sessionCard.className = 'session-card';
            sessionCard.style.border = '1px solid #ccc';
            sessionCard.style.margin = '10px';
            sessionCard.style.padding = '15px';
            sessionCard.style.borderRadius = '8px';
            sessionCard.style.backgroundColor = '#f9f9f9';
            
            const statusClass = session.admin ? 'active' : (session.customer ? 'waiting' : 'disconnected');
            const statusText = session.admin ? 'Active' : (session.customer ? 'Waiting for Admin' : 'Customer Disconnected');
            const customerName = session.customer ? session.customer.name : 
                                (session.status === 'customer_disconnected' ? 'Customer (Disconnected)' : 'Unknown Customer');
            
            // Prepare customer history display
            let historyInfo = '';
            if (session.customerHistory && session.customerHistory.isReturning) {
                historyInfo = `
                    <div class="customer-history">
                        <span class="returning-badge">🔄 Returning Customer</span>
                        <div class="history-details">
                            Previous sessions: ${session.customerHistory.previousSessions} | 
                            Total messages: ${session.customerHistory.totalMessages} |
                            Last seen: ${new Date(session.customerHistory.lastSeen).toLocaleDateString()}
                        </div>
                    </div>
                `;
            } else if (session.customerHistory && !session.customerHistory.isReturning) {
                historyInfo = '<div class="customer-history"><span class="new-badge">✨ New Customer</span></div>';
            }
            
            // Prepare client history display
            let clientInfo = '';
            if (session.clientHistory && session.clientHistory.isReturning) {
                const previousNames = session.clientHistory.previousNames.filter(name => name !== customerName);
                clientInfo = `
                    <div class="client-history">
                        <span class="client-badge">🔗 Same Device</span>
                        <div class="client-details">
                            Total sessions: ${session.clientHistory.totalSessions} |
                            ${previousNames.length > 0 ? `Previous names: ${previousNames.join(', ')} |` : ''}
                            First seen: ${new Date(session.clientHistory.firstSeen).toLocaleDateString()}
                        </div>
                    </div>
                `;
            } else if (session.customer && session.customer.clientId) {
                clientInfo = '<div class="client-history"><span class="new-device-badge">📱 New Device</span></div>';
            }
            
            // Prepare previous session info
            let previousSessionInfo = '';
            if (session.previousSession) {
                previousSessionInfo = `
                    <div class="previous-session">
                        <span class="previous-session-badge">🔄 Continued from Previous Session</span>
                        <div class="previous-session-details">
                            Previous session: ${session.previousSession.id.substring(8, 16)}... | 
                            ${session.previousSession.messageCount} messages | 
                            Closed: ${new Date(session.previousSession.closedAt).toLocaleTimeString()}
                        </div>
                    </div>
                `;
            }
            
            sessionCard.innerHTML = `
                <div class="session-info">
                    <div class="session-details">
                        <h4>${customerName}</h4>
                        ${historyInfo}
                        ${clientInfo}
                        ${previousSessionInfo}
                        <div class="session-meta">
                            <div>Session: ${session.id.substring(8, 16)}...</div>
                            <div>Messages: ${session.messageCount}</div>
                            <div>Created: ${new Date(session.createdAt).toLocaleTimeString()}</div>
                            ${session.customer && session.customer.clientId ? `<div class="client-id-small">Client: ${session.customer.clientId.substring(7, 14)}...</div>` : ''}
                        </div>
                    </div>
                    <span class="session-status ${statusClass}">
                        ${statusText}
                    </span>
                </div>
                <div class="session-actions">
                    ${!session.admin && session.customer ? 
                        `<button class="session-btn join" onclick="adminClient.joinSession('${session.id}')">Join Session</button>` : 
                        session.admin && session.admin.name === this.currentAdmin.name ?
                        `<button class="session-btn current" onclick="adminClient.switchToActiveSession('${session.id}')">Current Session</button>` :
                        `<button class="session-btn occupied">Occupied</button>`
                    }
                </div>
            `;
            
            console.log('Session card HTML:', sessionCard.innerHTML);
            this.sessionsList.appendChild(sessionCard);
        });
        
        console.log('Final sessions list HTML:', this.sessionsList.innerHTML);
    }
    
    joinSession(sessionId) {
        console.log('=== JOINING SESSION ===');
        console.log('Session ID:', sessionId);
        const session = this.sessions.get(sessionId);
        console.log('Session data:', session);
        
        if (session && session.admin && session.admin.name === this.currentAdmin.name) {
            console.log('Already in this session, just switching to it...');
            this.switchToActiveSession(sessionId);
            return;
        }
        
        // Emit join session event
        console.log('Emitting join_session event...');
        this.socket.emit('join_session', { sessionId: sessionId });
        
        // Pre-populate current session with available data
        if (session) {
            console.log('Pre-populating session data...');
            this.currentSession = {
                id: session.id,
                sessionId: session.id,
                customer: session.customer,
                messages: session.messages || []
            };
            
            // Update UI immediately
            console.log('Updating UI immediately...');
            this.updateActiveSessionUI();
            
            // Switch to Active Session tab only if not already there
            const currentTab = document.querySelector('.admin-tab.active');
            if (!currentTab || currentTab.id !== 'chatTab') {
                console.log('Switching to Active Session tab...');
                this.switchTab('chat');
            } else {
                console.log('Already on Active Session tab, no need to switch');
            }
        }
        
        // Set a timeout to check if the session was joined successfully
        setTimeout(() => {
            console.log('Checking if session was joined successfully...');
            if (this.currentSession && this.currentSession.id === sessionId) {
                console.log('✅ Session joined successfully');
                // Request fresh session history just in case
                this.socket.emit('get_session_history', { 
                    sessionId: sessionId,
                    adminId: this.currentAdmin ? this.currentAdmin.name : 'unknown'
                });
            } else {
                console.log('❌ Session join may have failed');
                alert('Failed to join session. Please try again.');
            }
        }, 1000);
    }
    
    switchToActiveSession(sessionId) {
        console.log('Switching to active session:', sessionId);
        const session = this.sessions.get(sessionId);
        if (session) {
            console.log('Loading existing session into Active Session tab:', session);
            this.currentSession = {
                id: session.id,
                sessionId: session.id,
                customer: session.customer,
                messages: session.messages || []
            };
            
            // Update UI immediately
            this.updateActiveSessionUI();
            
            // Only request session history if we don't have messages
            if (!session.messages || session.messages.length === 0) {
                console.log('No messages cached, requesting session history...');
                console.log('Current admin object:', this.currentAdmin);
                console.log('Admin name to send:', this.currentAdmin ? this.currentAdmin.name : 'UNDEFINED');
                this.socket.emit('get_session_history', { 
                    sessionId: sessionId,
                    adminId: this.currentAdmin ? this.currentAdmin.name : 'unknown'
                });
            }
            
            // Switch to Active Session tab
            this.switchTab('chat');
        }
    }
    
    loadSessionHistory(data) {
        console.log('Loading session history:', data);
        
        // Ensure we have valid session data
        if (!data || !data.sessionId) {
            console.error('Invalid session history data:', data);
            return;
        }
        
        this.currentSession = {
            id: data.sessionId,
            sessionId: data.sessionId,
            customer: data.customer,
            messages: data.messages || []
        };
        
        console.log('Session set to:', this.currentSession);
        
        // Update UI to show active session
        this.updateActiveSessionUI();
        
        // Switch to chat tab only if not already there
        const currentTab = document.querySelector('.admin-tab.active');
        if (!currentTab || currentTab.id !== 'chatTab') {
            console.log('Switching to chat tab after loading session');
            this.switchTab('chat');
        } else {
            console.log('Already on chat tab, no need to switch');
        }
    }
    
    closeCurrentSession() {
        if (!this.currentSession) return;
        
        if (confirm('Are you sure you want to close this session? The customer will be disconnected.')) {
            this.socket.emit('admin_action', {
                type: 'close_session',
                sessionId: this.currentSession.id,
                reason: 'Session closed by admin'
            });
            
            this.leaveSession();
        }
    }
    
    leaveCurrentSession() {
        if (!this.currentSession) return;
        
        if (confirm('Are you sure you want to leave this session? The customer will wait for another admin.')) {
            this.socket.emit('leave_session');
            this.leaveSession();
        }
    }
    
    leaveSession() {
        this.currentSession = null;
        
        // Update UI to show no active session
        this.noSessionMessage.classList.remove('hidden');
        this.messagesPanel.classList.add('hidden');
        this.messageControls.classList.add('hidden');
        this.sessionInfo.classList.add('hidden');
        this.closeSessionBtn.classList.add('hidden');
        this.leaveSessionBtn.classList.add('hidden');
        
        // Clear session info
        this.customerName.textContent = 'No active session';
        this.sessionId.textContent = '';
        this.adminMessagesList.innerHTML = '';
        
        // Switch to sessions tab
        this.switchTab('sessions');
    }
    
    showNewSessionAlert(data) {
        // You could add a notification sound or visual alert here
        console.log('New session alert:', data);
    }

    displayMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'admin-message';
        
        if (message.user === this.currentAdmin.name) {
            messageElement.classList.add('own');
        }
        
        if (message.isSystem) {
            messageElement.classList.add('system');
        } else if (message.isAdmin) {
            messageElement.classList.add('admin-only');
        }
        
        const timestamp = new Date(message.timestamp).toLocaleTimeString();
        
        messageElement.innerHTML = `
            <div class="message-header">
                <span class="message-user ${message.isAdmin ? 'admin' : ''}">${message.user}</span>
                <span class="message-time">${timestamp}</span>
            </div>
            <div class="message-content">${message.message}</div>
        `;
        
        this.adminMessagesList.appendChild(messageElement);
        this.scrollToBottom();
    }

    loadChatHistory(messages) {
        this.adminMessagesList.innerHTML = '';
        messages.forEach(message => this.displayMessage(message));
    }

    showSystemMessage(text) {
        const messageElement = document.createElement('div');
        messageElement.className = 'admin-message system';
        messageElement.innerHTML = `
            <div class="message-header">
                <span class="message-user">System</span>
                <span class="message-time">${new Date().toLocaleTimeString()}</span>
            </div>
            <div class="message-content">${text}</div>
        `;
        this.adminMessagesList.appendChild(messageElement);
        this.scrollToBottom();
    }

    exportChatHistory() {
        if (!this.currentSession) {
            alert('No active session to export');
            return;
        }
        
        const messages = Array.from(this.adminMessagesList.children).map(msg => {
            const user = msg.querySelector('.message-user').textContent;
            const time = msg.querySelector('.message-time').textContent;
            const content = msg.querySelector('.message-content').textContent;
            return `[${time}] ${user}: ${content}`;
        });
        
        const chatData = messages.join('\n');
        const blob = new Blob([chatData], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `session-${this.currentSession.id}-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    reconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket.connect();
        }
    }

    scrollToBottom() {
        const container = this.messagesPanel;
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    forceLoadActiveSession() {
        console.log('=== FORCE LOADING ACTIVE SESSION ===');
        console.log('Current sessions map:', this.sessions);
        console.log('Current admin:', this.currentAdmin);
        console.log('Looking for admin name:', this.currentAdmin ? this.currentAdmin.name : 'NO ADMIN');
        
        // First, request fresh session data
        console.log('Requesting fresh session data...');
        this.socket.emit('get_sessions');
        
        // Wait a bit and then look for active sessions
        setTimeout(() => {
            console.log('Processing sessions after refresh...');
            
            // Find any session where I'm the admin
            let foundSession = null;
            for (const [sessionId, session] of this.sessions) {
                console.log(`Checking session ${sessionId}:`, {
                    id: session.id,
                    customer: session.customer ? session.customer.name : 'NO CUSTOMER',
                    admin: session.admin ? session.admin.name : 'NO ADMIN',
                    isMySession: session.admin && session.admin.name === this.currentAdmin.name
                });
                
                if (session.admin && session.admin.name === this.currentAdmin.name) {
                    foundSession = session;
                    break;
                }
            }
            
            if (foundSession) {
                console.log('✅ FOUND MY ACTIVE SESSION:', foundSession);
                this.currentSession = {
                    id: foundSession.id,
                    sessionId: foundSession.id,
                    customer: foundSession.customer,
                    messages: foundSession.messages || []
                };
                
                // Update UI immediately
                this.updateActiveSessionUI();
                
                // Request fresh session history
                console.log('Requesting session history...');
                this.socket.emit('get_session_history', { 
                    sessionId: foundSession.id,
                    adminId: this.currentAdmin ? this.currentAdmin.name : 'unknown'
                });
                
                // Switch to Active Session tab only if not already there
                const currentTab = document.querySelector('.admin-tab.active');
                if (!currentTab || currentTab.id !== 'chatTab') {
                    this.switchTab('chat');
                } else {
                    console.log('Already on Active Session tab');
                }
                
                alert(`✅ Loaded session with ${foundSession.customer.name}!`);
            } else {
                console.log('❌ NO ACTIVE SESSION FOUND');
                console.log('Available sessions:', Array.from(this.sessions.keys()));
                
                // Check if there are any sessions I can join
                const waitingSessions = Array.from(this.sessions.values()).filter(s => s.customer && !s.admin);
                if (waitingSessions.length > 0) {
                    const sessionToJoin = waitingSessions[0];
                    if (confirm(`No active session found. Would you like to join the session with ${sessionToJoin.customer.name}?`)) {
                        this.joinSession(sessionToJoin.id);
                        return;
                    }
                }
                
                alert('❌ No active session found. You need to join a session first from the Sessions tab.');
                this.switchTab('sessions');
            }
        }, 500);
    }

    debugSession() {
        console.log('=== DEBUG SESSION INFO ===');
        console.log('Current admin:', this.currentAdmin);
        console.log('Current session:', this.currentSession);
        console.log('All sessions:', this.sessions);
        console.log('Socket connected:', this.isConnected);
        console.log('Socket ID:', this.socket ? this.socket.id : 'NO SOCKET');
        
        // Check UI elements
        console.log('UI Elements Check:');
        console.log('- noSessionMessage:', this.noSessionMessage ? 'EXISTS' : 'MISSING');
        console.log('- sessionInfo:', this.sessionInfo ? 'EXISTS' : 'MISSING');
        console.log('- messagesPanel:', this.messagesPanel ? 'EXISTS' : 'MISSING');
        console.log('- messageControls:', this.messageControls ? 'EXISTS' : 'MISSING');
        
        // Check which tab is active
        const activeTab = document.querySelector('.admin-tab.active');
        console.log('Active tab:', activeTab ? activeTab.id : 'NONE');
        
        // Check element visibility
        if (this.noSessionMessage) {
            console.log('noSessionMessage classes:', this.noSessionMessage.className);
            console.log('noSessionMessage style.display:', this.noSessionMessage.style.display);
        }
        
        if (this.sessionInfo) {
            console.log('sessionInfo classes:', this.sessionInfo.className);
            console.log('sessionInfo style.display:', this.sessionInfo.style.display);
        }
        
        // Show debug info in alert
        const debugInfo = `
DEBUG INFO:
- Admin: ${this.currentAdmin ? this.currentAdmin.name : 'NONE'}
- Current Session: ${this.currentSession ? this.currentSession.id : 'NONE'}
- Total Sessions: ${this.sessions.size}
- Socket Connected: ${this.isConnected}
- Active Tab: ${activeTab ? activeTab.id : 'NONE'}
        `;
        
        alert(debugInfo.trim());
    }

    // Closed Sessions Methods
    refreshClosedSessions() {
        if (this.socket) {
            this.socket.emit('get_closed_sessions');
        }
    }

    // Helper function to get relative time
    getRelativeTime(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) {
            return 'Just now';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days} day${days > 1 ? 's' : ''} ago`;
        }
    }

    updateClosedSessionsList(sessions) {
        this.closedSessionCount.textContent = sessions.length;
        
        if (sessions.length === 0) {
            this.closedSessionsList.innerHTML = `
                <div class="no-sessions">
                    <p>No closed sessions yet</p>
                </div>
            `;
            return;
        }

        // Sort sessions by closedAt date, latest first
        const sortedSessions = sessions.sort((a, b) => {
            const aDate = a.closedAt ? new Date(a.closedAt) : new Date(a.createdAt);
            const bDate = b.closedAt ? new Date(b.closedAt) : new Date(b.createdAt);
            return bDate - aDate; // Descending order (latest first)
        });

        this.closedSessionsList.innerHTML = sortedSessions.map(session => {
            const startTime = new Date(session.createdAt).toLocaleString();
            const endTime = session.closedAt ? new Date(session.closedAt).toLocaleString() : 'Unknown';
            const relativeTime = session.closedAt ? this.getRelativeTime(new Date(session.closedAt)) : 'Unknown';
            const customerName = session.customer ? session.customer.name : 'Unknown Customer';
            const adminName = session.admin ? session.admin.name : 'No Admin';

            return `
                <div class="closed-session-item" onclick="window.adminClient.viewClosedSession('${session.id}')">
                    <div class="closed-session-header">
                        <div class="closed-session-title">${customerName}</div>
                        <div class="status-closed">Closed ${relativeTime}</div>
                    </div>
                    <div class="closed-session-details">
                        <strong>Admin:</strong> ${adminName}<br>
                        <strong>Duration:</strong> ${startTime} - ${endTime}
                    </div>
                    <div class="closed-session-meta">
                        <span>💬 ${session.messageCount} messages</span>
                        <span>🕒 Ended: ${endTime}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    viewClosedSession(sessionId) {
        if (this.socket) {
            this.socket.emit('view_closed_session', { sessionId });
        }
    }

    showClosedSessionModal(sessionData) {
        // Populate session info
        this.closedCustomerName.textContent = sessionData.customer ? sessionData.customer.name : 'Unknown';
        this.closedAdminName.textContent = sessionData.admin ? sessionData.admin.name : 'No Admin';
        this.closedSessionStart.textContent = new Date(sessionData.createdAt).toLocaleString();
        this.closedSessionEnd.textContent = sessionData.closedAt ? new Date(sessionData.closedAt).toLocaleString() : 'Unknown';
        this.closedMessageCount.textContent = sessionData.messages.length;

        // Populate messages
        this.closedMessagesList.innerHTML = sessionData.messages.map(msg => {
            const isAdmin = msg.user === sessionData.admin?.name;
            const messageClass = isAdmin ? 'admin' : 'customer';
            const messageTime = new Date(msg.timestamp).toLocaleString();

            return `
                <div class="closed-message ${messageClass}">
                    <div class="message-header">
                        <strong>${msg.user}</strong>
                    </div>
                    <div class="message-content">${msg.message}</div>
                    <div class="message-time">${messageTime}</div>
                </div>
            `;
        }).join('');

        // Store current session data for export
        this.currentClosedSession = sessionData;

        // Show modal
        this.closedSessionModal.classList.remove('hidden');
    }

    hideClosedSessionModal() {
        this.closedSessionModal.classList.add('hidden');
        this.currentClosedSession = null;
    }

    exportClosedSession() {
        if (!this.currentClosedSession) return;

        const sessionData = this.currentClosedSession;
        const customerName = sessionData.customer ? sessionData.customer.name : 'Unknown';
        const startTime = new Date(sessionData.createdAt).toLocaleString();
        const endTime = sessionData.closedAt ? new Date(sessionData.closedAt).toLocaleString() : 'Unknown';

        let exportText = `Chat Session Export\n`;
        exportText += `===================\n`;
        exportText += `Customer: ${customerName}\n`;
        exportText += `Admin: ${sessionData.admin ? sessionData.admin.name : 'No Admin'}\n`;
        exportText += `Started: ${startTime}\n`;
        exportText += `Ended: ${endTime}\n`;
        exportText += `Messages: ${sessionData.messages.length}\n\n`;

        sessionData.messages.forEach(msg => {
            const messageTime = new Date(msg.timestamp).toLocaleString();
            exportText += `[${messageTime}] ${msg.user}: ${msg.message}\n`;
        });

        // Create and download file
        const blob = new Blob([exportText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-session-${customerName}-${new Date().getTime()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    viewClientHistory() {
        if (!this.currentSession || !this.currentSession.customer || !this.currentSession.customer.clientId) {
            alert('No client ID available for this session');
            return;
        }

        const clientId = this.currentSession.customer.clientId;
        console.log('Requesting client history for:', clientId);
        
        // Request client history from server
        this.socket.emit('get_client_history', { clientId: clientId });
    }

    showClientHistoryModal(clientHistory) {
        const modal = this.createClientHistoryModal(clientHistory);
        document.body.appendChild(modal);
        
        // Show modal
        setTimeout(() => {
            modal.style.display = 'flex';
        }, 10);
    }

    createClientHistoryModal(clientHistory) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content large';
        modalContent.style.cssText = `
            background: white;
            border-radius: 8px;
            padding: 2rem;
            max-width: 90%;
            max-height: 90%;
            overflow-y: auto;
            position: relative;
        `;

        let sessionsHTML = '';
        if (clientHistory.sessions.length === 0) {
            sessionsHTML = '<p>No previous sessions found for this client.</p>';
        } else {
            clientHistory.sessions.forEach((session, index) => {
                const startTime = new Date(session.createdAt).toLocaleString();
                const endTime = session.closedAt ? new Date(session.closedAt).toLocaleString() : 'Unknown';
                
                sessionsHTML += `
                    <div class="history-session" style="border: 1px solid #ddd; margin: 1rem 0; padding: 1rem; border-radius: 6px;">
                        <div class="session-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                            <h4>Session ${index + 1}: ${session.customerName}</h4>
                            <span style="font-size: 0.9rem; color: #666;">${session.messageCount} messages</span>
                        </div>
                        <div class="session-details" style="margin-bottom: 1rem; color: #666; font-size: 0.9rem;">
                            <div>Started: ${startTime}</div>
                            <div>Ended: ${endTime}</div>
                            <div>Admin: ${session.adminName}</div>
                        </div>
                        <div class="session-messages" style="max-height: 200px; overflow-y: auto; background: #f8f9fa; padding: 0.5rem; border-radius: 4px;">
                            ${session.messages.map(msg => `
                                <div style="margin: 0.25rem 0; padding: 0.25rem; border-radius: 3px; ${msg.user === session.customerName ? 'background: #e3f2fd; text-align: left;' : 'background: #f3e5f5; text-align: right;'}">
                                    <strong>${msg.user}:</strong> ${msg.message}
                                    <small style="display: block; font-size: 0.75rem; color: #666; margin-top: 0.25rem;">
                                        ${new Date(msg.timestamp).toLocaleString()}
                                    </small>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            });
        }

        modalContent.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h2>Client History: ${clientHistory.clientId}</h2>
                <button onclick="this.closest('.modal-overlay').remove()" style="background: #dc3545; color: white; border: none; border-radius: 4px; padding: 0.5rem 1rem; cursor: pointer;">
                    ✕ Close
                </button>
            </div>
            <div class="client-summary" style="background: #f8f9fa; padding: 1rem; border-radius: 6px; margin-bottom: 1.5rem;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    <div><strong>Total Sessions:</strong> ${clientHistory.totalSessions}</div>
                    <div><strong>Total Messages:</strong> ${clientHistory.totalMessages}</div>
                    <div><strong>Client ID:</strong> <code>${clientHistory.clientId}</code></div>
                </div>
            </div>
            <div class="sessions-history">
                <h3>Previous Sessions</h3>
                ${sessionsHTML}
            </div>
        `;

        modal.appendChild(modalContent);
        return modal;
    }
}

// Initialize the admin client when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.adminClient = new AdminChatClient();
});


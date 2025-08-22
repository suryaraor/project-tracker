class ProjectTracker {
    constructor() {
        this.data = null;
        this.platforms = ['Research', 'coding', 'unit_testing', 'MFD', 'MFA', 'Beta', 'Stage', 'PROD'];
        this.showCompletedProjects = true;
        this.unsavedChanges = false;
        this.autoSaveInterval = null;
        this.init();
    }

    init() {
        this.loadData();
        this.setupEventListeners();
        this.setupAutoSave();
        this.setupBeforeUnloadHandler();
    }

    // Mark that data has changed and needs saving
    markDataChanged() {
        this.unsavedChanges = true;
        this.updateUnsavedIndicator(true);
        console.log('📝 Data marked as changed');
    }

    // Update visual indicator for unsaved changes
    updateUnsavedIndicator(hasUnsavedChanges) {
        const indicator = document.getElementById('unsavedIndicator') || this.createUnsavedIndicator();
        if (hasUnsavedChanges) {
            indicator.style.display = 'block';
            indicator.textContent = '● Unsaved changes';
            indicator.style.color = '#ff6b35';
        } else {
            indicator.style.display = 'none';
        }
    }

    // Create the unsaved changes indicator
    createUnsavedIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'unsavedIndicator';
        indicator.style.cssText = `
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255, 107, 53, 0.1);
            color: #ff6b35;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.9rem;
            font-weight: 600;
            z-index: 1001;
            border: 1px solid rgba(255, 107, 53, 0.3);
            backdrop-filter: blur(10px);
            display: none;
        `;
        document.body.appendChild(indicator);
        return indicator;
    }

    setupEventListeners() {
        const showCompletedCheckbox = document.getElementById('showCompletedProjects');
        if (showCompletedCheckbox) {
            showCompletedCheckbox.addEventListener('change', (e) => {
                this.showCompletedProjects = e.target.checked;
                this.renderTable();
            });
        }
    }

    // Set up automatic saving every 30 seconds if there are unsaved changes
    setupAutoSave() {
        this.autoSaveInterval = setInterval(async () => {
            if (this.unsavedChanges && this.data) {
                console.log('🔄 Auto-saving changes...');
                const success = await this.saveDataWithBackup();
                if (success) {
                    this.unsavedChanges = false;
                    this.updateUnsavedIndicator(false);
                    console.log('✅ Auto-save completed');
                }
            }
        }, 30000); // 30 seconds
    }

    // Warn user before leaving if there are unsaved changes
    setupBeforeUnloadHandler() {
        window.addEventListener('beforeunload', (e) => {
            if (this.unsavedChanges) {
                e.preventDefault();
                return 'You have unsaved changes. Are you sure you want to leave?';
            }
        });

        // Add keyboard shortcut for saving (Ctrl+S)
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.manualSave();
            }
        });
    }

    getCurrentDate() {
        const today = new Date();
        return today.toISOString().split('T')[0];
    }

    async loadData() {
        try {
            const response = await fetch('data.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.data = await response.json();
            this.renderTable();
            
            // Auto-validate and repair data on load
            this.validateAndRepairDataOnLoad();
        } catch (error) {
            console.error('Error loading data:', error);
            this.showError('Failed to load project data. Please check if data.json exists.');
        }
    }

    renderTable() {
        this.renderHeader();
        this.renderBody();
        this.renderMainScreenLabels();
    }

    getFilteredProjects() {
        if (this.showCompletedProjects) {
            return this.data.projects;
        }
        // Filter out projects that are completed (PROD stage is completed)
        return this.data.projects.filter(project => {
            return !(project.currentStage === 'PROD' && project.platforms.PROD.status === 'completed');
        });
    }

    renderHeader() {
        const headerRow = document.getElementById('headerRow');
        
        // Clear existing headers except stage column
        headerRow.innerHTML = '<th class="date-column sticky-column">Stage</th>';
        
        // Add project headers (one column per project)
        const filteredProjects = this.getFilteredProjects();
        filteredProjects.forEach(project => {
            const projectHeader = document.createElement('th');
            projectHeader.className = 'project-header';
            projectHeader.textContent = project.name;
            headerRow.appendChild(projectHeader);
        });
    }

    renderBody() {
        const tableBody = document.getElementById('tableBody');
        tableBody.innerHTML = '';
        
        const filteredProjects = this.getFilteredProjects();

        // Create a row for each stage
        this.platforms.forEach(stageName => {
            const row = document.createElement('tr');
            
            // Stage name cell
            const stageCell = document.createElement('td');
            stageCell.className = 'date-cell sticky-column';
            stageCell.textContent = this.formatPlatformName(stageName);
            row.appendChild(stageCell);

            // Project cells (one per project showing this stage's data)
            filteredProjects.forEach(project => {
                const cell = document.createElement('td');
                const stageData = project.platforms[stageName];
                
                if (stageData) {
                    cell.className = `status-cell ${stageData.status}`;
                    if (project.currentStage === stageName) {
                        cell.classList.add('current-stage');
                    }
                    cell.innerHTML = this.createStageCell(stageData);
                    
                    // Add click event to open modal
                    cell.addEventListener('click', () => {
                        this.openProjectModal(project);
                    });
                } else {
                    cell.className = 'status-cell not-started';
                    cell.innerHTML = '<div class="status-text">N/A</div>';
                }
                
                row.appendChild(cell);
            });

            tableBody.appendChild(row);
        });
    }

    createStageCell(stageData) {
        const statusText = this.formatStatus(stageData.status);
        const progressBar = stageData.status === 'in-progress' || stageData.status === 'completed' ? 
            `<div class="progress-bar">
                <div class="progress-fill" style="width: ${stageData.progress}%"></div>
            </div>` : '';
        
        const progressText = stageData.progress > 0 ? 
            `<div class="progress-text">${stageData.progress}%</div>` : '';

        return `
            <div class="status-text">${statusText}</div>
            ${progressBar}
            ${progressText}
        `;
    }

    openProjectModal(project) {
        console.log('🎯 Opening modal for project:', project.name);
        this.currentProject = project;
        
        // Set modal title and current stage
        const modalTitle = document.getElementById('modalProjectName');
        const modalCurrentStage = document.getElementById('modalCurrentStage');
        
        if (modalTitle) modalTitle.textContent = project.name;
        if (modalCurrentStage) modalCurrentStage.textContent = this.formatPlatformName(project.currentStage);
        
        // Reset auto-progress checkbox (removed)
        
        // Render labels
        this.renderLabels(document.getElementById('labelsContainer'), project.labels || {});
        
        // Render stages grid
        this.renderModalStages(project);
        
        // Show modal
        const modal = document.getElementById('projectModal');
        if (modal) modal.style.display = 'block';
    }
    
    renderModalStages(project) {
        const stagesGrid = document.getElementById('modalStagesGrid');
        if (!stagesGrid) return;
        
        stagesGrid.innerHTML = '';
        
        this.platforms.forEach((stageName, index) => {
            const stageData = project.platforms[stageName] || {
                status: 'not-started',
                progress: 0,
                lastUpdated: null
            };
            
            const stageCard = document.createElement('div');
            stageCard.className = `stage-card ${stageData.status}`;
            if (project.currentStage === stageName) {
                stageCard.classList.add('current-stage');
            }
            
            // All stages can be checked/unchecked now
            const isChecked = stageData.status === 'completed';
            
            stageCard.innerHTML = `
                <div class="stage-header">
                    <div class="stage-header-left">
                        <div class="stage-name">${this.formatPlatformName(stageName)}</div>
                        <div class="stage-status ${stageData.status}">${this.formatStatus(stageData.status)}</div>
                    </div>
                    <div class="stage-checkbox-container">
                        <label class="stage-done-checkbox" title="Mark ${this.formatPlatformName(stageName)} as done">
                            <input type="checkbox" 
                                   ${isChecked ? 'checked' : ''} 
                                   onchange="handleStageMarkDone('${project.name}', '${stageName}', this.checked)"
                                   data-stage="${stageName}">
                            <span class="stage-checkmark"></span>
                            <span class="checkbox-label">Done</span>
                        </label>
                    </div>
                </div>
                <div class="stage-progress">
                    <div class="stage-progress-bar">
                        <div class="stage-progress-fill ${stageData.status}" style="width: ${stageData.progress}%"></div>
                    </div>
                    <div class="stage-progress-text">
                        <span>Progress</span>
                        <span>${stageData.progress}%</span>
                    </div>
                </div>
                <div class="stage-updated">
                    Last Updated: ${stageData.lastUpdated ? this.formatDate(stageData.lastUpdated) : 'Never'}
                </div>
            `;
            
            stagesGrid.appendChild(stageCard);
        });
    }

    renderLabels(container, labels) {
        container.innerHTML = '';
        
        if (Object.keys(labels).length === 0) {
            container.innerHTML = '<p style="color: #718096; font-style: italic; margin: 10px 0;">No labels added yet. Click "Add Label" to get started.</p>';
            return;
        }
        
        Object.entries(labels).forEach(([key, value]) => {
            const labelItem = document.createElement('div');
            labelItem.className = 'label-item';
            labelItem.innerHTML = this.createLabelDisplay(key, value);
            container.appendChild(labelItem);
        });
    }

    createLabelDisplay(key, value) {
        const isUrl = this.isValidUrl(value);
        const displayValue = isUrl ? `<a href="${value}" target="_blank">${value}</a>` : value;
        
        // Check if label is pinned
        const isPinned = this.currentProject.labelSettings && 
                        this.currentProject.labelSettings[key] && 
                        this.currentProject.labelSettings[key].pinned;
        
        return `
            <div class="label-display">
                <span class="label-key-display">${key}:</span>
                <span class="label-value-display">${displayValue}</span>
            </div>
            <div class="label-pin-container">
                <label class="label-pin-checkbox">
                    <input type="checkbox" ${isPinned ? 'checked' : ''} 
                           onchange="toggleLabelPin('${key}', this.checked)">
                    <span class="pin-label"></span>
                </label>
            </div>
            <div class="label-actions">
                <button class="label-btn edit" onclick="editLabel('${key}', '${value.replace(/'/g, "\\'")}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="label-btn delete" onclick="deleteLabel('${key}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    }

    createLabelEdit(key = '', value = '', isNew = false) {
        const originalKey = key;
        
        // Check if label is pinned (only for existing labels)
        const isPinned = !isNew && this.currentProject.labelSettings && 
                        this.currentProject.labelSettings[key] && 
                        this.currentProject.labelSettings[key].pinned;
        
        return `
            <input type="text" class="label-input label-key" placeholder="Label name" value="${key}" ${!isNew ? 'readonly' : ''}>
            <input type="text" class="label-input label-value" placeholder="Value or URL" value="${value}">
            <div class="label-pin-container">
                <label class="label-pin-checkbox">
                    <input type="checkbox" class="label-pin-input" ${isPinned ? 'checked' : ''}>
                    <span class="pin-label">Pin to main screen</span>
                </label>
            </div>
            <div class="label-actions">
                <button class="label-btn save" onclick="saveLabel('${originalKey}', ${isNew})">
                    <i class="fas fa-check"></i>
                </button>
                <button class="label-btn cancel" onclick="cancelLabelEdit()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }

    isValidUrl(string) {
        const urlPattern = /^https?:\/\/.+/i;
        return urlPattern.test(string);
    }

    formatPlatformName(platform) {
        const platformNames = {
            'Research': 'Research',
            'coding': 'Coding',
            'unit_testing': 'Unit Testing',
            'MFD': 'MFD',
            'MFA': 'MFA',
            'Beta': 'Beta',
            'Stage': 'Stage',
            'PROD': 'PROD'
        };
        return platformNames[platform] || platform;
    }

    formatStatus(status) {
        const statusNames = {
            'not-started': 'Not Started',
            'pending': 'Pending',
            'in-progress': 'In Progress',
            'completed': 'Completed'
        };
        return statusNames[status] || status;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const options = { 
            month: 'short', 
            day: 'numeric',
            weekday: 'short'
        };
        return date.toLocaleDateString('en-US', options);
    }

    showError(message) {
        const tableBody = document.getElementById('tableBody');
        tableBody.innerHTML = `
            <tr>
                <td colspan="100%" style="text-align: center; padding: 50px; color: #e53e3e; font-size: 1.1rem;">
                    <i class="fas fa-exclamation-triangle" style="margin-right: 10px;"></i>
                    ${message}
                </td>
            </tr>
        `;
    }

    async saveData(maxRetries = 5, initialRetryDelay = 500) {
        // Show saving indicator
        this.showSavingIndicator(true);
        
        let lastError;
        let retryDelay = initialRetryDelay;
        let totalAttempts = 0;
        const maxTotalAttempts = maxRetries * 2; // Allow more attempts for verification failures
        
        while (totalAttempts < maxTotalAttempts) {
            totalAttempts++;
            
            try {
                console.log(`💾 Save attempt ${totalAttempts}/${maxTotalAttempts}`);
                this.logSaveOperation(`Save attempt ${totalAttempts}`, this.data);
                
                // Add a small delay to prevent race conditions
                if (totalAttempts > 1) {
                    await this.delay(retryDelay);
                }
                
                const response = await fetch('data.json', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache',
                    },
                    body: JSON.stringify(this.data, null, 2)
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
                }

                console.log(`✅ Save HTTP request successful on attempt ${totalAttempts}`);
                
                // Critical: Verify the data was actually saved correctly
                const verificationResult = await this.verifySavedData();
                
                if (verificationResult) {
                    console.log(`🎯 Save AND verification successful on attempt ${totalAttempts}`);
                    this.logSaveOperation(`Save SUCCESS with verification on attempt ${totalAttempts}`, this.data);
                    this.showSavingIndicator(false, true); // Show success
                    this.showSaveSuccess();
                    this.unsavedChanges = false; // Mark as saved
                    this.updateUnsavedIndicator(false); // Hide unsaved indicator
                    
                    // Log the save operation
                    this.logSaveOperation('save', this.data);
                    
                    return true;
                } else {
                    this.logSaveOperation(`Save verification FAILED on attempt ${totalAttempts}`, this.data);
                    throw new Error('Save verification failed - saved data does not match intended data');
                }
                
            } catch (error) {
                lastError = error;
                console.error(`❌ Save attempt ${totalAttempts} failed:`, error);
                
                if (totalAttempts < maxTotalAttempts) {
                    console.log(`⏳ Retrying in ${retryDelay}ms...`);
                    // Exponential backoff with jitter
                    retryDelay = Math.floor(retryDelay * 1.5 + Math.random() * 200);
                } else {
                    console.error('💥 All save attempts failed (including verification)');
                    this.showSavingIndicator(false, false); // Show error
                    this.showSaveError(lastError);
                }
            }
        }
        
        return false;
   }

    // Verify that data was saved correctly by reading it back and comparing
    async verifySavedData(maxVerificationAttempts = 3) {
        for (let attempt = 1; attempt <= maxVerificationAttempts; attempt++) {
            try {
                console.log(`🔍 Verification attempt ${attempt}/${maxVerificationAttempts}`);
                
                // Add a small delay to ensure server has processed the save
                await this.delay(200);
                
                const response = await fetch('data.json?t=' + Date.now()); // Cache bust
                if (!response.ok) {
                    throw new Error('Failed to fetch saved data for verification');
                }
                const savedData = await response.json();
                
                // Basic structure validation
                if (!savedData.projects || !Array.isArray(savedData.projects)) {
                    throw new Error('Saved data structure is invalid');
                }
                
                // Deep comparison of critical data
                const verificationResult = this.compareDataStructures(this.data, savedData);
                
                if (verificationResult.isMatch) {
                    console.log('✅ Data verification successful - saved data matches intended data');
                    return true;
                } else {
                    console.warn(`⚠️ Data verification failed on attempt ${attempt}:`, verificationResult.differences);
                    
                    if (attempt < maxVerificationAttempts) {
                        console.log(`🔄 Retrying verification in 500ms...`);
                        await this.delay(500);
                    } else {
                        console.error('💥 Data verification failed after all attempts:', verificationResult.differences);
                        return false;
                    }
                }
            } catch (error) {
                console.warn(`⚠️ Data verification attempt ${attempt} failed:`, error);
                
                if (attempt < maxVerificationAttempts) {
                    await this.delay(500);
                } else {
                    console.error('💥 Data verification failed after all attempts:', error);
                    return false;
                }
            }
        }
        
        return false;
    }

    // Create a backup of data before saving
    createDataBackup() {
        try {
            const backupKey = `tracker_backup_${Date.now()}`;
            const backupData = JSON.stringify(this.data);
            localStorage.setItem(backupKey, backupData);
            
            // Keep only the last 5 backups
            const allKeys = Object.keys(localStorage);
            const backupKeys = allKeys.filter(key => key.startsWith('tracker_backup_')).sort((a, b) => a.localeCompare(b));
            
            if (backupKeys.length > 5) {
                const keysToRemove = backupKeys.slice(0, backupKeys.length - 5);
                keysToRemove.forEach(key => localStorage.removeItem(key));
            }
            
            console.log('📦 Data backup created:', backupKey);
        } catch (error) {
            console.warn('⚠️ Failed to create backup:', error);
        }
    }

    // Enhanced save with backup
    async saveDataWithBackup(maxRetries = 3, retryDelay = 1000) {
        // Create backup before attempting to save
        this.createDataBackup();
        
        return await this.saveData(maxRetries, retryDelay);
    }

    // Helper function for delays
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Show save success notification
    showSaveSuccess() {
        this.showNotification('✅ Data saved successfully!', 'success');
    }

    // Show save error notification with retry option
    showSaveError(error) {
        const message = `❌ Failed to save after ${10} attempts: ${error.message}`;
        this.showNotification(message, 'error', true); // Include retry button
    }

    // Generic notification system with optional retry functionality
    showNotification(message, type = 'info', includeRetry = false) {
        // Remove any existing notifications
        const existingNotification = document.querySelector('.save-notification');
        if (existingNotification) {
            document.body.removeChild(existingNotification);
        }

        const notification = document.createElement('div');
        notification.className = `save-notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 1002;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            animation: slideInRight 0.3s ease, slideOutRight 0.3s ease ${includeRetry ? '10' : '3.7'}s;
            max-width: 350px;
            word-wrap: break-word;
            font-size: 0.9rem;
        `;

        // Set background color based on type
        if (type === 'success') {
            notification.style.background = 'linear-gradient(135deg, #48bb78, #38a169)';
        } else if (type === 'error') {
            notification.style.background = 'linear-gradient(135deg, #e53e3e, #c53030)';
        } else {
            notification.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
        }

        // Create message content
        let content = `<div style="margin-bottom: ${includeRetry ? '10px' : '0'}">${message}</div>`;
        
        // Add retry button for errors
        if (includeRetry && type === 'error') {
            content += `
                <button onclick="retryLastSave()" style="
                    background: rgba(255, 255, 255, 0.2);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    color: white;
                    padding: 6px 12px;
                    border-radius: 4px;
                    font-size: 0.8rem;
                    cursor: pointer;
                    margin-top: 8px;
                ">
                    🔄 Retry Save
                </button>`;
        }

        notification.innerHTML = content;
        document.body.appendChild(notification);

        // Remove after animation
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, includeRetry ? 10000 : 4000);
    }

    showSavingIndicator(saving, success = null) {
        const modalHeader = document.querySelector('.modal-header h2');
        if (!modalHeader) return;
        
        if (saving) {
            modalHeader.innerHTML = modalHeader.textContent + ' <span style="color: #ffa500; font-size: 0.8em;">(Saving...)</span>';
        } else if (success === true) {
            modalHeader.innerHTML = modalHeader.textContent.replace(/ <span.*<\/span>/, '') + ' <span style="color: #38a169; font-size: 0.8em;">(Saved ✓)</span>';
            setTimeout(() => {
                modalHeader.innerHTML = modalHeader.textContent.replace(/ <span.*<\/span>/, '');
            }, 2000);
        } else if (success === false) {
            modalHeader.innerHTML = modalHeader.textContent.replace(/ <span.*<\/span>/, '') + ' <span style="color: #e53e3e; font-size: 0.8em;">(Save Failed ✗)</span>';
            setTimeout(() => {
                modalHeader.innerHTML = modalHeader.textContent.replace(/ <span.*<\/span>/, '');
            }, 3000);
        }
    }

    showAutoProgressSuccess() {
        // Create a temporary success message
        const successMessage = document.createElement('div');
        successMessage.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: linear-gradient(135deg, #48bb78, #38a169);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(72, 187, 120, 0.3);
            font-weight: 600;
            z-index: 1001;
            animation: slideInRight 0.3s ease, slideOutRight 0.3s ease 2.7s;
        `;
        successMessage.innerHTML = `<i class="fas fa-magic"></i> Stages auto-progressed successfully!`;
        
        document.body.appendChild(successMessage);
        
        // Remove after animation
        setTimeout(() => {
            if (successMessage.parentNode) {
                document.body.removeChild(successMessage);
            }
        }, 3000);
    }

    renderMainScreenLabels() {
        const mainLabelsContainer = document.getElementById('mainLabelsContainer');
        if (!mainLabelsContainer || !this.data) return;
        
        mainLabelsContainer.innerHTML = '';
        
        // Group labels by project, only include pinned labels
        const projectsWithPinnedLabels = this.data.projects.filter(project => {
            if (!project.labels || !project.labelSettings) return false;
            
            // Check if any labels are pinned
            return Object.keys(project.labels).some(key => 
                project.labelSettings[key] && project.labelSettings[key].pinned
            );
        });
        
        if (projectsWithPinnedLabels.length === 0) {
            mainLabelsContainer.innerHTML = '<div class="main-labels-empty">No pinned labels found. Pin some labels to see them here!</div>';
            return;
        }
        
        // Sort projects by name
        projectsWithPinnedLabels.sort((a, b) => a.name.localeCompare(b.name));
        
        // Create one sticky note per project
        projectsWithPinnedLabels.forEach((project, projectIndex) => {
            // Filter and sort only pinned labels
            const pinnedLabels = Object.entries(project.labels).filter(([key]) => 
                project.labelSettings && project.labelSettings[key] && project.labelSettings[key].pinned
            );
            pinnedLabels.sort(([a], [b]) => a.localeCompare(b));
            
            if (pinnedLabels.length > 0) {
                const projectStickyNote = document.createElement('div');
                projectStickyNote.className = 'simple-label-item project-sticky-note';
                projectStickyNote.setAttribute('data-project', project.name);
                
                // Build the content for all labels in this project
                let labelsContent = '';
                pinnedLabels.forEach(([key, value]) => {
                    const isUrl = this.isValidUrl(value);
                    const displayValue = isUrl ? `<a href="${value}" target="_blank">${value}</a>` : value;
                    
                    labelsContent += `
                        <div class="project-label-row" data-key="${key}">
                            <div class="label-key">${key}</div>
                            <div class="label-value">${displayValue}</div>
                            <button class="label-unpin-btn" onclick="unpinLabel('${project.name}', '${key}')" title="Unpin this label">×</button>
                        </div>
                    `;
                });
                
                // Sticky note format - project name and all its labels
                projectStickyNote.innerHTML = `
                    <div class="label-project">${project.name}</div>
                    <div class="project-labels-content">
                        ${labelsContent}
                    </div>
                `;
                
                mainLabelsContainer.appendChild(projectStickyNote);
            }
        });
   }
}

// Modal functions
function closeModal() {
    const modal = document.getElementById('projectModal');
    modal.style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('projectModal');
    if (event.target === modal) {
        closeModal();
    }
}

// Utility functions
function loadData() {
    if (window.tracker) {
        window.tracker.loadData();
    }
}

// Initialize the tracker when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.tracker = new ProjectTracker();
});

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        loadData();
    }
    if (e.key === 'Escape') {
        closeModal();
    }
});

// Auto-refresh every 30 seconds (optional)
setInterval(() => {
    if (window.tracker) {
        window.tracker.loadData();
    }
}, 30000);

// Label management functions
function addNewLabel() {
    const container = document.getElementById('labelsContainer');
    const labelItem = document.createElement('div');
    labelItem.className = 'label-item editing';
    labelItem.innerHTML = window.tracker.createLabelEdit('', '', true);
    
    // Remove empty message if it exists
    const emptyMessage = container.querySelector('p');
    if (emptyMessage) {
        emptyMessage.remove();
    }
    
    container.appendChild(labelItem);
    labelItem.querySelector('.label-key').focus();
}

function editLabel(key, value) {
    const container = document.getElementById('labelsContainer');
    const labelItems = container.querySelectorAll('.label-item');
    
    labelItems.forEach(item => {
        const keyDisplay = item.querySelector('.label-key-display');
        if (keyDisplay && keyDisplay.textContent === key + ':') {
            item.innerHTML = window.tracker.createLabelEdit(key, value, false);
            item.classList.add('editing');
            item.querySelector('.label-value').focus();
        }
    });
}

function saveLabel(originalKey, isNew) {
    const container = document.getElementById('labelsContainer');
    const editingItem = container.querySelector('.label-item.editing');
    
    if (!editingItem) return;
    
    const keyInput = editingItem.querySelector('.label-key');
    const valueInput = editingItem.querySelector('.label-value');
    const pinInput = editingItem.querySelector('.label-pin-input');
    
    const newKey = keyInput.value.trim();
    const newValue = valueInput.value.trim();
    const isPinned = pinInput ? pinInput.checked : false;
    
    if (!newKey || !newValue) {
        alert('Both label name and value are required.');
        return;
    }
    
    console.log('💾 Saving label:', { originalKey, newKey, newValue, isPinned, isNew });
    
    // Ensure project data structures exist
    if (!window.tracker.currentProject.labels) {
        window.tracker.currentProject.labels = {};
        console.log('🔧 Created missing labels object');
    }
    
    if (!window.tracker.currentProject.labelSettings) {
        window.tracker.currentProject.labelSettings = {};
        console.log('🔧 Created missing labelSettings object');
    }
    
    // If editing existing label with a new key, remove the old one
    if (!isNew && originalKey !== newKey && window.tracker.currentProject.labels[originalKey]) {
        delete window.tracker.currentProject.labels[originalKey];
        if (window.tracker.currentProject.labelSettings[originalKey]) {
            delete window.tracker.currentProject.labelSettings[originalKey];
        }
        console.log('🗑️ Removed old label:', originalKey);
    }
    
    // Set the new label data
    window.tracker.currentProject.labels[newKey] = newValue;
    window.tracker.currentProject.labelSettings[newKey] = {
        pinned: isPinned
    };
    
    console.log('✅ Label data updated in memory:', {
        labels: window.tracker.currentProject.labels,
        labelSettings: window.tracker.currentProject.labelSettings
    });
    
    // Mark data as changed
    window.tracker.markDataChanged();
    
    // Re-render labels immediately
    window.tracker.renderLabels(container, window.tracker.currentProject.labels);
    
    // Save to server with enhanced logging
    console.log('💾 Starting save operation...');
    window.tracker.saveDataWithBackup().then(success => {
        if (success) {
            console.log('✅ Label saved successfully:', newKey, newValue, 'Pinned:', isPinned);
            // Refresh main screen labels
            window.tracker.renderMainScreenLabels();
        } else {
            console.error('❌ Failed to save label after all retries');
            // Show user-friendly error message
            alert('Failed to save label. Please check your connection and try again.');
        }
    }).catch(error => {
        console.error('💥 Save operation threw an error:', error);
        alert('An error occurred while saving. Please try again.');
    });
}

function deleteLabel(key) {
    if (confirm(`Are you sure you want to delete the label "${key}"?`)) {
        delete window.tracker.currentProject.labels[key];
        
        // Also clean up labelSettings
        if (window.tracker.currentProject.labelSettings && window.tracker.currentProject.labelSettings[key]) {
            delete window.tracker.currentProject.labelSettings[key];
        }
        
        // Mark data as changed
        window.tracker.markDataChanged();
        
        const container = document.getElementById('labelsContainer');
        window.tracker.renderLabels(container, window.tracker.currentProject.labels);
        
        // Save to server with backup and retry logic
        window.tracker.saveDataWithBackup().then(success => {
            if (success) {
                console.log('Label deleted:', key);
                // Refresh main screen labels
                window.tracker.renderMainScreenLabels();
            } else {
                console.error('Failed to save label deletion after all retries');
            }
        });
    }
}

function cancelLabelEdit() {
    const container = document.getElementById('labelsContainer');
    const editingItem = container.querySelector('.label-item.editing');
    
    if (editingItem) {
        // If it's a new label, just remove it
        const keyInput = editingItem.querySelector('.label-key');
        if (!keyInput.readOnly) {
            editingItem.remove();
            
            // Show empty message if no labels left
            if (container.children.length === 0) {
                window.tracker.renderLabels(container, {});
            }
        } else {
            // If editing existing label, restore original display
            window.tracker.renderLabels(container, window.tracker.currentProject.labels);
        }
    }
}

// Manual save function for the save button
ProjectTracker.prototype.manualSave = async function() {
    const saveBtn = document.querySelector('.save-btn');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    }

    const success = await this.saveDataWithBackup();
    
    if (saveBtn) {
        if (success) {
            saveBtn.innerHTML = '<i class="fas fa-check"></i> Saved!';
            setTimeout(() => {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fas fa-save"></i> Save';
            }, 2000);
        } else {
            saveBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Failed';
            setTimeout(() => {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fas fa-save"></i> Save';
            }, 3000);
        }
    }
    
    return success;
}

// Global function for manual save button
function manualSave() {
    if (window.tracker) {
        return window.tracker.manualSave();
    }
}

// Global function for retrying the last save operation
function retryLastSave() {
    if (window.tracker) {
        console.log('🔄 Retrying save operation...');
        return window.tracker.saveDataWithBackup();
    }
}

// Global function for individual stage checkboxes
function handleStageMarkDone(projectName, stageName, isChecked) {
    console.log(`🎯 Stage mark done: ${projectName} - ${stageName} - ${isChecked}`);
    
    if (!window.tracker || !window.tracker.currentProject) {
        console.warn('⚠️ No current project available');
        return;
    }
    
    const project = window.tracker.currentProject;
    if (project.name !== projectName) {
        console.warn('⚠️ Project name mismatch');
        return;
    }
    
    if (isChecked) {
        window.tracker.markStageAsDone(project, stageName);
    } else {
        window.tracker.unmarkStageAsDone(project, stageName);
    }
}

// Add to ProjectTracker class methods
ProjectTracker.prototype.markStageAsDone = function(project, stageName) {
    console.log(`✅ Marking stage "${stageName}" as done for project "${project.name}"`);
    
    const stageIndex = this.platforms.indexOf(stageName);
    if (stageIndex === -1) {
        console.warn(`⚠️ Stage "${stageName}" not found in platforms list`);
        return;
    }
    
    // Mark all stages up to and including the selected stage as completed
    for (let i = 0; i <= stageIndex; i++) {
        const currentStageName = this.platforms[i];
        const currentStageData = project.platforms[currentStageName];
        
        if (currentStageData && currentStageData.status !== 'completed') {
            console.log(`✅ Auto-marking "${currentStageName}" as completed`);
            currentStageData.status = 'completed';
            currentStageData.progress = 100;
            currentStageData.lastUpdated = this.getCurrentDate();
        }
    }
    
    // Update current stage to the next incomplete stage or keep at the selected stage
    this.updateCurrentStageAfterCompletion(project, stageIndex);
    
    // Mark data as changed
    this.markDataChanged();
    
    // Save changes and refresh UI
    this.saveAndRefreshAfterStageChange(project, stageName, 'marked as done (sequential)');
};

ProjectTracker.prototype.unmarkStageAsDone = function(project, stageName) {
    console.log(`❌ Unmarking stage "${stageName}" as done for project "${project.name}"`);
    
    const stageIndex = this.platforms.indexOf(stageName);
    if (stageIndex === -1) {
        console.warn(`⚠️ Stage "${stageName}" not found in platforms list`);
        return;
    }
    
    // Unmark the selected stage and all stages after it
    for (let i = stageIndex; i < this.platforms.length; i++) {
        const currentStageName = this.platforms[i];
        const currentStageData = project.platforms[currentStageName];
        
        if (currentStageData) {
            if (i === stageIndex) {
                // The unchecked stage becomes in-progress
                console.log(`❌ Unmarking "${currentStageName}" - setting to in-progress`);
                currentStageData.status = 'in-progress';
                currentStageData.progress = 75;
                currentStageData.lastUpdated = this.getCurrentDate();
            } else {
                // All stages after the unchecked stage become not-started
                console.log(`⏸️ Setting "${currentStageName}" to not-started`);
                currentStageData.status = 'not-started';
                currentStageData.progress = 0;
                currentStageData.lastUpdated = null;
            }
        }
    }
    
    // Set the unmarked stage as the current stage
    console.log(`⬅️ Moving current stage back to "${stageName}"`);
    project.currentStage = stageName;
    
    // Mark data as changed
    this.markDataChanged();
    
    // Update modal current stage display
    const modalCurrentStage = document.getElementById('modalCurrentStage');
    if (modalCurrentStage) {
        modalCurrentStage.textContent = this.formatPlatformName(stageName);
    }
    
    // Save changes and refresh UI
    this.saveAndRefreshAfterStageChange(project, stageName, 'unmarked as done (sequential)');
};

ProjectTracker.prototype.advanceToNextStage = function(project, completedStageName) {
    const currentStageIndex = this.platforms.indexOf(completedStageName);
    
    if (currentStageIndex < this.platforms.length - 1) {
        const nextStageIndex = currentStageIndex + 1;
        const nextStageName = this.platforms[nextStageIndex];
        const nextStageData = project.platforms[nextStageName];
        
        if (nextStageData && nextStageData.status === 'not-started') {
            console.log(`➡️ Advancing to next stage: "${nextStageName}"`);
            project.currentStage = nextStageName;
            nextStageData.status = 'in-progress';
            nextStageData.progress = 10; // Initial progress for new stage
            nextStageData.lastUpdated = this.getCurrentDate();
            
            // Update modal current stage display
            const modalCurrentStage = document.getElementById('modalCurrentStage');
            if (modalCurrentStage) {
                modalCurrentStage.textContent = this.formatPlatformName(nextStageName);
            }
        }
    } else {
        console.log('🎉 Project completed! All stages done.');
    }
};

ProjectTracker.prototype.saveAndRefreshAfterStageChange = function(project, stageName, action) {
    this.saveDataWithBackup().then(success => {
        if (success) {
            console.log(`✅ Stage ${action} - changes saved successfully`);
            // Refresh the modal display
            this.renderModalStages(project);
            // Refresh the main table
            this.renderTable();
            // Update labels display
            this.updateSimpleLabelsDisplay();
            // Show success message
            this.showStageChangeSuccess(stageName, action);
        } else {
            console.error(`❌ Failed to save stage ${action} after all retries`);
        }
    });
};

ProjectTracker.prototype.showStageChangeSuccess = function(stageName, action) {
    const successMessage = document.createElement('div');
    successMessage.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: linear-gradient(135deg, #48bb78, #38a169);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(72, 187, 120, 0.3);
        font-weight: 600;
        z-index: 1001;
        animation: slideInRight 0.3s ease, slideOutRight 0.3s ease 2.7s;
    `;
    successMessage.innerHTML = `<i class="fas fa-check-circle"></i> ${this.formatPlatformName(stageName)} ${action}!`;
    
    document.body.appendChild(successMessage);
    
    // Remove after animation
    setTimeout(() => {
        if (successMessage.parentNode) {
            document.body.removeChild(successMessage);
        }
    }, 3000);
};

ProjectTracker.prototype.updateCurrentStageAfterCompletion = function(project, completedStageIndex) {
    // Find the next incomplete stage to set as current
    let nextCurrentStageIndex = completedStageIndex + 1;
    
    // If we completed the last stage, keep current stage at the last one
    if (nextCurrentStageIndex >= this.platforms.length) {
        project.currentStage = this.platforms[this.platforms.length - 1];
        console.log('🎉 Project completed! All stages done.');
        return;
    }
    
    // Find the next incomplete stage
    while (nextCurrentStageIndex < this.platforms.length) {
        const nextStageName = this.platforms[nextCurrentStageIndex];
        const nextStageData = project.platforms[nextStageName];
        
        if (nextStageData && nextStageData.status !== 'completed') {
            project.currentStage = nextStageName;
            
            // Set as in-progress if it was not-started
            if (nextStageData.status === 'not-started') {
                nextStageData.status = 'in-progress';
                nextStageData.progress = 10;
                nextStageData.lastUpdated = this.getCurrentDate();
            }
            
            console.log(`➡️ Advanced current stage to: "${nextStageName}"`);
            
            // Update modal current stage display
            const modalCurrentStage = document.getElementById('modalCurrentStage');
            if (modalCurrentStage) {
                modalCurrentStage.textContent = this.formatPlatformName(nextStageName);
            }
            return;
        }
        nextCurrentStageIndex++;
    }
    
    // If all stages are completed, keep current stage at the last one
    project.currentStage = this.platforms[this.platforms.length - 1];
    console.log('🎉 All stages completed!');
};

ProjectTracker.prototype.compareDataStructures = function(intended, saved) {
    const differences = [];
    
    try {
        // Compare project count
        if (intended.projects.length !== saved.projects.length) {
            differences.push(`Project count mismatch: intended ${intended.projects.length}, saved ${saved.projects.length}`);
        }
        
        // Compare each project
        for (let i = 0; i < intended.projects.length; i++) {
            const intendedProject = intended.projects[i];
            const savedProject = saved.projects[i];
            
            if (!savedProject) {
                differences.push(`Project ${i} missing in saved data`);
                continue;
            }
            
            // Compare project name
            if (intendedProject.name !== savedProject.name) {
                differences.push(`Project ${i} name mismatch: intended "${intendedProject.name}", saved "${savedProject.name}"`);
            }
            
            // Compare current stage
            if (intendedProject.currentStage !== savedProject.currentStage) {
                differences.push(`Project ${i} currentStage mismatch: intended "${intendedProject.currentStage}", saved "${savedProject.currentStage}"`);
            }
            
            // Compare labels (critical for the user's request)
            const labelDiffs = this.compareObjects(intendedProject.labels || {}, savedProject.labels || {}, `Project ${i} labels`);
            differences.push(...labelDiffs);
            
            // Compare label settings (critical for pin functionality)
            const labelSettingDiffs = this.compareObjects(intendedProject.labelSettings || {}, savedProject.labelSettings || {}, `Project ${i} labelSettings`);
            differences.push(...labelSettingDiffs);
            
            // Compare platform statuses
            const platformDiffs = this.comparePlatforms(intendedProject.platforms || {}, savedProject.platforms || {}, `Project ${i} platforms`);
            differences.push(...platformDiffs);
        }
        
        return {
            isMatch: differences.length === 0,
            differences: differences
        };
        
    } catch (error) {
        return {
            isMatch: false,
            differences: [`Comparison error: ${error.message}`]
        };
    }
};

ProjectTracker.prototype.compareObjects = function(intended, saved, context) {
    const differences = [];
    
    // Check all intended keys exist in saved with correct values
    for (const [key, value] of Object.entries(intended)) {
        if (!(key in saved)) {
            differences.push(`${context}: Missing key "${key}"`);
        } else if (typeof value === 'object' && value !== null) {
            // Deep comparison for nested objects (like labelSettings)
            const nestedDiffs = this.compareObjects(value, saved[key] || {}, `${context}.${key}`);
            differences.push(...nestedDiffs);
        } else if (saved[key] !== value) {
            differences.push(`${context}: Key "${key}" value mismatch: intended "${value}", saved "${saved[key]}"`);
        }
    }
    
    // Check for extra keys in saved that weren't intended
    for (const key of Object.keys(saved)) {
        if (!(key in intended)) {
            if (typeof saved[key] === 'object' && saved[key] !== null) {
                differences.push(`${context}: Unexpected object key "${key}"`);
            } else {
                differences.push(`${context}: Unexpected key "${key}" with value "${saved[key]}"`);
            }
        }
    }
    
    return differences;
};

ProjectTracker.prototype.comparePlatforms = function(intended, saved, context) {
    const differences = [];
    
    for (const [platform, intendedData] of Object.entries(intended)) {
        const savedData = saved[platform];
        
        if (!savedData) {
            differences.push(`${context}: Missing platform "${platform}"`);
            continue;
        }
        
        // Compare status
        if (intendedData.status !== savedData.status) {
            differences.push(`${context} ${platform}: Status mismatch: intended "${intendedData.status}", saved "${savedData.status}"`);
        }
        
        // Compare progress
        if (intendedData.progress !== savedData.progress) {
            differences.push(`${context} ${platform}: Progress mismatch: intended ${intendedData.progress}, saved ${savedData.progress}`);
        }
        
        // Compare lastUpdated
        if (intendedData.lastUpdated !== savedData.lastUpdated) {
            differences.push(`${context} ${platform}: LastUpdated mismatch: intended "${intendedData.lastUpdated}", saved "${savedData.lastUpdated}"`);
        }
    }
    
    return differences;
};

// Enhanced logging for save operations with detailed data snapshots
ProjectTracker.prototype.logSaveOperation = function(operation, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        operation,
        dataSnapshot: data ? {
            projectCount: data.projects?.length || 0,
            projectNames: data.projects?.map(p => p.name) || [],
            totalLabels: data.projects?.reduce((total, p) => total + Object.keys(p.labels || {}).length, 0) || 0
        } : null
    };
    
    console.log(`📊 Save Operation Log [${timestamp}]:`, logEntry);
    
    // Store in localStorage for debugging
    try {
        const logs = JSON.parse(localStorage.getItem('tracker_save_logs') || '[]');
        logs.push(logEntry);
        
        // Keep only last 20 log entries
        if (logs.length > 20) {
            logs.splice(0, logs.length - 20);
        }
        
        localStorage.setItem('tracker_save_logs', JSON.stringify(logs));
    } catch (error) {
        console.warn('Failed to store save log:', error);
    }
};

// Debug tools for label saving issues
window.debugLabelSave = function() {
    console.group('🔍 Label Save Debug Information');
    
    if (!window.tracker) {
        console.error('❌ Tracker not initialized');
        console.groupEnd();
        return;
    }
    
    if (!window.tracker.currentProject) {
        console.error('❌ No current project selected');
        console.groupEnd();
        return;
    }
    
    console.log('📊 Current Project Data:');
    console.log('Project Name:', window.tracker.currentProject.name);
    console.log('Labels:', window.tracker.currentProject.labels);
    console.log('Label Settings:', window.tracker.currentProject.labelSettings);
    
    console.log('💾 Full Data Structure:');
    console.log(JSON.stringify(window.tracker.data, null, 2));
    
    console.log('🔄 Testing save operation...');
    window.tracker.saveDataWithBackup().then(success => {
        if (success) {
            console.log('✅ Save test successful');
        } else {
            console.error('❌ Save test failed');
        }
        console.groupEnd();
    }).catch(error => {
        console.error('💥 Save test error:', error);
        console.groupEnd();
    });
};

window.validateDataStructure = function() {
    console.group('🔍 Data Structure Validation');
    
    if (!window.tracker || !window.tracker.data) {
        console.error('❌ No data to validate');
        console.groupEnd();
        return;
    }
    
    const data = window.tracker.data;
    let issues = [];
    
    // Check basic structure
    if (!data.projects || !Array.isArray(data.projects)) {
        issues.push('❌ Projects is not an array');
    }
    
    // Check each project
    data.projects.forEach((project, index) => {
        if (!project.name) {
            issues.push(`❌ Project ${index} missing name`);
        }
        
        if (!project.labels) {
            issues.push(`❌ Project ${index} (${project.name}) missing labels object`);
        }
        
        if (!project.labelSettings) {
            issues.push(`⚠️ Project ${index} (${project.name}) missing labelSettings object`);
        }
        
        // Check label consistency
        if (project.labels && project.labelSettings) {
            const labelKeys = Object.keys(project.labels);
            const settingKeys = Object.keys(project.labelSettings);
            
            labelKeys.forEach(key => {
                if (!project.labelSettings[key]) {
                    issues.push(`⚠️ Project ${index} (${project.name}) label "${key}" has no settings`);
                }
            });
            
            settingKeys.forEach(key => {
                if (!project.labels[key]) {
                    issues.push(`❌ Project ${index} (${project.name}) has settings for missing label "${key}"`);
                }
            });
        }
    });
    
    if (issues.length === 0) {
        console.log('✅ Data structure is valid');
    } else {
        console.warn(`⚠️ Found ${issues.length} issues:`);
        issues.forEach(issue => console.log(issue));
    }
    
    console.groupEnd();
    return issues;
};

window.forceDataRepair = function() {
    console.group('🔧 Forcing Data Repair');
    
    if (!window.tracker || !window.tracker.data) {
        console.error('❌ No data to repair');
        console.groupEnd();
        return;
    }
    
    let repairsMade = 0;
    
    window.tracker.data.projects.forEach((project, index) => {
        // Ensure labels object exists
        if (!project.labels) {
            project.labels = {};
            repairsMade++;
            console.log(`🔧 Added missing labels object to project ${index} (${project.name})`);
        }
        
        // Ensure labelSettings object exists
        if (!project.labelSettings) {
            project.labelSettings = {};
            repairsMade++;
            console.log(`🔧 Added missing labelSettings object to project ${index} (${project.name})`);
        }
        
        // Add missing label settings
        Object.keys(project.labels).forEach(key => {
            if (!project.labelSettings[key]) {
                project.labelSettings[key] = { pinned: false };
                repairsMade++;
                console.log(`🔧 Added missing settings for label "${key}" in project ${index} (${project.name})`);
            }
        });
        
        // Remove orphaned label settings
        Object.keys(project.labelSettings).forEach(key => {
            if (!project.labels[key]) {
                delete project.labelSettings[key];
                repairsMade++;
                console.log(`🔧 Removed orphaned settings for missing label "${key}" in project ${index} (${project.name})`);
            }
        });
    });
    
    if (repairsMade > 0) {
        console.log(`🔧 Made ${repairsMade} repairs to data structure`);
        window.tracker.markDataChanged();
        
        // Save the repaired data
        window.tracker.saveDataWithBackup().then(success => {
            if (success) {
                console.log('✅ Repaired data saved successfully');
            } else {
                console.error('❌ Failed to save repaired data');
            }
            console.groupEnd();
        });
    } else {
        console.log('✅ No repairs needed');
        console.groupEnd();
    }
};

// Enhanced error logging for save operations
ProjectTracker.prototype.logSaveOperation = function(operation, data) {
    try {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            operation,
            projectCount: data ? data.projects.length : 0,
            totalLabels: data ? data.projects.reduce((total, p) => total + Object.keys(p.labels || {}).length, 0) : 0,
            dataSize: JSON.stringify(data || {}).length
        };
        
        console.log(`📝 Save Log [${timestamp}]:`, logEntry);
        
        // Store recent logs in localStorage for debugging
        const logs = JSON.parse(localStorage.getItem('tracker_save_logs') || '[]');
        logs.push(logEntry);
        
        // Keep only last 20 logs
        if (logs.length > 20) {
            logs.splice(0, logs.length - 20);
        }
        
        localStorage.setItem('tracker_save_logs', JSON.stringify(logs));
    } catch (error) {
        console.warn('Failed to log save operation:', error);
    }
};

window.showSaveLogs = function() {
    const logs = JSON.parse(localStorage.getItem('tracker_save_logs') || '[]');
    console.group('📝 Recent Save Logs');
    logs.forEach(log => console.log(log));
    console.groupEnd();
};

// Pin/Unpin functionality for labels
function toggleLabelPin(key, isPinned) {
    if (!window.tracker || !window.tracker.currentProject) {
        console.error('No current project selected');
        return;
    }
    
    // Initialize labelSettings if it doesn't exist
    if (!window.tracker.currentProject.labelSettings) {
        window.tracker.currentProject.labelSettings = {};
    }
    
    // Initialize settings for this label if it doesn't exist
    if (!window.tracker.currentProject.labelSettings[key]) {
        window.tracker.currentProject.labelSettings[key] = {};
    }
    
    // Update pin status
    window.tracker.currentProject.labelSettings[key].pinned = isPinned;
    
    // Mark data as changed
    window.tracker.markDataChanged();
    
    // Save to server with backup and retry logic
    window.tracker.saveDataWithBackup().then(success => {
        if (success) {
            console.log('Label pin status updated:', key, 'Pinned:', isPinned);
            // Refresh main screen labels
            window.tracker.renderMainScreenLabels();
        } else {
            console.error('Failed to save label pin status after all retries');
        }
    });
}

function unpinLabel(projectName, key) {
    if (!window.tracker || !window.tracker.data) {
        console.error('No data available');
        return;
    }
    
    // Find the project
    const project = window.tracker.data.projects.find(p => p.name === projectName);
    if (!project) {
        console.error('Project not found:', projectName);
        return;
    }
    
    // Initialize labelSettings if it doesn't exist
    if (!project.labelSettings) {
        project.labelSettings = {};
    }
    
    // Initialize settings for this label if it doesn't exist
    if (!project.labelSettings[key]) {
        project.labelSettings[key] = {};
    }
    
    // Unpin the label
    project.labelSettings[key].pinned = false;
    
    // Mark data as changed
    window.tracker.markDataChanged();
    
    // Save to server with backup and retry logic
    window.tracker.saveDataWithBackup().then(success => {
        if (success) {
            console.log('Label unpinned:', projectName, key);
            // Refresh main screen labels
            window.tracker.renderMainScreenLabels();
        } else {
            console.error('Failed to save label unpin status after all retries');
        }
    });
}

// Auto-validate and repair data on load
ProjectTracker.prototype.validateAndRepairDataOnLoad = function() {
    console.group('🔍 Auto-validating data structure on load');
    
    if (!this.data || !this.data.projects) {
        console.error('❌ Invalid data structure detected');
        console.groupEnd();
        return;
    }
    
    let repairsMade = 0;
    
    this.data.projects.forEach((project, index) => {
        // Ensure labels object exists
        if (!project.labels) {
            project.labels = {};
            repairsMade++;
            console.log(`🔧 Added missing labels object to project ${index} (${project.name})`);
        }
        
        // Ensure labelSettings object exists
        if (!project.labelSettings) {
            project.labelSettings = {};
            repairsMade++;
            console.log(`🔧 Added missing labelSettings object to project ${index} (${project.name})`);
        }
        
        // Add missing label settings for existing labels
        Object.keys(project.labels).forEach(key => {
            if (!project.labelSettings[key]) {
                project.labelSettings[key] = { pinned: false };
                repairsMade++;
                console.log(`🔧 Added missing settings for label "${key}" in project ${index} (${project.name})`);
            }
        });
        
        // Remove orphaned label settings
        Object.keys(project.labelSettings).forEach(key => {
            if (!project.labels[key]) {
                delete project.labelSettings[key];
                repairsMade++;
                console.log(`🔧 Removed orphaned settings for missing label "${key}" in project ${index} (${project.name})`);
            }
        });
    });
    
    if (repairsMade > 0) {
        console.log(`🔧 Made ${repairsMade} repairs to data structure`);
        this.markDataChanged();
        
        // Auto-save the repaired data
        this.saveDataWithBackup().then(success => {
            if (success) {
                console.log('✅ Repaired data auto-saved successfully');
            } else {
                console.warn('⚠️ Failed to auto-save repaired data');
            }
        });
    } else {
        console.log('✅ Data structure is valid, no repairs needed');
    }
    
    console.groupEnd();
};

class ProjectTracker {
    constructor() {
        this.data = null;
        this.platforms = ['Research', 'coding', 'unit_testing', 'MFD', 'MFA', 'Beta', 'Stage', 'PROD'];
        this.showCompletedProjects = true;
        this.init();
    }

    init() {
        this.loadData();
        this.setupEventListeners();
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
        } catch (error) {
            console.error('Error loading data:', error);
            this.showError('Failed to load project data. Please check if data.json exists.');
        }
    }

    renderTable() {
        this.renderHeader();
        this.renderBody();
        this.updatePinnedLabelsDisplay();
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
        const modal = document.getElementById('projectModal');
        const modalProjectName = document.getElementById('modalProjectName');
        const modalCurrentStage = document.getElementById('modalCurrentStage');
        const modalStagesGrid = document.getElementById('modalStagesGrid');
        const labelsContainer = document.getElementById('labelsContainer');

        modalProjectName.textContent = project.name;
        modalCurrentStage.textContent = this.formatPlatformName(project.currentStage);
        
        // Store current project for label operations
        this.currentProject = project;
        
        // Render labels
        this.renderLabels(labelsContainer, project.labels || {});
        
        // Clear and populate stages grid
        modalStagesGrid.innerHTML = '';
        
        this.platforms.forEach(platform => {
            const stageData = project.platforms[platform];
            if (stageData) {
                const stageCard = document.createElement('div');
                stageCard.className = `stage-card ${platform === project.currentStage ? 'active' : ''}`;
                
                stageCard.innerHTML = `
                    <div class="stage-header">
                        <div class="stage-name">${this.formatPlatformName(platform)}</div>
                        <div class="stage-status ${stageData.status}">${this.formatStatus(stageData.status)}</div>
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
                
                modalStagesGrid.appendChild(stageCard);
            }
        });

        modal.style.display = 'block';
    }

    renderLabels(container, labels) {
        container.innerHTML = '';
        
        if (Object.keys(labels).length === 0) {
            container.innerHTML = '<p style="color: #718096; font-style: italic; margin: 10px 0;">No labels added yet. Click "Add Label" to get started.</p>';
            return;
        }
        
        Object.entries(labels).forEach(([key, labelData]) => {
            const labelItem = document.createElement('div');
            labelItem.className = 'label-item';
            
            // Handle both old string format and new object format
            const value = typeof labelData === 'string' ? labelData : labelData.value;
            const pinned = typeof labelData === 'object' ? labelData.pinned : false;
            
            labelItem.innerHTML = this.createLabelDisplay(key, value, pinned);
            container.appendChild(labelItem);
        });
        
        // Update pinned labels display after rendering
        this.updatePinnedLabelsDisplay();
    }

    createLabelDisplay(key, value, pinned = false) {
        const isUrl = this.isValidUrl(value);
        const displayValue = isUrl ? `<a href="${value}" target="_blank">${value}</a>` : value;
        const pinIcon = pinned ? 'fas fa-thumbtack' : 'far fa-circle';
        const pinClass = pinned ? 'pinned' : '';
        const escapedValue = value.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        
        return `
            <div class="label-display">
                <span class="label-key-display">${key}:</span>
                <span class="label-value-display">${displayValue}</span>
            </div>
            <div class="label-actions">
                <button class="pin-button ${pinClass}" onclick="togglePin('${key}')" title="${pinned ? 'Unpin' : 'Pin'} this label">
                    <i class="${pinIcon}"></i>
                </button>
                <button class="label-btn edit" onclick="editLabel('${key}', '${escapedValue}')">
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
        return `
            <input type="text" class="label-input label-key" placeholder="Label name" value="${key}" ${!isNew ? 'readonly' : ''}>
            <input type="text" class="label-input label-value" placeholder="Value or URL" value="${value}">
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

    async saveData() {
        // Show saving indicator
        this.showSavingIndicator(true);
        
        try {
            console.log('Saving data:', JSON.stringify(this.data, null, 2));
            
            const response = await fetch('data.json', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.data, null, 2)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
            }
            
            const responseData = await response.json();
            console.log('Data saved successfully:', responseData);
            this.showSavingIndicator(false, true); // Show success
            return true;
        } catch (error) {
            console.error('Error saving data:', error);
            this.showSavingIndicator(false, false); // Show error
            alert(`Failed to save data. Error: ${error.message}`);
            return false;
        }
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

    updatePinnedLabelsDisplay() {
        const pinnedLabelsSection = document.getElementById('pinnedLabelsSection');
        const pinnedLabelsContainer = document.getElementById('pinnedLabelsContainer');
        
        if (!this.data || !this.data.projects) return;
        
        // Collect all pinned labels grouped by project
        const pinnedLabelsByProject = {};
        
        this.data.projects.forEach(project => {
            if (project.labels) {
                const pinnedLabels = {};
                Object.entries(project.labels).forEach(([key, labelData]) => {
                    // Handle both old string format and new object format
                    const pinned = typeof labelData === 'object' ? labelData.pinned : false;
                    if (pinned) {
                        const value = typeof labelData === 'string' ? labelData : labelData.value;
                        pinnedLabels[key] = value;
                    }
                });
                
                if (Object.keys(pinnedLabels).length > 0) {
                    pinnedLabelsByProject[project.name] = pinnedLabels;
                }
            }
        });
        
        // Show/hide section based on whether there are pinned labels
        if (Object.keys(pinnedLabelsByProject).length === 0) {
            pinnedLabelsSection.style.display = 'none';
            return;
        }
        
        pinnedLabelsSection.style.display = 'block';
        
        // Render pinned labels by project
        pinnedLabelsContainer.innerHTML = '';
        
        Object.entries(pinnedLabelsByProject).forEach(([projectName, labels]) => {
            const projectGroup = document.createElement('div');
            projectGroup.className = 'pinned-project-group';
            
            const projectNameDiv = document.createElement('div');
            projectNameDiv.className = 'pinned-project-name';
            projectNameDiv.textContent = projectName;
            
            const labelsListDiv = document.createElement('div');
            labelsListDiv.className = 'pinned-labels-list';
            
            Object.entries(labels).forEach(([key, value]) => {
                const labelItem = document.createElement('div');
                labelItem.className = 'pinned-label-item';
                
                const isUrl = this.isValidUrl(value);
                const displayValue = isUrl ? `<a href="${value}" target="_blank">${value}</a>` : value;
                
                labelItem.innerHTML = `
                    <span class="pinned-label-key">${key}:</span>
                    <span class="pinned-label-value">${displayValue}</span>
                `;
                
                labelsListDiv.appendChild(labelItem);
            });
            
            projectGroup.appendChild(projectNameDiv);
            projectGroup.appendChild(labelsListDiv);
            pinnedLabelsContainer.appendChild(projectGroup);
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
    
    const newKey = keyInput.value.trim();
    const newValue = valueInput.value.trim();
    
    console.log('Saving label:', { originalKey, newKey, newValue, isNew });
    
    if (!newKey || !newValue) {
        alert('Both label name and value are required.');
        return;
    }
    
    // Update the project data
    if (!window.tracker.currentProject.labels) {
        window.tracker.currentProject.labels = {};
    }
    
    // Preserve pin status if editing existing label
    let pinned = false;
    if (!isNew && window.tracker.currentProject.labels[originalKey]) {
        const existingLabel = window.tracker.currentProject.labels[originalKey];
        pinned = typeof existingLabel === 'object' ? existingLabel.pinned : false;
        console.log('Preserving pin status:', pinned);
    }
    
    // If editing existing label with a new key, remove the old one
    if (!isNew && originalKey !== newKey && window.tracker.currentProject.labels[originalKey]) {
        delete window.tracker.currentProject.labels[originalKey];
        console.log('Deleted old label:', originalKey);
    }
    
    // Save in new object format
    window.tracker.currentProject.labels[newKey] = {
        value: newValue,
        pinned: pinned
    };
    
    console.log('Updated project labels:', window.tracker.currentProject.labels);
    console.log('Current project in data:', window.tracker.data.projects.find(p => p.name === window.tracker.currentProject.name));
    
    // Re-render labels
    window.tracker.renderLabels(container, window.tracker.currentProject.labels);
    
    // Save to server
    window.tracker.saveData().then(success => {
        if (success) {
            console.log('Label saved successfully:', newKey, newValue);
        } else {
            console.log('Label save failed');
        }
    });
}

function deleteLabel(key) {
    if (confirm(`Are you sure you want to delete the label "${key}"?`)) {
        delete window.tracker.currentProject.labels[key];
        
        const container = document.getElementById('labelsContainer');
        window.tracker.renderLabels(container, window.tracker.currentProject.labels);
        
        // Save to server
        window.tracker.saveData().then(success => {
            if (success) {
                console.log('Label deleted:', key);
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

function togglePin(key) {
    if (!window.tracker.currentProject.labels[key]) return;
    
    // Ensure label is in new object format
    let labelData = window.tracker.currentProject.labels[key];
    if (typeof labelData === 'string') {
        // Convert old format to new format
        labelData = { value: labelData, pinned: false };
        window.tracker.currentProject.labels[key] = labelData;
    }
    
    // Toggle pin status
    labelData.pinned = !labelData.pinned;
    
    // Re-render labels
    const container = document.getElementById('labelsContainer');
    window.tracker.renderLabels(container, window.tracker.currentProject.labels);
    
    // Save to server
    window.tracker.saveData().then(success => {
        if (success) {
            console.log('Label pin status updated:', key, labelData.pinned);
        }
    });
}

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

        modalProjectName.textContent = project.name;
        modalCurrentStage.textContent = this.formatPlatformName(project.currentStage);
        
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

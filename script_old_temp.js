class ProjectTracker {
    constructor() {
        this.data = null;
        this.platforms = ['Research', 'coding', 'unit_testing', 'MFD', 'MFA', 'Beta', 'Stage', 'PROD'];
        this.currentDate = this.getCurrentDate();
        this.init();
    }

    init() {
        this.displayCurrentDate();
        this.loadData();
    }

    getCurrentDate() {
        const today = new Date();
        return today.toISOString().split('T')[0];
    }

    displayCurrentDate() {
        const currentDateElement = document.getElementById('currentDate');
        const today = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        currentDateElement.textContent = today.toLocaleDateString('en-US', options);
    }

    async loadData() {
        try {
            const response = await fetch('data.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.data = await response.json();
            this.generateDateRange();
            this.renderTable();
        } catch (error) {
            console.error('Error loading data:', error);
            this.showError('Failed to load project data. Please check if data.json exists.');
        }
    }

    generateDateRange() {
        const startDate = new Date(this.data.dateRange.startDate);
        const endDate = new Date(this.data.dateRange.endDate);
        const dates = [];
        
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            dates.push(new Date(currentDate).toISOString().split('T')[0]);
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        this.dates = dates;
    }

    renderTable() {
        this.renderHeader();
        this.renderBody();
        this.highlightFirstCodingProject();
    }

    renderHeader() {
        const headerRow = document.getElementById('headerRow');
        
        // Clear existing headers except stage column
        headerRow.innerHTML = '<th class="date-column sticky-column">Stage</th>';
        
        // Add project headers (one column per project)
        this.data.projects.forEach(project => {
            const projectHeader = document.createElement('th');
            projectHeader.className = 'project-header';
            projectHeader.textContent = project.name;
            headerRow.appendChild(projectHeader);
        });
    }

    renderBody() {
        const tableBody = document.getElementById('tableBody');
        tableBody.innerHTML = '';

        // Create a row for each stage
        this.platforms.forEach(stage => {
            const row = document.createElement('tr');
            
            // Stage name cell (replaces date cell)
            const stageCell = document.createElement('td');
            stageCell.className = 'date-cell sticky-column stage-name-row';
            stageCell.textContent = this.formatPlatformName(stage);
            row.appendChild(stageCell);

            // Project cells (one per project showing stage status)
            this.data.projects.forEach(project => {
                const cell = document.createElement('td');
                const stageData = project.platforms[stage];
                
                cell.className = `status-cell ${stageData.status}`;
                if (project.currentStage === stage) {
                    cell.classList.add('current-stage');
                }
                cell.innerHTML = this.createSimplifiedCellContent(stage, stageData, project.currentStage === stage);
                
                // Add click event to open modal
                cell.addEventListener('click', () => {
                    this.openProjectModal(project, stage);
                });
                
                row.appendChild(cell);
            });

            tableBody.appendChild(row);
        });
    }

    createSimplifiedCellContent(stageName, stageData, isCurrentStage) {
        const statusText = this.formatStatus(stageData.status);
        const progressBar = stageData.status === 'in-progress' || stageData.status === 'completed' ? 
            `<div class="progress-bar">
                <div class="progress-fill" style="width: ${stageData.progress}%"></div>
            </div>` : '';
        
        const progressText = stageData.progress > 0 ? 
            `<div class="progress-text">${stageData.progress}%</div>` : '';

        const currentIndicator = isCurrentStage ? 
            `<div class="current-indicator">🎯</div>` : '';

        return `
            ${currentIndicator}
            <div class="status-text">${statusText}</div>
            ${progressBar}
            ${progressText}
        `;
    }

    highlightFirstCodingProject() {
        // Find the first project that just started coding
        let firstCodingCell = null;
        const codingRow = Array.from(document.querySelectorAll('tbody tr')).find(row => {
            const stageCell = row.querySelector('.stage-name-row');
            return stageCell && stageCell.textContent.toLowerCase().includes('coding');
        });
        
        if (codingRow) {
            const cells = codingRow.querySelectorAll('.status-cell');
            
            this.data.projects.forEach((project, projectIndex) => {
                if (!firstCodingCell && project.currentStage === 'coding' && 
                    (project.platforms.coding.status !== 'not-started' || project.platforms.coding.progress > 0)) {
                    firstCodingCell = cells[projectIndex];
                }
            });
        }

        // Highlight the first coding cell with value
        if (firstCodingCell) {
            firstCodingCell.classList.add('highlighted');
        }
    }

    openProjectModal(project, selectedStage) {
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

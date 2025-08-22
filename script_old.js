class ProjectTracker {
    constructor() {
        this.data = null;
        this.platforms = ['coding', 'unit_testing', 'MFD', 'MFA', 'Beta', 'Stage', 'PROD'];
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
        
        // Sort dates to put current date first
        this.dates = this.sortDatesWithCurrentFirst(dates);
    }

    sortDatesWithCurrentFirst(dates) {
        const currentDateStr = this.currentDate;
        const currentDateIndex = dates.indexOf(currentDateStr);
        
        if (currentDateIndex !== -1) {
            // Remove current date from its position and put it at the beginning
            const reorderedDates = [currentDateStr];
            dates.forEach(date => {
                if (date !== currentDateStr) {
                    reorderedDates.push(date);
                }
            });
            return reorderedDates;
        }
        
        return dates;
    }

    renderTable() {
        this.renderHeader();
        this.renderBody();
        this.highlightCurrentDateAndFirstCoding();
    }

    renderHeader() {
        const headerRow = document.getElementById('headerRow');
        
        // Clear existing headers except date column
        headerRow.innerHTML = '<th class="date-column sticky-column">Date</th>';
        
        // Add project headers
        this.data.projects.forEach(project => {
            const projectHeader = document.createElement('th');
            projectHeader.className = 'project-header';
            projectHeader.setAttribute('colspan', this.platforms.length);
            projectHeader.textContent = project.name;
            headerRow.appendChild(projectHeader);
        });

        // Add platform sub-headers
        const platformRow = document.createElement('tr');
        platformRow.innerHTML = '<th class="date-column sticky-column"></th>';
        
        this.data.projects.forEach(project => {
            this.platforms.forEach(platform => {
                const platformHeader = document.createElement('th');
                platformHeader.className = 'platform-header';
                platformHeader.textContent = this.formatPlatformName(platform);
                platformRow.appendChild(platformHeader);
            });
        });
        
        headerRow.parentNode.appendChild(platformRow);
    }

    renderBody() {
        const tableBody = document.getElementById('tableBody');
        tableBody.innerHTML = '';

        this.dates.forEach(date => {
            const row = document.createElement('tr');
            
            // Date cell
            const dateCell = document.createElement('td');
            dateCell.className = 'date-cell sticky-column';
            if (date === this.currentDate) {
                dateCell.classList.add('current-date');
            }
            dateCell.textContent = this.formatDate(date);
            row.appendChild(dateCell);

            // Project cells
            this.data.projects.forEach(project => {
                this.platforms.forEach(platform => {
                    const cell = document.createElement('td');
                    const platformData = project.platforms[platform];
                    
                    cell.className = `status-cell ${platformData.status}`;
                    cell.innerHTML = this.createCellContent(platformData);
                    
                    // Add click event for interaction
                    cell.addEventListener('click', () => {
                        this.handleCellClick(project.name, platform, date, platformData);
                    });
                    
                    row.appendChild(cell);
                });
            });

            tableBody.appendChild(row);
        });
    }

    createCellContent(platformData) {
        const statusText = this.formatStatus(platformData.status);
        const progressBar = platformData.status === 'in-progress' || platformData.status === 'completed' ? 
            `<div class="progress-bar">
                <div class="progress-fill" style="width: ${platformData.progress}%"></div>
            </div>` : '';
        
        const progressText = platformData.progress > 0 ? 
            `<div class="progress-text">${platformData.progress}%</div>` : '';

        return `
            <div class="status-text">${statusText}</div>
            ${progressBar}
            ${progressText}
        `;
    }

    highlightCurrentDateAndFirstCoding() {
        // Find the first project with coding status that just started (low progress)
        let firstCodingCell = null;
        const rows = document.querySelectorAll('#tableBody tr');
        
        // Get the first row (current date row)
        const currentDateRow = rows[0];
        if (currentDateRow) {
            const cells = currentDateRow.querySelectorAll('.status-cell');
            let cellIndex = 0;
            
            // Find the first project that just started coding (Project Alpha - 15% progress)
            this.data.projects.forEach((project, projectIndex) => {
                const codingCell = cells[cellIndex]; // First platform is always coding
                const codingData = project.platforms.coding;
                
                // Highlight the first project that just started coding (in-progress with low progress)
                if (!firstCodingCell && 
                    codingData.status === 'in-progress' && 
                    codingData.progress > 0 && 
                    codingData.progress <= 20) { // Just started projects (<=20%)
                    firstCodingCell = codingCell;
                }
                
                cellIndex += this.platforms.length;
            });
        }

        // Highlight the first coding cell that just started
        if (firstCodingCell) {
            firstCodingCell.classList.add('highlighted');
            // Add a special indicator for "just started"
            const statusText = firstCodingCell.querySelector('.status-text');
            if (statusText) {
                statusText.innerHTML += ' <i class="fas fa-play" style="color: #667eea; margin-left: 5px;" title="Just Started"></i>';
            }
        }
    }

    handleCellClick(projectName, platform, date, platformData) {
        const message = `
            Project: ${projectName}
            Platform: ${this.formatPlatformName(platform)}
            Date: ${this.formatDate(date)}
            Status: ${this.formatStatus(platformData.status)}
            Progress: ${platformData.progress}%
            Last Updated: ${platformData.lastUpdated || 'Never'}
        `;
        
        alert(message);
    }

    formatPlatformName(platform) {
        const platformNames = {
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
});

// Auto-refresh every 30 seconds (optional)
setInterval(() => {
    if (window.tracker) {
        window.tracker.loadData();
    }
}, 30000);

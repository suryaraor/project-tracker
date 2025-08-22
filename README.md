# Project Tracker

A high-responsive frontend application for tracking project progress across different platforms and stages.

## Features

- **Date-based tracking**: Shows progress for each day in a configurable date range
- **Multi-project support**: Track multiple projects simultaneously
- **Platform stages**: Supports 7 different stages: Coding, Unit Testing, MFD, MFA, Beta, Stage, PROD
- **Current date highlighting**: Automatically highlights the current date
- **First active project highlighting**: Highlights the first project with coding activity
- **Responsive design**: Works seamlessly on desktop, tablet, and mobile devices
- **Progress visualization**: Shows progress bars and percentages for active tasks
- **Interactive cells**: Click on any cell to see detailed information
- **Auto-refresh**: Automatically refreshes data every 30 seconds

## File Structure

```
tracker0.2/
├── index.html          # Main HTML file
├── styles.css          # CSS styles and responsive design
├── script.js           # JavaScript functionality
├── data.json           # Backend data (JSON format)
└── README.md           # This file
```

## Getting Started

1. **Open the application**: Open `index.html` in a web browser
2. **Local server (recommended)**: For better performance, serve the files using a local web server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js (if you have http-server installed)
   npx http-server
   
   # Using PHP
   php -S localhost:8000
   ```
3. **Access the application**: Navigate to `http://localhost:8000` in your browser

## Data Format

The application reads data from `data.json`. Here's the structure:

```json
{
  "projects": [
    {
      "name": "Project Name",
      "platforms": {
        "coding": { 
          "status": "in-progress", 
          "progress": 75, 
          "lastUpdated": "2025-08-22" 
        },
        "unit_testing": { 
          "status": "pending", 
          "progress": 0, 
          "lastUpdated": null 
        },
        // ... other platforms
      }
    }
  ],
  "dateRange": {
    "startDate": "2025-08-01",
    "endDate": "2025-08-31"
  }
}
```

### Status Options
- `not-started`: Task hasn't begun
- `pending`: Task is waiting to start
- `in-progress`: Task is currently being worked on
- `completed`: Task is finished

### Platform Stages
1. **Coding**: Development phase
2. **Unit Testing**: Unit testing phase
3. **MFD**: MFD environment
4. **MFA**: MFA environment
5. **Beta**: Beta testing environment
6. **Stage**: Staging environment
7. **PROD**: Production environment

## Customization

### Adding New Projects
Add new project objects to the `projects` array in `data.json`:

```json
{
  "name": "New Project",
  "platforms": {
    "coding": { "status": "not-started", "progress": 0, "lastUpdated": null },
    // ... define all platforms
  }
}
```

### Changing Date Range
Modify the `dateRange` object in `data.json`:

```json
"dateRange": {
  "startDate": "2025-09-01",
  "endDate": "2025-09-30"
}
```

### Styling Customization
- Edit `styles.css` to change colors, fonts, or layout
- The application uses CSS Grid and Flexbox for responsive design
- Custom CSS variables can be added for easier theme management

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Responsive design optimized for touch

## Performance Features

- Efficient DOM manipulation
- Smooth animations and transitions
- Optimized for large datasets
- Sticky headers for better navigation
- Responsive scrolling

## Keyboard Shortcuts

- `Ctrl + R`: Refresh data

## Technical Details

- **No dependencies**: Pure HTML, CSS, and JavaScript
- **Modern ES6+**: Uses classes, async/await, and modern JavaScript features
- **CSS Grid/Flexbox**: Modern layout techniques for responsiveness
- **Fetch API**: For loading JSON data
- **CSS Animations**: Smooth visual feedback

## Troubleshooting

### Data not loading
- Ensure `data.json` is in the same directory as `index.html`
- Check browser console for errors
- Verify JSON syntax is valid

### Layout issues
- Check browser zoom level
- Clear browser cache
- Ensure all CSS files are loading properly

### Performance issues
- Reduce date range if handling large datasets
- Consider pagination for very large project lists

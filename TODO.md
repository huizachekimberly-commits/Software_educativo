# TODO: Add castle background images to sub-activities

## Steps

1. [x] Add `SUB_ACTIVITY_BACKGROUNDS` array in `js/app.js` with 15 image paths (b1-b15)
2. [x] Set background image in `openSubActivity()` function using the array and add `has-castle-bg` class
3. [x] Reset background in `closeActivity()` function
4. [x] Add CSS styles for `.has-castle-bg` (card transparency, backdrop blur) and `.sub-activity-bg` layer in `css/styles.css`
5. [x] Test the implementation

## Changes Made

### `js/app.js`
- Added `SUB_ACTIVITY_BACKGROUNDS` constant array with paths to `assets/castle_images/b1.jpeg` through `b15.jpeg`
- In `openSubActivity()`: set `activityZone.style.backgroundImage` using the array and added `has-castle-bg` class
- In `closeActivity()`: reset `backgroundImage`, `backgroundSize`, `backgroundPosition`, `backgroundRepeat` and remove `has-castle-bg` class

### `css/styles.css`
- Added styles for `.activity-zone.has-castle-bg` (glassmorphism card, backdrop blur on workspace/feedback)
- Added `.sub-activity-bg` layer with proper z-index stacking inside `.unit-fullscreen .activity-content`


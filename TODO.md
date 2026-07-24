# TODO: Fix Unit 1/2 Structure

## Steps
- [x] 1. Rename audio files in theme2/ (activity_1→activity_6, activity_2→activity_7, feedback_1→feedback_6, feedback_2→feedback_7)
- [x] 2. Update data/units.json: move caldero & carruaje to castillo subActivities as activities 6 & 7; remove subActivities from bosque
- [x] 3. Update js/app.js: make playUnitSound() and playCorrectThenFeedback() theme-aware for Unit 1
- [x] 4. Fix renderProgress() to count individual activities instead of whole units (per-activity increment)
- [x] 5. Add background music support (music.mpeg) with syncSoundButton() integration
- [x] 6. Rename feedback MP3 files (remove underscores) to match code path pattern

## Summary of Changes
- **Audio**: theme2/ files renamed to activity_6, activity_7, feedback6, feedback7
- **Audio**: theme1/ feedback files renamed feedback1..5.mp3 (no underscores)
- **data/units.json**: caldero & carruaje moved from bosque to castillo as subActivity items 6 & 7
- **data/units.json**: bosque subActivities removed
- **js/app.js**: `playUnitSound()` uses theme1/ for castillo subIndex 0-4, theme2/ for 5-6
- **js/app.js**: `playCorrectThenFeedback()` same theme-aware logic for feedback paths
- **js/app.js**: `renderProgress()` now counts individual activity completions, not whole units
- **js/app.js**: `syncSoundButton()` syncs background music state with sound toggle
- **js/app.js**: background music plays `assets/music.mpeg` at 35% volume with auto-play

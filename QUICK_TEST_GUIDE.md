# Quick Test Guide - Pattern 2 Implementation

## 🚀 Deployed URLs

**Frontend**: https://voice-todo-9d58esnyj-siddhartha-manis-projects.vercel.app
**Agent**: Running on Railway (already deployed)

## ✅ Test Steps

### Test 1: First Connection
1. Open the app in your browser
2. Press **Spacebar** to activate the agent
3. Say: "Create a task to test the agent"
4. **Expected**: Agent responds and creates the task

### Test 2: Page Refresh (THE FIX)
1. Press **F5** or **Ctrl+R** to refresh the page
2. Press **Spacebar** to activate the agent
3. Say: "Show me all my tasks"
4. **Expected**: Agent responds correctly ✅ (This was broken before!)

### Test 3: Multiple Refreshes
1. Refresh the page 3 times
2. Each time, press **Spacebar** and test a voice command
3. **Expected**: Agent responds every time ✅

### Test 4: Verify Clean Rooms
1. Open browser console (F12)
2. Look for logs like:
   ```
   [useLivekit] Connected to room, dispatching agent for room: voice-todo-room-1732299123456
   ```
3. Refresh and check again
4. **Expected**: Different room name each time (timestamp changes)

## 🔍 What to Look For

### ✅ Success Indicators
- Agent responds immediately after spacebar press
- Agent responds after page refresh
- Console shows different room names on each refresh
- No "agent not responding" errors

### ❌ Failure Indicators
- Agent doesn't respond after refresh
- Same room name appears after refresh
- Console shows errors about agent dispatch
- Microphone doesn't activate

## 🐛 Troubleshooting

### If Agent Doesn't Respond:

1. **Check Console for Errors**:
   - Open DevTools (F12) → Console tab
   - Look for red error messages

2. **Verify Microphone Permissions**:
   - Browser should ask for microphone access
   - Grant permission if prompted

3. **Check Room Name**:
   - Should see: `voice-todo-room-[timestamp]`
   - Timestamp should be different on each refresh

4. **Verify Agent Dispatch**:
   - Console should show: "Created new agent dispatch: AD_XXXXX"
   - If missing, check backend logs

### If Still Having Issues:

1. **Clear Browser Cache**:
   - Ctrl+Shift+Delete → Clear cache
   - Refresh page

2. **Try Incognito Mode**:
   - Open in private/incognito window
   - Test again

3. **Check LiveKit Dashboard**:
   - Go to https://cloud.livekit.io
   - Check "Rooms" section
   - Should see new rooms being created

## 📊 Expected Console Output

### On Page Load:
```
[useLivekit] Connection state changed to: connected, Room: voice-todo-room-1732299123456
[useLivekit] Connected to room, dispatching agent for room: voice-todo-room-1732299123456
[useLivekit] [CREATE] Created new agent dispatch: AD_PZtvnRafUR9r
```

### On Refresh (New Room):
```
[useLivekit] Connection state changed to: connected, Room: voice-todo-room-1732299234567
[useLivekit] Connected to room, dispatching agent for room: voice-todo-room-1732299234567
[useLivekit] [CREATE] Created new agent dispatch: AD_XYZ123ABC456
```

**Notice**: Room name timestamp changes (1732299123456 → 1732299234567)

## 🎯 Success Criteria

✅ **All tests pass when:**
- [ ] Agent responds on first connection
- [ ] Agent responds after page refresh
- [ ] Agent responds after multiple refreshes
- [ ] Room names change on each refresh
- [ ] No console errors
- [ ] Voice commands work correctly

## 📝 Notes

- **Conversation history is NOT preserved** across refreshes (by design)
- Each refresh creates a **new room** and **new agent**
- This is **Pattern 2: Clean Shutdown** - simple and reliable
- Old rooms are **automatically cleaned up** by LiveKit

## 🎉 What's Fixed

### Before (Broken):
1. Open app → Agent works ✅
2. Refresh page → Agent doesn't respond ❌
3. User frustrated 😞

### After (Fixed):
1. Open app → Agent works ✅
2. Refresh page → Agent works ✅
3. Refresh again → Agent works ✅
4. User happy 😊

---

**Ready to test!** Open the app and follow the test steps above.

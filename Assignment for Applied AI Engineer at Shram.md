# Assignment for Applied AI Engineer at Shram

Date \- 15th Nov ‘25

### Goal

Make a voice-first to-do list web-app that uses a user’s voice commands to process CRUD operations.

### Examples

If the user says “Show me all administrative tasks”, it should render a view with exactly that. If the user says “I want to work on X” or “Make me a task to do Y”, it should create tasks with appropriate titles. If the user says “Delete the task about the compliances”, it should do so.  
Bonus: You could consider that the task has not just the title, but also a scheduled time and/or a priority index. So if the user says “Push the task about fixing bugs to tomorrow” it should update the scheduled time accordingly or on saying “Delete the 4th task” should delete the fourth task by index.

### Criteria

You can use any voice model (Apple STT, Deepgram, etc) and LLM of your choice but ensure that the to-do list supports natural language to process these requests with sub-2s latency with 90%+ accuracy. Ensure that you write clean, modular code in python/javascript with comments and deploy the app on Vercel or wherever you like so that there is no friction to test the app.

### Submission

Please submit the assignment as soon as possible. Interviews will be held on a first-come first serve basis. Submit the following:

1. Deployed working app  
2. Link to GitHub repository  
3. Note on why you chose a particular voice model and LLM (in the repo)

Please note that any deviation from the submission requirements would lead to disqualification, so please double-check on the three aforementioned points.
# **App Name**: SkitForge AI

## Core Features:

- Script Input: Text area accepts multiline text input to enable script entry.
- Dynamic Character Detection: Automatically identify unique character tags in the text area in real time.
- Dynamic Voice Assignment UI: For each detected character, render a label and dropdown in the Cast section.
- Voice Selection: Populate each dropdown with the predefined list of Gemini voices.
- Generate Skit: Generates the skit by sending the script and voice map to the backend using the Gemini TTS API for each line of dialogue with the correct assigned voice tool. Then, merges the individual audio clips into a single audio file in the correct order.
- Audio Preview: Presents the generated audio file in an embedded player.
- Audio Download: Allows the user to download the generated audio file.

## Style Guidelines:

- Primary color: Electric Blue (#7DF9FF) to convey a tech-forward feel, providing contrast against the dark background.
- Background color: Very dark gray (#121212) to evoke a studio environment.
- Accent color: Purple (#BE95FF) to complement the electric blue and provide emphasis on interactive elements.
- Body and headline font: 'Inter', a clean sans-serif font, for a modern and readable user experience.
- A two-column layout with the script editor taking up 70% width on the left and the control panel on the right. Post-generation elements are placed below the columns.
- Add status indicators/loading animations after the Generate Skit button is clicked to clearly show processing is in progress.
# SkitForge AI

SkitForge AI is a powerful and intuitive web application that allows creators to bring their stories to life by generating multi-character audio skits using advanced AI. From writing the script to producing the final audio file, SkitForge streamlines the entire creative process.

## Core Features

-   **AI Script Writer**: Generate complete, engaging scripts from a simple prompt. The AI understands character personas and injects subtle emotional cues for a more natural performance.
-   **Dynamic Character Management**: Easily add and manage multiple characters for your skits.
-   **Voice Assignment**: Assign unique, high-quality AI voices to each character from a diverse library of options.
-   **Multi-Speaker Audio Generation**: Utilizes Google's cutting-edge multi-speaker Text-to-Speech technology to generate a single, coherent audio file from your script in one go.
-   **Audio Preview & Download**: Instantly preview the generated audio within the app and download it as a WAV file.
-   **Model Selection**: Choose from different Gemini models for both script generation and audio synthesis to experiment with the latest AI capabilities.

## Tech Stack

SkitForge AI is built with a modern, robust, and scalable tech stack:

-   **Framework**: [Next.js](https://nextjs.org/) (with App Router)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **AI Integration**: [Genkit](https://firebase.google.com/docs/genkit) (for defining and running AI flows)
-   **Generative Models**: [Google AI - Gemini](https://ai.google.dev/) (for script generation and multi-speaker TTS)
-   **UI Components**: [ShadCN UI](https://ui.shadcn.com/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)

## Getting Started

Follow these instructions to set up and run the project on your local machine.

### Prerequisites

-   [Node.js](https://nodejs.org/en) (v20 or later recommended)
-   [npm](https://www.npmjs.com/), [yarn](https://yarnpkg.com/), or [pnpm](https://pnpm.io/) package manager
-   A Google AI API Key. You can get one from [Google AI Studio](https://aistudio.google.com/app/apikey).

### Local Development Setup

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd <repository-folder>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a new file named `.env` in the root of your project and add your Google AI API key:
    ```
    GEMINI_API_KEY=YOUR_API_KEY_HERE
    ```

4.  **Run the development servers:**
    You need to run two processes in separate terminals:
    -   **Terminal 1: Run the Next.js app:**
        ```bash
        npm run dev
        ```
        This will start the main application, typically available at `http://localhost:9002`.

    -   **Terminal 2: Run the Genkit AI flows:**
        ```bash
        npm run genkit:watch
        ```
        This starts the Genkit development server, which runs your AI flows. The Next.js app communicates with this server.

5.  **Open the application:**
    Navigate to `http://localhost:9002` in your browser to use SkitForge AI.



This means I've commetied to her.......
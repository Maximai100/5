# Project Overview: "Смета за 5 минут" (Estimate in 5 Minutes)

This is a comprehensive project management and cost estimation tool designed to run as a Telegram Web App. It allows users to manage construction or repair projects, create detailed cost estimates, track finances, and generate reports. The application is built using React, TypeScript, and Vite, and it leverages the Gemini API for AI-powered suggestions. All application data is stored locally in the user's browser using `localStorage`.

## Core Features

*   **Project Management:** Create and manage projects, including details like client name, address, and status (in progress, completed).
*   **Cost Estimation:** Build detailed estimates with line items for materials and labor, including quantities, prices, units, discounts, and taxes.
*   **Financial Tracking:** Log income (payments) and expenses for each project to track profitability.
*   **Reporting:** View financial summaries and reports, with the ability to filter by project.
*   **Document & Media:** Attach documents, create photo reports, and add notes to projects.
*   **Inventory Management:** Track tools and equipment, noting their location (on-site or at a home base).
*   **AI Assistant:** Utilizes the Gemini API to provide suggestions for estimate items.
*   **Data Portability:** Users can back up their entire dataset to a JSON file and restore it later.
*   **Exporting:** Estimates can be exported to a professional-looking PDF document.

## Technical Stack

*   **Framework:** React (v18) with TypeScript
*   **Build Tool:** Vite
*   **AI:** Google Gemini API (`@google/genai`)
*   **Styling:** Custom CSS (see `index.css`)
*   **Platform:** Telegram Web App

## Project Structure

*   `src/App.tsx`: The main application component that manages all state and orchestrates the different views and modals.
*   `src/components/views/`: Contains the main UI screens of the application (e.g., `ProjectsListView.tsx`, `EstimateView.tsx`, `ProjectDetailView.tsx`).
*   `src/components/modals/`: Contains modal dialogs for specific actions like creating a new project, adding a financial entry, etc.
*   `src/types/index.ts`: Defines all the TypeScript interfaces for the application's data structures (e.g., `Project`, `Estimate`, `Item`).
*   `src/utils/index.ts`: Includes helper functions used across the application.
*   `localStorage`: Used as the primary database for all application data. State is loaded from `localStorage` on startup and saved back whenever changes are made.

## Building and Running

**Prerequisites:**
*   Node.js installed.

**Setup:**

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Set Up Environment Variables:**
    Create a file named `.env.local` in the project root and add your Gemini API key:
    ```
    GEMINI_API_KEY=your_api_key_here
    ```

**Running the App:**

*   **Development:** To run the local development server:
    ```bash
    npm run dev
    ```

*   **Build:** To create a production build:
    ```bash
    npm run build
    ```

*   **Preview:** To preview the production build locally:
    ```bash
    npm run preview
    ```

## Development Conventions

*   **State Management:** The application uses React Hooks (`useState`, `useEffect`, `useMemo`, etc.) for state management, all centralized within `App.tsx`.
*   **Data Persistence:** All data is persisted in the browser's `localStorage`. Look for `localStorage.getItem(...)` and `localStorage.setItem(...)` calls to understand how data is loaded and saved.
*   **Component Structure:** The UI is broken down into "views" (full-screen components) and "modals" (pop-up dialogs).
*   **Typing:** The project is strictly typed with TypeScript. All data models are defined in `src/types/index.ts`.
*   **Telegram Integration:** The app interacts with the Telegram Web App API (accessed via `window.Telegram.WebApp`) for a native look and feel, including theme handling and haptic feedback.

# 🎱 BingoMaster AI

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19-61dafb.svg?style=flat&logo=react)
![Gemini AI](https://img.shields.io/badge/AI-Google%20Gemini-8e75b2.svg?style=flat&logo=google)
![Tailwind CSS](https://img.shields.io/badge/Style-Tailwind-38bdf8.svg?style=flat&logo=tailwindcss)

**BingoMaster AI** is a modern, intelligent web application designed to manage multiple physical Bingo cards simultaneously. 

Stop checking cards one by one! This app uses **Computer Vision (via Google Gemini 2.5 Flash)** to scan your physical cards using your camera, digitize them into the app, and automatically track winners as numbers are called.

## ✨ Features

- **📸 AI-Powered Scanning:** Upload or snap a photo of your physical Bingo card. The app uses the Google Gemini API to analyze the grid and import the numbers instantly.
- **🔢 Multi-Card Tracking:** Manage dozens of cards at once. The system highlights called numbers across all active cards in real-time.
- **🏆 Automatic Win Detection:** Instantly detects winning patterns (Rows, Columns, Diagonals) and notifies you with animations.
- **🎨 Glassmorphism UI:** A stunning, dark-themed interface designed with Tailwind CSS, featuring smooth animations and responsive layouts.
- **📱 Mobile First:** Optimized experience for phones and tablets.
- **⚙️ Flexible Configuration:** Supports standard 5x5 grids, as well as 3x3, 4x4, and custom sizes.
- **✏️ Customization:** Rename cards, edit incorrect scans manually, and toggle "Free Space" rules.

## 🚀 Tech Stack

- **Frontend:** React 19, TypeScript, Vite (recommended).
- **Styling:** Tailwind CSS, Lucide React (Icons).
- **Artificial Intelligence:** Google GenAI SDK (`@google/genai`) using the **Gemini 2.5 Flash** model for OCR and image analysis.

## 🛠️ Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/bingomaster-ai.git
   cd bingomaster-ai
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Get a Google Gemini API Key**
   - Go to [Google AI Studio](https://aistudio.google.com/).
   - Create a free API Key.

4. **Configure Environment Variables**
   - Create a `.env` file in the root directory.
   - Add your API key (for Vite use `VITE_GEMINI_API_KEY`; this project maps that value to `process.env` for compatibility):

   ```env
   # Example
   VITE_GEMINI_API_KEY=your_google_api_key_here
   ```

   > **Note:** The project now supports `import.meta.env.VITE_GEMINI_API_KEY` and maps it into `process.env` via `vite.config.ts` for compatibility.

5. **Run the App**
   ```bash
   npm run dev
   ```

## ☁️ Deploying to Vercel

- Connect your GitHub repository to Vercel via the Vercel dashboard.
- In the Vercel project settings, add an Environment Variable named `VITE_GEMINI_API_KEY` (Production & Preview as needed) and paste your API key there.
 - In the Vercel project settings, add an Environment Variable named `GEMINI_API_KEY` (Production & Preview as needed) and paste your API key there. This project proxies Gemini requests through a serverless endpoint (`/api/gemini/scan`) so the key stays server-side and is never exposed to the browser or GitHub.
- Do NOT commit your `.env` file. This repository uses `.env` locally for convenience, but `.env` is listed in `.gitignore` and should never be pushed.
- Use `.env.example` as a template for contributors.
- If you accidentally pushed a secret to GitHub, rotate the key immediately and remove it from history (or ask for help to scrub it).

Important: this repository uses a serverless proxy for Gemini. Do NOT place your production `GEMINI_API_KEY` in a client `.env` file (VITE_*), because those are exposed to the browser. Use Vercel's environment settings to store `GEMINI_API_KEY` instead.

Vercel will run `npm run build` and serve the `dist/` directory by default (see `vercel.json`).

## 🎮 How to Play

1. **Add Cards:** Click the **"Add Card"** button.
2. **Scan or Type:** Choose "AI Scan" to take a photo of your card, or enter numbers manually.
3. **Configure:** Set your grid size (e.g., 5x5) and Free Space settings.
4. **Play:** Enter the numbers called by the Bingo announcer in the top input bar and hit **"Call"**.
5. **Win:** The app will automatically flag winning cards with a "BINGO!" badge and celebratory animations.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

*Built with ❤️ and AI.*

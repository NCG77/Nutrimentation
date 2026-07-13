# Nutrimentation 🍏

<div align="center">
  <p><strong>A Next.js-powered intelligent nutrition analyzer and personalized dietary assistant.</strong></p>
</div>

<br />

## 🎥 Video Demo
<div align="center">
  <a href="https://your-video-link-here.com" target="_blank">
    <img src="https://via.placeholder.com/800x450.png?text=Click+to+watch+the+Nutrimentation+Demo" alt="Watch the video" width="800" style="border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" />
  </a>
</div>

<br />

## Features

Nutrimentation uses advanced multi-model AI analysis to evaluate food products based on your personal health goals.

*   **Barcode Scanning:** Quickly scan food product barcodes using your device's camera.
*   **Personalized Analysis:** Evaluates how well a product fits your specific dietary goals, health concerns, and preferences.
*   **Nutritional Insights:** Deep dive into nutritional quality, highlighting benefits and potential concerns.
*   **Web Verification:** Cross-references product data with online research and consumer feedback for accuracy.
*   **Multi-Model AI:** Leverages powerful AI models to provide comprehensive, integrated dietary recommendations.
*   **Secure Authentication:** Built with Firebase for secure user login and profile management.
*   **Progressive Web App (PWA):** Installable on mobile devices for quick access on the go.

## Tech Stack

*   **Framework:** [Next.js](https://nextjs.org/) (React 19)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **AI Integration:** Google Generative AI (`@google/generative-ai`)
*   **Authentication & Database:** [Firebase](https://firebase.google.com/)
*   **Scanning:** `html5-qrcode`
*   **Web Scraping/Parsing:** `axios`, `cheerio`
*   **PWA Support:** `next-pwa`

## Getting Started

Follow these steps to set up the project locally.

### Prerequisites

*   Node.js (v18 or higher recommended)
*   npm, yarn, pnpm, or bun

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/nutrimentation.git
    cd nutrimentation
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Set up environment variables:**
    Create a `.env.local` or `.env` file in the root directory and add your API keys (Firebase, Google Gemini, Groq, etc.).
    ```env
    # Example .env structure - configure according to your project's needs
    NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
    NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
    # AI Keys
    GEMINI_API_KEY=your_gemini_api_key
    GROQ_API_KEY=your_groq_api_key
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```

5.  **Open the app:**
    Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1.  **Sign Up / Log In:** Create an account to set up your personal dietary profile and preferences.
2.  **Scan a Product:** Use the built-in barcode scanner to scan any food item's barcode.
3.  **Review Analysis:**
    *   **Combined View:** Get an integrated overview and overall score for the product.
    *   **Your Profile:** See specifically if the product matches your dietary needs and restrictions.
    *   **Nutrition Facts:** Check the nutritional breakdown, highlights, and areas of concern.
    *   **Online Research:** Read verified web insights and recurring consumer themes.

## Contributing

Contributions, issues, and feature requests are welcome!

1.  Fork the project
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

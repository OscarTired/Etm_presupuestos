<div style="text-align: center;">
<h1>Electrical Board Budgeting System</h1>

[![GitHub License](https://img.shields.io/github/license/OscarTired/Etm_presupuestos?style=flat-square)](https://github.com/OscarTired/Etm_presupuestos/blob/main/LICENSE)
[![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Laravel](https://img.shields.io/badge/Laravel-FF2D20?style=flat-square&logo=laravel&logoColor=white)](https://laravel.com/)
[![PHP](https://img.shields.io/badge/PHP-777BB4?style=flat-square&logo=php&logoColor=white)](https://www.php.net/)
[![Gemini](https://img.shields.io/badge/Gemini_AI-8E75C2?style=flat-square&logo=google-gemini&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
</div>

An advanced web application designed for engineering, sales, and manufacturing departments to estimate, budget, and configure electrical enclosures (cabinets) and electrical boards (tableros). The system features a responsive UI, parametric calculations, and artificial intelligence capabilities to analyze technical diagrams or actual images of electrical boards, matching components automatically with an internal product catalog.

---

## Key Features

- **Enclosure Configurator (Gabinete Calculator):** Tailored calculations for physical cabinet structures, structural options, and spatial dimensions.
- **Electrical Board Configurator (Tablero Calculator):** Interactive board planning with structural accessories and multi-category component listings (switches, breakers, protection units, contactors, structural supports, and wiring).
- **Global Parametric Discounts:** Real-time modification of global price discount percentages directly applied to catalog list prices.
- **AI-Powered Image Analyzer:** Drag-and-drop panel to upload diagrams or physical images of boards. Google Gemini AI processes the image to identify technical components, performing deep semantic matching with the local catalog based on poles, amperage (A), short-circuit capacity (kA), and model codes.
- **Responsive Toast Notification System:** Non-intrusive alert system built to sit perfectly below the top navbar, shifting from a top-center alignment on mobile viewports to top-right on desktop screens with smooth vertical entrance transitions.

---

## System Architecture & Data Flow

The application is architected into a separated client-server model:

```
[ Frontend: React + Vite + Tailwind ]
               |
               | (1) Budget request with global discount
               | (2) Upload image for AI analysis
               v
[ Backend: Laravel API ]
               |
               +---> [ Local Catalog JSON ]
               |     Loads structured inventory data and filters item pricing.
               |
               +---> [ Google Gemini AI Service ]
                     Sends binary image data with optimized system prompts 
                     to detect components and map parameters back to catalog schemas.
```

### 1. Catalog Matching Engine
The matching engine parses electrical variables parsed by the AI against `backend/storage/app/tablero_catalog.json`. It searches for exact or nearest matching components analyzing:
- Pole configurations (e.g., 3P, 4P).
- Rated currents / Amperage (e.g., 100A, 250A).
- Breaking capacity / kA ratings (e.g., 25kA, 36kA).
- Brand, model, and category compliance.

### 2. Parametric Calculation Engine
Applies global discounts on the fly. The final budgets calculate individual unit base rates, net item sums, sub-totals per subsystem, global structural margins, and tax figures dynamically on both frontend state and backend validation controllers.

---

## Directory Structure

```
Etm_presupuestos/
├── backend/                  # Laravel 10+ PHP application
│   ├── app/
│   │   └── Http/Controllers/
│   │       └── TableroController.php   # Handles catalog matching, budgets, and AI analysis
│   ├── config/
│   │   └── services.php      # Configured Google Gemini credentials
│   ├── routes/
│   │   └── api.php           # REST API endpoints
│   └── storage/app/
│       └── tablero_catalog.json        # Main localized product database
│
├── frontend/                 # React SPA bundled with Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── GabineteCalculator.jsx  # Cabinet pricing engine component
│   │   │   └── TableroCalculator.jsx   # Board pricing and AI analysis component
│   │   ├── App.jsx           # Main navigation and state layout
│   │   ├── index.css         # Tailwind directives and customized animation rules
│   │   └── main.jsx          # Entry point
│   ├── tailwind.config.js    # Styling frameworks configurations
│   └── vite.config.js        # Bundler configuration file
```

---

## Installation & Configuration

### Prerequisites
- PHP >= 8.1
- Composer
- Node.js (v18 or superior) and npm
- A Google Gemini API Key

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install PHP packages:
   ```bash
   composer install
   ```
3. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```
4. Generate the application key:
   ```bash
   php artisan key:generate
   ```
5. Configure your Google Gemini API key inside `.env`:
   ```env
   GEMINI_API_KEY=your_actual_api_key_here
   GEMINI_MODEL=gemini-3.5-flash
   ```
6. Start the local server:
   ```bash
   php artisan serve
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install Node dependencies:
   ```bash
   pnpm install
   ```
3. Create your local environment file if needed, targeting the backend server (default: `http://localhost:8000/api`).
4. Start the frontend developer server:
   ```bash
   pnpm run dev
   ```
5. To build for production deployment:
   ```bash
   pnpm run build
   ```

---

## Tech Stack Details

- **Frontend Core:** React, Vite, Lucide React (Icons).
- **Styling & UI:** Tailwind CSS with dark/light custom palettes and animated status transitions.
- **Backend Framework:** Laravel.
- **External APIs:** Google Gemini Vertex AI (via Laravel HTTP Client).
- **Data Format:** JSON-driven catalogs and unified REST payload endpoints.

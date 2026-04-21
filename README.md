# Visual Board

A collaborative real-time visual board application with whiteboard, chat, and assignment features.

## Project Structure

```
├── backend/          # Node.js + Express API
│   ├── models/       # Mongoose models
│   ├── routes/       # API routes
│   ├── middleware/   # Auth middleware
│   └── index.js      # Entry point
├── frontend/         # React + Vite app
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── context/
│       └── utils/
└── docker-compose.yml
```

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB
- Docker (optional)

### Run with Docker
```bash
docker-compose up
```

### Run Manually

**Backend:**
```bash
cd backend
cp .env.example .env   # fill in your values
npm install
npm start
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Features
- Real-time collaborative whiteboard
- Chat sidebar
- Assignments management
- User authentication
- Progress tracking

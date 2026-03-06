# comic-beta

A comic reading platform with UUID-based mapping system for series and chapters, built with Express.js, MongoDB, and deployed on Vercel.

## Features

- **UUID Mapping System**: Generate and retrieve unique UUIDs for comic series/chapters
- **RESTful API**: Clean API endpoints for managing comic mappings
- **MongoDB Integration**: Persistent storage using Mongoose ODM
- **CORS Enabled**: Ready for cross-origin requests
- **Health Check Endpoint**: Monitor database connection status

## Project Structure

```
comic-beta/
├── api/
│   ├── index.js          # Express server with API routes
│   └── ifh               # (internal file)
├── public/
│   ├── index.html        # Frontend HTML
│   ├── script.js         # Frontend JavaScript
│   ├── style.css         # Stylesheet
│   └── assets/           # Static assets
├── package.json          # Dependencies and project config
├── vercel.json           # Vercel deployment configuration
└── README.md             # This file
```

## API Endpoints

### `POST /api/get-id`
Get or create a UUID for a given slug and type.

**Request Body:**
```json
{
  "slug": "example-comic",
  "type": "series"
}
```

**Response:**
```json
{
  "uuid": "550e8400-e29b-41d4-a716-446655440000"
}
```

### `GET /api/get-slug/:uuid`
Retrieve mapping data by UUID.

**Response:**
```json
{
  "_id": "...",
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "slug": "example-comic",
  "type": "series"
}
```

### `GET /api/health`
Check server and database connection status.

**Response:**
```json
{
  "status": "OK",
  "database": "Connected"
}
```

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB instance
- npm or yarn

### Local Development

1. Clone the repository:
```bash
git clone <repository-url>
cd comic-beta
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
MONGODB_URI=mongodb://localhost:27017/comic-beta
```

4. Run the server:
```bash
node api/index.js
```

The server will start on `http://localhost:3000` (or your configured port).

## Deployment

This project is configured for deployment on **Vercel**.

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

3. Set environment variables in Vercel dashboard:
   - `MONGODB_URI`: Your MongoDB connection string

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | Yes |

## Dependencies

- **express** ^4.18.2 - Web framework
- **mongoose** ^8.0.0 - MongoDB ODM
- **cors** ^2.8.5 - CORS middleware
- **dotenv** ^16.3.1 - Environment variable management
- **uuid** ^9.0.1 - UUID generation

## License

MIT

import express from "express";
import cors from "cors";
import * as http from "http";
import morgan from "morgan";
import multer from 'multer';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express4';
import { uploadImageHandler } from './controllers/upload';
import { downloadImageHandler } from './controllers/download';
import connectDB from './database';
import { typeDefs, resolvers } from './gql';
import { isLocal } from './utils/storage';

const upload = multer({ storage: multer.memoryStorage() });

export const app = express();

// Middleware
app.use(cors());
app.use(morgan("tiny"));
app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ limit: "500mb", extended: true }));

// Database connection middleware - runs before all routes
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

// REST upload endpoint
app.post('/api/images/upload', upload.single('image') as any, uploadImageHandler);

// Keep download as REST since GraphQL returns data, not files
app.get('/api/images/:id/download', downloadImageHandler);

// Apollo Server setup
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

// Start Apollo Server in background (handles startup errors by logging and failing all requests)
server.startInBackgroundHandlingStartupErrorsByLoggingAndFailingAllRequests();

// GraphQL endpoint
app.use('/graphql', cors(), express.json(), expressMiddleware(server));

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
  if (err) {
    console.error(`Error on ${req.path}:`, err);
    res.status(500).send();
  } else {
    next();
  }
});

// Catch 404
app.use((_: any, res: any) => {
  res.status(404).send();
});

// Local development server setup
async function startServer() {
  const port = process.env.PORT || 3000;
  const httpServer = http.createServer(app);

  httpServer.on("error", (error: NodeJS.ErrnoException) => {
    if (error.syscall !== "listen") {
      throw error;
    } else {
      throw error;
    }
  });

  httpServer.on("listening", () => {
    console.log(`HTTP server listening at ${port}`);
  });

  httpServer.listen(port);
}

// Only start server for local development
if (isLocal()) {
  startServer();
}

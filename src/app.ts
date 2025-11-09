import express from "express";
import cors from "cors";
import * as http from "http";
import morgan from "morgan";
import multer from 'multer';
import { uploadImageHandler } from './controllers/upload';
import connectDB from './database';
import { ApolloServer } from 'apollo-server-express';
import { typeDefs, resolvers } from './gql'
import { downloadImageHandler } from './controllers/download';
import { isLocal } from 'utils/storage';

const upload = multer({ storage: multer.memoryStorage() })

export const app = express();
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

// error handler
app.use((err: any, req: any, res: any, next: any) => {
  if (err) {
    console.error(`Error on ${req.path}:`, err)
    res.status(500).send()
  } else {
    next()
  }
});
// catch 404 and forward to error handler
app.use((_: any, res: any) => {
  res.status(404).send()
});

export async function startApolloServer() {
  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    formatError: (error) => {
      console.error('GraphQL Error:', error);
      return error;
    },
  });

  // Only do .start() if we are running locally
  if (isLocal()) {
    await apolloServer.start();
  }

  apolloServer.applyMiddleware({ app, path: '/graphql' });
}

// The code below are all for local development only

async function startServer() {
  const port = process.env.PORT || 3000;
  const server = http.createServer(app);

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.syscall !== "listen") {
      throw error
    } else {
      throw error
    }
  });

  server.on("listening", () => {
    console.log(`HTTP server listening at ${port}`)
  });

  server.listen(port);
}


// Only add event listeners and start server for local development
if (isLocal()) {
  startServer()
}

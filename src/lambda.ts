import serverlessExpress from '@vendia/serverless-express';
import { app } from './app';

// Export the Lambda handler
export const graphqlHandler = serverlessExpress({ app });

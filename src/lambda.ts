import * as awsServerlessExpress from 'aws-serverless-express';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { app, startApolloServer } from './app';

export const handler = async (event: APIGatewayProxyEvent, context: Context) => {
	await startApolloServer();
	const server = awsServerlessExpress.createServer(app);
	return awsServerlessExpress.proxy(server, event, context);
};

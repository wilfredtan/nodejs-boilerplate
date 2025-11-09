import { Express } from "express";
import multer from 'multer';
import { uploadImageHandler } from './controllers/upload';
import { downloadImageHandler } from './controllers/download';

const upload = multer({ storage: multer.memoryStorage() });

export const routes = (app: Express) => {
	// REST upload endpoint
	app.post('/api/images/upload', upload.single('image') as any, uploadImageHandler);

	// Keep download as REST since GraphQL returns data, not files
	app.get('/api/images/:id/download', downloadImageHandler);
}

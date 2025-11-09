import { S3Client } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
	region: process.env.AWS_REGION || 'ap-southeast-1', // Default to ap-southeast-1 if not set
});

export const bucketName = process.env.BUCKET_NAME;

export default s3Client;

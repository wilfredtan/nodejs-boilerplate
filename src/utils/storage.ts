export function isLocal() {
  return !process.env.AWS_EXECUTION_ENV;
}

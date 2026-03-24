export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = 'AppError';
    // Maintains proper prototype chain in transpiled code
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

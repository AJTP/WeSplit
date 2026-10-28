export class AppException extends Error {
  public name: string;

  constructor(
    message: string,
    public statusCode: number = 500,
    public details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = this.constructor.name;
    // new.target.prototype (no AppException.prototype): así instanceof sigue
    // funcionando también en las subclases.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

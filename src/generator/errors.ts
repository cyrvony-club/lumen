export class PackageGeneratorError extends Error {
  override readonly name = "PackageGeneratorError";

  constructor(message: string) {
    super(message);
  }
}

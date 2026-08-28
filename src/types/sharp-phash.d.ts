declare module "sharp-phash" {
  /** Returns a 64-character binary string (DCT pHash) for the image. */
  function phash(image: Buffer | string): Promise<string>;
  export = phash;
}

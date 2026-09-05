const textDecoder = new TextDecoder("latin1");

export class ByteReader {
  private offset = 0;

  constructor(private readonly data: Uint8Array) {}

  remaining(): number {
    return this.data.length - this.offset;
  }

  seek(offset: number): void {
    if (offset < 0 || offset > this.data.length) {
      throw new Error(`Seek offset ${offset} is out of range`);
    }
    this.offset = offset;
  }

  skip(count: number): void {
    this.require(count);
    this.offset += count;
  }

  u8(): number {
    this.require(1);
    return this.data[this.offset++]!;
  }

  bool(): boolean {
    return this.u8() !== 0;
  }

  u16(): number {
    this.require(2);
    const value = (this.data[this.offset]! << 8) | this.data[this.offset + 1]!;
    this.offset += 2;
    return value;
  }

  u32(): number {
    this.require(4);
    const value =
      ((this.data[this.offset]! << 24) |
        (this.data[this.offset + 1]! << 16) |
        (this.data[this.offset + 2]! << 8) |
        this.data[this.offset + 3]!) >>>
      0;
    this.offset += 4;
    return value;
  }

  i32(): number {
    return this.u32() | 0;
  }

  u16le(): number {
    this.require(2);
    const value = this.data[this.offset]! | (this.data[this.offset + 1]! << 8);
    this.offset += 2;
    return value;
  }

  u32le(): number {
    this.require(4);
    const value =
      (this.data[this.offset]! |
        (this.data[this.offset + 1]! << 8) |
        (this.data[this.offset + 2]! << 16) |
        (this.data[this.offset + 3]! << 24)) >>>
      0;
    this.offset += 4;
    return value;
  }

  string(): string {
    const length = this.u32();
    this.require(length);
    const bytes = this.data.subarray(this.offset, this.offset + length);
    this.offset += length;
    return textDecoder.decode(bytes);
  }

  fixedString(length: number): string {
    this.require(length);
    const bytes = this.data.subarray(this.offset, this.offset + length);
    this.offset += length;
    const end = bytes.indexOf(0);
    return textDecoder.decode(end === -1 ? bytes : bytes.subarray(0, end));
  }

  private require(count: number): void {
    if (this.offset + count > this.data.length) {
      throw new Error(`Unexpected end of stream at offset ${this.offset}`);
    }
  }
}

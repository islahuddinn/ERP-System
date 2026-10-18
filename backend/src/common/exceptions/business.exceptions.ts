import { HttpException, HttpStatus } from "@nestjs/common";

export class InsufficientStockException extends HttpException {
  constructor(productName: string, available: number, requested: number) {
    super(
      {
        message: `Insufficient stock for ${productName}`,
        error: "InsufficientStock",
        details: { available, requested },
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class DuplicateSKUException extends HttpException {
  constructor(sku: string) {
    super(
      {
        message: `Product with SKU ${sku} already exists`,
        error: "DuplicateSKU",
        details: { sku },
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class ProductInUseException extends HttpException {
  constructor(productName: string, reason: string) {
    super(
      {
        message: `Cannot delete ${productName}: ${reason}`,
        error: "ProductInUse",
        details: { productName, reason },
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class InvalidQuantityException extends HttpException {
  constructor(quantity: number) {
    super(
      {
        message: `Invalid quantity: ${quantity}. Must be a positive number.`,
        error: "InvalidQuantity",
        details: { quantity },
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

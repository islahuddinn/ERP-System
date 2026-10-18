import { Module } from "@nestjs/common";
import { CsvService } from "./csv.service";
import { CsvController } from "./csv.controller";
import { ProductsModule } from "../product-management/products/products.module";
import { LocationsModule } from "../locations/locations.module";

@Module({
  imports: [ProductsModule, LocationsModule],
  providers: [CsvService],
  controllers: [CsvController],
  exports: [CsvService],
})
export class CsvModule {}

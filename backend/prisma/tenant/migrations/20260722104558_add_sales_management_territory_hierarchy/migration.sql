-- CreateEnum
CREATE TYPE "TerritoryStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "locations" ALTER COLUMN "address" DROP NOT NULL;

-- AlterTable
ALTER TABLE "products" ALTER COLUMN "min_stock" DROP NOT NULL,
ALTER COLUMN "min_stock" DROP DEFAULT;

-- CreateTable
CREATE TABLE "sales_regions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country_name" TEXT NOT NULL,
    "status" "TerritoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_zones" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region_id" TEXT NOT NULL,
    "status" "TerritoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_cities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "zone_id" TEXT NOT NULL,
    "status" "TerritoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_areas" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city_id" TEXT NOT NULL,
    "status" "TerritoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_areas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sales_regions_name_key" ON "sales_regions"("name");

-- CreateIndex
CREATE INDEX "sales_regions_status_idx" ON "sales_regions"("status");

-- CreateIndex
CREATE INDEX "sales_zones_region_id_idx" ON "sales_zones"("region_id");

-- CreateIndex
CREATE INDEX "sales_zones_status_idx" ON "sales_zones"("status");

-- CreateIndex
CREATE UNIQUE INDEX "sales_zones_name_region_id_key" ON "sales_zones"("name", "region_id");

-- CreateIndex
CREATE INDEX "sales_cities_zone_id_idx" ON "sales_cities"("zone_id");

-- CreateIndex
CREATE INDEX "sales_cities_status_idx" ON "sales_cities"("status");

-- CreateIndex
CREATE UNIQUE INDEX "sales_cities_name_zone_id_key" ON "sales_cities"("name", "zone_id");

-- CreateIndex
CREATE INDEX "sales_areas_city_id_idx" ON "sales_areas"("city_id");

-- CreateIndex
CREATE INDEX "sales_areas_status_idx" ON "sales_areas"("status");

-- CreateIndex
CREATE UNIQUE INDEX "sales_areas_name_city_id_key" ON "sales_areas"("name", "city_id");

-- AddForeignKey
ALTER TABLE "sales_zones" ADD CONSTRAINT "sales_zones_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "sales_regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_cities" ADD CONSTRAINT "sales_cities_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "sales_zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_areas" ADD CONSTRAINT "sales_areas_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "sales_cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'INVENTORY_MANAGER');

-- CreateEnum
CREATE TYPE "ThreeDAssetKind" AS ENUM ('GLTF_MODEL', 'PROCEDURAL_FALLBACK', 'PLACEHOLDER');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('INFO', 'WARNING', 'ERROR');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComponentCategory" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ComponentCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Component" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "images" TEXT[],
    "specifications" JSONB NOT NULL,
    "socket" TEXT,
    "formFactor" TEXT,
    "ramType" TEXT,
    "pcieGeneration" TEXT,
    "lengthMm" DOUBLE PRECISION,
    "widthMm" DOUBLE PRECISION,
    "heightMm" DOUBLE PRECISION,
    "tdpWatts" INTEGER,
    "powerDrawWatts" INTEGER,
    "wattage" INTEGER,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Component_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inventory" (
    "id" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 5,
    "lastRestockedAt" TIMESTAMP(3),

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreeDAsset" (
    "id" TEXT NOT NULL,
    "componentId" TEXT,
    "kind" "ThreeDAssetKind" NOT NULL,
    "url" TEXT,
    "proceduralGeneratorKey" TEXT,
    "source" TEXT,
    "licenseInfo" TEXT,
    "attribution" TEXT,
    "usageRights" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThreeDAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompatibilityRule" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "Severity" NOT NULL DEFAULT 'ERROR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CompatibilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PCBuild" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "workspaceState" JSONB,
    "compatibilityStatus" JSONB,
    "estimatedPowerWatts" INTEGER,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "shareSlug" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PCBuild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildComponent" (
    "id" TEXT NOT NULL,
    "buildId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "installedZoneKey" TEXT NOT NULL,
    "positionX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "positionY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "positionZ" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rotationX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rotationY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rotationZ" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "BuildComponent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_name_key" ON "Brand"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ComponentCategory_key_key" ON "ComponentCategory"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Component_sku_key" ON "Component"("sku");

-- CreateIndex
CREATE INDEX "Component_categoryId_idx" ON "Component"("categoryId");

-- CreateIndex
CREATE INDEX "Component_brandId_idx" ON "Component"("brandId");

-- CreateIndex
CREATE INDEX "Component_socket_idx" ON "Component"("socket");

-- CreateIndex
CREATE INDEX "Component_formFactor_idx" ON "Component"("formFactor");

-- CreateIndex
CREATE INDEX "Component_ramType_idx" ON "Component"("ramType");

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_componentId_key" ON "Inventory"("componentId");

-- CreateIndex
CREATE INDEX "ThreeDAsset_componentId_idx" ON "ThreeDAsset"("componentId");

-- CreateIndex
CREATE UNIQUE INDEX "CompatibilityRule_key_key" ON "CompatibilityRule"("key");

-- CreateIndex
CREATE UNIQUE INDEX "PCBuild_shareSlug_key" ON "PCBuild"("shareSlug");

-- CreateIndex
CREATE INDEX "PCBuild_userId_idx" ON "PCBuild"("userId");

-- CreateIndex
CREATE INDEX "BuildComponent_buildId_idx" ON "BuildComponent"("buildId");

-- CreateIndex
CREATE INDEX "BuildComponent_componentId_idx" ON "BuildComponent"("componentId");

-- AddForeignKey
ALTER TABLE "Component" ADD CONSTRAINT "Component_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ComponentCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Component" ADD CONSTRAINT "Component_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreeDAsset" ADD CONSTRAINT "ThreeDAsset_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PCBuild" ADD CONSTRAINT "PCBuild_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildComponent" ADD CONSTRAINT "BuildComponent_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "PCBuild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildComponent" ADD CONSTRAINT "BuildComponent_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

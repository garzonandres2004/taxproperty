-- CreateTable
CREATE TABLE "PipelineRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "property_id" TEXT NOT NULL,
    "pipeline_version" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    "phases_requested" TEXT NOT NULL,
    "phases_completed" TEXT,
    "current_phase" TEXT,
    "status" TEXT NOT NULL DEFAULT 'running',
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" DATETIME,
    "duration_ms" INTEGER,
    "investability_score" REAL,
    "recommendation_bucket" TEXT,
    "error_message" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PipelineRun_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TitleSignals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "property_id" TEXT NOT NULL,
    "has_deed_records" BOOLEAN,
    "document_count_5yr" INTEGER,
    "last_transfer_date" DATETIME,
    "last_transfer_type" TEXT,
    "mortgage_docs_found" INTEGER,
    "lien_docs_found" INTEGER,
    "release_docs_found" INTEGER,
    "red_flags_count" INTEGER NOT NULL DEFAULT 0,
    "yellow_flags_count" INTEGER NOT NULL DEFAULT 0,
    "data_source" TEXT NOT NULL,
    "source_url" TEXT,
    "scraped_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TitleSignals_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables (CountyConfig additive changes)
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CountyConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "county_name" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'Utah',
    "display_name" TEXT NOT NULL,
    "auction_date" TEXT,
    "auction_platform" TEXT,
    "auction_url" TEXT,
    "auction_format" TEXT NOT NULL DEFAULT 'bid_up',
    "sale_type" TEXT NOT NULL DEFAULT 'deed',
    "parcel_api_url" TEXT,
    "parcel_api_layer" TEXT,
    "zoning_api_url" TEXT,
    "land_records_url" TEXT,
    "land_records_requires_auth" BOOLEAN NOT NULL DEFAULT false,
    "parcel_id_format" TEXT,
    "parcel_id_separator" TEXT NOT NULL DEFAULT ':',
    "parcel_id_for_api" TEXT,
    "csv_source_url" TEXT,
    "csv_format_notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "total_properties" INTEGER NOT NULL DEFAULT 0,
    "completeness_score" REAL,
    "physical_completeness" REAL,
    "valuation_completeness" REAL,
    "location_completeness" REAL,
    "title_completeness" REAL,
    "automation_potential" TEXT NOT NULL DEFAULT 'unknown',
    "manual_playbook_required" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "last_completeness_check" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_CountyConfig" (
    "auction_date", "auction_format", "auction_platform", "auction_url",
    "county_name", "created_at", "csv_format_notes", "csv_source_url",
    "display_name", "id", "is_active", "land_records_requires_auth",
    "land_records_url", "notes", "parcel_api_layer", "parcel_api_url",
    "parcel_id_for_api", "parcel_id_format", "parcel_id_separator",
    "sale_type", "state", "updated_at", "zoning_api_url"
) SELECT
    "auction_date", "auction_format", "auction_platform", "auction_url",
    "county_name", "created_at", "csv_format_notes", "csv_source_url",
    "display_name", "id", "is_active", "land_records_requires_auth",
    "land_records_url", "notes", "parcel_api_layer", "parcel_api_url",
    "parcel_id_for_api", "parcel_id_format", "parcel_id_separator",
    "sale_type", "state", "updated_at", "zoning_api_url"
FROM "CountyConfig";
DROP TABLE "CountyConfig";
ALTER TABLE "new_CountyConfig" RENAME TO "CountyConfig";
CREATE UNIQUE INDEX "CountyConfig_county_name_key" ON "CountyConfig"("county_name");
CREATE INDEX "CountyConfig_county_name_idx" ON "CountyConfig"("county_name");
CREATE INDEX "CountyConfig_state_idx" ON "CountyConfig"("state");
CREATE INDEX "CountyConfig_status_idx" ON "CountyConfig"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "PipelineRun_property_id_idx" ON "PipelineRun"("property_id");
CREATE INDEX "PipelineRun_status_idx" ON "PipelineRun"("status");
CREATE INDEX "PipelineRun_county_idx" ON "PipelineRun"("county");
CREATE INDEX "PipelineRun_pipeline_version_idx" ON "PipelineRun"("pipeline_version");
CREATE INDEX "PipelineRun_property_id_pipeline_version_idx" ON "PipelineRun"("property_id", "pipeline_version");
CREATE INDEX "PipelineRun_started_at_idx" ON "PipelineRun"("started_at");

-- CreateIndex
CREATE UNIQUE INDEX "TitleSignals_property_id_key" ON "TitleSignals"("property_id");
CREATE INDEX "TitleSignals_property_id_idx" ON "TitleSignals"("property_id");
CREATE INDEX "TitleSignals_data_source_idx" ON "TitleSignals"("data_source");

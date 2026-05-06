-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdjacentParcel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "property_id" TEXT NOT NULL,
    "adjacent_parcel_number" TEXT NOT NULL,
    "is_in_tax_sale" BOOLEAN NOT NULL DEFAULT false,
    "distance_meters" REAL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    FOREIGN KEY ("property_id") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Auction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "county" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "auction_date" DATETIME NOT NULL,
    "format" TEXT NOT NULL,
    "property_count" INTEGER NOT NULL,
    "url" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CountyConfig" (
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
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DataGap" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "property_id" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "source_hint" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" DATETIME,
    "resolved_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    FOREIGN KEY ("property_id") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OutcomeEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "property_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "event_date" TEXT NOT NULL,
    "details" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("property_id") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "county" TEXT NOT NULL,
    "sale_year" INTEGER NOT NULL,
    "sale_date" TEXT,
    "parcel_number" TEXT NOT NULL,
    "owner_name" TEXT,
    "owner_mailing_address" TEXT,
    "property_address" TEXT,
    "legal_description" TEXT,
    "total_amount_due" REAL,
    "assessed_value" REAL,
    "estimated_market_value" REAL,
    "estimated_repair_cost" REAL,
    "estimated_cleanup_cost" REAL,
    "estimated_closing_cost" REAL,
    "property_type" TEXT NOT NULL DEFAULT 'unknown',
    "occupancy_status" TEXT NOT NULL DEFAULT 'unknown',
    "zoning" TEXT,
    "lot_size_sqft" REAL,
    "building_sqft" REAL,
    "year_built" INTEGER,
    "auction_platform" TEXT,
    "deposit_required" REAL,
    "redemption_deadline" TEXT,
    "access_risk" TEXT NOT NULL DEFAULT 'unknown',
    "title_risk" TEXT NOT NULL DEFAULT 'unknown',
    "legal_risk" TEXT NOT NULL DEFAULT 'unknown',
    "marketability_risk" TEXT NOT NULL DEFAULT 'unknown',
    "data_confidence" REAL,
    "notes" TEXT,
    "opportunity_score" REAL,
    "risk_score" REAL,
    "final_score" REAL,
    "recommendation" TEXT,
    "max_bid" REAL,
    "max_bid_calculated" REAL,
    "repair_estimate" REAL,
    "desired_profit" REAL,
    "absentee_owner" BOOLEAN,
    "micro_parcel" BOOLEAN,
    "assemblage_opportunity" BOOLEAN,
    "is_otc" BOOLEAN NOT NULL DEFAULT false,
    "municipal_lien_risk" TEXT DEFAULT 'unknown',
    "code_violations_found" BOOLEAN,
    "code_violations_balance_due" REAL,
    "utility_lien_notes" TEXT,
    "municipal_lien_checked_at" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'new',
    "status_reason" TEXT,
    "status_last_verified_at" DATETIME,
    "county_source_url" TEXT,
    "source_last_checked_at" DATETIME,
    "presale_volatility_risk" INTEGER NOT NULL DEFAULT 0,
    "is_active_sale_candidate" BOOLEAN NOT NULL DEFAULT true,
    "photo_url" TEXT,
    "photo_date" TEXT,
    "aerial_url" TEXT,
    "is_seed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "latitude" REAL,
    "longitude" REAL,
    "confidence_score_v2" REAL,
    "investability_score" REAL,
    "opportunity_score_v2" REAL,
    "recommendation_bucket" TEXT,
    "risk_score_v2" REAL,
    "score_version" TEXT,
    "title_score_v2" REAL,
    FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RedFlag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "property_id" TEXT NOT NULL,
    "flag_type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "details" TEXT,
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    FOREIGN KEY ("property_id") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "property_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT,
    "source_type" TEXT NOT NULL DEFAULT 'other',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("property_id") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StateGuide" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "state_code" TEXT NOT NULL,
    "state_name" TEXT NOT NULL,
    "sale_type" TEXT NOT NULL,
    "interest_rate" TEXT,
    "redemption_period" TEXT,
    "auction_frequency" TEXT NOT NULL,
    "top_counties" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ThirdPartyEnrichment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "property_id" TEXT NOT NULL,
    "zillow_url" TEXT,
    "zillow_zpid" TEXT,
    "zillow_zestimate" REAL,
    "zillow_rent_estimate" REAL,
    "zillow_beds" INTEGER,
    "zillow_baths" REAL,
    "zillow_sqft" INTEGER,
    "zillow_confidence" TEXT,
    "zillow_last_synced" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    FOREIGN KEY ("property_id") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TitleAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "property_id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "recommendation" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "redFlags" TEXT,
    "yellowFlags" TEXT,
    "greenFlags" TEXT,
    "ownershipChain" TEXT,
    "activeLiens" TEXT,
    "mortgageStatus" TEXT NOT NULL,
    "yearsSameOwner" INTEGER,
    "titleComplexity" TEXT NOT NULL,
    "estimatedQuietTitleCost" INTEGER,
    "recommendedActions" TEXT,
    "rawDocuments" TEXT,
    "pdfAnalyses" TEXT,
    "pdfWarnings" TEXT,
    "hasPDFCriticalIssues" BOOLEAN NOT NULL DEFAULT false,
    "analyzedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("property_id") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TitleResearchChecklist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "property_id" TEXT NOT NULL,
    "drive_by_status" TEXT NOT NULL DEFAULT 'pending',
    "drive_by_notes" TEXT,
    "drive_by_completed_at" DATETIME,
    "drive_by_auto_verified" BOOLEAN NOT NULL DEFAULT false,
    "deed_search_status" TEXT NOT NULL DEFAULT 'pending',
    "deed_search_notes" TEXT,
    "deed_search_completed_at" DATETIME,
    "grantor_grantee_status" TEXT NOT NULL DEFAULT 'pending',
    "grantor_grantee_notes" TEXT,
    "grantor_grantee_completed_at" DATETIME,
    "municipal_liens_status" TEXT NOT NULL DEFAULT 'pending',
    "municipal_liens_notes" TEXT,
    "municipal_liens_completed_at" DATETIME,
    "owner_lien_search_status" TEXT NOT NULL DEFAULT 'pending',
    "owner_lien_search_notes" TEXT,
    "owner_lien_search_completed_at" DATETIME,
    "hoa_status" TEXT NOT NULL DEFAULT 'pending',
    "hoa_notes" TEXT,
    "hoa_completed_at" DATETIME,
    "arv_verified_status" TEXT NOT NULL DEFAULT 'pending',
    "arv_verified_notes" TEXT,
    "arv_verified_completed_at" DATETIME,
    "gis_verified_status" TEXT NOT NULL DEFAULT 'pending',
    "gis_verified_notes" TEXT,
    "gis_verified_completed_at" DATETIME,
    "gis_auto_verified" BOOLEAN NOT NULL DEFAULT false,
    "lawsuit_search_status" TEXT NOT NULL DEFAULT 'pending',
    "lawsuit_search_notes" TEXT,
    "lawsuit_search_completed_at" DATETIME,
    "total_completed" INTEGER NOT NULL DEFAULT 0,
    "last_updated_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("property_id") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" DATETIME,
    "image" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "user_id" TEXT,
    "totalBudget" REAL,
    "maxPerProperty" REAL,
    "reserveBuffer" REAL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ZoningProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "property_id" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "is_unincorporated" BOOLEAN NOT NULL DEFAULT true,
    "zoning_code" TEXT,
    "zoning_name" TEXT,
    "land_use_designation" TEXT,
    "permitted_uses" TEXT,
    "conditional_uses" TEXT,
    "prohibited_uses" TEXT,
    "min_lot_size_sqft" REAL,
    "min_lot_size_acres" REAL,
    "front_setback_ft" REAL,
    "side_setback_ft" REAL,
    "rear_setback_ft" REAL,
    "max_height_ft" REAL,
    "max_height_stories" INTEGER,
    "max_lot_coverage_percent" REAL,
    "frontage_required_ft" REAL,
    "has_slope_restrictions" BOOLEAN NOT NULL DEFAULT false,
    "has_floodplain_restrictions" BOOLEAN NOT NULL DEFAULT false,
    "has_wildfire_restrictions" BOOLEAN NOT NULL DEFAULT false,
    "has_open_space_requirements" BOOLEAN NOT NULL DEFAULT false,
    "overlays" TEXT,
    "has_legal_access" BOOLEAN NOT NULL DEFAULT false,
    "access_type" TEXT,
    "utilities_status" TEXT NOT NULL DEFAULT 'unknown',
    "water_source" TEXT,
    "sewer_type" TEXT,
    "slope_percent" REAL,
    "buildable_area_sqft" REAL,
    "buildability_score" INTEGER NOT NULL DEFAULT 0,
    "buildability_notes" TEXT,
    "best_use_ideas" TEXT,
    "use_difficulty" TEXT NOT NULL DEFAULT 'unknown',
    "estimated_time_to_entitlement" TEXT,
    "next_steps" TEXT,
    "zoning_map_url" TEXT,
    "zoning_ordinance_url" TEXT,
    "data_last_verified" DATETIME,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    FOREIGN KEY ("property_id") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider" ASC, "providerAccountId" ASC);

-- CreateIndex
CREATE INDEX "AdjacentParcel_adjacent_parcel_number_idx" ON "AdjacentParcel"("adjacent_parcel_number" ASC);

-- CreateIndex
CREATE INDEX "AdjacentParcel_property_id_idx" ON "AdjacentParcel"("property_id" ASC);

-- CreateIndex
CREATE INDEX "Auction_auction_date_idx" ON "Auction"("auction_date" ASC);

-- CreateIndex
CREATE INDEX "Auction_state_idx" ON "Auction"("state" ASC);

-- CreateIndex
CREATE INDEX "Auction_county_idx" ON "Auction"("county" ASC);

-- CreateIndex
CREATE INDEX "CountyConfig_state_idx" ON "CountyConfig"("state" ASC);

-- CreateIndex
CREATE INDEX "CountyConfig_county_name_idx" ON "CountyConfig"("county_name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "CountyConfig_county_name_key" ON "CountyConfig"("county_name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "DataGap_property_id_phase_field_key" ON "DataGap"("property_id" ASC, "phase" ASC, "field" ASC);

-- CreateIndex
CREATE INDEX "DataGap_level_idx" ON "DataGap"("level" ASC);

-- CreateIndex
CREATE INDEX "DataGap_reason_idx" ON "DataGap"("reason" ASC);

-- CreateIndex
CREATE INDEX "DataGap_phase_idx" ON "DataGap"("phase" ASC);

-- CreateIndex
CREATE INDEX "DataGap_property_id_idx" ON "DataGap"("property_id" ASC);

-- CreateIndex
CREATE INDEX "Property_user_id_idx" ON "Property"("user_id" ASC);

-- CreateIndex
CREATE INDEX "Property_parcel_number_idx" ON "Property"("parcel_number" ASC);

-- CreateIndex
CREATE INDEX "Property_status_idx" ON "Property"("status" ASC);

-- CreateIndex
CREATE INDEX "Property_county_idx" ON "Property"("county" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Property_parcel_number_key" ON "Property"("parcel_number" ASC);

-- CreateIndex
CREATE INDEX "RedFlag_is_resolved_idx" ON "RedFlag"("is_resolved" ASC);

-- CreateIndex
CREATE INDEX "RedFlag_flag_type_idx" ON "RedFlag"("flag_type" ASC);

-- CreateIndex
CREATE INDEX "RedFlag_property_id_idx" ON "RedFlag"("property_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Source_property_id_label_key" ON "Source"("property_id" ASC, "label" ASC);

-- CreateIndex
CREATE INDEX "StateGuide_sale_type_idx" ON "StateGuide"("sale_type" ASC);

-- CreateIndex
CREATE INDEX "StateGuide_state_code_idx" ON "StateGuide"("state_code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "StateGuide_state_code_key" ON "StateGuide"("state_code" ASC);

-- CreateIndex
CREATE INDEX "ThirdPartyEnrichment_zillow_zpid_idx" ON "ThirdPartyEnrichment"("zillow_zpid" ASC);

-- CreateIndex
CREATE INDEX "ThirdPartyEnrichment_property_id_idx" ON "ThirdPartyEnrichment"("property_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ThirdPartyEnrichment_property_id_key" ON "ThirdPartyEnrichment"("property_id" ASC);

-- CreateIndex
CREATE INDEX "TitleAnalysis_recommendation_idx" ON "TitleAnalysis"("recommendation" ASC);

-- CreateIndex
CREATE INDEX "TitleAnalysis_score_idx" ON "TitleAnalysis"("score" ASC);

-- CreateIndex
CREATE INDEX "TitleAnalysis_property_id_idx" ON "TitleAnalysis"("property_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "TitleAnalysis_property_id_key" ON "TitleAnalysis"("property_id" ASC);

-- CreateIndex
CREATE INDEX "TitleResearchChecklist_property_id_idx" ON "TitleResearchChecklist"("property_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "TitleResearchChecklist_property_id_key" ON "TitleResearchChecklist"("property_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_user_id_key" ON "UserSettings"("user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier" ASC, "token" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ZoningProfile_property_id_key" ON "ZoningProfile"("property_id" ASC);

┌─────────────────────────────────────────────────────────┐
│  Update available 5.22.0 -> 7.8.0                       │
│                                                         │
│  This is a major update - please follow the guide at    │
│  https://pris.ly/d/major-version-upgrade                │
│                                                         │
│  Run the following to update                            │
│    npm i --save-dev prisma@latest                       │
│    npm i @prisma/client@latest                          │
└─────────────────────────────────────────────────────────┘

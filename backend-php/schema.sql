-- Price Intel — MySQL / MariaDB schema (Hostinger: import via phpMyAdmin).
-- Column names match the JSON the dashboard and agent already speak, so the
-- PHP layer can hand rows straight back without renaming.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS platforms (
  PlatformID    INT AUTO_INCREMENT PRIMARY KEY,
  PlatformCode  VARCHAR(32)  NOT NULL,
  PlatformName  VARCHAR(100) NOT NULL,
  -- Prefix of the price-comparison columns: <ColumnKey>Price / <ColumnKey>URL.
  -- The dashboard reads fixed keys (AmazonPrice, sathyaPrice, ...), so this is
  -- stored rather than derived from the display name.
  ColumnKey     VARCHAR(64)  NOT NULL,
  BaseURL       VARCHAR(255) NOT NULL DEFAULT '',
  CollectorType VARCHAR(32)  NOT NULL DEFAULT 'http',
  IsEnabled     TINYINT(1)   NOT NULL DEFAULT 1,
  UNIQUE KEY uq_platform_code (PlatformCode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
  ProductID       INT AUTO_INCREMENT PRIMARY KEY,
  -- GoFix GetModelList modelId; NULL for products added by hand.
  ExternalModelID INT NULL,
  ItemCode        VARCHAR(64)  NOT NULL DEFAULT '',
  Brand           VARCHAR(100) NOT NULL DEFAULT '',
  ModelName       VARCHAR(255) NOT NULL DEFAULT '',
  RAM             VARCHAR(32)  NOT NULL DEFAULT '',
  StorageSize     VARCHAR(32)  NOT NULL DEFAULT '',
  ColorName       VARCHAR(64)  NOT NULL DEFAULT '',
  VariantName     VARCHAR(128) NOT NULL DEFAULT '',
  ItemName        VARCHAR(255) NOT NULL DEFAULT '',
  Category        VARCHAR(100) NOT NULL DEFAULT '',
  SubCategory     VARCHAR(100) NOT NULL DEFAULT '',
  LaunchDate      DATE NULL,
  IsActive        TINYINT(1)   NOT NULL DEFAULT 1,
  CurrentPrice    DECIMAL(12,2) NULL,
  LastUpdated     DATETIME NULL,
  CreatedOn       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_external_model (ExternalModelID),
  KEY ix_active (IsActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_platforms (
  ProductPlatformID INT AUTO_INCREMENT PRIMARY KEY,
  ProductID         INT NOT NULL,
  PlatformID        INT NOT NULL,
  ProductURL        VARCHAR(1024) NOT NULL,
  -- 'manual' = entered in the dashboard; the scraper never overwrites it.
  -- 'auto'   = found by the scraper's store search; replaced if it goes stale.
  UrlSource         ENUM('manual','auto') NOT NULL DEFAULT 'manual',
  MatchedTitle      VARCHAR(512) NULL,
  IsActive          TINYINT(1) NOT NULL DEFAULT 1,
  -- Latest scrape, denormalised so price-comparison doesn't scan history.
  LastPrice         DECIMAL(12,2) NULL,
  LastMRP           DECIMAL(12,2) NULL,
  LastDiscount      DECIMAL(6,2)  NULL,
  LastCheckedAt     DATETIME NULL,
  CreatedOn         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedOn         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_product_platform (ProductID, PlatformID),
  KEY ix_platform (PlatformID),
  CONSTRAINT fk_pp_product  FOREIGN KEY (ProductID)  REFERENCES products(ProductID)   ON DELETE CASCADE,
  CONSTRAINT fk_pp_platform FOREIGN KEY (PlatformID) REFERENCES platforms(PlatformID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS price_history (
  PriceID           BIGINT AUTO_INCREMENT PRIMARY KEY,
  ProductPlatformID INT NOT NULL,
  Price             DECIMAL(12,2) NOT NULL,
  MRP               DECIMAL(12,2) NULL,
  Discount          DECIMAL(6,2)  NULL,
  Source            VARCHAR(64) NOT NULL DEFAULT '',
  IsActive          TINYINT(1) NOT NULL DEFAULT 1,
  CaptureTime       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_pp_time (ProductPlatformID, CaptureTime),
  CONSTRAINT fk_ph_pp FOREIGN KEY (ProductPlatformID) REFERENCES product_platforms(ProductPlatformID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Store searches that found no matching listing, so the scraper doesn't
-- re-search the same model on the same store every run.
CREATE TABLE IF NOT EXISTS search_misses (
  ProductID  INT NOT NULL,
  PlatformID INT NOT NULL,
  Reason     VARCHAR(255) NOT NULL DEFAULT '',
  SearchedAt DATETIME NOT NULL,
  PRIMARY KEY (ProductID, PlatformID),
  CONSTRAINT fk_sm_product  FOREIGN KEY (ProductID)  REFERENCES products(ProductID)   ON DELETE CASCADE,
  CONSTRAINT fk_sm_platform FOREIGN KEY (PlatformID) REFERENCES platforms(PlatformID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Competitors the dashboard knows about. ColumnKey values are what the
-- dashboard's price-comparison types expect — don't rename them.
INSERT IGNORE INTO platforms (PlatformCode, PlatformName, ColumnKey, BaseURL, CollectorType) VALUES
  ('AMAZON',    'Amazon',              'Amazon',            'https://www.amazon.in',              'http'),
  ('FLIPKART',  'Flipkart',            'Flipkart',          'https://www.flipkart.com',           'http'),
  ('POORVIKA',  'Poorvika',            'Poorvika',          'https://www.poorvika.com',           'http'),
  ('CROMA',     'Croma',               'Croma',             'https://www.croma.com',              'browser'),
  ('RELIANCE',  'Reliance Digital',    'RelianceDigital',   'https://www.reliancedigital.in',     'http'),
  ('SANGEETHA', 'Sangeetha Mobiles',   'SangeethaMobiles',  'https://www.sangeetha.com',          'http'),
  ('TCM',       'The Chennai Mobiles', 'TheChennaiMobiles', 'https://www.thechennaimobiles.com',  'http'),
  ('SATHYA',    'Sathya',              'sathya',            'https://www.sathya.store',           'http');

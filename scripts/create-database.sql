-- Create database schema for landscape photo platform

-- Images table to store processed photos metadata
CREATE TABLE IF NOT EXISTS images (
    id SERIAL PRIMARY KEY,
    original_filename VARCHAR(255) NOT NULL,
    processed_url TEXT NOT NULL,
    original_url TEXT,
    title VARCHAR(255),
    description TEXT,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    file_size INTEGER,
    file_type VARCHAR(50),
    
    -- Color correction data
    brightness_adjustment DECIMAL(5,2),
    contrast_adjustment DECIMAL(5,2),
    saturation_adjustment DECIMAL(5,2),
    
    -- Metadata
    camera_model VARCHAR(100),
    location VARCHAR(255),
    camera_settings TEXT,
    
    -- Processing status
    processing_status VARCHAR(20) DEFAULT 'pending',
    processed_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories table for AWS Rekognition labels
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(7), -- Hex color for UI
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Junction table for image-category relationships
CREATE TABLE IF NOT EXISTS image_categories (
    id SERIAL PRIMARY KEY,
    image_id INTEGER REFERENCES images(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    confidence DECIMAL(5,2), -- AWS Rekognition confidence score
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(image_id, category_id)
);

-- Processing logs table
CREATE TABLE IF NOT EXISTS processing_logs (
    id SERIAL PRIMARY KEY,
    image_id INTEGER REFERENCES images(id) ON DELETE CASCADE,
    step VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    message TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_images_upload_date ON images(upload_date DESC);
CREATE INDEX IF NOT EXISTS idx_images_processing_status ON images(processing_status);
CREATE INDEX IF NOT EXISTS idx_image_categories_image_id ON image_categories(image_id);
CREATE INDEX IF NOT EXISTS idx_image_categories_category_id ON image_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_processing_logs_image_id ON processing_logs(image_id);

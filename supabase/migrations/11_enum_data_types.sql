-- Migration: Introduce ENUM types for specific columns
-- Description: Converts jurisdiction and document_type in documents table to ENUMs for data integrity.

-- Create ENUM type for document_type
CREATE TYPE public.document_type_enum AS ENUM (
    'Real Estate Law',
    'Title & Escrow Law',
    'Tax Law',
    'Regulation',
    'Contract', -- Added example
    'Litigation', -- Added example
    'Corporate', -- Added example
    'Other'
);

-- Create ENUM type for jurisdiction (US States/Territories + National)
-- This is a partial list for brevity, extend as needed.
CREATE TYPE public.jurisdiction_enum AS ENUM (
    'National',
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
    -- Add US Territories as needed, e.g., 'PR', 'GU', etc.
    'Other' -- Fallback for international or unspecified
);

-- Alter documents table to use the new ENUM types
-- Note: If data exists, this requires a USING clause to cast existing text values.
-- It's crucial that existing text values match enum values or are handled (e.g., mapped to 'Other').

ALTER TABLE public.documents
ADD COLUMN temp_document_type public.document_type_enum;

-- Attempt to update based on existing values, mapping known ones or defaulting to 'Other'
-- This is an example, carefully review and test mapping logic based on actual data
UPDATE public.documents
SET temp_document_type = CASE
    WHEN document_type ILIKE 'Real Estate Law' THEN 'Real Estate Law'::public.document_type_enum
    WHEN document_type ILIKE 'Title & Escrow Law' THEN 'Title & Escrow Law'::public.document_type_enum
    WHEN document_type ILIKE 'Tax Law' THEN 'Tax Law'::public.document_type_enum
    WHEN document_type ILIKE 'Regulation' THEN 'Regulation'::public.document_type_enum
    -- Add more explicit mappings here based on your distinct document_type values
    ELSE 'Other'::public.document_type_enum
END
WHERE document_type IS NOT NULL;

ALTER TABLE public.documents
DROP COLUMN document_type;

ALTER TABLE public.documents
RENAME COLUMN temp_document_type TO document_type;


ALTER TABLE public.documents
ADD COLUMN temp_jurisdiction public.jurisdiction_enum;

-- Example update for jurisdiction (must be more robust for actual data)
UPDATE public.documents
SET temp_jurisdiction = jurisdiction::public.jurisdiction_enum
WHERE jurisdiction IS NOT NULL AND jurisdiction IN (SELECT unnest(enum_range(NULL::public.jurisdiction_enum))::text);
-- For values not in enum, they will remain NULL or you can map them to 'Other'
UPDATE public.documents
SET temp_jurisdiction = 'Other'::public.jurisdiction_enum
WHERE jurisdiction IS NOT NULL AND temp_jurisdiction IS NULL; 

ALTER TABLE public.documents
DROP COLUMN jurisdiction;

ALTER TABLE public.documents
RENAME COLUMN temp_jurisdiction TO jurisdiction;

-- Add CHECK constraint for county based on jurisdiction (example)
-- This is complex to maintain. A separate lookup table might be better if strict county validation is needed.
/*
ALTER TABLE public.documents
ADD CONSTRAINT chk_county_jurisdiction
CHECK (
    (jurisdiction = 'National' AND county IS NULL) OR
    (jurisdiction != 'National' AND county IS NOT NULL) -- Basic check, not validating actual counties
);
*/

-- Comment: Changing column types on tables with existing data needs careful planning
-- and testing to ensure data integrity and handle potential casting errors.
-- The UPDATE statements provided are examples and may need adjustment based on actual distinct values. 
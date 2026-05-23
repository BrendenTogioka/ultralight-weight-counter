-- Add featured image to trips
alter table trips add column if not exists featured_image_url text;

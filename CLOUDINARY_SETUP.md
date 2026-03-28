# Cloudinary Setup Guide

This guide explains how to configure Cloudinary for image uploads in the FX Journal application.

## 1. Create a Cloudinary Account

1. Go to [cloudinary.com](https://cloudinary.com) and sign up for a free account
2. After registration, you'll be redirected to your Dashboard

## 2. Get Your Cloudinary Credentials

From your Cloudinary Dashboard, find these values:

- **Cloud Name**: Displayed at the top of your dashboard
- **API Key**: Found in Settings > API Keys
- **API Secret**: Found in Settings > API Keys (click "reveal" to see it)

## 3. Configure Environment Variables

Update your `backend/.env` file with your Cloudinary credentials:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## 4. Image Upload Features

The application now supports:

### Single Image Upload
```javascript
POST /api/upload
Content-Type: multipart/form-data
Body: image (file)
Response: { url, publicId, originalName }
```

### Multiple Image Upload
```javascript
POST /api/upload/multiple
Content-Type: multipart/form-data
Body: images (file array, max 10)
Response: [{ url, publicId, originalName }, ...]
```

### Delete Image
```javascript
DELETE /api/upload/:publicId
Response: { message: 'Image deleted successfully' }
```

## 5. Image Optimization

Images are automatically optimized on upload:

- Max resolution: 1920x1080
- Quality: Auto (good balance)
- Format: Auto (WebP when supported)
- Stored in folder: `fx-journal/`

## 6. Security

- Images are stored securely in Cloudinary's cloud storage
- URLs use HTTPS
- API secret is never exposed to frontend
- Only authenticated users can upload/delete images
- Images are automatically deleted from Cloudinary when trades are deleted

## 7. Troubleshooting

### Upload Fails
- Verify credentials in `.env` are correct
- Check Cloudinary account is active
- Ensure file is a valid image format (jpg, png, webp)

### Images Not Displaying
- Verify image URL is valid
- Check Cloudinary dashboard for the image
- Ensure CORS is configured in Cloudinary (Settings > Security)

### CORS Issues
Add your frontend URL to Cloudinary's allowed origins:
1. Go to Settings > Security
2. Find "Allowed fetch domains"
3. Add `http://localhost:5173` (for development)
4. Add your production domain when deploying

## 8. Migration from Base64

Existing base64 images will continue to work. New images will be stored in Cloudinary. To migrate existing images:

1. Download images from MongoDB (they're stored as base64 strings)
2. Upload them to Cloudinary manually or via API
3. Update the database to replace base64 with Cloudinary URLs

## 9. Cost

Cloudinary's free tier includes:
- 25 GB storage
- 25 GB bandwidth/month
- 20,000 transformations/month

For typical trading journal use, this is usually sufficient.

import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import sizeOf from 'image-size';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


export async function GET() {
  try {
    const ACCOUNT_ID = process.env.CLOUDFLARE_IMAGES_ACCOUNT_ID;
    const API_TOKEN = process.env.CLOUDFLARE_IMAGES_API_TOKEN;

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/images/v1`,
      {
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();
    const { images } = data.result;

    // Fetch image dimensions by downloading the image
    const imagesWithMetadata = await Promise.all(
      images.map(async (image: any) => {
        try {
          const imageUrl = image.variants[0];
          const imageResponse = await fetch(imageUrl);
          const arrayBuffer = await imageResponse.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const dimensions = sizeOf(buffer);

          console.log(`Fetched dimensions for ${image.id}:`, dimensions);

          return {
            url: imageUrl,
            type: 'image',
            width: dimensions.width,
            height: dimensions.height,
            aspectRatio: dimensions.width && dimensions.height 
              ? dimensions.width / dimensions.height 
              : null,
          };
        } catch (error) {
          console.error(`Error fetching image dimensions for ${image.id}:`, error);
          return {
            url: image.variants[0],
            type: 'image',
            width: null,
            height: null,
            aspectRatio: null,
          };
        }
      })
    );

    return NextResponse.json({ media: imagesWithMetadata });
  } catch (error) {
    console.error('Error fetching Cloudinary media:', error);
    return NextResponse.json({ media: [], error: 'Failed to fetch media' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

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
    console.log(ACCOUNT_ID);
    console.log(API_TOKEN);

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
    console.log(images[0])
    // console.log(data.result.images);


    return NextResponse.json({ media: data.result.images.map(image => ({
      url: image.variants[0], // Use the first variant URL
      type: 'image', // Assuming all are images, adjust if you have videos
    })) });
  } catch (error) {
    console.error('Error fetching Cloudinary media:', error);
    return NextResponse.json({ media: [], error: 'Failed to fetch media' }, { status: 500 });
  }
}

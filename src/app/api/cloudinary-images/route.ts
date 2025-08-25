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
    // Replace 'your-folder-name' with your actual Cloudinary folder name
    const folderName = process.env.CLOUDINARY_FOLDER || 'portfolio';
    
    const result = await cloudinary.search
      .expression(`folder:${folderName}/*`)
      .sort_by('created_at', 'desc')
      .max_results(50)
      .execute();

    const media = result.resources.map((resource: { 
      secure_url: string; 
      resource_type: string; 
      format: string;
    }) => ({
      url: resource.secure_url,
      type: resource.resource_type, // 'image' or 'video'
      format: resource.format
    }));

    return NextResponse.json({ media });
  } catch (error) {
    console.error('Error fetching Cloudinary media:', error);
    return NextResponse.json({ media: [], error: 'Failed to fetch media' }, { status: 500 });
  }
}

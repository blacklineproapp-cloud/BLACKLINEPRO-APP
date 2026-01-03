import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY not found in .env.local');
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  try {
    // Note: listModels is on the genAI object in some versions, or maybe elsewhere
    // In @google/generative-ai ^0.11.0, it might be on a different path or not exposed easily?
    // Actually, it should be genAI.getGenerativeModel({ model: '...' }).
    // To list models, we usually need the REST API or the admin/management SDK if available.
    // However, the error message itself suggests calling ListModels.
    
    // Let's try to fetch models using the REST API directly since the SDK might not expose it easily
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error listing models:', error);
  }
}

listModels();
